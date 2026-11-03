import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { Admin, adminApi, getAdminToken, setAdminToken } from "./adminApi";

interface Value { admin: Admin | null; loading: boolean; login: (email: string, password: string) => Promise<void>; logout: () => void }
const Ctx = createContext<Value | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(getAdminToken()));
  useEffect(() => { if (getAdminToken()) adminApi.me().then(setAdmin).catch(() => setAdmin(null)).finally(() => setLoading(false)); }, []);
  useEffect(() => { const f = () => setAdmin(null); window.addEventListener("yatra-admin-logout", f); return () => window.removeEventListener("yatra-admin-logout", f); }, []);
  const login = useCallback(async (email: string, password: string) => { const r = await adminApi.login(email, password); setAdminToken(r.token); setAdmin(r.admin); }, []);
  const logout = useCallback(() => { setAdminToken(null); setAdmin(null); }, []);
  return <Ctx.Provider value={{ admin, loading, login, logout }}>{children}</Ctx.Provider>;
}
export function useAdmin(): Value {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAdmin must be used inside AdminAuthProvider");
  return c;
}
