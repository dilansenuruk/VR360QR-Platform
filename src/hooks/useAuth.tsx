import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchCurrentProfile, loginWithUsername, logout as logoutService } from '../services/authService';
import type { Profile } from '../types';

interface AuthContextValue {
  profile: Profile | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchCurrentProfile().then((currentProfile) => {
      if (isMounted) {
        setProfile(currentProfile);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  async function login(username: string, password: string) {
    const currentProfile = await loginWithUsername(username, password);
    setProfile(currentProfile);
  }

  async function logout() {
    await logoutService();
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ profile, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
