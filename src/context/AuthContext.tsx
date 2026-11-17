import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'super_admin';
}

export interface PersistenceStatus {
  supabaseClientSession: boolean;
  serverServiceRole: boolean;
  diagnostic: string | null;
}

interface AuthContextType {
  isAdmin: boolean;
  isAuthLoading: boolean;
  adminUser: AdminUser | null;
  persistenceStatus: PersistenceStatus;
  recheckPersistenceStatus: () => Promise<PersistenceStatus>;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  getAuthToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_SESSION_USER_KEY = 'novaluxe_admin_user_session';
const ADMIN_SESSION_TOKEN_KEY = 'novaluxe_admin_auth_token';

async function verifySupabaseAdminProfile(userId: string): Promise<'admin' | 'super_admin' | null> {
  if (!isSupabaseConfigured || !supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('admin_profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data && (data.role === 'admin' || data.role === 'super_admin')) {
      return data.role;
    }
  } catch {
    // admin_profiles lookup failed or not authorized
  }
  return null;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [persistenceStatus, setPersistenceStatus] = useState<PersistenceStatus>({
    supabaseClientSession: false,
    serverServiceRole: false,
    diagnostic: null
  });

  const clearSession = useCallback(() => {
    setAdminUser(null);
    setPersistenceStatus({
      supabaseClientSession: false,
      serverServiceRole: false,
      diagnostic: null
    });
    try {
      sessionStorage.removeItem(ADMIN_SESSION_USER_KEY);
      sessionStorage.removeItem(ADMIN_SESSION_TOKEN_KEY);
    } catch {}
  }, []);

  const evaluatePersistenceCapabilities = useCallback(async (overrideDiagnostic?: string | null): Promise<PersistenceStatus> => {
    let supabaseClientSession = false;
    let serverServiceRole = false;
    let diagnostic: string | null = overrideDiagnostic || null;

    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.user?.id) {
          const role = await verifySupabaseAdminProfile(data.session.user.id);
          if (role) {
            supabaseClientSession = true;
          } else if (!diagnostic) {
            diagnostic = `Supabase Auth signed in, but User UUID (${data.session.user.id}) is not registered in public.admin_profiles.`;
          }
        }
      } catch {
        // Ignore check failure
      }
    }

    let token: string | null = null;
    try {
      token = sessionStorage.getItem(ADMIN_SESSION_TOKEN_KEY);
    } catch {}

