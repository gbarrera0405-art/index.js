const functions = require("@google-cloud/functions-framework");
const { Firestore } = require("@google-cloud/firestore");
const pathMod = require("path");
const fs = require("fs");

const { OAuth2Client } = require('google-auth-library');
const CLIENT_ID = "63798769550-6hfbo9bodtej1i6k00ch0i4n523v02v0.apps.googleusercontent.com";
const client = new OAuth2Client(CLIENT_ID);

const db = new Firestore();

const ZD_CONFIG = {
    subdomain: "musely",
    adminEmail: "genaro.barrera@trusper.com",
    apiToken: "bUBkQG96B50GVworY7rxKT6b0qFyfpirLeoKVXGS"
};

const zdFetch = async (url) => {
    const auth = Buffer.from(`${ZD_CONFIG.adminEmail}/token:${ZD_CONFIG.apiToken}`).toString('base64');
    const res = await fetch(url, {
        headers: { 'Authorization': `Basic ${auth}` }
    });
    if (!res.ok) throw new Error(`Zendesk API Error: ${res.statusText}`);
    return res.json();
};

/** ------------------------
 * Helpers
 * ------------------------ */
// Robust time parser (Handles "7:00 AM", "07:00:00", "7:00", etc.)
function parseTime(t) {
  if (!t) return "";
  const s = String(t).trim().toUpperCase();
  
  // Handle AM/PM
  const match = s.match(/^(\d{1,2})(:(\d{2}))?(:(\d{2}))?\s*(AM|PM)?$/);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[3] || "00";
    const ampm = match[6];

    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    
    return `${String(h).padStart(2, "0")}:${m}`;
  }
  return s; // Fallback
}

function readJsonBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "object") return req.body;
  try {
    return JSON.parse(String(req.body));
  } catch {
    return {};
  }
}

function requirePreviewKey(req, res) {
  const expected = process.env.PREVIEW_KEY; // set in Cloud Run
  if (!expected) return true; // if not set, no gate
  const got = req.get("x-preview-key") || String(req.query.key || "");
  if (got !== expected) {
    res.status(403).send("Forbidden");
    return false;
  }
  return true;
}

function normalizeValue(v) {
  if (v && typeof v === "object" && typeof v.toDate === "function") return v.toDate().toISOString();
  if (Array.isArray(v)) return v.map(normalizeValue);
  if (v && typeof v === "object") {
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = normalizeValue(val);
    return out;
  }
  return v;
}

function toIsoNow() {
  return new Date().toISOString();
}

function sanitizePatch(patch = {}) {
  const out = {};
  const allowed = ["person", "status", "notifyStatus", "notes", "start", "end", "role"];
  for (const k of allowed) {
    if (patch[k] !== undefined) out[k] = patch[k];
  }
  return out;
}

function hhmm(t) {
  const s = String(t || "").trim();
  if (!s) return "";
  const m = s.match(/^(\d{1,2}:\d{2})(:\d{2})?$/);
  return m ? m[1].padStart(5, "0") : s;
}

function normalizeAssignment(a = {}) {
  const person =
    String(a.person ?? a.agentName ?? a.name ?? a.personName ?? a.assignee ?? "").trim() || "Unassigned";

  const role = String(a.role ?? a.queue ?? a.work ?? "").trim();

  const sRaw = a.start ?? a.startTime ?? a.from ?? a.shiftStart ?? "";
  const eRaw = a.end ?? a.endTime ?? a.to ?? a.shiftEnd ?? "";

  const start = sRaw ? hhmm(sRaw) : "";
  const end   = eRaw ? hhmm(eRaw) : "";

  const startLabel = start ? toAmPm(start) : "";
  const endLabel   = end ? toAmPm(end) : "";

  return {
    ...a,

    // canonical
    person,
    role,
    start,
    end,
    startLabel,
    endLabel,

    // aliases (prevents UI "undefined")
    name: person,
    agentName: person,
    personName: person,
    startTime: start,
    endTime: end,
    from: start,
    to: end,
  };
}

