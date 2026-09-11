import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, Business, UserRole } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: UserProfile | null;
  business: Business | null;
  role: UserRole;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (businessName: string, name: string, email: string, password: string, mobile?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (newRole: UserRole) => void;
  refreshMe: () => Promise<void>;
  completeOnboarding: (data: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [role, setRole] = useState<UserRole>('OWNER');
  const [loading, setLoading] = useState(true);

  const loadProfile = async (token?: string, forcedRole?: UserRole) => {
    try {
      if (token) {
        api.setAuth(token, forcedRole || null);
      }
      const res = await api.getMe();
      if (res.success && res.data) {
        const resolvedRole = forcedRole || (res.data.user.role as UserRole) || 'OWNER';
        setUser({
          ...res.data.user,
          role: resolvedRole,
        });
        setBusiness(res.data.business);
        setRole(resolvedRole);
        api.setAuth(token || api.getToken(), resolvedRole);
      } else {
        setUser(null);
        setBusiness(null);
        api.setAuth(null, null);
      }
    } catch (err) {
      console.warn('Could not load user profile:', err);
      setUser(null);
      setBusiness(null);
      api.setAuth(null, null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const existingToken = api.getToken();
    if (existingToken) {
      loadProfile(existingToken);
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    setLoading(true);
    try {
      const res = await api.login(email.trim(), password);
      if (res.success && res.data?.token) {
        api.setAuth(res.data.token, res.data.user.role);
        setUser(res.data.user);
        setBusiness(res.data.business);
        setRole(res.data.user.role as UserRole);
      } else {
        throw new Error('Login failed to return session.');
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    businessName: string,
    name: string,
    email: string,
    password: string,
    mobile?: string
  ): Promise<void> => {
    setLoading(true);
    try {
      const res = await api.register({
        businessName,
        name,
        email: email.trim(),
        password,
        mobile,
      });
      if (res.success && res.data?.token) {
        api.setAuth(res.data.token, 'OWNER');
        setUser(res.data.user);
        setBusiness(res.data.business);
        setRole('OWNER');
      } else {
        throw new Error('Registration failed to return session.');
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    api.setAuth(null, null);
    setUser(null);
    setBusiness(null);
  };

  const switchRole = (newRole: UserRole) => {
    setRole(newRole);
    if (user) {
      setUser({ ...user, role: newRole });
    }
    const token = api.getToken();
    if (token) {
      api.setAuth(token, newRole);
    }
  };

  const refreshMe = async () => {
    const token = api.getToken();
    if (token) {
      await loadProfile(token, role);
    }
  };

  const completeOnboarding = async (data: any) => {
    const res = await api.completeOnboarding(data);
    if (res.success && res.data) {
      setBusiness(res.data);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        business,
        role,
        loading,
        login,
        register,
        logout,
        switchRole,
        refreshMe,
        completeOnboarding,
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
