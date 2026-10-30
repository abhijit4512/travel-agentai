import { LayoutDashboard, LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../services/auth";

const links = [
  { to: "/explore", label: "Explore" }, { to: "/states", label: "States" }, { to: "/collections", label: "Collections" },
  { to: "/map", label: "Map" }, { to: "/plan", label: "Plan a trip" }, { to: "/chat", label: "AI planner" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === "dark");
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const overHero = pathname === "/";

  useEffect(() => { const f = () => setScrolled(window.scrollY > 24); f(); window.addEventListener("scroll", f, { passive: true }); return () => window.removeEventListener("scroll", f); }, []);
  useEffect(() => setOpen(false), [pathname]);

  function toggleTheme() {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("yatra_theme", next); } catch { /* storage blocked */ }
    setDark(!dark);
  }
  return (
    <header className={`nav ${overHero ? "over-hero" : ""} ${scrolled ? "scrolled" : ""}`}>
      <div className="container nav-inner">
        <Link to="/" className="brand" aria-label="Yatra AI home">Yatra<span>AI</span></Link>
        <nav id="nav-links" className={`nav-links ${open ? "open" : ""}`} aria-label="Main">
          {links.map((l) => <NavLink key={l.to} to={l.to}>{l.label}</NavLink>)}
          {user ? (
            <>
              <NavLink to="/dashboard"><LayoutDashboard size={16} /> Hi, {user.name.split(" ")[0]}</NavLink>
              <button className="nav-btn" onClick={logout}><LogOut size={16} /> Log out</button>
            </>
          ) : <NavLink to="/login">Log in</NavLink>}
        </nav>
        <button className="icon-btn" onClick={toggleTheme} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
        <button className="icon-btn nav-toggle" aria-expanded={open} aria-controls="nav-links" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen(!open)}>{open ? <X size={20} /> : <Menu size={20} />}</button>
      </div>
    </header>
  );
}
