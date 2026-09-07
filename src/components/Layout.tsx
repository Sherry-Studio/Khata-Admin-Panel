import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Activity,
  LayoutDashboard,
  LogOut,
  Radio,
  ScrollText,
  Users,
} from "lucide-react";
import { useAuth } from "../state/auth";
import { initials } from "../lib/format";

const NAV = [
  { to: "/", label: "Command Deck", icon: LayoutDashboard, end: true },
  { to: "/users", label: "Operators", icon: Users, end: false },
  { to: "/transactions", label: "Signal Feed", icon: Activity, end: false },
  { to: "/audit", label: "Trace Log", icon: ScrollText, end: false },
  { to: "/broadcast", label: "Broadcast", icon: Radio, end: false },
];

export default function Layout() {
  const { user, logout, impersonating, stopImpersonation } = useAuth();
  const nav = useNavigate();

  return (
    <>
      <div className="aurora" />
      {impersonating && (
        <div className="impersonate-banner">
          ⚠ Impersonating {impersonating.email}
          <button
            className="btn btn-sm"
            style={{ background: "rgba(0,0,0,0.25)", borderColor: "transparent", color: "#10060c" }}
            onClick={stopImpersonation}
          >
            Exit to admin
          </button>
        </div>
      )}
      <div className="shell" style={{ paddingTop: impersonating ? 36 : 0 }}>
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark">K+</div>
            <div>
              <div className="brand-name">KHATA+</div>
              <div className="brand-sub">Command Deck</div>
            </div>
          </div>

          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className="nav-link">
              <Icon size={17} strokeWidth={1.8} />
              {label}
            </NavLink>
          ))}

          <div className="sidebar-foot">
            <div className="row" style={{ marginBottom: 10 }}>
              <div className="avatar">{initials(user?.name || user?.email || "A")}</div>
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                  {user?.name || "Admin"}
                </div>
                <div className="faint" style={{ fontSize: 10.5 }}>{user?.email}</div>
              </div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              style={{ width: "100%", justifyContent: "flex-start" }}
              onClick={async () => {
                await logout();
                nav("/login");
              }}
            >
              <LogOut size={14} /> Disconnect
            </button>
          </div>
        </aside>

        <main className="main">
          <Outlet />
        </main>
      </div>
    </>
  );
}
