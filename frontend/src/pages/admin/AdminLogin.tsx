import { ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useSeo } from "../../hooks/useSeo";
import { useAdmin } from "../../services/adminAuth";

export default function AdminLogin() {
  useSeo({ title: "Admin sign in" });
  const { admin, login } = useAdmin();
  const nav = useNavigate();
  const [email, setEmail] = useState(""), [password, setPassword] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  if (admin) return <Navigate to="/admin" replace />;
  async function submit(e: FormEvent) {
    e.preventDefault(); setError(""); setBusy(true);
    try { await login(email, password); nav("/admin", { replace: true }); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return (
    <div className="admin-login">
      <form className="card stack" onSubmit={submit}>
        <p className="eyebrow"><ShieldCheck size={14} style={{ verticalAlign: "-2px" }} /> Restricted area</p>
        <h1 style={{ fontSize: "1.6rem" }}>Admin sign in</h1>
        <p className="muted small">For authorised administrators only. Customer accounts cannot sign in here. Access is logged.</p>
        <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required /></label>
        <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
        {error && <p className="notice error" role="alert">{error}</p>}
        <button className="btn solid" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
      </form>
    </div>
  );
}
