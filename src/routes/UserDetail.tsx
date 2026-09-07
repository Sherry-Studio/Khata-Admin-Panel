import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  BadgeCheck,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserCog,
  Wand2,
} from "lucide-react";
import { AdminUser, adminFetch } from "../api/client";
import { dateShort, initials, num, pkr } from "../lib/format";
import {
  Badge,
  Card,
  ConfirmDanger,
  Loading,
  Modal,
  Spinner,
  useToast,
} from "../components/ui";
import PageHeader from "../components/PageHeader";
import { useAuth } from "../state/auth";

interface UserFull extends AdminUser {
  language?: string;
  appearance?: string;
  aggregates?: {
    balance: number;
    incomeThisMonth: number;
    expenseThisMonth: number;
    savedThisMonth: number;
    transactionCount: number;
  };
  counts?: { transactions: number; udhaar: number; goals: number; accounts: number };
}

export default function UserDetail() {
  const { id = "" } = useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { show, node } = useToast();
  const { user: me, startImpersonation } = useAuth();

  const [editOpen, setEditOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [confirm, setConfirm] = useState<null | "disable" | "reseed" | "delete">(null);
  const [impersonateResult, setImpersonateResult] = useState<null | {
    accessToken: string;
    refreshToken: string;
    user: AdminUser;
  }>(null);

  const { data: u, isLoading, error } = useQuery<UserFull>({
    queryKey: ["user", id],
    queryFn: () => adminFetch(`/users/${id}`),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["user", id] });
    qc.invalidateQueries({ queryKey: ["users"] });
  };

  const act = useMutation({
    mutationFn: ({ path, method = "POST", body }: { path: string; method?: string; body?: unknown }) =>
      adminFetch(`/users/${id}${path}`, {
        method,
        body: body ? JSON.stringify(body) : undefined,
      }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => show(e.message, "err"),
  });

  const patch = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      adminFetch(`/users/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      invalidate();
      show("Profile updated");
    },
    onError: (e: Error) => show(e.message, "err"),
  });

  if (isLoading) return <Loading label="pulling operator record" />;
  if (error || !u)
    return (
      <>
        <PageHeader title="Operator" />
        <Card><span className="err">Operator not found.</span></Card>
      </>
    );

  const isSelf = me?.id === u.id;
  const ag = u.aggregates;

  return (
    <>
      <PageHeader
        title={u.name || u.email}
        sub={u.email}
        actions={
          <button className="btn btn-ghost btn-sm" onClick={() => nav("/users")}>
            <ArrowLeft size={14} /> Back
          </button>
        }
      />

      <div className="grid" style={{ gridTemplateColumns: "1fr 1.4fr" }}>
        {/* Identity */}
        <Card glow className="stack">
          <div className="row">
            <div className="avatar" style={{ width: 52, height: 52, fontSize: 18 }}>
              {initials(u.name || u.email)}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{u.name || "Unnamed"}</div>
              <div className="mono">{u.email}</div>
            </div>
          </div>

          <div className="wrap-gap">
            {u.role === "admin" ? <Badge kind="violet"><ShieldCheck size={11} /> Admin</Badge> : <Badge kind="dim">User</Badge>}
            {u.disabled ? <Badge kind="danger">Disabled</Badge> : <Badge kind="ok">Active</Badge>}
            {u.verified ? <Badge kind="info"><BadgeCheck size={11} /> Verified</Badge> : <Badge kind="warn">Unverified</Badge>}
          </div>

          <dl className="kv">
            <dt>ID</dt><dd className="mono">{u.id}</dd>
            <dt>Phone</dt><dd>{u.phone || "—"}</dd>
            <dt>Monthly income</dt><dd>{pkr(u.monthlyIncome)}</dd>
            <dt>Language</dt><dd>{u.language ?? "—"}</dd>
            <dt>Appearance</dt><dd>{u.appearance ?? "—"}</dd>
            <dt>Joined</dt><dd>{dateShort(u.createdAt)}</dd>
          </dl>

          <div className="wrap-gap">
            <button className="btn btn-sm" onClick={() => setEditOpen(true)}><UserCog size={13} /> Edit</button>
            <button
              className="btn btn-sm"
              disabled={patch.isPending}
              onClick={() => patch.mutate({ verified: !u.verified })}
            >
              <BadgeCheck size={13} /> {u.verified ? "Unverify" : "Verify"}
            </button>
            <button
              className="btn btn-sm"
              disabled={patch.isPending || isSelf}
              onClick={() => patch.mutate({ role: u.role === "admin" ? "user" : "admin" })}
            >
              <ShieldCheck size={13} /> {u.role === "admin" ? "Revoke admin" : "Make admin"}
            </button>
          </div>
        </Card>

        {/* Aggregates */}
        <div className="stack">
          <Card>
            <div className="section-h">This month</div>
            <div className="grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
              <Mini label="Balance" value={pkr(ag?.balance)} />
              <Mini label="Saved" value={pkr(ag?.savedThisMonth)} />
              <Mini label="Income" value={pkr(ag?.incomeThisMonth)} />
              <Mini label="Expense" value={pkr(ag?.expenseThisMonth)} />
            </div>
          </Card>
          <Card>
            <div className="section-h">Ledger footprint</div>
            <div className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
              <Mini label="Txns" value={num(u.counts?.transactions)} />
              <Mini label="Udhaar" value={num(u.counts?.udhaar)} />
              <Mini label="Goals" value={num(u.counts?.goals)} />
              <Mini label="Accounts" value={num(u.counts?.accounts)} />
            </div>
          </Card>

          <Card className="stack">
            <div className="section-h">Operations</div>
            <div className="wrap-gap">
              <button className="btn btn-sm" onClick={() => setPwOpen(true)}>
                <KeyRound size={13} /> Reset password
              </button>
              <button
                className="btn btn-sm"
                disabled={act.isPending}
                onClick={() =>
                  act.mutate(
                    { path: "/impersonate" },
                    { onSuccess: (r: any) => setImpersonateResult(r) }
                  )
                }
              >
                <Wand2 size={13} /> Impersonate
              </button>
              <button className="btn btn-sm" onClick={() => setConfirm("reseed")}>
                <RefreshCw size={13} /> Reseed demo data
              </button>
              {u.disabled ? (
                <button
                  className="btn btn-sm btn-cyan"
                  disabled={act.isPending}
                  onClick={() =>
                    act.mutate({ path: "/enable" }, { onSuccess: () => show("Operator enabled") })
                  }
                >
                  Enable account
                </button>
              ) : (
                <button className="btn btn-sm btn-danger" disabled={isSelf} onClick={() => setConfirm("disable")}>
                  Disable account
                </button>
              )}
              <button className="btn btn-sm btn-danger" disabled={isSelf} onClick={() => setConfirm("delete")}>
                <Trash2 size={13} /> Delete
              </button>
            </div>
            {isSelf && <div className="faint" style={{ fontSize: 11.5 }}>You cannot disable or delete your own account.</div>}
          </Card>
        </div>
      </div>

      {/* --- Edit modal --- */}
      <EditModal open={editOpen} onClose={() => setEditOpen(false)} user={u} onSave={(b) => { patch.mutate(b); setEditOpen(false); }} />

      {/* --- Reset password modal --- */}
      <ResetPwModal
        open={pwOpen}
        onClose={() => setPwOpen(false)}
        onSubmit={(password) => {
          act.mutate(
            { path: "/reset-password", body: { password } },
            { onSuccess: () => { show("Password reset · sessions revoked"); setPwOpen(false); } }
          );
        }}
        busy={act.isPending}
      />

      {/* --- Confirm dialogs --- */}
      <ConfirmDanger
        open={confirm === "disable"}
        onClose={() => setConfirm(null)}
        phrase={u.email}
        title="Disable operator"
        body="They will be signed out everywhere and blocked from logging in. Reversible."
        actionLabel="Disable"
        busy={act.isPending}
        onConfirm={() =>
          act.mutate({ path: "/disable" }, { onSuccess: () => { show("Operator disabled"); setConfirm(null); } })
        }
      />
      <ConfirmDanger
        open={confirm === "reseed"}
        onClose={() => setConfirm(null)}
        phrase={u.email}
        title="Reseed demo dataset"
        body="Wipes this operator's data and reloads a fresh demo dataset. Cannot be undone."
        actionLabel="Reseed"
        busy={act.isPending}
        onConfirm={() =>
          act.mutate({ path: "/reseed" }, { onSuccess: () => { show("Dataset reseeded"); setConfirm(null); invalidate(); } })
        }
      />
      <ConfirmDanger
        open={confirm === "delete"}
        onClose={() => setConfirm(null)}
        phrase={u.email}
        title="Hard delete operator"
        body="Permanently removes the account and cascades every transaction, udhaar, goal and account. Irreversible — prefer Disable during beta."
        actionLabel="Delete forever"
        busy={act.isPending}
        onConfirm={() =>
          act.mutate(
            { path: "", method: "DELETE" },
            { onSuccess: () => { show("Operator deleted"); nav("/users"); } }
          )
        }
      />

      {/* --- Impersonation result --- */}
      <Modal open={!!impersonateResult} onClose={() => setImpersonateResult(null)} title="Impersonation session">
        {impersonateResult && (
          <div className="stack" style={{ gap: 12 }}>
            <p>
              A full session for <b>{impersonateResult.user.email}</b> has been minted and recorded in the trace log.
            </p>
            <TokenBox label="Access token" value={impersonateResult.accessToken} />
            <TokenBox label="Refresh token" value={impersonateResult.refreshToken} />
            <div className="wrap-gap" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-ghost" onClick={() => setImpersonateResult(null)}>Close</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  startImpersonation({
                    accessToken: impersonateResult.accessToken,
                    refreshToken: impersonateResult.refreshToken,
                    user: impersonateResult.user,
                  });
                  setImpersonateResult(null);
                  nav("/");
                }}
              >
                Enter session
              </button>
            </div>
          </div>
        )}
      </Modal>

      {node}
    </>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="faint" style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: 1.2 }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

function TokenBox({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="field">
      <label>{label}</label>
      <div className="row">
        <input className="input mono" readOnly value={value} style={{ fontSize: 11 }} />
        <button
          className="btn btn-sm"
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? "✓" : "Copy"}
        </button>
      </div>
    </div>
  );
}

function EditModal({
  open,
  onClose,
  user,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  user: UserFull;
  onSave: (body: Record<string, unknown>) => void;
}) {
  const [name, setName] = useState(user.name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [income, setIncome] = useState(String(user.monthlyIncome ?? ""));

  return (
    <Modal open={open} onClose={onClose} title="Edit operator">
      <div className="stack" style={{ gap: 12 }}>
        <div className="field">
          <label>Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>Phone</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="field">
          <label>Monthly income (PKR)</label>
          <input className="input" type="number" value={income} onChange={(e) => setIncome(e.target.value)} />
        </div>
        <div className="wrap-gap" style={{ justifyContent: "flex-end" }}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() =>
              onSave({
                name: name || undefined,
                phone: phone || undefined,
                monthlyIncome: income === "" ? undefined : Number(income),
              })
            }
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ResetPwModal({
  open,
  onClose,
  onSubmit,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (pw: string) => void;
  busy: boolean;
}) {
  const [pw, setPw] = useState("");
  return (
    <Modal open={open} onClose={onClose} title="Reset password">
      <p style={{ marginBottom: 12 }}>Sets a new password and revokes all of this operator's sessions.</p>
      <div className="field" style={{ marginBottom: 16 }}>
        <label>New password (≥ 8 chars)</label>
        <input className="input" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
      </div>
      <div className="wrap-gap" style={{ justifyContent: "flex-end" }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={pw.length < 8 || busy} onClick={() => onSubmit(pw)}>
          {busy ? <Spinner /> : "Reset"}
        </button>
      </div>
    </Modal>
  );
}