    if (token) {
      try {
        const res = await fetch('/api/admin/persist', {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          serverServiceRole = Boolean(data?.hasServiceRole);
        }
      } catch {}
    }

    if (!supabaseClientSession && !serverServiceRole && !diagnostic) {
      diagnostic =
        'Remote writes require either a Supabase Auth admin user listed in public.admin_profiles OR SUPABASE_SERVICE_ROLE_KEY set on the server.';
    } else if (supabaseClientSession || serverServiceRole) {
      diagnostic = null;
    }

    const nextStatus: PersistenceStatus = {
      supabaseClientSession,
      serverServiceRole,
      diagnostic
    };
    setPersistenceStatus(nextStatus);
    return nextStatus;
  }, []);

  // Check and verify existing session on mount before granting any admin UI access
  useEffect(() => {
    let isMounted = true;

    async function verifyExistingSession() {
      try {
        // 1. Check Supabase Auth session ONLY if user has an authorized admin_profiles record
        if (isSupabaseConfigured && supabase) {
          try {
            const { data } = await supabase.auth.getSession();
            if (data.session?.user && isMounted) {
              const adminRole = await verifySupabaseAdminProfile(data.session.user.id);
              if (adminRole && isMounted) {
                const verifiedUser: AdminUser = {
                  id: data.session.user.id,
                  email: data.session.user.email || 'administrator',
                  role: adminRole
                };
                setAdminUser(verifiedUser);
                try {
                  sessionStorage.setItem(ADMIN_SESSION_USER_KEY, JSON.stringify(verifiedUser));
                } catch {}
                await evaluatePersistenceCapabilities();
                return;
              }
              // Clear unprivileged Supabase session
              await supabase.auth.signOut().catch(() => {});
            }
          } catch {
            // Continue to backend token verification
          }
        }

        // 2. Check backend HMAC session token against /api/admin/verify
        let token: string | null = null;
        try {
          token = sessionStorage.getItem(ADMIN_SESSION_TOKEN_KEY);
        } catch {}

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
                try {
                  sessionStorage.setItem(ADMIN_SESSION_USER_KEY, JSON.stringify(data.user));
                } catch {}
                await evaluatePersistenceCapabilities();
                return;
              }
            }
          } catch {
            // Verification failed
          }
        }

        if (isMounted) {
          clearSession();
        }
      } finally {
        if (isMounted) {
          setIsAuthLoading(false);
        }
      }
    }

    verifyExistingSession();

    // Listen to Supabase auth state changes if configured
    if (isSupabaseConfigured && supabase) {
      const {
        data: { subscription }
      } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!isMounted) return;
        if (session?.user) {
          const adminRole = await verifySupabaseAdminProfile(session.user.id);
          if (!isMounted) return;
          if (adminRole) {
            const user: AdminUser = {
              id: session.user.id,
              email: session.user.email || 'administrator',
              role: adminRole
            };
            setAdminUser(user);
            try {
              sessionStorage.setItem(ADMIN_SESSION_USER_KEY, JSON.stringify(user));
            } catch {}
            evaluatePersistenceCapabilities().catch(() => {});
          } else {
            await supabase?.auth.signOut().catch(() => {});
            let hasBackendToken = false;
            try {
              hasBackendToken = Boolean(sessionStorage.getItem(ADMIN_SESSION_TOKEN_KEY));
            } catch {}
            if (!hasBackendToken && isMounted) {
              setAdminUser(null);
            }
          }
        } else {
          let hasBackendToken = false;
          try {
            hasBackendToken = Boolean(sessionStorage.getItem(ADMIN_SESSION_TOKEN_KEY));
          } catch {}
          if (!hasBackendToken && isMounted) {
            setAdminUser(null);
          }
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
  }, [clearSession, evaluatePersistenceCapabilities]);

  const login = async (identifierInput: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    const trimmed = identifierInput.trim();
    if (!trimmed || !pass) {
      return { success: false, error: 'Please enter both username/email and password.' };
    }

    let supabaseDiagnostic: string | null = null;

    // 1. Try Supabase Auth first if configured and user entered an email, requiring admin_profiles verification
    if (isSupabaseConfigured && supabase && trimmed.includes('@')) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmed,
          password: pass
        });
        if (!error && data?.user) {
          const adminRole = await verifySupabaseAdminProfile(data.user.id);
          if (adminRole) {
            const user: AdminUser = {
              id: data.user.id,
              email: data.user.email || trimmed,
              role: adminRole
            };
            setAdminUser(user);
            try {
              sessionStorage.setItem(ADMIN_SESSION_USER_KEY, JSON.stringify(user));
            } catch {}
            await evaluatePersistenceCapabilities();
            return { success: true };
          }
          // Authenticated in Supabase Auth, but NOT listed in admin_profiles
          await supabase.auth.signOut().catch(() => {});
          return {
            success: false,
            error: 'This account does not have NOVALUXE administrator privileges in admin_profiles.'
          };
        } else if (error) {
          supabaseDiagnostic = `Supabase Auth sign-in note: ${error.message}`;
        }
      } catch (err: any) {
        supabaseDiagnostic = err?.message || 'Supabase Auth request failed.';
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

        // Also establish Supabase Auth session for RLS-protected Storage/DB writes
        if (isSupabaseConfigured && supabase && data.supabaseEmail) {
          try {
            const expectedEmail = String(data.supabaseEmail).trim().toLowerCase();
            const { data: sessionData } = await supabase.auth.getSession();
            const existingUser = sessionData.session?.user;
            let reuseExisting = false;

            if (existingUser) {
              const sameEmail = (existingUser.email || '').trim().toLowerCase() === expectedEmail;
              const existingRole = sameEmail ? await verifySupabaseAdminProfile(existingUser.id) : null;
              if (sameEmail && existingRole) {
                reuseExisting = true;
              } else {
                await supabase.auth.signOut().catch(() => {});
              }
            }

            if (!reuseExisting) {
              const { data: signData, error: signErr } = await supabase.auth.signInWithPassword({
                email: expectedEmail,
                password: pass
              });
              if (signErr) {
                supabaseDiagnostic = `Supabase Auth could not sign in as ${expectedEmail} (${signErr.message}).`;
              } else if (signData?.user?.id) {
                const role = await verifySupabaseAdminProfile(signData.user.id);
                if (!role) {
                  supabaseDiagnostic = `Signed into Supabase Auth (${expectedEmail}), but User UUID ${signData.user.id} is missing from public.admin_profiles.`;
                  await supabase.auth.signOut().catch(() => {});
                } else {
                  supabaseDiagnostic = null;
                }
              }
            }
          } catch (err: any) {
            supabaseDiagnostic = err?.message || 'Background Supabase Auth check failed.';
          }
        }

        await evaluatePersistenceCapabilities(supabaseDiagnostic);
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
    clearSession();
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
  };

  const getAuthToken = useCallback(async (): Promise<string | null> => {
    try {
      const token = sessionStorage.getItem(ADMIN_SESSION_TOKEN_KEY);
      if (token) return token;
    } catch {}

    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session?.access_token) {
          return data.session.access_token;
        }
      } catch {}
    }
    return null;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAdmin: Boolean(adminUser),
        isAuthLoading,
        adminUser,
        persistenceStatus,
        recheckPersistenceStatus: () => evaluatePersistenceCapabilities(),
        login,
        logout,
        getAuthToken
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
