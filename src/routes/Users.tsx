import { useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Ban, Check, Search, ShieldCheck, UserPlus } from "lucide-react";
import { AdminUser, adminFetch, qs } from "../api/client";
import { dateShort, initials } from "../lib/format";
import { Badge, Card, Loading, Modal, Spinner, useToast } from "../components/ui";
import PageHeader from "../components/PageHeader";

interface Page {
  items: AdminUser[];
  nextCursor: string | null;
}

export default function UsersList() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { show, node } = useToast();

  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [disabled, setDisabled] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const filters = { q, role, disabled };

  const query = useInfiniteQuery<Page>({
    queryKey: ["users", filters],
    queryFn: ({ pageParam }) =>
      adminFetch(`/users${qs({ ...filters, limit: 25, cursor: pageParam })}`),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

  const toggle = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "disable" | "enable" }) =>
      adminFetch(`/users/${id}/${action}`, { method: "POST" }),
    onSuccess: (_d, v) => {
      show(v.action === "disable" ? "Operator disabled" : "Operator re-enabled");
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (e: Error) => show(e.message, "err"),
  });

  const rows = query.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <PageHeader
        title="Operators"
        sub="Search, inspect, and gate access to every beta account"
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setCreateOpen(true)}>
            <UserPlus size={14} /> New
          </button>
        }
      />

      <Card className="stack" style={{ marginBottom: 16 }}>
        <div className="wrap-gap">
          <div className="row" style={{ flex: 1, minWidth: 240, position: "relative" }}>
            <Search size={15} style={{ position: "absolute", left: 12, color: "var(--text-faint)" }} />
            <input
              className="input"
              style={{ paddingLeft: 34 }}
              placeholder="Search name or email…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select className="select" style={{ width: 150 }} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">All roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <select className="select" style={{ width: 160 }} value={disabled} onChange={(e) => setDisabled(e.target.value)}>
            <option value="">Any status</option>
            <option value="false">Active</option>
            <option value="true">Disabled</option>
          </select>
        </div>
      </Card>

      <Card pad={false}>
        {query.isLoading ? (
          <Loading />
        ) : query.error ? (
          <div className="card-pad err">Failed to load operators.</div>
        ) : rows.length === 0 ? (
          <div className="card-pad muted">No operators match those filters.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Operator</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Joined</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} onClick={() => nav(`/users/${u.id}`)}>
                    <td>
                      <div className="row">
                        <div className="avatar" style={{ width: 30, height: 30 }}>
                          {initials(u.name || u.email)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{u.name || "—"}</div>
                          <div className="mono">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {u.role === "admin" ? (
                        <Badge kind="violet"><ShieldCheck size={11} /> Admin</Badge>
                      ) : (
                        <Badge kind="dim">User</Badge>
                      )}
                    </td>
                    <td>
                      {u.disabled ? (
                        <Badge kind="danger">Disabled</Badge>
                      ) : u.verified ? (
                        <Badge kind="ok">Verified</Badge>
                      ) : (
                        <Badge kind="warn">Unverified</Badge>
                      )}
                    </td>
                    <td className="muted">{dateShort(u.createdAt)}</td>
                    <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                      {u.disabled ? (
                        <button
                          className="btn btn-sm btn-cyan"
                          disabled={toggle.isPending}
                          onClick={() => toggle.mutate({ id: u.id, action: "enable" })}
                        >
                          <Check size={13} /> Enable
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm btn-danger"
                          disabled={toggle.isPending}
                          onClick={() => toggle.mutate({ id: u.id, action: "disable" })}
                        >
                          <Ban size={13} /> Disable
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {query.hasNextPage && (
          <div className="card-pad" style={{ textAlign: "center" }}>
            <button
              className="btn btn-sm"
              onClick={() => query.fetchNextPage()}
              disabled={query.isFetchingNextPage}
            >
              {query.isFetchingNextPage ? <Spinner /> : "Load more"}
            </button>
          </div>
        )}
      </Card>

      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onDone={(id) => {
          setCreateOpen(false);
          show("Operator created");
          qc.invalidateQueries({ queryKey: ["users"] });
          nav(`/users/${id}`);
        }}
      />
      {node}
    </>
  );
}

function CreateUserModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: (id: string) => void;
}) {
  const [form, setForm] = useState({ email: "", password: "", name: "", role: "user", seed: false });
  const [err, setErr] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      adminFetch("/users", {
        method: "POST",
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
          name: form.name || undefined,
          role: form.role,
          seed: form.seed,
        }),
      }),
    onSuccess: (u: AdminUser) => onDone(u.id),
    onError: (e: Error) =>
      setErr(e.message === "email_taken" ? "That email is already registered." : e.message),
  });

  return (
    <Modal open={open} onClose={onClose} title="New operator">
      <div className="stack" style={{ gap: 12 }}>
        <div className="field">
          <label>Email</label>
          <input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="field">
          <label>Password (≥ 8 chars)</label>
          <input className="input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </div>
        <div className="field">
          <label>Name (optional)</label>
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="wrap-gap">
          <div className="field" style={{ flex: 1 }}>
            <label>Role</label>
            <select className="select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <label className="row" style={{ fontSize: 12.5, alignSelf: "flex-end", paddingBottom: 10 }}>
            <input type="checkbox" checked={form.seed} onChange={(e) => setForm({ ...form, seed: e.target.checked })} />
            Seed demo data
          </label>
        </div>
        {err && <div className="err">{err}</div>}
        <div className="wrap-gap" style={{ justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            disabled={form.password.length < 8 || !form.email || create.isPending}
            onClick={() => {
              setErr(null);
              create.mutate();
            }}
          >
            {create.isPending ? <Spinner /> : "Create"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
