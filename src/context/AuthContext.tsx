import React, { createContext, useContext, useState, useEffect } from 'react';
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
  demoLogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_SESSION_KEY = 'novaluxe_admin_session_v1';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => {
    try {
      const saved = sessionStorage.getItem(ADMIN_SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (adminUser) {
      sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(adminUser));
    } else {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    }
  }, [adminUser]);

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    // 1. Try Supabase Auth if configured
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: pass
        });
        if (error) {
          return { success: false, error: error.message };
        }
        if (data.user) {
          const user: AdminUser = {
            id: data.user.id,
            email: data.user.email || email,
            role: 'admin'
          };
          setAdminUser(user);
          return { success: true };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Authentication error' };
      }
    }

    // 2. Official Administrative Portal Credentials for NOVALUXE
    // Email: sennelgroup@gmail.com
    // Password: Sennel3.9$*
    const validEmails = ['sennelgroup@gmail.com', 'admin@novaluxe.lr', 'admin'];
    const validPasswords = ['Sennel3.9$*', 'Novaluxe2026!'];

    if (
      (validEmails.includes(email.toLowerCase().trim()) || email.trim() === 'admin') &&
      validPasswords.includes(pass)
    ) {
      const user: AdminUser = {
        id: 'usr-admin-sennel',
        email: email.includes('@') ? email : 'sennelgroup@gmail.com',
        role: 'super_admin'
      };
      setAdminUser(user);
      return { success: true };
    }

    return { success: false, error: 'Invalid administrative email or password.' };
  };

  const demoLogin = () => {
    const user: AdminUser = {
      id: 'usr-admin-sennel',
      email: 'sennelgroup@gmail.com',
      role: 'super_admin'
    };
    setAdminUser(user);
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch {}
    }
    setAdminUser(null);
    sessionStorage.removeItem(ADMIN_SESSION_KEY);
  };

  return (
    <AuthContext.Provider
      value={{
        isAdmin: Boolean(adminUser),
        adminUser,
        login,
        logout,
        demoLogin
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
