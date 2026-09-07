import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Radio, Send } from "lucide-react";
import { adminFetch } from "../api/client";
import { Badge, Card, Spinner, useToast } from "../components/ui";
import PageHeader from "../components/PageHeader";

const TONES = [
  { value: "accent", label: "Accent", kind: "info" as const },
  { value: "pos", label: "Positive", kind: "ok" as const },
  { value: "warn", label: "Warning", kind: "warn" as const },
];

export default function Broadcast() {
  const { show, node } = useToast();
  const [kind, setKind] = useState("announcement");
  const [body, setBody] = useState("");
  const [tone, setTone] = useState("accent");
  const [target, setTarget] = useState<"all" | "one">("all");
  const [userId, setUserId] = useState("");
  const [delivered, setDelivered] = useState<number | null>(null);

  const send = useMutation({
    mutationFn: () =>
      adminFetch("/notifications/broadcast", {
        method: "POST",
        body: JSON.stringify({
          kind,
          body,
          tone,
          userId: target === "one" && userId ? userId.trim() : undefined,
        }),
      }),
    onSuccess: (r: { delivered: number }) => {
      setDelivered(r.delivered);
      show(`Delivered to ${r.delivered} operator${r.delivered === 1 ? "" : "s"}`);
      setBody("");
    },
    onError: (e: Error) => show(e.message, "err"),
  });

  const toneKind = TONES.find((t) => t.value === tone)?.kind ?? "info";

  return (
    <>
      <PageHeader title="Broadcast" sub="Push a notification into the app's Notifications screen" />

      <div className="grid" style={{ gridTemplateColumns: "1fr 0.9fr" }}>
        <Card glow className="stack">
          <div className="field">
            <label>Kind</label>
            <input className="input" value={kind} onChange={(e) => setKind(e.target.value)} placeholder="announcement" />
          </div>

          <div className="field">
            <label>Message body</label>
            <textarea
              className="textarea"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Please update to the latest build — maintenance window tonight 02:00–03:00 PKT."
            />
          </div>

          <div className="field">
            <label>Tone</label>
            <div className="wrap-gap">
              {TONES.map((t) => (
                <button
                  key={t.value}
                  className={`btn btn-sm ${tone === t.value ? "btn-primary" : ""}`}
                  onClick={() => setTone(t.value)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Audience</label>
            <div className="wrap-gap">
              <button className={`btn btn-sm ${target === "all" ? "btn-primary" : ""}`} onClick={() => setTarget("all")}>
                Every active operator
              </button>
              <button className={`btn btn-sm ${target === "one" ? "btn-primary" : ""}`} onClick={() => setTarget("one")}>
                Single operator
              </button>
            </div>
          </div>

          {target === "one" && (
            <div className="field">
              <label>User ID</label>
              <input className="input mono" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="6a9f0bcb7525a931c93864ee" />
            </div>
          )}

          <button
            className="btn btn-primary"
            style={{ justifyContent: "center" }}
            disabled={!body.trim() || send.isPending || (target === "one" && !userId.trim())}
            onClick={() => {
              setDelivered(null);
              send.mutate();
            }}
          >
            {send.isPending ? <Spinner /> : <><Send size={15} /> Transmit</>}
          </button>
        </Card>

        <Card className="stack">
          <div className="section-h">Live preview</div>
          <motion.div
            key={body + tone + kind}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              padding: 16,
              borderRadius: 14,
              background: "rgba(6,9,18,0.6)",
              border: "1px solid var(--stroke)",
              borderLeft: `3px solid ${
                tone === "warn" ? "var(--amber)" : tone === "pos" ? "var(--lime)" : "var(--cyan)"
              }`,
            }}
          >
            <div className="row" style={{ gap: 8, marginBottom: 8 }}>
              <Radio size={14} style={{ color: "var(--cyan)" }} />
              <span style={{ fontSize: 12.5, fontWeight: 700, textTransform: "capitalize" }}>{kind || "notification"}</span>
              <Badge kind={toneKind}>{tone}</Badge>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.55, color: body ? "var(--text)" : "var(--text-faint)" }}>
              {body || "Your message will appear here…"}
            </div>
          </motion.div>

          <div className="faint" style={{ fontSize: 11.5 }}>
            {target === "all"
              ? "Sends to every non-disabled operator."
              : "Sends to one operator only."}
          </div>

          {delivered !== null && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                padding: 14,
                borderRadius: 12,
                background: "rgba(157,255,92,0.1)",
                border: "1px solid rgba(157,255,92,0.28)",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 26, fontWeight: 750, color: "var(--lime)" }}>{delivered}</div>
              <div className="faint" style={{ fontSize: 11 }}>notifications delivered</div>
            </motion.div>
          )}
        </Card>
      </div>
      {node}
    </>
  );
}
