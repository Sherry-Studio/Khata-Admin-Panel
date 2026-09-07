import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../state/auth";
import { ApiError } from "../api/client";
import { Spinner } from "../components/ui";

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      nav("/");
    } catch (e) {
      const code = e instanceof ApiError ? e.message : "network_error";
      setErr(
        code === "not_authorized"
          ? "That account is not an admin."
          : code === "invalid_credentials"
          ? "Wrong email or password."
          : `Login failed — ${code}`
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="aurora" />
      <div className="login-wrap">
        <motion.form
          className="login-card"
          onSubmit={submit}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="login-logo">K+</div>
          <h1 style={{ fontSize: 20, marginBottom: 4 }}>Command Deck</h1>
          <p className="muted" style={{ fontSize: 13, marginBottom: 24 }}>
            Restricted access · admin credentials required
          </p>

          <div className="stack">
            <div className="field">
              <label>Email</label>
              <input
                className="input"
                type="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@khata.app"
                required
              />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {err && <div className="err">{err}</div>}

            <button className="btn btn-primary" style={{ justifyContent: "center", marginTop: 4 }} disabled={busy}>
              {busy ? <Spinner /> : <><ShieldCheck size={16} /> Authenticate</>}
            </button>
          </div>
        </motion.form>
      </div>
    </>
  );
}
