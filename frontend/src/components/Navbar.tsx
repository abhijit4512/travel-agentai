import { ChevronDown, LayoutDashboard, LogOut, Menu, Moon, Sun, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../services/auth";

const links = [{ to: "/explore", label: "Explore" }, { to: "/states", label: "States" }, { to: "/collections", label: "Collections" }, { to: "/map", label: "Map" }, { to: "/plan", label: "Plan a trip" }, { to: "/chat", label: "AI planner" }];
const travel = [{ to: "/cars", label: "Car rentals and fuel" }, { to: "/hotels", label: "Hotels" }, { to: "/bus", label: "Bus" }, { to: "/train", label: "Train" }, { to: "/flights", label: "Flights" }];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === "dark");
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const overHero = pathname === "/";

  useEffect(() => { const f = () => setScrolled(window.scrollY > 24); f(); window.addEventListener("scroll", f, { passive: true }); return () => window.removeEventListener("scroll", f); }, []);
  useEffect(() => { setOpen(false); setMenu(false); }, [pathname]);
  function toggleTheme() {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("yatra_theme", next); } catch { /* storage blocked */ }
    setDark(!dark);
  }
  return (
    <header className={`nav ${overHero ? "over-hero" : ""} ${scrolled ? "scrolled" : ""}`} aria-label="YatraAI site navigation">
      <div className="container nav-inner">
        <Link to="/" className="brand" aria-label="Yatra AI home">Yatra<span>AI</span></Link>
        <nav id="nav-links" className={`nav-links ${open ? "open" : ""}`} aria-label="Main">
          {links.map((l) => <NavLink key={l.to} to={l.to}>{l.label}</NavLink>)}
          <div className="nav-drop">
            <button className="nav-btn" aria-expanded={menu} aria-haspopup="true" onClick={() => setMenu(!menu)}>Book and travel <ChevronDown size={14} /></button>
            <div className={`nav-drop-panel ${menu ? "open" : ""}`}>{travel.map((l) => <NavLink key={l.to} to={l.to}>{l.label}</NavLink>)}</div>
          </div>
          {user && <NavLink to="/memories">Memories</NavLink>}
          {user ? (
            <>
              <NavLink to="/my"><LayoutDashboard size={16} /> My travel</NavLink>
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