function toAmPm(hhmmStr) {
  const s = hhmm(hhmmStr);
  const m = s.match(/^(\d{2}):(\d{2})$/);
  if (!m) return s;
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${ampm}`;
}

function clampDays(d) {
  const n = parseInt(d || "14", 10) || 14;
  return Math.min(Math.max(n, 1), 31);
}

function buildScheduleDocIds(teamKey, start, days) {
  const startDate = new Date(`${start}T00:00:00Z`);
  if (isNaN(startDate.getTime())) throw new Error("Invalid start date");

  const ids = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate);
    d.setUTCDate(d.getUTCDate() + i);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    ids.push(`${yyyy}-${mm}-${dd}__${teamKey}`);
  }
  return ids;
}

async function fetchSchedule(teamKey, start, days) {
  const ids = buildScheduleDocIds(teamKey, start, days);
  const refs = ids.map((id) => db.collection("scheduleDays").doc(id));
  const snaps = await db.getAll(...refs);

  let results = snaps
    .filter((s) => s.exists)
    .map((s) => ({ id: s.id, ...normalizeValue(s.data()) }));

  results = results.map((day) => ({
  ...day,
  assignments: (day.assignments || []).map(normalizeAssignment),
}));

  return results;
}

function contentTypeFor(filePath) {
  const ext = pathMod.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".js") return "application/javascript; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

function servePublicFile(reqPath, res) {
  const publicDir = pathMod.join(__dirname, "public");
  const cleanPath = reqPath === "/" || reqPath === "" ? "/index.html" : reqPath;

  // prevent path traversal
  const abs = pathMod.join(publicDir, cleanPath);
  if (!abs.startsWith(publicDir)) {
    res.status(403).send("Forbidden");
    return true;
  }

  if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) return false;

  const buf = fs.readFileSync(abs);
  res.status(200).set("Content-Type", contentTypeFor(abs)).send(buf);
  return true;
}

/** ------------------------
 * Main HTTP Handler
 * ------------------------ */
functions.http("helloHttp", async (req, res) => {
  try {
    // CORS first
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type,Authorization,x-preview-key");

    if (req.method === "OPTIONS") return res.status(204).send("");

    let path = String(req.path || "/").toLowerCase();
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);

    const action = (req.query.action || (req.body && req.body.action) || "").toLowerCase();

    // Force path to match action if present
    if (action) {
      path = "/" + action;
    }

    // Gate (optional)
    if (path !== "/health") {
      if (!requirePreviewKey(req, res)) return;
    }

    // Static first (anything not in the API list)
    const isApi = [
      "/health",
      "/people",
      "/teams",
      "/roles",
      "/schedule",
      "/initdashboard",
      "/assignment/replace",
      "/assignment/status",
      "/assignment/notify",
      "/assignment/notes",
      "/assignment/update",
      "/base-schedule",
      "/assignment/add",
      "/assignment/delete",
      // --- NEW ADMIN ENDPOINTS ---
      "/admin/generate",
      "/admin/archive",
      "/admin/seed-base",
      "/update-master-schedule",
      "/agent-profile",
      "/config",
      "/getmetadata"
    ].includes(path);

    if (!isApi) {
      if (servePublicFile(req.path || "/", res)) return;
    }

    // Health
    if (path === "/health") return res.status(200).json({ ok: true, service: "scheduler-api" });

    // Lookups
    if (path === "/people" && req.method === "GET") {
      const snap = await db.collection("people").get();
      const people = snap.docs.map((d) => ({ id: d.id, ...normalizeValue(d.data()) }));
      return res.status(200).json({ count: people.length, people });
    }

    if (action === "getMetadata" || path === "/getmetadata") {
        try {
            const [peopleSnap, teamsSnap] = await Promise.all([
                db.collection("people").get(),
                db.collection("teams").orderBy("sort", "asc").get()
            ]);
            
            return res.status(200).json({
                people: peopleSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                teams: teamsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
                zendeskMetrics: [], // Placeholder if not used
                success: true
            });
        } catch (e) {
            console.error("Metadata Error:", e);
            return res.status(500).json({ error: e.message });
        }
    }

    if (path === "/teams" && req.method === "GET") {
      const snap = await db.collection("teams").orderBy("sort", "asc").get();
      const teams = snap.docs.map((d) => ({ id: d.id, ...normalizeValue(d.data()) }));
      return res.status(200).json({ count: teams.length, teams });
    }

    
    if (path === "/config" || action === "config") {
        if (req.method === "POST") {
            try {
                const ticket = await client.verifyIdToken({
                    idToken: req.body.credential,
                    audience: CLIENT_ID,
                });
                const payload = ticket.getPayload();
                const email = payload['email'];

                const personDoc = await db.collection("people").where("email", "==", email).get();
                
                if (personDoc.empty) {
                    return res.status(403).json({ error: "Access Denied: User not in system." });
                }

                const userData = personDoc.docs[0].data();
                return res.status(200).json({
                    userEmail: email,
                    matchedPerson: userData.name,
                    isManager: userData.role === "admin" || userData.role === "MASTER",
                    role: userData.role
                });
            } catch (e) {
                console.error("Auth Failure:", e.message);
                return res.status(401).json({ error: "Unauthorized" });
            }
        }
    }

    if (path === "/roles" && req.method === "GET") {
      const snap = await db.collection("roles").orderBy("sort", "asc").get();
      const roles = snap.docs.map((d) => ({ id: d.id, ...normalizeValue(d.data()) }));
      return res.status(200).json({ count: roles.length, roles });
    }

    // initDashboard
    if (path === "/initdashboard" && req.method === "POST") {
        try {
            const body = readJsonBody(req);
            const { isManager, agentName } = body;
            
            const pstDate = new Date().toLocaleDateString("en-CA", {timeZone: "America/Los_Angeles"});
            
            const startParam = req.query.start || pstDate;
            const days = parseInt(req.query.days || "14");
            const teamKey = req.query.teamKey || "";

            // Calculate range based on PST input
            const [y, m, d] = (startParam || pstDate).split("-").map(Number);
            const startDate = new Date(y, m - 1, d);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + days);
            const startStr = startParam;
            const endStr = endDate.toISOString().split('T')[0];

            let query = db.collection("scheduleDays")
                .where("date", ">=", startStr)
                .where("date", "<=", endStr);

            const snapshot = await query.get();
            const results = [];

            snapshot.forEach(doc => {
                const d = doc.data();
                if (teamKey && d.team !== teamKey) return; 

                if (d.assignments && Array.isArray(d.assignments)) {
                    d.assignments = d.assignments
                        .filter(a => {
                            if (!isManager && agentName && a.person !== agentName) return false;
                            return true;
                        })
                        .map(a => {
                            // Ensure proper labels for the UI
                            const s = a.start ? hhmm(a.start) : "";
                            const e = a.end ? hhmm(a.end) : "";
                            return {
                                ...a,
                                start: s,
                                end: e,
                                startLabel: s ? toAmPm(s) : "",
                                endLabel: e ? toAmPm(e) : "",
                                person: a.person || "Unassigned"
                            };
                        });
                }

                if (d.assignments && (d.assignments.length > 0 || isManager)) {
                    d.id = doc.id; 
                    results.push(d);
                }
            });

            return res.status(200).json({
                success: true,
                schedule: { results: results }
            });

        } catch (error) {
            console.error("Dashboard Error:", error);
            return res.status(500).json({ error: error.message });
        }
    }

  // 2. Handle Updates (Drag & Drop / Edits)

    /** ------------------------
     * Assignment endpoints (legacy + new)
     * ------------------------ */

    // legacy: assignment replace
    if (path === "/assignment/replace" && req.method === "POST") {
      const body = readJsonBody(req);

      const docId = String(body.docId || "").trim();
      const assignmentId = String(body.assignmentId || "").trim();
      const newPerson = String(body.newPerson || "").trim();
      const notes = String(body.notes || "").trim();
      const notifyMode = String(body.notifyMode || "defer").trim(); // "defer" | "markSent"

      if (!docId || !assignmentId || !newPerson) {
        return res.status(400).json({ error: "Missing docId, assignmentId, or newPerson" });
      }

      const docRef = db.collection("scheduleDays").doc(docId);

      try {
        const updated = await db.runTransaction(async (tx) => {
          const snap = await tx.get(docRef);
          if (!snap.exists) throw new Error(`scheduleDays doc not found: ${docId}`);

          const data = snap.data() || {};
          const assignments = Array.isArray(data.assignments) ? data.assignments : [];
          const idx = assignments.findIndex((a) => String(a.id || "").trim() === assignmentId);
          if (idx === -1) throw new Error(`Assignment not found: ${assignmentId}`);

          const old = assignments[idx] || {};
          let notifyStatus = old.notifyStatus || "Pending";
          if (notifyMode === "markSent") notifyStatus = "Sent";
          if (notifyMode === "defer") notifyStatus = "Pending";

          const now = toIsoNow();
          const next = assignments.slice();
          next[idx] = { ...old, person: newPerson, notes, notifyStatus, updatedAt: now };

          tx.update(docRef, { assignments: next, updatedAt: now });
          return next[idx];
        });

        return res.status(200).json({ ok: true, docId, assignmentId, updated: normalizeValue(updated) });
      } catch (e) {
        console.error("replace error:", e);
        return res.status(500).json({ error: e.message || "Replace failed" });
      }
    }

    // legacy: assignment status
    if (path === "/assignment/status" && req.method === "POST") {
      const body = readJsonBody(req);
      const docId = String(body.docId || "").trim();
      const assignmentId = String(body.assignmentId || "").trim();
      const status = String(body.status || "").trim(); // Active | Completed

      if (!docId || !assignmentId || !status) {
        return res.status(400).json({ error: "Missing docId, assignmentId, or status" });
      }

      const docRef = db.collection("scheduleDays").doc(docId);

      try {
        const updated = await db.runTransaction(async (tx) => {
          const snap = await tx.get(docRef);
          if (!snap.exists) throw new Error(`scheduleDays doc not found: ${docId}`);

          const data = snap.data() || {};
          const assignments = Array.isArray(data.assignments) ? data.assignments : [];
          const idx = assignments.findIndex((a) => String(a.id || "").trim() === assignmentId);
          if (idx === -1) throw new Error(`Assignment not found: ${assignmentId}`);

          const now = toIsoNow();
          const next = assignments.slice();
          next[idx] = { ...next[idx], status, updatedAt: now };

          tx.update(docRef, { assignments: next, updatedAt: now });
          return next[idx];
        });

        return res.status(200).json({ ok: true, docId, assignmentId, updated: normalizeValue(updated) });
      } catch (e) {
        console.error("status error:", e);
        return res.status(500).json({ error: e.message || "Status update failed" });
      }
    }

    // legacy: assignment notify
    if (path === "/assignment/notify" && req.method === "POST") {
      const body = readJsonBody(req);
      const docId = String(body.docId || "").trim();
      const assignmentId = String(body.assignmentId || "").trim();
      const notifyStatus = String(body.notifyStatus || "").trim(); // Pending | Sent

      if (!docId || !assignmentId || !notifyStatus) {
        return res.status(400).json({ error: "Missing docId, assignmentId, or notifyStatus" });
      }

      const docRef = db.collection("scheduleDays").doc(docId);

      try {
        const updated = await db.runTransaction(async (tx) => {
          const snap = await tx.get(docRef);
          if (!snap.exists) throw new Error(`scheduleDays doc not found: ${docId}`);

          const data = snap.data() || {};
          const assignments = Array.isArray(data.assignments) ? data.assignments : [];
          const idx = assignments.findIndex((a) => String(a.id || "").trim() === assignmentId);
          if (idx === -1) throw new Error(`Assignment not found: ${assignmentId}`);

          const now = toIsoNow();
          const next = assignments.slice();
          next[idx] = { ...next[idx], notifyStatus, updatedAt: now };

          tx.update(docRef, { assignments: next, updatedAt: now });
          return next[idx];
        });

        return res.status(200).json({ ok: true, docId, assignmentId, updated: normalizeValue(updated) });
      } catch (e) {
        console.error("notify error:", e);
        return res.status(500).json({ error: e.message || "Notify update failed" });
      }
    }

    if (path === "/schedule" && req.method === "GET") {
  const teamKey = String(req.query.teamKey || "").trim();
  const start = String(req.query.start || new Date().toISOString().split("T")[0]);
  const days = clampDays(req.query.days || 14);

  const results = await fetchSchedule(teamKey, start, days);
  return res.status(200).json({
  ok: true,
  results,
  schedule: { results } // ✅ keeps compatibility if UI expects schedule.results
});
}

    // legacy: assignment notes
    if (path === "/assignment/notes" && req.method === "POST") {
      const body = readJsonBody(req);
      const docId = String(body.docId || "").trim();
      const assignmentId = String(body.assignmentId || "").trim();
      const notes = String(body.notes || "").trim();

      if (!docId || !assignmentId) {
        return res.status(400).json({ error: "Missing docId or assignmentId" });
      }

      const docRef = db.collection("scheduleDays").doc(docId);

      try {
        const updated = await db.runTransaction(async (tx) => {
          const snap = await tx.get(docRef);
          if (!snap.exists) throw new Error(`scheduleDays doc not found: ${docId}`);

          const data = snap.data() || {};
          const assignments = Array.isArray(data.assignments) ? data.assignments : [];
          const idx = assignments.findIndex((a) => String(a.id || "").trim() === assignmentId);
          if (idx === -1) throw new Error(`Assignment not found: ${assignmentId}`);

          const now = toIsoNow();
          const next = assignments.slice();
          next[idx] = { ...next[idx], notes, updatedAt: now };

          tx.update(docRef, { assignments: next, updatedAt: now });
          return next[idx];
        });

        return res.status(200).json({ ok: true, docId, assignmentId, updated: normalizeValue(updated) });
      } catch (e) {
        console.error("notes error:", e);
        return res.status(500).json({ error: e.message || "Notes update failed" });
      }
    }

    // ✅ NEW: unified update (used by your newer HTML)
    if (path === "/assignment/update" && req.method === "POST") {
  try {
    const body = readJsonBody(req);

    const docId = String(body.docId || "").trim();
    const assignmentId = String(body.assignmentId || "").trim();

    // Support both styles
    let patch = body.patch && typeof body.patch === "object" ? body.patch : null;

    if (!patch) {
      // legacy style from your UI
      const newPerson = body.newPerson !== undefined ? String(body.newPerson || "").trim() : undefined;
      const notes = body.notes !== undefined ? String(body.notes || "") : undefined;
      const notifyMode = String(body.notifyMode || "defer").trim(); // "send" | "defer"

      patch = {};
      if (newPerson !== undefined) patch.person = newPerson;
      if (notes !== undefined) patch.notes = notes;
      patch.notifyStatus = notifyMode === "send" ? "Sent" : "Pending";
    }

    patch = sanitizePatch(patch);

    if (!docId || !assignmentId) {
      return res.status(400).json({ error: "Missing docId or assignmentId" });
    }

    const docRef = db.collection("scheduleDays").doc(docId);

    const updated = await db.runTransaction(async (t) => {
      const snap = await t.get(docRef);
      if (!snap.exists) throw new Error(`Day not found: ${docId}`);

      const data = snap.data() || {};
      const assignments = Array.isArray(data.assignments) ? data.assignments : [];

      const idx = assignments.findIndex(a => String(a.id || "").trim() === assignmentId);
      if (idx === -1) throw new Error(`Assignment not found: ${assignmentId}`);

      const now = toIsoNow();
      const next = assignments.slice();
      next[idx] = { ...next[idx], ...patch, updatedAt: now };

      t.update(docRef, { assignments: next, updatedAt: now });
      return next[idx];
    });

    return res.status(200).json({ ok: true, docId, assignmentId, updated: normalizeValue(updated) });
  } catch (err) {
    console.error("Update Error:", err);
    return res.status(500).json({ error: err.message || "Update failed" });
  }
}

    // ✅ NEW: add shift (creates doc if missing)
    if (path === "/assignment/add" && req.method === "POST") {
      const body = readJsonBody(req);
      const docId = String(body.docId || "").trim();
      const assignment = body.assignment || {};

      const id = String(assignment.id || "").trim();
      const start = String(assignment.start || "").trim(); // expect "HH:MM:SS"
      const end = String(assignment.end || "").trim();
      const role = String(assignment.role || "").trim();
      const person = String(assignment.person || "").trim();

      if (!docId || !id || !start || !end || !role) {
        return res.status(400).json({ error: "Missing docId or assignment fields (id,start,end,role)" });
      }

      const docRef = db.collection("scheduleDays").doc(docId);

      try {
        const created = await db.runTransaction(async (tx) => {
          const snap = await tx.get(docRef);
          const now = toIsoNow();

          if (!snap.exists) {
            tx.set(
              docRef,
              {
                id: docId,
                assignments: [
                  {
                    id,
                    start,
                    end,
                    role,
                    person,
                    status: "Active",
                    notifyStatus: "Pending",
                    notes: "",
                    updatedAt: now,
                  },
                ],
                createdAt: now,
                updatedAt: now,
              },
              { merge: true }
            );

            return {
              id,
              start,
              end,
              role,
              person,
              status: "Active",
              notifyStatus: "Pending",
              notes: "",
              updatedAt: now,
            };
          }

          const data = snap.data() || {};
          const assignments = Array.isArray(data.assignments) ? data.assignments : [];
          if (assignments.some((a) => String(a.id || "").trim() === id)) {
            throw new Error(`Assignment id already exists: ${id}`);
          }

          const next = assignments.concat([
            {
              id,
              start,
              end,
              role,
              person,
              status: "Active",
              notifyStatus: "Pending",
              notes: "",
              updatedAt: now,
            },
          ]);

          tx.update(docRef, { assignments: next, updatedAt: now });
          return next[next.length - 1];
        });

        return res.status(200).json({ ok: true, docId, created: normalizeValue(created) });
      } catch (e) {
        console.error("add error:", e);
        return res.status(500).json({ error: e.message || "Add failed" });
      }
    }

    // ✅ NEW: delete shift
    if (path === "/assignment/delete" && req.method === "POST") {
      const body = readJsonBody(req);
      const docId = String(body.docId || "").trim();
      const assignmentId = String(body.assignmentId || "").trim();

      if (!docId || !assignmentId) {
        return res.status(400).json({ error: "Missing docId or assignmentId" });
      }

      const docRef = db.collection("scheduleDays").doc(docId);

      try {
        const removed = await db.runTransaction(async (tx) => {
          const snap = await tx.get(docRef);
          if (!snap.exists) throw new Error(`scheduleDays doc not found: ${docId}`);

          const data = snap.data() || {};
          const assignments = Array.isArray(data.assignments) ? data.assignments : [];
          const idx = assignments.findIndex((a) => String(a.id || "").trim() === assignmentId);
          if (idx === -1) throw new Error(`Assignment not found: ${assignmentId}`);

          const now = toIsoNow();
          const next = assignments.slice();
          const [deleted] = next.splice(idx, 1);

          tx.update(docRef, { assignments: next, updatedAt: now });
          return deleted;
        });

        return res.status(200).json({ ok: true, docId, assignmentId, removed: normalizeValue(removed) });
      } catch (e) {
        console.error("delete error:", e);
        return res.status(500).json({ error: e.message || "Delete failed" });
      }
    }

    // ✅ NEW: Generate future shifts (Supports "ALL" teams to save Scheduler slots)
    if (path === "/admin/generate" && req.method === "POST") {
      const body = readJsonBody(req);
      const daysForward = clampDays(body.days || 14);
      const reqTeam = String(body.teamKey || "ALL").trim(); // Default to ALL

      const baseSnap = await db.collection("base_schedule").get();
      const templates = {}; 
      const allTeams = new Set();

      baseSnap.forEach(doc => {
        const items = doc.data().items || [];
        templates[doc.id.substring(0, 3)] = items; 
        // dynamically find all teams mentioned in your templates
        items.forEach(i => {
           if(i.team) allTeams.add(i.team);
        });
      });

      // If specific team requested, use it. Otherwise, loop through ALL teams found.
      const teamsToProcess = (reqTeam !== "ALL" && reqTeam !== "") 
        ? [reqTeam] 
        : Array.from(allTeams);

      const dayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const log = [];
      const today = new Date();
      
      // Loop Days
      for (let i = 0; i < daysForward; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD
        const dow = dayMap[d.getDay()]; 

        const rawItems = templates[dow] || [];
        if (rawItems.length === 0) continue;

        // Loop Teams (This is the new "ALL" magic)
        for (const team of teamsToProcess) {
            const dailyItems = rawItems.filter(item => item.team === team);
            if (dailyItems.length === 0) continue;

            const docId = `${dateStr}__${team}`;
            const docRef = db.collection("scheduleDays").doc(docId);

            await db.runTransaction(async (tx) => {
              const snap = await tx.get(docRef);
              const now = toIsoNow();
              
              let assignments = [];
              if (snap.exists) assignments = snap.data().assignments || [];

              let addedCount = 0;

              dailyItems.forEach(tmpl => {
                 const isDupe = assignments.some(exist => 
                    exist.person === tmpl.person && 
                    exist.start === tmpl.start
                 );

                 if (!isDupe) {
                   assignments.push({
                     id: "gen_" + Math.random().toString(36).substr(2, 9),
                     start: tmpl.start,
                     end: tmpl.end,
                     role: tmpl.role,
                     person: tmpl.person,
                     status: "Active",
                     notifyStatus: "Pending",
                     notes: tmpl.focus || "",
                     updatedAt: now
                   });
                   addedCount++;
                 }
              });

              if (addedCount > 0) {
                tx.set(docRef, { 
                  id: docId,
                  date: dateStr, 
                  team: team, // Correctly saves the team name
                  assignments, 
                  updatedAt: now 
                }, { merge: true });
              }
            });
            log.push(`Checked ${dateStr} for ${team}`);
        }
      }

      return res.status(200).json({ ok: true, daysGenerated: daysForward, details: log });
    }

    // ✅ NEW: Archive old days
    if (path === "/admin/archive" && req.method === "POST") {
      const body = readJsonBody(req);
      const daysAgo = parseInt(body.daysAgo || "30", 10);
      
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysAgo);
      const cutoffStr = cutoff.toISOString().split("T")[0]; // YYYY-MM-DD

      // NOTE: This relies on the 'date' field we added in the generator above.
      // If old docs don't have a 'date' field, this query checks 'id' if possible, 
      // but 'date' field is cleaner.
      const oldDocs = await db.collection("scheduleDays")
        .where("date", "<", cutoffStr)
        .get();

      if (oldDocs.empty) {
        return res.status(200).json({ ok: true, archived: 0, message: "No old docs found." });
      }

      const batch = db.batch();
      let count = 0;

      oldDocs.forEach(doc => {
        const data = doc.data();
        const archiveRef = db.collection("scheduleArchive").doc(doc.id);
        
        // Copy to Archive
        batch.set(archiveRef, { ...data, archivedAt: toIsoNow() });
        // Delete from Live
        batch.delete(doc.ref);
        count++;
      });

      await batch.commit();
      return res.status(200).json({ ok: true, archived: count, cutoff: cutoffStr });
    }

    // ✅ NEW: Import Base Schedule (V2: Includes Team & Time Fix)
    if (path === "/admin/seed-base" && req.method === "POST") {
      const body = readJsonBody(req);
      const daysData = body.days || {}; 

      if (Object.keys(daysData).length === 0) return res.status(400).json({ error: "No data" });

      const batch = db.batch();
      let count = 0;

      for (const [dayName, items] of Object.entries(daysData)) {
        const docRef = db.collection("base_schedule").doc(dayName);
        
        const cleanedItems = items.map(item => ({
          person: String(item.person || ""),
          team: String(item.team || ""), // <--- Added Team
          role: String(item.role || ""),
          start: parseTime(item.start),  // <--- Fixes "7:00 AM" to "07:00"
          end: parseTime(item.end),
          focus: String(item.focus || "")
        }));

        batch.set(docRef, { items: cleanedItems });
        count++;
      }

      await batch.commit();
      return res.status(200).json({ ok: true, daysImported: count });
    }

    if (path === "/base-schedule" && req.method === "GET") {
  try {
    const snap = await db.collection("base_schedule").get();
    const data = {};
    snap.forEach(doc => {
      // doc.id should be "Mon", "Tue", etc.
      data[doc.id] = doc.data().items || [];
    });
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

if (path === "/update-master-schedule" && req.method === "POST") {
      const body = readJsonBody(req);
      const { action, person, day, oldStart, oldEnd, newStart, newEnd } = body;

      console.log(`Master Update Request: ${action} for ${person} on ${day} (${oldStart}-${oldEnd})`);

      try {
        const docRef = db.collection("base_schedule").doc(day);
        
        await db.runTransaction(async (t) => {
          const doc = await t.get(docRef);
          if (!doc.exists) throw new Error(`Day '${day}' not found in base_schedule`);

          const data = doc.data();
          let items = data.items || [];
          
          // --- ROBUST MATCHING ---
          // 1. Clean the incoming "Old" times to standard HH:MM
          const targetStart = hhmm(oldStart);
          const targetEnd = hhmm(oldEnd);
          const targetPerson = String(person || "").trim();

          // 2. Find the item by cleaning the DB times too
          const idx = items.findIndex(i => 
            String(i.person || "").trim() === targetPerson && 
            hhmm(i.start) === targetStart && 
            hhmm(i.end) === targetEnd
          );

          if (idx === -1 && action !== "ADD") {
             throw new Error("Original shift not found. Please refresh.");
          }

          if (action === "DELETE") {
            items.splice(idx, 1);
          } else if (action === "EDIT") {
            items[idx].start = hhmm(newStart);
            items[idx].end = hhmm(newEnd);
            if (req.body.newTeam) items[idx].team = String(req.body.newTeam).trim();
          } else if (action === "ADD") {
            // Logic to add a brand new entry to the array
            items.push({
              person: targetPerson,
              day: day,
              start: hhmm(newStart),
              end: hhmm(newEnd),
              team: String(req.body.newTeam || "Other").trim(),
              role: "Agent"
            });
          }

          if (action === "DELETE") {
            items.splice(idx, 1);
          } else if (action === "EDIT") {
            // Update and ensure the NEW times are also clean HH:MM
            items[idx].start = hhmm(newStart);
            items[idx].end = hhmm(newEnd);
            
            // FIX: Update Team and Role if provided
            if (req.body.newTeam) items[idx].team = String(req.body.newTeam).trim();
            if (req.body.newRole) items[idx].role = String(req.body.newRole).trim();
          }

          t.update(docRef, { items: items });
        });

        return res.status(200).json({ status: "success" });
      } catch (err) {
        console.error("Update Master Error:", err);
        return res.status(500).json({ status: "error", message: err.message });
      }
    }

    if (path === "/agent-profile" && req.method === "POST") {
    try {
        const { name } = readJsonBody(req);
        if (!name) return res.status(400).json({ error: "No name provided" });

        // 1. Find the agent's email from Firestore (replacing SHEET_PEOPLE)
        // 1. Find the agent's email from Firestore (Replacing Google Sheets lookup)
        const peopleSnap = await db.collection("people").get();
        let agentEmail = "";
        
        const target = name.toLowerCase().trim();
        peopleSnap.forEach(doc => {
            const d = doc.data();
            const dbName = String(d.name || d.id || "").toLowerCase().trim();
            
            // Match full name or first name
            if (dbName === target || dbName.split(" ")[0] === target.split(" ")[0]) {
                // This looks for an 'email' field inside the Firestore document
                agentEmail = d.email; 
            }
        });

        if (!agentEmail) {
            throw new Error(`Agent ${name} found in Firestore, but they are missing an email address.`);
        }

        // 2. Lookup User in Zendesk
        const userSearchUrl = `https://${ZD_CONFIG.subdomain}.zendesk.com/api/v2/users/search.json?query=${encodeURIComponent(`type:user email:${agentEmail}`)}`;
        const userRes = await zdFetch(userSearchUrl);
        if (!userRes.users?.length) throw new Error("Email not found in Zendesk.");
        
        const user = userRes.users[0];

        // 3. Fetch Open Tickets
        const openUrl = `https://${ZD_CONFIG.subdomain}.zendesk.com/api/v2/search.json?query=${encodeURIComponent(`type:ticket assignee:${user.id} status<solved`)}`;
        const openRes = await zdFetch(openUrl);

        // 4. Fetch Solved Tickets (Last 7 Days)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const date7 = oneWeekAgo.toISOString().split('T')[0];
        const solvedUrl = `https://${ZD_CONFIG.subdomain}.zendesk.com/api/v2/search.json?query=${encodeURIComponent(`type:ticket assignee:${user.id} status:solved solved>${date7}`)}`;
        const solvedRes = await zdFetch(solvedUrl);

        // 5. Fetch CSAT (Last 60 Days) - Using your countScore logic
        // 5. Fetch CSAT (Last 60 Days) - Replicating original code.gs math
        const daysBack = 60;
        const endSec = Math.floor(Date.now() / 1000) - 120; // 120s buffer from original code
        const startSec = endSec - (daysBack * 24 * 60 * 60);
        
        const getCsatCount = async (score) => {
            let count = 0;
            // Use encodeURIComponent just like the original logic
            let url = `https://${ZD_CONFIG.subdomain}.zendesk.com/api/v2/satisfaction_ratings.json?start_time=${startSec}&end_time=${endSec}&score=${encodeURIComponent(score)}`;
            
            let safetyPages = 0;
            while (url) {
                safetyPages++;
                if (safetyPages > 50) break; // Matches your code.gs safety stop

                const data = await zdFetch(url);
                const ratings = data.satisfaction_ratings || [];

                // Strict matching to the User ID
                for (const r of ratings) {
                    if (Number(r.assignee_id) === Number(user.id)) {
                        count++;
                    }
                }
                
                // Zendesk pagination often uses next_page. Ensure we follow it.
                url = data.next_page || null;
            }
            return count;
        };

        const good = await getCsatCount("good");
        const bad = await getCsatCount("bad");
        const total = good + bad;
        const csatDisplay = total ? Math.round((good / total) * 100) + "%" : "--";

        // 6. Return standard object to UI
        return res.status(200).json({
            found: true,
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.photo ? user.photo.content_url : null,
            role: user.role,
            lastLogin: user.last_login_at,
            openTickets: openRes.count || 0,
            solvedWeek: solvedRes.count || 0,
            csatScore: csatDisplay
        });

    } catch (error) {
        console.error("Profile Error:", error);
        return res.status(500).json({ error: error.message });
    }
}

    return res.status(404).json({ error: "Not found" });
  } catch (err) {
    console.error("ERROR:", err);
    return res.status(500).json({ error: "Server error", details: String(err?.message || err) });
  }
});
