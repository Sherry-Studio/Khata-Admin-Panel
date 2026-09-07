import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Banknote,
  HandCoins,
  ShieldAlert,
  Sparkles,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { adminFetch } from "../api/client";
import { compact, num, pkr } from "../lib/format";
import { Card, Loading } from "../components/ui";
import PageHeader from "../components/PageHeader";

interface Metrics {
  users: { total: number; verified: number; disabled: number; newThisMonth: number };
  transactions: { count: number; volume: number };
  udhaarOutstanding: number;
}

const STAT_META = [
  { key: "total", label: "Total operators", icon: Users, get: (m: Metrics) => num(m.users.total), foot: (m: Metrics) => `${m.users.verified} verified` },
  { key: "verified", label: "Verified", icon: UserCheck, get: (m: Metrics) => num(m.users.verified), foot: (m: Metrics) => `${Math.round((m.users.verified / Math.max(m.users.total, 1)) * 100)}% of base` },
  { key: "disabled", label: "Disabled", icon: ShieldAlert, get: (m: Metrics) => num(m.users.disabled), foot: () => "access revoked" },
  { key: "new", label: "New this month", icon: Sparkles, get: (m: Metrics) => num(m.users.newThisMonth), foot: () => "fresh signups" },
  { key: "txc", label: "Transactions", icon: Wallet, get: (m: Metrics) => num(m.transactions.count), foot: (m: Metrics) => `${compact(m.transactions.count)} logged` },
  { key: "vol", label: "Transaction volume", icon: Banknote, get: (m: Metrics) => pkr(m.transactions.volume), foot: () => "lifetime PKR" },
  { key: "udhaar", label: "Udhaar outstanding", icon: HandCoins, get: (m: Metrics) => pkr(m.udhaarOutstanding), foot: () => "owed across ledgers" },
];

export default function Dashboard() {
  const { data, isLoading, error } = useQuery<Metrics>({
    queryKey: ["metrics"],
    queryFn: () => adminFetch("/metrics"),
    refetchInterval: 45_000,
  });

  if (isLoading) return <Loading label="syncing telemetry" />;
  if (error || !data)
    return (
      <>
        <PageHeader title="Command Deck" />
        <Card><span className="err">Could not load metrics.</span></Card>
      </>
    );

  const health = Math.round((data.users.verified / Math.max(data.users.total, 1)) * 100);
  const chartData = buildSpark(data);

  return (
    <>
      <PageHeader title="Command Deck" sub="Live beta telemetry · auto-refresh 45s" />

      <div className="grid stat-grid" style={{ marginBottom: 16 }}>
        {STAT_META.map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={s.key} className="stat" pad={false}>
              <div style={{ padding: "18px 20px" } as any}>
                <div className="stat-label">
                  <Icon size={14} className="stat-ico" /> {s.label}
                </div>
                <motion.div
                  className="stat-value"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  {s.get(data)}
                </motion.div>
                <div className="stat-foot">{s.foot(data)}</div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.6fr 1fr" }}>
        <Card glow>
          <div className="section-h">Volume curve (synthetic projection)</div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cff" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#35f0e0" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" stroke="#5a6488" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#5a6488" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => compact(v)} width={44} />
                <Tooltip
                  contentStyle={{
                    background: "#10162a",
                    border: "1px solid rgba(120,160,255,0.24)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  formatter={(v: number) => pkr(v)}
                />
                <Area type="monotone" dataKey="value" stroke="#8b5cff" strokeWidth={2} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card glow>
          <div className="section-h">Base health</div>
          <div className="row" style={{ gap: 20 }}>
            <Ring pct={health} />
            <div className="stack" style={{ gap: 10 }}>
              <Line color="var(--lime)" label="Verified" value={num(data.users.verified)} />
              <Line color="var(--amber)" label="Unverified" value={num(data.users.total - data.users.verified - data.users.disabled)} />
              <Line color="var(--danger)" label="Disabled" value={num(data.users.disabled)} />
            </div>
          </div>
          <div className="faint" style={{ fontSize: 11.5, marginTop: 16 }}>
            Avg volume / transaction ·{" "}
            <span className="mono" style={{ color: "var(--text)" }}>
              {pkr(Math.round(data.transactions.volume / Math.max(data.transactions.count, 1)))}
            </span>
          </div>
        </Card>
      </div>
    </>
  );
}

function Line({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="row" style={{ fontSize: 12.5 }}>
      <span className="dot" style={{ background: color }} />
      <span className="muted" style={{ width: 84 }}>{label}</span>
      <span className="mono" style={{ color: "var(--text)" }}>{value}</span>
    </div>
  );
}

function Ring({ pct }: { pct: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <svg width={112} height={112} viewBox="0 0 112 112">
      <circle cx={56} cy={56} r={r} stroke="rgba(120,160,255,0.12)" strokeWidth={10} fill="none" />
      <motion.circle
        cx={56}
        cy={56}
        r={r}
        stroke="url(#ring)"
        strokeWidth={10}
        strokeLinecap="round"
        fill="none"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c - (c * pct) / 100 }}
        transition={{ duration: 1, ease: "easeOut" }}
        transform="rotate(-90 56 56)"
      />
      <defs>
        <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b5cff" />
          <stop offset="100%" stopColor="#35f0e0" />
        </linearGradient>
      </defs>
      <text x={56} y={54} textAnchor="middle" fill="#e8ecff" fontSize={20} fontWeight={700}>
        {pct}%
      </text>
      <text x={56} y={72} textAnchor="middle" fill="#5a6488" fontSize={9} letterSpacing={1}>
        VERIFIED
      </text>
    </svg>
  );
}

function buildSpark(m: Metrics) {
  // Deterministic synthetic 8-point curve ending near the true lifetime volume.
  const end = m.transactions.volume || 1;
  const pts = [0.28, 0.36, 0.44, 0.51, 0.63, 0.74, 0.88, 1];
  return pts.map((p, i) => ({ label: `T-${8 - i}`, value: Math.round(end * p) }));
}
