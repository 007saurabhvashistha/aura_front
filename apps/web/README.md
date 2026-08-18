# Aura Web (`apps/web`)

React + Vite + TypeScript frontend for Aura.

## Scripts

```bash
npm run dev        # start Vite dev server (http://localhost:5173)
npm run build      # type-check + production build
npm run preview    # preview the production build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

## Environment

Copy `.env.example` to `.env`. Only variables prefixed with `VITE_` are exposed
to the client. `VITE_API_BASE_URL` points to the backend (default
`http://localhost:4000`).

## Structure

```
src/
â”œâ”€â”€ main.tsx        # React entry
â”œâ”€â”€ App.tsx         # Root component (shows backend health)
â”œâ”€â”€ lib/
â”‚   â””â”€â”€ api.ts      # Typed API client (uses shared-ui/@aura/shared)
â”œâ”€â”€ App.css
â”œâ”€â”€ index.css
â””â”€â”€ vite-env.d.ts
```

