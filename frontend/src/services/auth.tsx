import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import type { User } from "../types";
import { api, getToken, setToken } from "./api";

interface AuthValue {
  user: User | null; loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(getToken()));

  useEffect(() => {      // On page load, check whether a saved token is still valid.
    if (!getToken()) return;
    api.me().then(setUser).catch(() => setUser(null)).finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener("yatra-logout", onLogout);
    return () => window.removeEventListener("yatra-logout", onLogout);
  }, []);

  const login = useCallback(async (email: string, password: string) => { const r = await api.login(email, password); setToken(r.token); setUser(r.user); }, []);
  const register = useCallback(async (name: string, email: string, password: string) => { const r = await api.register(name, email, password); setToken(r.token); setUser(r.user); }, []);
  const logout = useCallback(() => { setToken(null); setUser(null); }, []);
  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
