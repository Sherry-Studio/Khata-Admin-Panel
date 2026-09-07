import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

export function Card({
  children,
  className = "",
  glow = false,
  pad = true,
  style,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  pad?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`card ${glow ? "card-glow" : ""} ${pad ? "card-pad" : ""} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

export function Spinner() {
  return <div className="spinner" />;
}

export function Loading({ label }: { label?: string }) {
  return (
    <div className="center-load stack" style={{ alignItems: "center" }}>
      <Spinner />
      {label && <span className="faint" style={{ fontSize: 12 }}>{label}</span>}
    </div>
  );
}

type BadgeKind = "ok" | "warn" | "danger" | "info" | "violet" | "dim";
export function Badge({ kind = "dim", children }: { kind?: BadgeKind; children: ReactNode }) {
  return <span className={`badge badge-${kind}`}>{children}</span>;
}

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="modal"
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="between" style={{ marginBottom: 14 }}>
              <h3>{title}</h3>
              <button className="btn-ghost btn btn-sm" onClick={onClose}>
                <X size={15} />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Confirm dialog that requires typing the given phrase (usually an email). */
export function ConfirmDanger({
  open,
  onClose,
  onConfirm,
  title,
  body,
  phrase,
  actionLabel,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body: ReactNode;
  phrase: string;
  actionLabel: string;
  busy?: boolean;
}) {
  const [typed, setTyped] = useState("");
  useEffect(() => {
    if (!open) setTyped("");
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p style={{ marginBottom: 14 }}>{body}</p>
      <div className="field" style={{ marginBottom: 18 }}>
        <label>
          Type <span className="mono" style={{ color: "var(--text)" }}>{phrase}</span> to confirm
        </label>
        <input
          className="input"
          value={typed}
          autoFocus
          onChange={(e) => setTyped(e.target.value)}
          placeholder={phrase}
        />
      </div>
      <div className="wrap-gap" style={{ justifyContent: "flex-end" }}>
        <button className="btn btn-ghost" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn btn-danger"
          disabled={typed !== phrase || busy}
          onClick={onConfirm}
        >
          {busy ? <Spinner /> : actionLabel}
        </button>
      </div>
    </Modal>
  );
}

export function Toast({ msg, kind }: { msg: string; kind: "ok" | "err" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, x: "-50%" }}
      animate={{ opacity: 1, y: 0, x: "-50%" }}
      exit={{ opacity: 0, y: 10, x: "-50%" }}
      style={{
        position: "fixed",
        bottom: 26,
        left: "50%",
        zIndex: 80,
        padding: "11px 20px",
        borderRadius: 12,
        fontSize: 13,
        fontWeight: 600,
        background: kind === "ok" ? "rgba(157,255,92,0.14)" : "rgba(255,77,109,0.16)",
        border: `1px solid ${kind === "ok" ? "rgba(157,255,92,0.35)" : "rgba(255,77,109,0.4)"}`,
        color: kind === "ok" ? "var(--lime)" : "#ff8098",
        backdropFilter: "blur(12px)",
      }}
    >
      {msg}
    </motion.div>
  );
}

export function useToast() {
  const [toast, setToast] = useState<{ msg: string; kind: "ok" | "err" } | null>(null);
  const show = (msg: string, kind: "ok" | "err" = "ok") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3200);
  };
  const node = (
    <AnimatePresence>{toast && <Toast {...toast} />}</AnimatePresence>
  );
  return { show, node };
}
