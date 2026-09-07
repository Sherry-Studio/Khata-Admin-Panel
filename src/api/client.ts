export const BASE: string =
  (import.meta.env.VITE_API_BASE as string) ||
  "https://khata-app-backend-beta.vercel.app/api/v1";

const ACCESS_KEY = "khata_admin_access";
const REFRESH_KEY = "khata_admin_refresh";
const USER_KEY = "khata_admin_user";

export interface AdminUser {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  role: "user" | "admin";
  verified: boolean;
  disabled: boolean;
  monthlyIncome?: number;
  createdAt: string;
}

export const tokens = {
  access: () => localStorage.getItem(ACCESS_KEY) ?? "",
  refresh: () => localStorage.getItem(REFRESH_KEY) ?? "",
  user: (): AdminUser | null => {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) ?? "null");
    } catch {
      return null;
    }
  },
  set: (access: string, refresh: string, user?: AdminUser) => {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

export class ApiError extends Error {
  status: number;
  issues?: unknown;
  constructor(message: string, status: number, issues?: unknown) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

async function parse(res: Response) {
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(
      body?.error ?? res.statusText ?? "request_failed",
      res.status,
      body?.issues
    );
  }
  return body;
}

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const rt = tokens.refresh();
    if (!rt) return false;
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken: rt }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      tokens.set(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

let onAuthLost: (() => void) | null = null;
export function setAuthLostHandler(fn: () => void) {
  onAuthLost = fn;
}

/** Raw call against the API base (not scoped to /admin). */
export async function apiFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
  return parse(res);
}

/** Authenticated call scoped to /admin with 401 refresh+retry. */
export async function adminFetch(path: string, init: RequestInit = {}) {
  const run = (token: string) =>
    fetch(`${BASE}/admin${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
        ...(init.headers ?? {}),
      },
    });

  let res = await run(tokens.access());
  if (res.status === 401) {
    const ok = await tryRefresh();
    if (ok) {
      res = await run(tokens.access());
    } else {
      tokens.clear();
      onAuthLost?.();
      throw new ApiError("session_expired", 401);
    }
  }
  return parse(res);
}

export const qs = (params: Record<string, unknown>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
};
