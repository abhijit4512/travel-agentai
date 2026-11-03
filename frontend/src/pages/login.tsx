import { FormEvent, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ErrorBox } from "../components/ui";
import { useAuth } from "../services/auth";

export default function Login() {
  const { user, login, register } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const from =
    (location.state as { from?: string } | null | undefined)?.from ?? "/saved";

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={from} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;

    setError("");
    setBusy(true);

    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      nav(from, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const isLogin = mode === "login";

  return (
    <div className="auth-page">
      <section className="auth-shell" aria-label="YatraAI account access">
        {/* Image-led brand panel */}
        <aside className="auth-visual">
          <div className="auth-visual-photo" aria-hidden="true" />

          <div className="auth-brand-row">
            <Link to="/" className="auth-brand" aria-label="YatraAI home">
              Yatra<span>AI</span>
            </Link>
            <span className="auth-brand-caption">TRAVEL, REIMAGINED</span>
          </div>

          <div className="auth-visual-copy">
            <span className="auth-kicker">
              <span aria-hidden="true">✦</span> YOUR JOURNEY STARTS HERE
            </span>

            <h1>
              Explore. Plan.
              <br />
              <em>Travel beyond.</em>
            </h1>

            <p>
              Find your next unforgettable experience. Let YatraAI help you
              discover the places, stories and hidden gems of incredible India.
            </p>

            <div className="auth-benefits">
              <span><i aria-hidden="true">✧</i> AI-powered itineraries</span>
              <span><i aria-hidden="true">₹</i> Smart budget planning</span>
              <span><i aria-hidden="true">⌖</i> Explore across India</span>
            </div>
          </div>

          <div className="auth-visual-bottom">
            <span>Made for the journeys that stay with you.</span>
            <Link to="/">← Back to explore</Link>
          </div>
        </aside>

        {/* Login and registration panel */}
        <div className="auth-panel">
          <div className="auth-mobile-brand">
            <Link to="/" className="auth-brand">
              Yatra<span>AI</span>
            </Link>
            <span>YOUR INDIA, YOUR WAY</span>
          </div>

          <div className="auth-form-wrap">
            <div className="auth-form-heading">
              <span className="auth-form-kicker">WELCOME TO YATRAAI</span>
              <h2>{isLogin ? "Welcome back" : "Create your account"}</h2>
              <p>
                {isLogin
                  ? "Log in to pick up where your next adventure begins."
                  : "Create an account to save your trips and plan your next adventure."}
              </p>
            </div>

            <div className="auth-tabs" role="tablist" aria-label="Login or register">
              <button
                type="button"
                role="tab"
                aria-selected={isLogin}
                className={isLogin ? "active" : ""}
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
              >
                Log in
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={!isLogin}
                className={!isLogin ? "active" : ""}
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
              >
                Create account
              </button>
            </div>

            <form className="auth-form" onSubmit={submit}>
              {!isLogin && (
                <label className="auth-field">
                  <span>Your name</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={60}
                    autoComplete="name"
                    placeholder="Enter your full name"
                  />
                </label>
              )}

              <label className="auth-field">
                <span>Email address</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={254}
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </label>

              <label className="auth-field">
                <span>Password</span>
                <span className="auth-password-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={isLogin ? 1 : 8}
                    maxLength={128}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    placeholder={isLogin ? "Enter your password" : "At least 8 characters"}
                  />
                  <button
                    className="auth-password-toggle"
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </span>
              </label>

              {!isLogin && (
                <p className="auth-hint">Use at least 8 characters for your password.</p>
              )}

              {error && <ErrorBox message={error} />}

              <button className="auth-submit" type="submit" disabled={busy}>
                {busy
                  ? "Please wait..."
                  : isLogin
                    ? "Log in to YatraAI"
                    : "Create my account"}
                {!busy && <span aria-hidden="true">→</span>}
              </button>
            </form>

            <p className="auth-security-note">
              <span aria-hidden="true">♧</span>
              Your account details are handled securely.
            </p>
          </div>

          <div className="auth-panel-footer">
            <span>© {new Date().getFullYear()} YatraAI</span>
            <span>Discover more. Worry less.</span>
          </div>
        </div>
      </section>
    </div>
  );
}
