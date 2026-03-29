## Firestore read footprint (current code)

This project mainly reads from Firestore via:
- `/getmetadata` / `/people`: `people` + `teams` collections (2 reads) with a 10‑minute fresh TTL / 30‑minute stale‑while‑revalidate cache. Shared across all users until cache expires.
- SSE `/events` listeners:
  - Agents (`isManager` false): one listener on `agent_notifications` filtered by `recipientName`. First snapshot costs one read per matching document; subsequent document changes each cost a read.
  - Managers (`isManager` true): four listeners — `manager_notifications`, `manager_presence` (last 10m), `time_off_requests` (pending), `agent_presence` (last 5m). Each initial snapshot costs one read per matching document; each change costs a read.
- Other endpoints (e.g., `/agent/schedule`) rely on in‑memory caches and only read when the cache is cold or TTL expires.

### Example estimate (25 people total; 20 agents active; 5 managers active)
Assumptions for initial snapshots:
- Each agent has ~5 matching `agent_notifications` docs.
- `manager_notifications`: ~20 docs (5 pending).
- `manager_presence`: ~5 recent docs.
- `agent_presence`: ~20 recent docs.
- `time_off_requests` (pending): ~5 docs.

Estimated reads when everyone connects once (before any live changes):
- Metadata cache warm-up: **2 reads** total.
- 20 agents SSE: **20 × 5 ≈ 100 reads** (agent notifications).
- 5 managers SSE: per manager ~50 reads (20 + 5 + 5 + 20) → **≈ 250 reads**.
- **Total initial snapshot cost ≈ 352 reads**.

After the initial snapshots, additional reads occur only when matching documents change (one read per changed/added/deleted doc per listener). Caching keeps metadata reads at ~2 per 10–30 minutes window regardless of user count.
