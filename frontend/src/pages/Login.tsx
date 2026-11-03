import { Eye, EyeOff } from "lucide-react";
import { FormEvent, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import DestinationImage from "../components/DestinationImage";
import { ErrorBox } from "../components/ui";
import { useSeo } from "../hooks/useSeo";
import { useAuth } from "../services/auth";

export default function Login() {
  useSeo({ title: "Log in" });
  const { user, login, register } = useAuth();
  const nav = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? "/dashboard";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState(""), [email, setEmail] = useState(""), [password, setPassword] = useState("");
  const [show, setShow] = useState(false), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [fieldErr, setFieldErr] = useState<Record<string, string>>({});

  if (user) return <Navigate to={from} replace />;
  const isLogin = mode === "login";

  async function submit(e: FormEvent) {
    e.preventDefault();
    const fe: Record<string, string> = {};
    if (!isLogin && !name.trim()) fe.name = "Enter your name.";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fe.email = "Enter a valid email address.";
    if (!isLogin && password.length < 8) fe.password = "Use at least 8 characters.";
    if (isLogin && !password) fe.password = "Enter your password.";
    setFieldErr(fe); setError("");
    if (Object.keys(fe).length) return;
    setBusy(true);
    try { isLogin ? await login(email, password) : await register(name, email, password); nav(from, { replace: true }); }
    catch (err) { setError((err as Error).message); }
    finally { setBusy(false); }
  }
  return (
    <div className="authwrap">
      <aside className="authside" aria-hidden="true">
        <DestinationImage id="munnar" name="Munnar" eager className="fill" />
        <div><h2>Save every trip. Pick up where you left off.</h2><p style={{ color: "#dcebe4" }}>Your itineraries, wishlist and preferences, in one place.</p></div>
      </aside>
      <div className="authform">
        <div style={{ width: "min(420px, 100%)" }}>
          <h1>{isLogin ? "Welcome back" : "Create your account"}</h1>
          <p className="muted">You can still explore and plan without an account. Log in to keep trips on your account.</p>
          <div className="tabs" role="tablist" aria-label="Log in or create account" style={{ marginBottom: "1rem" }}>
            <button role="tab" aria-selected={isLogin} className={isLogin ? "on" : ""} onClick={() => { setMode("login"); setError(""); setFieldErr({}); }}>Log in</button>
            <button role="tab" aria-selected={!isLogin} className={!isLogin ? "on" : ""} onClick={() => { setMode("register"); setError(""); setFieldErr({}); }}>Create account</button>
          </div>
          <form onSubmit={submit} noValidate>
            {!isLogin && <label>Your name<input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" aria-invalid={!!fieldErr.name} />{fieldErr.name && <span className="err">{fieldErr.name}</span>}</label>}
            <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} autoComplete="email" aria-invalid={!!fieldErr.email} />{fieldErr.email && <span className="err">{fieldErr.email}</span>}</label>
            <label>Password
              <span className="pw"><input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} maxLength={128} autoComplete={isLogin ? "current-password" : "new-password"} aria-invalid={!!fieldErr.password} />
                <button type="button" className="icon-btn" style={{ width: 36, height: 36, border: 0 }} onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"} aria-pressed={show}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></span>
              {fieldErr.password && <span className="err">{fieldErr.password}</span>}</label>
            {error && <ErrorBox message={error} />}
            <button className="btn primary" type="submit" disabled={busy} style={{ marginTop: ".5rem" }}>{busy ? "Please wait..." : isLogin ? "Log in" : "Create account"}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
