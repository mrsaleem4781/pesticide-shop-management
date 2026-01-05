# GitHub Copilot instructions for the Pesticide Shop Management System

Purpose: give an AI coding agent only the immediately useful, discoverable facts to be productive in this repo.

## Quick summary ✅
- Full-stack app: React frontend (root) + Express + MongoDB backend (`/backend`).
- Frontend communicates with backend at `http://localhost:5000/api` via `src/services/api.js`.
- Dev commands:
  - Frontend: `npm start` (root package.json, runs react-scripts on port 3000)
  - Backend: `cd backend && npm run dev` (nodemon) or `npm start` (node)
- Backend exposes REST endpoints under `/api` (see `backend/server.js`): `products`, `sales`, `customers`, `stats`.

## Architecture & data flow 🔧
- Frontend pages live in `src/pages/` and use `api` (imported from `src/services/api.js`) for CRUD:
  - Example: `const response = await api.get('/products')` → `response.data` is an array of products.
- UI uses a single Add/Edit modal (`src/components/Modal/AddModal.jsx`) controlled from `App.jsx` via `openModal(type, isEdit=false, data=null)`.
  - `App.jsx` keeps `editMode` and `editData` in state and passes them to `AddModal`.
- Notifications: UI shows transient notifications via `showNotification(message, type='success')` passed down from `App.jsx`.
- Backend side effects: posting a sale (`POST /api/sales`) reduces product stock and increments customer's `totalPurchases` (see `server.js`).

## Project-specific conventions & quirks ⚠️
- IDs may be stored as `_id` (Mongo) or `id` in some client objects — code attempts to handle both (`product._id || product.id`).
- Some files contain inline comments and temporary lines (e.g., Hindi notes, `window.location.reload()` used to refresh data after mutations) — expect quick fixes / refactors.
- Important: `backend/server.js` currently contains a few discoverable issues you should know about:
  - There is an `app.put('/api/sales/:id', ...)` handler nested inside the `POST /api/sales` handler — this is likely a bug and should be hoisted to top-level.
  - A MongoDB connection string is hard-coded in `server.js`. Treat it as secret: prefer moving to `process.env.MONGO_URI` and `.env`.

## Testing & build notes 🧪
- Frontend tests: `npm test` (uses react-scripts test). There are no visible backend tests.
- Production build: `npm run build` (root) produces a static app in `build/`.
- To run full app locally: start backend on port 5000, then run frontend; CORS is enabled in backend.

## Integration & external deps 🔗
- Backend deps: `express`, `mongoose`, `cors`; dev: `nodemon` (see `backend/package.json`).
- Frontend uses `axios` via `src/services/api.js` and `lucide-react` for icons.
- Persistent DB: MongoDB (Atlas connection string is present in `backend/server.js`).

## Useful code patterns & search tips 🔎
- To find API uses: search for `import api from '../services/api'` or `api.get(`/`.
- To find UI flows: search for `openModal(` and `showNotification(` to see how components request modals/notifications.
- Common data access pattern: pages fetch all resources on mount (`useEffect(() => { fetch... }, [])`).

## Safe edit guidance for AI agents 🛡️
- Avoid committing secrets (e.g., don't re-add hard-coded connection strings). If you introduce a `.env` file, add it to `.gitignore` and document the required variables.
- If changing API routes, update `src/services/api.js` or ensure client calls match new server endpoints.
- Preserve current UI contracts: `openModal(type, isEdit, data)`, `showNotification(message, type)`, and the props expected by pages in `src/pages/*`.

## Example quick fixes (copy/paste) 💡
- Fix nested route bug in `backend/server.js` (move this block to top-level):

  Replace (inside POST handler):
  ```js
  // app.put('/api/sales/:id', ... )  <-- this shouldn't be nested here
  ```
  With a top-level `app.put('/api/sales/:id', ...)` near other route declarations.

- Make DB URI configurable:
  ```js
  // replace hard-coded string with:
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pesticide-shop';
  mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  ```

## When in doubt ❓
- Ask: "Does this change require updating `src/services/api.js` or `App.jsx` modal/notification contracts?" — those are the most fragile integration points.

---
If you'd like, I can refine this further (e.g., add exact environment variable names, CI steps, or a short checklist for new contributors). Any sections unclear or missing examples you want me to expand?