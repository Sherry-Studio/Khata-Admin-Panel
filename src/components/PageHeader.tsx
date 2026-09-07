import type { ReactNode } from "react";
import { useAuth } from "../state/auth";
import { initials } from "../lib/format";

export default function PageHeader({
  title,
  sub,
  actions,
}: {
  title: string;
  sub?: string;
  actions?: ReactNode;
}) {
  const { user } = useAuth();
  return (
    <div className="topbar">
      <div>
        <div className="page-title">{title}</div>
        {sub && <div className="page-sub">{sub}</div>}
      </div>
      <div className="row">
        {actions}
        <div className="user-chip">
          <div className="avatar">{initials(user?.name || user?.email || "A")}</div>
          <span className="muted">{user?.email}</span>
        </div>
      </div>
    </div>
  );
}
