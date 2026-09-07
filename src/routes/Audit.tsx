import { useInfiniteQuery } from "@tanstack/react-query";
import {
  Ban,
  CheckCircle2,
  KeyRound,
  Radio,
  RefreshCw,
  Trash2,
  UserCog,
  UserPlus,
  Wand2,
} from "lucide-react";
import { adminFetch, qs } from "../api/client";
import { dateTime, timeAgo } from "../lib/format";
import { Badge, Card, Loading, Spinner } from "../components/ui";
import PageHeader from "../components/PageHeader";

interface Row {
  id: string;
  actorId: string;
  actorEmail: string;
  action: string;
  targetId: string;
  meta: Record<string, unknown>;
  createdAt: string;
}
interface Page {
  items: Row[];
  nextCursor: string | null;
}

const META: Record<string, { icon: any; kind: "ok" | "warn" | "danger" | "info" | "violet" | "dim"; label: string }> = {
  "user.create": { icon: UserPlus, kind: "ok", label: "Created" },
  "user.update": { icon: UserCog, kind: "info", label: "Updated" },
  "user.disable": { icon: Ban, kind: "danger", label: "Disabled" },
  "user.enable": { icon: CheckCircle2, kind: "ok", label: "Enabled" },
  "user.reset_password": { icon: KeyRound, kind: "warn", label: "Password reset" },
  "user.impersonate": { icon: Wand2, kind: "violet", label: "Impersonated" },
  "user.delete": { icon: Trash2, kind: "danger", label: "Deleted" },
  "user.reseed": { icon: RefreshCw, kind: "warn", label: "Reseeded" },
  "notification.broadcast": { icon: Radio, kind: "violet", label: "Broadcast" },
};

export default function Audit() {
  const q = useInfiniteQuery<Page>({
    queryKey: ["audit"],
    queryFn: ({ pageParam }) => adminFetch(`/audit${qs({ limit: 50, cursor: pageParam })}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const rows = q.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <PageHeader title="Trace Log" sub="Every mutating admin action, newest first" />
      <Card pad={false}>
        {q.isLoading ? (
          <Loading />
        ) : rows.length === 0 ? (
          <div className="card-pad muted">No activity yet.</div>
        ) : (
          <div style={{ padding: "6px 0" }}>
            {rows.map((r) => {
              const m = META[r.action] ?? { icon: UserCog, kind: "dim" as const, label: r.action };
              const Icon = m.icon;
              return (
                <div
                  key={r.id}
                  className="row"
                  style={{ padding: "13px 20px", borderBottom: "1px solid rgba(120,160,255,0.06)", gap: 14 }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      display: "grid",
                      placeItems: "center",
                      background: "rgba(120,160,255,0.07)",
                      border: "1px solid var(--stroke)",
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={15} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="row" style={{ gap: 8 }}>
                      <Badge kind={m.kind}>{m.label}</Badge>
                      <span className="mono" style={{ fontSize: 12 }}>{r.actorEmail}</span>
                    </div>
                    <div className="faint" style={{ fontSize: 11.5, marginTop: 4 }}>
                      target <span className="mono">{r.targetId || "—"}</span>
                      {r.meta && Object.keys(r.meta).length > 0 && (
                        <> · {JSON.stringify(r.meta)}</>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 12 }}>{timeAgo(r.createdAt)}</div>
                    <div className="faint" style={{ fontSize: 10.5 }}>{dateTime(r.createdAt)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {q.hasNextPage && (
          <div className="card-pad" style={{ textAlign: "center" }}>
            <button className="btn btn-sm" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>
              {q.isFetchingNextPage ? <Spinner /> : "Load more"}
            </button>
          </div>
        )}
      </Card>
    </>
  );
}
