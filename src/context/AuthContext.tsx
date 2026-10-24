import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'super_admin';
}

interface AuthContextType {
  isAdmin: boolean;
  adminUser: AdminUser | null;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_SESSION_USER_KEY = 'novaluxe_admin_user_session';
const ADMIN_SESSION_TOKEN_KEY = 'novaluxe_admin_auth_token';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    try {
      const saved = sessionStorage.getItem(ADMIN_SESSION_USER_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const clearSession = useCallback(() => {
    setAdminUser(null);
    try {
      sessionStorage.removeItem(ADMIN_SESSION_USER_KEY);
      sessionStorage.removeItem(ADMIN_SESSION_TOKEN_KEY);
    } catch {}
  }, []);

  // Check and verify existing session on mount
  useEffect(() => {
    let isMounted = true;

    async function verifyExistingSession() {
      // 1. If Supabase is configured, check Supabase Auth session first
      if (isSupabaseConfigured && supabase) {
        try {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user && isMounted) {
            setAdminUser({
              id: data.session.user.id,
              email: data.session.user.email || 'administrator',
              role: 'admin'
            });
            return;
          }
        } catch {
          // Continue to token verification
        }
      }

      // 2. Check backend session token
      const token = sessionStorage.getItem(ADMIN_SESSION_TOKEN_KEY);
      if (token && isMounted) {
        try {
          const res = await fetch('/api/admin/verify', {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.valid && data.user && isMounted) {
              setAdminUser(data.user);
              sessionStorage.setItem(ADMIN_SESSION_USER_KEY, JSON.stringify(data.user));
              return;
            }
          }
          // If token verification returned 401 or invalid, clear invalid session
          if (isMounted) {
            clearSession();
          }
        } catch {
          // If network error, preserve existing session if present, but do not throw
        }
      }
    }

    verifyExistingSession();

    // Listen to Supabase auth state changes if configured
    if (isSupabaseConfigured && supabase) {
      const {
        data: { subscription }
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (!isMounted) return;
        if (session?.user) {
          const user: AdminUser = {
            id: session.user.id,
            email: session.user.email || 'administrator',
            role: 'admin'
          };
          setAdminUser(user);
          try {
            sessionStorage.setItem(ADMIN_SESSION_USER_KEY, JSON.stringify(user));
          } catch {}
        } else if (!sessionStorage.getItem(ADMIN_SESSION_TOKEN_KEY)) {
          // No Supabase session and no backend token
          setAdminUser(null);
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    }

    return () => {
      isMounted = false;
    };
  }, [clearSession]);

  const login = async (identifierInput: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    const trimmed = identifierInput.trim();
    if (!trimmed || !pass) {
      return { success: false, error: 'Please enter both username/email and password.' };
    }

    // 1. Try Supabase Auth first if configured and user entered an email
    if (isSupabaseConfigured && supabase && trimmed.includes('@')) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmed,
          password: pass
        });
        if (!error && data?.user) {
          const user: AdminUser = {
            id: data.user.id,
            email: data.user.email || trimmed,
            role: 'admin'
          };
          setAdminUser(user);
          try {
            sessionStorage.setItem(ADMIN_SESSION_USER_KEY, JSON.stringify(user));
          } catch {}
          return { success: true };
        }
      } catch {
        // Fall back to serverless admin auth endpoint
      }
    }

    // 2. Authenticate through secure backend API route
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: trimmed,
          username: trimmed,
          password: pass
        })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success && data.token && data.user) {
        setAdminUser(data.user);
        try {
          sessionStorage.setItem(ADMIN_SESSION_USER_KEY, JSON.stringify(data.user));
          sessionStorage.setItem(ADMIN_SESSION_TOKEN_KEY, data.token);
        } catch {}
        return { success: true };
      }

      return {
        success: false,
        error: data.error || 'Invalid administrator credentials.'
      };
    } catch {
      return {
        success: false,
        error: 'Unable to connect to authentication server. Please check your network and try again.'
      };
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    clearSession();
  };

  return (
    <AuthContext.Provider
      value={{
        isAdmin: Boolean(adminUser),
        adminUser,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
