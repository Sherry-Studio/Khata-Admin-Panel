# Khata+ — Command Deck (Admin Panel)

Futuristic, glassmorphic admin dashboard for the Khata+ beta. Pure client of the
existing backend (`/api/v1/admin/*`) — no server code.

## Stack
Vite + React + TypeScript · React Router · TanStack Query · Framer Motion ·
Recharts · lucide-react.

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build to dist/
```

Set the backend base URL (optional — defaults to the beta backend):

```bash
cp .env.example .env
# VITE_API_BASE=https://khata-app-backend-beta.vercel.app/api/v1
```

## Auth
Uses the mobile app's `/auth/login`. Non-admin accounts are rejected at login.
Access + refresh tokens live in `localStorage`; `adminFetch` auto-refreshes on
`401` and rotates both tokens. Seeded beta admin: `admin@khata.app` / `admin12345`.

## Routes
| Route | Purpose |
| --- | --- |
| `/login` | Email + password, admin-only |
| `/` | Command Deck — 7 metric cards, volume curve, base-health ring |
| `/users` | Search / filter / paginate; inline enable-disable; create operator |
| `/users/:id` | Profile, aggregates, counts; edit, verify, role, reset password, reseed, impersonate, disable, delete |
| `/transactions` | Read-only global signal feed, filter by user id |
| `/audit` | Reverse-chronological trace log |
| `/broadcast` | Compose kind / body / tone, target all or one, live preview + delivered count |

## Safety
- `disable`, `reset-password`, `reseed`, `delete` all sit behind a
  type-the-email confirm dialog.
- An admin cannot disable or delete their own account (buttons disabled).
- Impersonation shows a persistent banner + one-click "Exit to admin"; the
  action is already written to the audit log.

## Deploy
Static build — deploy `dist/` to its own Vercel project. Before a public URL,
lock backend CORS to that origin and move tokens to httpOnly cookies.
