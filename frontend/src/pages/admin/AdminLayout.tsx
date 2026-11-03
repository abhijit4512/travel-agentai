import { BarChart3, Bell, FileText, LayoutDashboard, LogOut, Map as MapIcon, Search, Settings, ShieldCheck, Ticket, Users, Car, Images} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Skeleton } from "../../components/ui";
import { Row, adminApi } from "../../services/adminApi";
import { useAdmin } from "../../services/adminAuth";

const NAV = [
  ["/admin", "Overview", LayoutDashboard, true], ["/admin/users", "Users", Users, false], ["/admin/trips", "Trip monitoring", MapIcon, false],
  ["/admin/bookings", "Bookings", Ticket, false], ["/admin/catalog", "Cars and integrations", Car, false], ["/admin/analytics", "Analytics", BarChart3, false], ["/admin/notifications", "Notifications", Bell, false],
  ["/admin/reports", "Reports", FileText, false], ["/admin/audit", "Audit log", ShieldCheck, false], ["/admin/settings", "Settings", Settings, false],["/admin/images", "Image Manager", Images, false],
] as const;

export default function AdminLayout() {
  const { admin, loading, logout } = useAdmin();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [unread, setUnread] = useState(0);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Record<string, Row[]>>({});
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {          // near-real-time: check for new notifications every 30 seconds
    if (!admin) return;
    const load = () => adminApi.notifications(true).then((r) => setUnread(r.unread)).catch(() => {});
    load(); const t = window.setInterval(load, 30000);
    return () => window.clearInterval(t);
  }, [admin, pathname]);
  useEffect(() => {
    if (q.trim().length < 2) { setResults({}); return; }
    const t = setTimeout(() => adminApi.search(q.trim()).then((r) => setResults(r.results)).catch(() => setResults({})), 250);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => { const f = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setResults({}); }; document.addEventListener("mousedown", f); return () => document.removeEventListener("mousedown", f); }, []);

  if (loading) return <div className="admin-main"><Skeleton height={200} /></div>;
  if (!admin) return <Navigate to="/admin/login" replace />;

  const go = (to: string) => { setQ(""); setResults({}); nav(to); };
  const link = (group: string, r: Row): [string, string] =>
    group === "users" ? [`/admin/users/${r.id}`, `${r.name} · ${r.email}`] : group === "trips" ? [`/admin/trips/${r.id}`, `${r.title}`] :
    group === "bookings" ? [`/admin/bookings?q=${encodeURIComponent(r.reference)}`, `${r.reference} · ${r.title}`] :
    group === "destinations" ? [`/admin/trips?q=${encodeURIComponent(r.name)}`, `${r.name}, ${r.state}`] : [`/admin/bookings?q=${encodeURIComponent(r.name)}`, r.name];
  const groups = Object.entries(results).filter(([, v]) => v.length);

  return (
    <div className="admin-shell">
      <aside className="admin-side no-print" aria-label="Admin navigation">
        <Link to="/admin" className="admin-brand">Yatra<span>AI</span> <small>Admin</small></Link>
        <nav>{NAV.map(([to, label, Icon, end]) => <NavLink key={to} to={to} end={end}><Icon size={17} /> {label}{to === "/admin/notifications" && unread > 0 && <em className="badge-n">{unread}</em>}</NavLink>)}</nav>
        <button className="side-out" onClick={() => { logout(); nav("/admin/login"); }}><LogOut size={16} /> Sign out</button>
      </aside>
      <div className="admin-body">
        <header className="admin-top no-print">
          <div className="admin-search" ref={box} role="search">
            <Search size={16} /><label className="sr" htmlFor="gs">Search users, trips, bookings, destinations</label>
            <input id="gs" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search users, trips, bookings, hotels, cars, destinations" />
            {groups.length > 0 && <div className="search-pop">{groups.map(([g, rows]) => (<div key={g}><b>{g}</b>{rows.map((r) => { const [to, text] = link(g, r); return <button key={g + r.id} onClick={() => go(to)}>{text}</button>; })}</div>))}</div>}
          </div>
          <Link to="/admin/notifications" className="icon-btn" aria-label={`Notifications, ${unread} unread`}><Bell size={18} />{unread > 0 && <em className="badge-n dot">{unread}</em>}</Link>
          <span className="small muted">{admin.name}</span>
        </header>
        <main className="admin-main" id="admin-main"><Outlet /></main>
      </div>
    </div>
  );
}
