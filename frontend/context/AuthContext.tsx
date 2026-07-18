"use client";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, setAuthToken, AuthUser, AuthCompany } from "@/lib/api";

interface AuthState {
  user: AuthUser | null;
  company: AuthCompany | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string; password: string; company_name: string;
    company_type: string; industry: string; description?: string;
    avatar_color?: string; website?: string;
  }) => Promise<void>;
  tryDemo: () => Promise<void>;
  logout: () => void;
  refreshCompany: () => Promise<void>;
  setCompany: (c: AuthCompany) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [company, setCompany] = useState<AuthCompany | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("negotiai_token");
    if (!token) { setIsLoading(false); return; }
    setAuthToken(token);
    api.auth.me()
      .then(data => { setUser(data.user); setCompany(data.company); })
      .catch(() => { localStorage.removeItem("negotiai_token"); setAuthToken(null); })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.auth.login({ email, password });
    localStorage.setItem("negotiai_token", data.access_token);
    setAuthToken(data.access_token);
    setUser(data.user);
    setCompany(data.company);
  }, []);

  const register = useCallback(async (formData: Parameters<AuthState["register"]>[0]) => {
    const data = await api.auth.register(formData);
    localStorage.setItem("negotiai_token", data.access_token);
    setAuthToken(data.access_token);
    setUser(data.user);
    setCompany(data.company);
  }, []);

  const tryDemo = useCallback(async () => {
    const data = await api.auth.demo();
    localStorage.setItem("negotiai_token", data.access_token);
    setAuthToken(data.access_token);
    setUser(data.user);
    setCompany(data.company);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("negotiai_token");
    setAuthToken(null);
    setUser(null);
    setCompany(null);
  }, []);

  const refreshCompany = useCallback(async () => {
    const data = await api.auth.me();
    setCompany(data.company);
  }, []);

  return (
    <AuthContext.Provider value={{ user, company, isLoading, login, register, tryDemo, logout, refreshCompany, setCompany }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
