import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  AdminUser,
  ApiError,
  apiFetch,
  setAuthLostHandler,
  tokens,
} from "../api/client";

interface ImpersonationState {
  email: string;
  admin: { access: string; refresh: string; user: AdminUser };
}

interface AuthCtx {
  user: AdminUser | null;
  ready: boolean;
  impersonating: ImpersonationState | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  startImpersonation: (session: {
    accessToken: string;
    refreshToken: string;
    user: AdminUser;
  }) => void;
  stopImpersonation: () => void;
}

const Ctx = createContext<AuthCtx>(null as never);
export const useAuth = () => useContext(Ctx);

const IMP_KEY = "khata_admin_impersonation";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(() => tokens.user());
  const [ready, setReady] = useState(false);
  const [impersonating, setImpersonating] = useState<ImpersonationState | null>(
    () => {
      try {
        return JSON.parse(localStorage.getItem(IMP_KEY) ?? "null");
      } catch {
        return null;
      }
    }
  );

  const logout = useCallback(async () => {
    const rt = tokens.refresh();
    if (rt) {
      try {
        await apiFetch("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refreshToken: rt }),
        });
      } catch {
        /* ignore */
      }
    }
    tokens.clear();
    localStorage.removeItem(IMP_KEY);
    setImpersonating(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setAuthLostHandler(() => {
      localStorage.removeItem(IMP_KEY);
      setImpersonating(null);
      setUser(null);
    });
  }, []);

  useEffect(() => {
    // Validate stored session on boot.
    (async () => {
      if (!tokens.access()) {
        setReady(true);
        return;
      }
      try {
        const me = tokens.user();
        if (me?.role === "admin") setUser(me);
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (data.user?.role !== "admin") {
      throw new ApiError("not_authorized", 403);
    }
    tokens.set(data.accessToken, data.refreshToken, data.user);
    setUser(data.user);
  }, []);

  const startImpersonation = useCallback(
    (session: { accessToken: string; refreshToken: string; user: AdminUser }) => {
      const admin = {
        access: tokens.access(),
        refresh: tokens.refresh(),
        user: tokens.user()!,
      };
      const state: ImpersonationState = { email: session.user.email, admin };
      localStorage.setItem(IMP_KEY, JSON.stringify(state));
      tokens.set(session.accessToken, session.refreshToken, session.user);
      setImpersonating(state);
    },
    []
  );

  const stopImpersonation = useCallback(() => {
    const state: ImpersonationState | null = JSON.parse(
      localStorage.getItem(IMP_KEY) ?? "null"
    );
    if (state) {
      tokens.set(state.admin.access, state.admin.refresh, state.admin.user);
      setUser(state.admin.user);
    }
    localStorage.removeItem(IMP_KEY);
    setImpersonating(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      ready,
      impersonating,
      login,
      logout,
      startImpersonation,
      stopImpersonation,
    }),
    [user, ready, impersonating, login, logout, startImpersonation, stopImpersonation]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
