const functions = require("@google-cloud/functions-framework");
const { Firestore } = require("@google-cloud/firestore");
const pathMod = require("path");
const fs = require("fs");
const { OAuth2Client } = require('google-auth-library');
const CLIENT_ID = "63798769550-6hfbo9bodtej1i6k00ch0i4n523v02v0.apps.googleusercontent.com";
const client = new OAuth2Client(CLIENT_ID);
// ============================================
// GOOGLE CHAT BOT INTEGRATION
// ============================================
const CHAT_BOT_URL = process.env.CHAT_BOT_URL || "https://musely-chat-bot-63798769550.us-central1.run.app";
const SCHEDULER_URL = process.env.SCHEDULER_URL || "https://scheduler-api-63798769550.us-central1.run.app";

/**
 * Send a shift notification to an agent via Google Chat
 */
async function sendShiftNotification(agentEmail, shiftData) {
  try {
    // 1. Look up the agent's Google Chat user ID from Firestore
    const peopleSnap = await db.collection("people")
      .where("email", "==", agentEmail)
      .limit(1)
      .get();
    if (peopleSnap.empty) {
      console.warn(`sendShiftNotification: No person found with email: ${agentEmail}`);
      return { success: false, error: "Agent not found in system" };
    }
    const personDoc = peopleSnap.docs[0].data();
    const chatUserId = personDoc.chatUserId;
    if (!chatUserId) {
      console.warn(`sendShiftNotification: Agent ${agentEmail} has no chatUserId`);
      return { success: false, error: "Agent has no Chat ID configured" };
    }
    // 2. Call the Chat Bot service
    console.log(`Sending notification to ${agentEmail} (${chatUserId})...`);
    
    const response = await fetch(CHAT_BOT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "SEND_NOTIFICATION",
        chatUserId: chatUserId,
        cardData: {
          date: shiftData.date || "N/A",
          start: shiftData.start || "N/A",
          end: shiftData.end || "N/A",
          role: shiftData.role || "Agent",
          team: shiftData.team || "Support",
          notes: shiftData.notes || "Your shift has been updated.",
          schedulerUrl: SCHEDULER_URL // Include link to scheduler
        }
      })
    });
    if (!response.ok) {
      const errText = await response.text();
      console.error("Chat bot error response:", errText);
      return { success: false, error: errText };
    }
    const result = await response.json();
    console.log(`✅ Notification sent successfully to ${agentEmail}:`, result);
    return { success: true };
  } catch (err) {
    console.error("sendShiftNotification error:", err);
    return { success: false, error: err.message };
  }
}
/**
 * Helper to get agent email from their display name
 */
async function getAgentEmailByName(name) {
  if (!name) return null;

  const { people } = await getCachedMetadata();
  const target = String(name).toLowerCase().trim();

  for (const p of people) {
    const dbName = String(p.name || p.id || "").toLowerCase().trim();

    // Match full name or first name
    if (dbName === target || dbName.split(" ")[0] === target.split(" ")[0]) {
      return p.email || null;
    }
  }
  
  console.warn(`getAgentEmailByName: No email found for "${name}"`);
  return null;
}
const db = new Firestore();
// ============================================
// SIMPLE IN-MEMORY CACHE (for metadata)
// Reduces reads for people/teams which rarely change
// ============================================
const metadataCache = {
  people: null,
  teams: null,
  lastFetch: 0,
  TTL: 5 * 60 * 1000 // 5 minutes
};
async function getCachedMetadata() {
  const now = Date.now();
  if (metadataCache.people && metadataCache.teams && (now - metadataCache.lastFetch) < metadataCache.TTL) {
    console.log("📦 Serving metadata from cache");
    return { people: metadataCache.people, teams: metadataCache.teams };
  }
  
  console.log("🔄 Fetching fresh metadata from Firestore");
  const [peopleSnap, teamsSnap] = await Promise.all([
    db.collection("people").get(),
    db.collection("teams").orderBy("sort", "asc").get()
  ]);
  
  metadataCache.people = peopleSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  metadataCache.teams = teamsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  metadataCache.lastFetch = now;
  
  return { people: metadataCache.people, teams: metadataCache.teams };
}

const ZD_CONFIG = {
    subdomain: process.env.ZENDESK_SUBDOMAIN || "musely",
    adminEmail: process.env.ZENDESK_ADMIN_EMAIL || "genaro.barrera@trusper.com",
    apiToken: process.env.ZENDESK_API_TOKEN || "bUBkQG96B50GVworY7rxKT6b0qFyfpirLeoKVXGS"
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
// Check if two time ranges overlap
function timeRangesOverlap(start1, end1, start2, end2) {
  const s1 = parseTimeDecimal(start1);
  const e1 = parseTimeDecimal(end1);
  const s2 = parseTimeDecimal(start2);
  const e2 = parseTimeDecimal(end2);
  
  // Handle invalid times
  if (s1 === 0 && e1 === 0) return false;
  if (s2 === 0 && e2 === 0) return false;
  
  // Check for overlap: ranges overlap if one starts before the other ends
  return (s1 < e2) && (s2 < e1);
}
// Check if a person is already scheduled during a time slot on a given date
// Also flags lunch conflicts
async function checkDoubleBooking(db, personName, date, startTime, endTime, excludeAssignmentId = null) {
  try {
    // Get all schedule docs for this date
    const datePrefix = date.split("T")[0]; // Ensure YYYY-MM-DD format
    const snap = await db.collection("scheduleDays")
      .where("date", "==", datePrefix)
      .get();
    
    const conflicts = [];
    let hasLunchConflict = false;
    
    snap.forEach(doc => {
      const data = doc.data();
      const assignments = data.assignments || [];
      const teamName = (data.team || doc.id.split("__")[1] || "").toLowerCase();
      
      assignments.forEach(a => {
        // Skip if this is the assignment we're editing
        if (excludeAssignmentId && (String(a.id) === String(excludeAssignmentId) || String(a.assignmentId) === String(excludeAssignmentId))) {
          return;
        }
        
        // Check if same person
        if (String(a.person || "").toLowerCase().trim() === String(personName || "").toLowerCase().trim()) {
          // Check if times overlap
          if (timeRangesOverlap(startTime, endTime, a.start, a.end)) {
            // Flag lunch conflicts specifically
            const isLunch = teamName.includes("lunch") || (a.role || "").toLowerCase().includes("lunch");
            
            conflicts.push({
              docId: doc.id,
              team: data.team || doc.id.split("__")[1] || "",
              start: toAmPm(a.start),
              end: toAmPm(a.end),
              assignmentId: a.id || a.assignmentId,
              isLunchConflict: isLunch
            });
            
            if (isLunch) hasLunchConflict = true;
          }
        }
      });
    });
    
    // Add lunch conflict flag to results
    conflicts.hasLunchConflict = hasLunchConflict;
    
    return conflicts;
  } catch (err) {
    console.error("Double booking check error:", err);
    return [];
  }
}
// Robust time parser (Handles "7:00 AM", "07:00:00", "7:00", etc.)
// Helper to parse "7:00 AM" or "14:00" into decimal hours (e.g. 7.0 or 14.0)
    function parseTimeDecimal(timeStr) {
        if(!timeStr) return 0;
        try {
            // Handle "7:00 AM" style
            const match = timeStr.match(/(\d+):(\d+)\s?(AM|PM)?/i);
            if(!match) return 0;
            
            let h = parseInt(match[1]);
            let m = parseInt(match[2]);
            let ampm = match[3] ? match[3].toUpperCase() : null;
            
            if (ampm === "PM" && h < 12) h += 12;
            if (ampm === "AM" && h === 12) h = 0;
            
            return h + (m / 60);
        } catch(e) { return 0; }
    }
    function normalizeTimeOffType(raw) {
  const s = String(raw || "").trim().toLowerCase();
  // Treat anything with "make" as Make Up Time
  if (s.includes("make")) return "make_up";
  // Treat anything with "pto" as PTO
  if (s.includes("pto")) return "pto";
  // Default to PTO if unknown
  return "pto";
}
// Helper: Calculate hours between two time strings (e.g. "09:00", "17:30")
function calculateHoursDiff(start, end) {
  if (!start || !end) return 0;
  try {
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    const startDec = h1 + (m1 / 60);
    const endDec = h2 + (m2 / 60);
    let diff = endDec - startDec;
    if (diff < 0) diff += 24; // Handle overnight shifts
    return parseFloat(diff.toFixed(2));
  } catch (e) {
    return 0;
  }
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
function getPstDateKey(isoDate) {
  const dt = new Date(isoDate);
  if (Number.isNaN(dt.getTime())) return null;
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(dt);
}
function getPstHour(isoDate) {
  const dt = new Date(isoDate);
  if (Number.isNaN(dt.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    hour: '2-digit',
    hour12: false
  }).formatToParts(dt);
  const hourPart = parts.find(p => p.type === 'hour');
  return hourPart ? Number(hourPart.value) : null;
}

/**
 * Sanitize team name for use in Firestore document IDs
 * Replaces "/" with "-" to avoid path separator issues
 */
function sanitizeTeamName(team) {
  if (!team) return "Unknown";
  return String(team).replace(/\//g, "-").replace(/\s+/g, "");
}

/**
 * Normalize team name to a canonical key (for document IDs and grouping)
 * This ensures "Email/Floater", "EmailFloater", "Email-Floater" all become "EmailFloater"
 */
function getCanonicalTeamKey(team) {
  if (!team) return "Other";
  const t = String(team).toLowerCase().replace(/[\s\-_\/]+/g, '');
  
  // Map variations to canonical keys
  if (t.includes('livechat') || t === 'lc' || t === 'chat') return 'LiveChat';
  if (t.includes('phone')) return 'PhoneSupport';
  if (t.includes('email') || t.includes('floater') || t === 'float') return 'EmailFloater';
  if (t.includes('social') || t === 'ss') return 'Socials';
  if (t.includes('dispute') || t === 'dis') return 'Disputes';
  if (t.includes('md') || t.includes('medical')) return 'MDSupport';
  if (t.includes('project') || t === 'proj') return 'Projects';
  if (t.includes('lunch')) return 'Lunch';
  if (t.includes('1:1') || t.includes('11') && t.includes('meeting')) return '1-1Meetings';
  if (t.includes('meeting') || t === 'mtg') return 'Meeting';
  if (t.includes('defcon')) return 'Defcon';
  if (t.includes('custom')) return 'Custom';
  
  // Default: capitalize first letter, remove special chars
  return String(team).replace(/[\s\-_\/]+/g, '');
}

/**
 * Get the display name for a team (for UI and stored team field)
 */
function getCanonicalTeamDisplay(team) {
  const key = getCanonicalTeamKey(team);
  const displayMap = {
    'LiveChat': 'Live Chat',
    'PhoneSupport': 'Phone Support',
    'EmailFloater': 'Email/Floater',
    'Socials': 'Socials',
    'Disputes': 'Disputes',
    'MDSupport': 'MD Support',
    'Projects': 'Projects',
    'Lunch': 'Lunch',
    '1-1Meetings': '1:1 Meetings',
    'Meeting': 'Meeting',
    'Defcon': 'Defcon',
    'Custom': 'Custom'
  };
  return displayMap[key] || team;
}

/**
 * Structured logging helper with trace ID support
 */
function logWithTrace(traceId, level, operation, message, metadata = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    traceId,
    level,
    operation,
    message,
    ...metadata
  };
  console.log(JSON.stringify(logEntry));
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
function clampDays(d, max = 60) {
  const n = parseInt(d || "14", 10) || 14;
  return Math.min(Math.max(n, 1), max);
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
function requireManager(req) {
  // Check multiple possible sources for manager status
  const isManager = req.user?. isManager === true || 
                    req.isManager === true ||
                    req.body?.isManager === true;

  if (!isManager) {
    return { ok: false, status: 403, body: { ok: false, error: "Forbidden - Manager access required" } };
  }
  return { ok: true };
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
  const cleanPath = reqPath === "/" || reqPath === "" ? "/index.html" : reqPath;

  const candidates = [
    pathMod.join(__dirname, "public", cleanPath), // /public/...
    pathMod.join(__dirname, cleanPath),           // project-root/...
  ];

  for (const abs of candidates) {
    // prevent traversal
    const root = abs.includes(pathMod.join(__dirname, "public"))
      ? pathMod.join(__dirname, "public")
      : __dirname;

    if (!abs.startsWith(root)) continue;

    if (fs.existsSync(abs) && !fs.statSync(abs).isDirectory()) {
      const buf = fs.readFileSync(abs);
      res.status(200).set("Content-Type", contentTypeFor(abs)).send(buf);
      return true;
    }
  }

  return false;
}
function looksLikeStaticAsset(p) {
  const s = String(p || "/");
  return (
    s === "/" ||
    s === "/index.html" ||
    s.startsWith("/assets/") ||
    /\.(css|js|png|jpg|jpeg|svg|ico|map|json)$/i.test(s)
  );
}
/** ------------------------
 * Main HTTP Handler
 * ------------------------ */
functions.http("helloHttp", async (req, res) => {
  try {
    // Generate or extract trace ID
    const traceId = req.get('X-Trace-Id') || `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // CORS first
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type,Authorization,x-preview-key,X-Trace-Id");
    res.set("X-Trace-Id", traceId);

    if (req.method === "OPTIONS") return res.status(204).send("");

    const rawPath = String(req.path || "/");
let path = rawPath.toLowerCase();
if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);

// Check for action parameter FIRST - API calls take priority over static files
const action = (req.query.action || (req.body && req.body.action) || "").toLowerCase();

// ✅ Serve static ONLY if there's NO action parameter
if (!action && req.method === "GET" && looksLikeStaticAsset(rawPath)) {
  // OPTIONAL: if you use PREVIEW_KEY and need the browser to load assets, you can skip the gate for assets:
  // if (rawPath === "/" || rawPath === "/index.html") { if (!requirePreviewKey(req, res)) return; }

  if (servePublicFile(rawPath, res)) return;
  // If the file wasn't found, fall through to normal routing (or you can return 404 here)
}

// Now do action-based routing for API calls
if (action) path = "/" + action;

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
      "/admin/generate",
      "/admin/archive",
      "/admin/seed-base",
      "/update-master-schedule",
      "/agent-profile",
      "/config",
      "/getmetadata",
      "/notifications/send",
      "/notifications/pending",
      "/notifications/dismiss",
      "/holidays/list",
      "/holidays/add",
      "/holidays/delete",
      "/holiday/bank",
      "/agent/schedule",
      "/balances/list",        
      "/balances/update",
      "/audit/logs",
      "/audit/clear",
      "/timeoff/request",
      "/audit/log",
      "/timeoff/list",
      "/staffing/rules",
      "/staffing/rules/delete",
      "/timeoff/count",
      "/timeoff/resolve",
      "/admin/wipe-future",
      "/admin/regenerate-all",
      "/schedule/extended",
      "/schedule/past", 
      "/schedule/future",
      "/zendesk/activity",
      "/agent/notifications",
      "/agent/notifications/read",
      "/swap/request",
      "/swap/pending",
      "/swap/respond",
      "/schedule/check-conflict",
      "/manager/heartbeat",
      "/manager/presence",
      "/manager/notifications",
      "/manager/notifications/read",
      "/timeoff/approve",
      "/timeoff/deny",
      "/people/add",
      "/people/update",
      "/people/list",
      "/base-schedule/save",
      "/agent/notifications/clear",
      "/debug/base-schedule",
      "/open-shifts",
      "/open-shifts/fill"
    ].includes(path);

    if (!isApi) {
      if (servePublicFile(req.path || "/", res)) return;
    }
    // Health
    if (path === "/health") return res.status(200).json({ ok: true, service: "scheduler-api" });
    
    // Debug endpoint for base_schedule
    if (path === "/debug/base-schedule" && req.method === "GET") {
      try {
        const snap = await db.collection("base_schedule").get();
        const data = {};
        let totalItems = 0;
        
        snap.forEach(doc => {
          const items = doc.data().items || [];
          totalItems += items.length;
          data[doc.id] = {
            itemCount: items.length,
            teams: [...new Set(items.map(i => i.team))],
            sampleItems: items.slice(0, 3) // Show first 3 items as sample
          };
        });
        
        return res.status(200).json({
          ok: true,
          documentCount: snap.size,
          totalItems: totalItems,
          days: data,
          message: snap.size === 0 ? "No base_schedule documents found! Please set up Master Template first." : `Found ${totalItems} shifts across ${snap.size} days`
        });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }
    // ============================================
    // NEW: OPTIMIZED AGENT SCHEDULE ENDPOINT
    // Only reads the specific assignments for one agent
    // ============================================
    if (path === "/agent/schedule" && req.method === "POST") {
      const body = readJsonBody(req);
      const agentName = String(body.agentName || "").trim();
      const startParam = body.start || new Date().toISOString().split("T")[0];
      const days = clampDays(body.days || 14);
      if (!agentName) {
        return res.status(400).json({ error: "agentName is required" });
      }
      console.log(`📱 Agent schedule request: ${agentName}, ${days} days from ${startParam}`);
      // Calculate date range
      const startDate = new Date(`${startParam}T00:00:00Z`);
      const endDate = new Date(startDate);
      endDate.setUTCDate(endDate.getUTCDate() + days);
      const endStr = endDate.toISOString().split('T')[0];
      // Query only schedule days in the date range
      // This is more efficient than fetching all docs
      const snapshot = await db.collection("scheduleDays")
        .where("date", ">=", startParam)
        .where("date", "<=", endStr)
        .get();
      console.log(`📊 Found ${snapshot.size} schedule day docs`);
      const results = [];
      let totalAssignments = 0;
      let agentAssignments = 0;
      snapshot.forEach(doc => {
        const d = doc.data();
        totalAssignments += (d.assignments || []).length;
        // Filter assignments to only this agent
        const agentShifts = (d.assignments || []).filter(a => {
          const assignedPerson = String(a.person || "").toLowerCase().trim();
          return assignedPerson === agentName.toLowerCase().trim();
        });
        agentAssignments += agentShifts.length;
        if (agentShifts.length > 0) {
          results.push({
            id: doc.id,
            date: d.date,
            team: d.team || doc.id.split("__")[1] || "",
            assignments: agentShifts.map(a => {
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
            })
          });
        }
      });
      console.log(`✅ Agent ${agentName}: ${agentAssignments} of ${totalAssignments} assignments returned`);
      // Add cache headers for agents (5 minute cache)
      res.set("Cache-Control", "private, max-age=300");
      res.set("X-Agent-Cache", "enabled");
      return res.status(200).json({
        success: true,
        agentName: agentName,
        schedule: { results },
        meta: {
          docsScanned: snapshot.size,
          totalAssignments,
          agentAssignments,
          cacheHint: "5min"
        }
      });
    }
    // Lookups - Now using cached metadata
    if (path === "/people" && req.method === "GET") {
      const { people } = await getCachedMetadata();
      return res.status(200).json({ count: people.length, people });
    }
    if (path === "/admin/wipe-future" && req.method === "POST") {
      const body = readJsonBody(req);
      const confirmWipe = body.confirm === true;
      const includePast = body.includePast === true;
      
      if (!confirmWipe) {
        return res.status(400).json({ 
          error: "Safety check failed", 
          message: "You must pass confirm: true to wipe schedule days" 
        });
      }
      try {
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split("T")[0];
        
        let query;
        let logMessage;
        
        if (includePast) {
          // Delete ALL schedule days (past + future)
          query = db.collection("scheduleDays");
          logMessage = `🗑️ WIPE REQUEST: Deleting ALL scheduleDays...`;
        } else {
          // Delete only future days (from today onwards)
          query = db.collection("scheduleDays").where("date", ">=", today);
          logMessage = `🗑️ WIPE REQUEST: Deleting scheduleDays from ${today} onwards...`;
        }
        
        console.log(logMessage);
        
        const docsToDelete = await query.get();
        
        if (docsToDelete.empty) {
          return res.status(200).json({ 
            ok: true, 
            deleted: 0, 
            message: includePast ? "No schedule days found to delete." : "No future schedule days found to delete." 
          });
        }
        
        // Delete in batches (Firestore limit is 500 per batch)
        const batchSize = 450;
        let deleted = 0;
        let batch = db.batch();
        let batchCount = 0;
        
        for (const doc of docsToDelete.docs) {
          batch.delete(doc.ref);
          batchCount++;
          deleted++;
          
          // Commit batch if we hit the limit
          if (batchCount >= batchSize) {
            await batch.commit();
            batch = db.batch();
            batchCount = 0;
            console.log(`  Deleted ${deleted} docs so far...`);
          }
        }
        
        // Commit any remaining
        if (batchCount > 0) {
          await batch.commit();
        }
        
        const completeMsg = includePast 
          ? `✅ WIPE COMPLETE: Deleted ALL ${deleted} schedule days`
          : `✅ WIPE COMPLETE: Deleted ${deleted} future schedule days`;
        console.log(completeMsg);
        
        return res.status(200).json({ 
          ok: true, 
          deleted: deleted,
          fromDate: includePast ? "all" : today,
          includedPast: includePast,
          message: includePast 
            ? `Successfully deleted ALL ${deleted} schedule days.`
            : `Successfully deleted ${deleted} future schedule days.`
        });
      } catch (err) {
        console.error("Wipe Schedule Error:", err);
        return res.status(500).json({ error: err.message });
      }
    }

    if (path === "/people/add" && req.method === "POST") {
  try {
    const body = readJsonBody(req);
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const role = String(body.role || "agent").trim().toLowerCase();
    const chatUserId = String(body.chatUserId || "").trim();

    if (!name || !email) return res.status(400).json({ ok:false, error:"Missing name or email" });

    // Use lowercase first name as document ID (matching existing structure)
    const docId = name.toLowerCase().split(" ")[0];
    
    // Check if document already exists
    const existingDoc = await db.collection("people").doc(docId).get();
    if (existingDoc.exists) {
      return res.status(400).json({ ok:false, error:`Agent "${name}" already exists (doc ID: ${docId})` });
    }
    
    await db.collection("people").doc(docId).set({
      name,
      email,
      active: true,
      role: role, // 'admin' or 'agent'
      chatUserId: chatUserId || "",
      roles: [],
      teams: []
    });

    // Clear metadata cache so the new agent appears immediately
    metadataCache.people = null;
    metadataCache.lastFetch = 0;

    return res.status(200).json({ ok:true, docId });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok:false, error:e.message });
  }
}

// Update/Modify an existing agent
if (path === "/people/update" && req.method === "POST") {
  try {
    const body = readJsonBody(req);
    const docId = String(body.docId || "").trim().toLowerCase();
    
    if (!docId) return res.status(400).json({ ok:false, error:"Missing docId" });
    
    const docRef = db.collection("people").doc(docId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ ok:false, error:`Agent not found: ${docId}` });
    }
    
    // Build update object with only provided fields
    const updates = {};
    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.email !== undefined) updates.email = String(body.email).trim().toLowerCase();
    if (body.role !== undefined) updates.role = String(body.role).trim().toLowerCase();
    if (body.chatUserId !== undefined) updates.chatUserId = String(body.chatUserId).trim();
    if (body.active !== undefined) updates.active = Boolean(body.active);
    
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ ok:false, error:"No fields to update" });
    }
    
    await docRef.update(updates);
    
    // Clear metadata cache
    metadataCache.people = null;
    metadataCache.lastFetch = 0;
    
    return res.status(200).json({ ok:true, updated: updates });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok:false, error:e.message });
  }
}

// Get all agents with full details (for admin management)
if (path === "/people/list" && req.method === "GET") {
  try {
    const snap = await db.collection("people").get();
    const people = snap.docs.map(doc => ({
      docId: doc.id,
      ...doc.data()
    }));
    return res.status(200).json({ ok:true, people });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok:false, error:e.message });
  }
}

if (path === "/base-schedule/save" && req.method === "POST") {
  try {
    const body = readJsonBody(req);
    const days = body.days || {};
    const validDays = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

    const batch = db.batch();

    validDays.forEach(day => {
      if (!(day in days)) return;
      const raw = Array.isArray(days[day]) ? days[day] : [];
      const items = raw.map(x => ({
        person: String(x.person || "").trim(),
        start: hhmm(x.start),
        end: hhmm(x.end),
        team: String(x.team || "Other").trim(),
        role: String(x.role || "Agent").trim(),
      })).filter(i => i.person && i.start && i.end);

      batch.set(db.collection("base_schedule").doc(day), { items }, { merge: true });
    });

    await batch.commit();
    return res.status(200).json({ ok:true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok:false, error:e.message });
  }
}


    if (path === "/admin/regenerate-all" && req.method === "POST") {
      const body = readJsonBody(req);
      const confirmRegen = body.confirm === true;
      const daysForward = Math.min(Math.max(parseInt(body.days || "14", 10), 1), 60);
      
      if (!confirmRegen) {
        return res.status(400).json({ 
          error: "Safety check failed", 
          message: "You must pass confirm: true to regenerate" 
        });
      }
      try {
        const today = new Date().toISOString().split("T")[0];
        const log = [];
        // ========== STEP 1: DELETE ALL FUTURE DAYS ==========
        console.log(`🔄 REGENERATE: Step 1 - Wiping future days from ${today}...`);
        log.push(`Starting wipe from ${today}`);
        const futureDocs = await db.collection("scheduleDays")
          .where("date", ">=", today)
          .get();
        let deleted = 0;
        if (!futureDocs.empty) {
          const batchSize = 450;
          let batch = db.batch();
          let batchCount = 0;
          for (const doc of futureDocs.docs) {
            batch.delete(doc.ref);
            batchCount++;
            deleted++;
            if (batchCount >= batchSize) {
              await batch.commit();
              batch = db.batch();
              batchCount = 0;
            }
          }
          if (batchCount > 0) {
            await batch.commit();
          }
        }
        log.push(`Deleted ${deleted} existing schedule days`);
        console.log(`  ✓ Deleted ${deleted} days`);
        // ========== STEP 2: LOAD BASE SCHEDULE TEMPLATES ==========
        console.log(`🔄 REGENERATE: Step 2 - Loading base_schedule templates...`);
        const baseSnap = await db.collection("base_schedule").get();
        const templates = {};
        const allTeams = new Set();
        baseSnap.forEach(doc => {
          const items = doc.data().items || [];
          // Use exact doc.id (Mon, Tue, Wed, etc.)
          templates[doc.id] = items;
          console.log(`  📅 ${doc.id}: ${items.length} items`);
          items.forEach(i => {
            if (i.team) {
              allTeams.add(i.team);
            }
          });
        });
        const teamsToProcess = Array.from(allTeams);
        log.push(`Found ${teamsToProcess.length} teams: ${teamsToProcess.join(", ")}`);
        console.log(`  ✓ Teams found: ${teamsToProcess.join(", ")}`);
        
        // ========== STEP 3: GENERATE NEW DAYS ==========
        console.log(`🔄 REGENERATE: Step 3 - Generating ${daysForward} days...`);
        const dayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const todayDate = new Date();
        let generated = 0;
        let totalAssignments = 0;
        
        for (let i = 0; i < daysForward; i++) {
          const d = new Date(todayDate);
          d.setDate(todayDate.getDate() + i);
          const dateStr = d.toISOString().split("T")[0];
          const dow = dayMap[d.getDay()];
          const rawItems = templates[dow] || [];
          
          if (rawItems.length === 0) {
            console.log(`  ⏭️ ${dateStr} (${dow}): No template items`);
            continue;
          }
          
          // Group items by CANONICAL team key (normalizes variations)
          const itemsByTeam = {};
          rawItems.forEach(item => {
            // Use canonical key to group all variations together
            const canonicalKey = getCanonicalTeamKey(item.team);
            if (!itemsByTeam[canonicalKey]) {
              itemsByTeam[canonicalKey] = {
                displayName: getCanonicalTeamDisplay(item.team),
                items: []
              };
            }
            itemsByTeam[canonicalKey].items.push(item);
          });
          
          console.log(`  📅 ${dateStr} (${dow}): ${Object.keys(itemsByTeam).length} teams - ${Object.keys(itemsByTeam).join(', ')}`);
          
          // Create a document for each team
          for (const [teamKey, teamData] of Object.entries(itemsByTeam)) {
            const docId = `${dateStr}__${teamKey}`;
            const docRef = db.collection("scheduleDays").doc(docId);
            const now = toIsoNow();
            
            const assignments = teamData.items.map(tmpl => ({
              id: "gen_" + Math.random().toString(36).substr(2, 9),
              start: tmpl.start,
              end: tmpl.end,
              role: tmpl.role || "Agent",
              person: tmpl.person,
              status: "Active",
              notifyStatus: "Generated",
              notes: tmpl.focus || "",
              updatedAt: now
            }));
            
            await docRef.set({
              id: docId,
              date: dateStr,
              team: teamData.displayName, // Use canonical display name
              assignments: assignments,
              createdAt: now,
              updatedAt: now
            });
            
            generated++;
            totalAssignments += assignments.length;
            console.log(`  ✅ ${docId}: ${assignments.length} shifts`);
          }
        }
        
        log.push(`Generated ${generated} schedule documents with ${totalAssignments} total shifts`);
        console.log(`✅ REGENERATE COMPLETE: ${generated} docs, ${totalAssignments} shifts`);
        
        return res.status(200).json({
          ok: true,
          deleted: deleted,
          generated: generated,
          totalAssignments: totalAssignments,
          daysForward: daysForward,
          teams: teamsToProcess,
          log: log,
          message: `Wiped ${deleted} old days and generated ${generated} new days with ${totalAssignments} shifts.`
        });
      } catch (err) {
        console.error("Regenerate All Error:", err);
        return res.status(500).json({ error: err.message });
      }
    }
    // [NEW] Count pending requests for the notification badge
    if (path === "/timeoff/count" && req.method === "GET") {
      try {
        const snap = await db.collection("time_off_requests")
          .where("status", "==", "pending")
          .get();
        
        return res.status(200).json({ ok: true, count: snap.size });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }
    if (action === "getMetadata" || path === "/getmetadata") {
      try {
        const body = readJsonBody(req);
        const isManager = body.isManager !== false; // Default to true for backward compat
        
        const { people, teams } = await getCachedMetadata();
        
        // For agents, we can return a minimal people list (just names)
        // Managers get full details
        const peopleResponse = isManager 
          ? people 
          : people.map(p => ({ id: p.id, name: p.name })); // Minimal for agents
        
        return res.status(200).json({
          people: peopleResponse,
          teams: teams,
          zendeskMetrics: [], // Placeholder if not used
          success: true
        });
      } catch (e) {
        console.error("Metadata Error:", e);
        return res.status(500).json({ error: e.message });
      }
    }
    if (path === "/teams" && req.method === "GET") {
      const { teams } = await getCachedMetadata();
      return res.status(200).json({ count: teams.length, teams });
    }
    if (path === "/timeoff/request" && req.method === "POST") {
      try {
        const body = readJsonBody(req);
        // NEW: Extract 'team' from the body
        const { person, reason, type, date, shiftStart, shiftEnd, duration, team, makeUpDate, dateRange } = body;
        const typeKey = normalizeTimeOffType(type); 
        if (typeKey === "make_up" && !String(makeUpDate || "").trim()) {
        return res.status(400).json({ error: "Make Up Time requires a make-up date." });
}
        
        if (!person || !reason) return res.status(400).json({ error: "Missing fields" });
        const docRef = db.collection("time_off_requests").doc();
        
        const requestData = {
          id: docRef.id,
          person: person,
          reason: reason,
          type: type || "pto",
          status: "pending",
          date: date || new Date().toISOString().split('T')[0],
          shiftStart: shiftStart || "",
          shiftEnd: shiftEnd || "",
          duration: duration || "shift",
          team: team || "",
          typeKey,                 // "make_up" or "pto" (stable for logic)
          makeUpDate: makeUpDate || "",
          dateRange: dateRange || null, // For multi-day requests
          createdAt: new Date().toISOString()
        };
        
        await docRef.set(requestData);
        
        // Create notification for managers (add to manager_notifications collection)
        const displayDate = dateRange ? 
          `${dateRange.start} to ${dateRange.end}` : 
          (date || new Date().toISOString().split('T')[0]);
        
        // Build notification message with make-up date if applicable
        let notifMessage = `${person} requested ${type || 'PTO'} for ${displayDate}`;
        if (typeKey === "make_up" && makeUpDate) {
          notifMessage += ` (Make-up date: ${makeUpDate})`;
        }
        
        await db.collection("manager_notifications").add({
          type: "timeoff_request",
          requestId: docRef.id,
          agentName: person,
          message: notifMessage,
          reason: reason,
          date: date,
          dateRange: dateRange || null,
          timeOffType: type || "PTO",
          makeUpDate: makeUpDate || null,
          status: "pending",
          createdAt: new Date().toISOString(),
          read: false
        });
        
        console.log(`📝 Time off request created: ${person} - ${type} for ${displayDate}`);
        
        return res.status(200).json({ ok: true, id: docRef.id });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }
if (path === "/audit/log" && req.method === "POST") {
      try {
        const body = readJsonBody(req);
        const { action, manager, target, details, date } = body;
        await db.collection("audit_log").add({
          action: action || "UNKNOWN",
          manager: manager || "System",
          target: target || "",
          details: details || "",
          date: date || "",
          timestamp: new Date().toISOString()
        });
        return res.status(200).json({ ok: true });
      } catch (err) {
        console.error("Audit Log Error:", err);
        return res.status(500).json({ error: err.message });
      }
    }
    // Get audit logs
if (path === "/audit/logs" && req.method === "GET") {
  try {
    const snap = await db.collection("audit_log")
      .orderBy("timestamp", "desc")
      .limit(100)
      .get();
    
    const logs = [];
    snap.forEach(doc => {
      logs.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return res.status(200).json({ ok: true, logs });
  } catch (err) {
    console.error("Audit log error:", err);
    return res.status(500).json({ error: err.message });
  }
}
    // Clear audit logs
    if (path === "/audit/clear" && req.method === "POST") {
      try {
        const body = readJsonBody(req);
        const { mode, olderThanDays } = body; // mode: "all" or "older"
        
        let query = db.collection("audit_log");
        
        if (mode === "older" && olderThanDays) {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
          query = query.where("timestamp", "<", cutoffDate.toISOString());
        }
        
        // Batch delete (Firestore limit is 500 per batch, we'll do 400 for safety)
        let totalDeleted = 0;
        let hasMore = true;
        
        while (hasMore) {
          const snap = await query.limit(400).get();
          
          if (snap.empty) {
            hasMore = false;
            break;
          }
          
          const batch = db.batch();
          snap.docs.forEach(doc => {
            batch.delete(doc.ref);
          });
          
          await batch.commit();
          totalDeleted += snap.size;
          
          // If we got less than 400, we're done
          if (snap.size < 400) {
            hasMore = false;
          }
        }
        
        console.log(`🗑️ Audit log cleared: ${totalDeleted} entries deleted`);
        return res.status(200).json({ ok: true, deleted: totalDeleted });
      } catch (err) {
        console.error("Audit clear error:", err);
        return res.status(500).json({ error: err.message });
      }
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
    // Get all pending notifications
    if (path === "/notifications/pending" && req.method === "GET") {
      try {
        // Get ALL schedule days that might have pending notifications
        // We need to include recent past dates because managers might edit yesterday's schedule
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const minDate = oneWeekAgo.toISOString().split("T")[0];
        
        // Try the indexed query first, fall back to getting all documents
        let snap;
        try {
          snap = await db.collection("scheduleDays")
            .where("date", ">=", minDate)
            .orderBy("date", "asc")
            .get();
        } catch (indexError) {
          // Fall back to getting all documents and filtering in memory
          snap = await db.collection("scheduleDays").get();
        }
        
        const pending = [];
        
        snap.forEach(doc => {
          const data = doc.data();
          
          // Extract date from document ID if date field is missing
          const docDate = data.date || doc.id.split("__")[0];
          
          // Skip documents older than a week (for fallback query)
          if (docDate < minDate) {
            return;
          }
          
          const assignments = data.assignments || [];
          
          assignments.forEach(a => {
            if (a.notifyStatus === "Pending") {
              pending.push({
                docId: doc.id,
                assignmentId: a.id,
                date: docDate,
                team: data.team || doc.id.split("__")[1]?.replace(/_/g, ' ') || "",
                person: a.person,
                start: toAmPm(a.start || ""),
                end: toAmPm(a.end || ""),
                role: a.role || "",
                notes: a.notes || "",
                updatedAt: a.updatedAt || ""
              });
            }
          });
        });
        
        // Sort by date (most recent first for better UX)
        pending.sort((a, b) => b.date.localeCompare(a.date));
        
        return res.status(200).json({ 
          ok: true, 
          count: pending.length, 
          notifications: pending 
        });
        
      } catch (err) {
        console.error("Pending notifications error:", err);
        return res.status(500).json({ error: err.message });
      }
    }
    // Clear (dismiss) a pending notification - sets status to "Dismissed"
    if (path === "/notifications/dismiss" && req.method === "POST") {
      const body = readJsonBody(req);
      const docId = String(body.docId || "").trim();
      const assignmentId = String(body.assignmentId || "").trim();
      
      if (!docId || !assignmentId) {
        return res.status(400).json({ error: "Missing docId or assignmentId" });
      }
      
      try {
        const docRef = db.collection("scheduleDays").doc(docId);
        
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(docRef);
          if (!snap.exists) throw new Error("Doc not found");
          
          const data = snap.data();
          const assignments = data.assignments || [];
          const idx = assignments.findIndex(a => String(a.id || "").trim() === assignmentId);
          
          if (idx === -1) throw new Error("Assignment not found");
          
          assignments[idx].notifyStatus = "Dismissed";
          assignments[idx].updatedAt = toIsoNow();
          
          tx.update(docRef, { assignments, updatedAt: toIsoNow() });
        });
        
        return res.status(200).json({ ok: true, docId, assignmentId, status: "Dismissed" });
        
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }
    // 1. Get Rules
    if (path === "/staffing/rules" && req.method === "GET") {
      try {
        const snap = await db.collection("staffing_rules").get();
        const rules = [];
        snap.forEach(doc => rules.push({ id: doc.id, ...doc.data() }));
        return res.status(200).json(rules);
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }
    // 2. Add/Save a Rule
    if (path === "/staffing/rules" && req.method === "POST") {
      try {
        const body = readJsonBody(req);
        // team: "Socials", day: "Monday" (or "All"), min: 5
        await db.collection("staffing_rules").add(body);
        return res.status(200).json({ ok: true });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }
    // 3. Delete a Rule
    if (path === "/staffing/rules/delete" && req.method === "POST") {
      try {
        const body = readJsonBody(req);
        await db.collection("staffing_rules").doc(body.idx).delete(); // frontend sends 'idx' as the ID
        return res.status(200).json({ ok: true });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }
    if (path === "/roles" && req.method === "GET") {
      const snap = await db.collection("roles").orderBy("sort", "asc").get();
      const roles = snap.docs.map((d) => ({ id: d.id, ...normalizeValue(d.data()) }));
      return res.status(200).json({ count: roles.length, roles });
    }
    // initDashboard - OPTIMIZED to handle agent vs manager differently
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
        console.log(`📊 initDashboard: isManager=${isManager}, agentName=${agentName}, docs=${snapshot.size}`);
        snapshot.forEach(doc => {
          const docData = doc.data();
          if (teamKey && docData.team !== teamKey) return; 
          if (docData.assignments && Array.isArray(docData.assignments)) {
            // OPTIMIZATION: Filter assignments server-side for agents
            docData.assignments = docData.assignments
              .filter(a => {
                // Agents only see their own shifts
                if (!isManager && agentName) {
                  const assignedPerson = String(a.person || "").toLowerCase().trim();
                  const requestingAgent = String(agentName).toLowerCase().trim();
                  return assignedPerson === requestingAgent;
                }
                return true; // Managers see all
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
          // Only include days that have assignments (for agents) or all days (for managers)
          if (docData.assignments && (docData.assignments.length > 0 || isManager)) {
            docData.id = doc.id; 
            results.push(docData);
          }
        });
        // Add cache headers for agents
        if (!isManager) {
          res.set("Cache-Control", "private, max-age=300"); // 5 minutes
          res.set("X-Cache-Type", "agent");
        } else {
          res.set("Cache-Control", "no-cache"); // Managers always get fresh data
          res.set("X-Cache-Type", "manager");
        }
        return res.status(200).json({
          success: true,
          schedule: { results: results }
        });
      } catch (error) {
        console.error("Dashboard Error:", error);
        return res.status(500).json({ error: error.message });
      }
    }
    /** ------------------------
     * Assignment endpoints (legacy + new)
     * ------------------------ */

    // assignment replace (with Chat notification)
    if (path === "/assignment/replace" && req.method === "POST") {
      logWithTrace(traceId, 'info', 'assignment/replace', 'Processing assignment replacement');

      const body = readJsonBody(req);

      const docId = String(body.docId || "").trim();
      const assignmentId = String(body.assignmentId || "").trim();
      const newPerson = String(body.newPerson || "").trim();
      const notes = String(body.notes || "").trim();
      const notifyMode = String(body.notifyMode || "defer").trim(); // "defer" | "send" | "silent"

      if (!docId || !assignmentId || !newPerson) {
        logWithTrace(traceId, 'error', 'assignment/replace', 'Missing required fields', { docId, assignmentId, newPerson });
        return res.status(400).json({ error: "Missing docId, assignmentId, or newPerson" });
      }

      // Validate notifyMode
      if (!["defer", "send", "silent"].includes(notifyMode)) {
  logWithTrace(traceId, 'error', 'assignment/replace', 'Invalid notifyMode', { notifyMode });
  return res.status(400).json({ error: "notifyMode must be 'defer', 'send', or 'silent'" });
}

      const docRef = db.collection("scheduleDays").doc(docId);

      try {
        let oldPerson = "";
        let shiftData = {};
        const updated = await db.runTransaction(async (tx) => {
          const snap = await tx.get(docRef);
          if (!snap.exists) throw new Error(`scheduleDays doc not found: ${docId}`);
          const data = snap.data() || {};
          const assignments = Array.isArray(data.assignments) ? data.assignments : [];
          const idx = assignments.findIndex((a) => String(a.id || "").trim() === assignmentId);
          if (idx === -1) throw new Error(`Assignment not found: ${assignmentId}`);
          const old = assignments[idx] || {};
          oldPerson = old.person || "";
          
          // Capture shift data for notification
          shiftData = {
            date: data.date || docId.split("__")[0],
            start: toAmPm(old.start || ""),
            end: toAmPm(old.end || ""),
            role: old.role || "",
            team: data.team || docId.split("__")[1] || "",
            notes: notes || `Shift reassigned from ${oldPerson}`
          };
          // Set notify status based on mode
          let notifyStatus = "Pending";
if (notifyMode === "send") notifyStatus = "Sent";
if (notifyMode === "silent") notifyStatus = "None";

          const now = toIsoNow();
          const next = assignments.slice();
          next[idx] = { ...old, person: newPerson, notes, notifyStatus, notifyError: null, updatedAt: now };

          tx.update(docRef, { assignments: next, updatedAt: now });
          return next[idx];
        });

        logWithTrace(traceId, 'info', 'assignment/replace', 'Assignment replaced', {
          docId,
          assignmentId,
          oldPerson,
          newPerson,
          notifyMode
        });

        // 🔔 SEND NOTIFICATION TO NEW PERSON
        let notificationResult = { sent: false };

        if (notifyMode === "send") {
          const newPersonEmail = await getAgentEmailByName(newPerson);
          
          if (newPersonEmail) {
            const result = await sendShiftNotification(newPersonEmail, {
              ...shiftData,
              notes: notes || `You have been assigned this shift (previously: ${oldPerson})`
            });
            
            notificationResult = { 
              sent: result.success, 
              recipient: newPerson,
              error: result.error 
            };

            // If send failed, update the assignment to store the error
            if (!result.success) {
              const snap = await docRef.get();
              const data = snap.data() || {};
              const assignments = data.assignments || [];
              const idx = assignments.findIndex((a) => String(a.id || "").trim() === assignmentId);
              if (idx !== -1) {
                assignments[idx].notifyStatus = "Pending";
                assignments[idx].notifyError = result.error;
                await docRef.update({ assignments, updatedAt: toIsoNow() });
              }

              logWithTrace(traceId, 'warn', 'assignment/replace', 'Notification send failed', {
                docId,
                assignmentId,
                recipient: newPerson,
                error: result.error
              });
            }
          } else {
            const error = `Could not find email for ${newPerson}`;
            notificationResult = { 
              sent: false, 
              recipient: newPerson,
              error 
            };

            // Store error in assignment
            const snap = await docRef.get();
            const data = snap.data() || {};
            const assignments = data.assignments || [];
            const idx = assignments.findIndex((a) => String(a.id || "").trim() === assignmentId);
            if (idx !== -1) {
              assignments[idx].notifyStatus = "Pending";
              assignments[idx].notifyError = error;
              await docRef.update({ assignments, updatedAt: toIsoNow() });
            }

            logWithTrace(traceId, 'warn', 'assignment/replace', 'Could not find agent email', {
              docId,
              assignmentId,
              recipient: newPerson
            });
          }
        }

        return res.status(200).json({ 
          ok: true, 
          docId, 
          assignmentId, 
          updated: normalizeValue(updated),
          notification: notificationResult
        });

      } catch (e) {
        logWithTrace(traceId, 'error', 'assignment/replace', 'Error replacing assignment', {
          error: e.message,
          stack: e.stack
        });
        return res.status(500).json({ error: e.message || "Replace failed" });
      }
    }

    // Send pending notifications manually
    if (path === "/notifications/send" && req.method === "POST") {
      logWithTrace(traceId, 'info', 'notifications/send', 'Processing notification send request');

      const body = readJsonBody(req);
      const notifications = body.notifications || []; // Array of {docId, assignmentId}

      if (!Array.isArray(notifications) || notifications.length === 0) {
        logWithTrace(traceId, 'error', 'notifications/send', 'Invalid notifications array');
        return res.status(400).json({ error: "Invalid notifications array" });
      }

      const results = [];

      for (const notif of notifications) {
        try {
          const docId = String(notif.docId || "").trim();
          const assignmentId = String(notif.assignmentId || "").trim();
          
          if (!docId || !assignmentId) {
            results.push({ docId, assignmentId, success: false, error: "Missing IDs" });
            continue;
          }
          
          const docRef = db.collection("scheduleDays").doc(docId);
          const snap = await docRef.get();
          
          if (!snap.exists) {
            results.push({ docId, assignmentId, success: false, error: "Doc not found" });
            continue;
          }
          
          const data = snap.data() || {};
          const assignments = data.assignments || [];
          const assignment = assignments.find(a => String(a.id || "").trim() === assignmentId);
          
          if (!assignment) {
            results.push({ docId, assignmentId, success: false, error: "Assignment not found" });
            continue;
          }
          
          // Get agent email and send notification
          const agentEmail = await getAgentEmailByName(assignment.person);

          if (!agentEmail) {
            const error = `No email for ${assignment.person}`;
            results.push({ docId, assignmentId, success: false, error });

            // Keep status as Pending and store error
            const idx = assignments.findIndex(a => String(a.id || "").trim() === assignmentId);
            if (idx !== -1) {
              assignments[idx].notifyStatus = "Pending";
              assignments[idx].notifyError = error;
              assignments[idx].updatedAt = toIsoNow();
              await docRef.update({ assignments, updatedAt: toIsoNow() });
            }
            continue;
          }

          const shiftData = {
            date: data.date || docId.split("__")[0],
            start: toAmPm(assignment.start || ""),
            end: toAmPm(assignment.end || ""),
            role: assignment.role || "",
            team: data.team || docId.split("__")[1] || "",
            notes: assignment.notes || "You have a scheduled shift."
          };

          const sendResult = await sendShiftNotification(agentEmail, shiftData);

          // Update assignment based on send result
          const idx = assignments.findIndex(a => String(a.id || "").trim() === assignmentId);
          if (idx !== -1) {
            if (sendResult.success) {
              assignments[idx].notifyStatus = "Sent";
              assignments[idx].notifyError = null; // Clear any previous error
              assignments[idx].updatedAt = toIsoNow();

              logWithTrace(traceId, 'info', 'notifications/send', 'Notification sent successfully', {
                docId,
                assignmentId,
                person: assignment.person
              });
            } else {
              // Keep as Pending with error stored
              assignments[idx].notifyStatus = "Pending";
              assignments[idx].notifyError = sendResult.error || "Unknown error";
              assignments[idx].updatedAt = toIsoNow();

              logWithTrace(traceId, 'warn', 'notifications/send', 'Notification send failed', {
                docId,
                assignmentId,
                person: assignment.person,
                error: sendResult.error
              });
            }
            await docRef.update({ assignments, updatedAt: toIsoNow() });
          }

          results.push({ 
            docId, 
            assignmentId, 
            person: assignment.person,
            success: sendResult.success, 
            error: sendResult.error,
            retryable: !sendResult.success // Mark as retryable if failed
          });

        } catch (err) {
          logWithTrace(traceId, 'error', 'notifications/send', 'Exception during notification send', {
            docId: notif.docId,
            assignmentId: notif.assignmentId,
            error: err.message
          });
          results.push({ 
            docId: notif.docId, 
            assignmentId: notif.assignmentId, 
            success: false, 
            error: err.message,
            retryable: true
          });
        }
      }

      const successCount = results.filter(r => r.success).length;
      const failedCount = results.filter(r => !r.success).length;

      logWithTrace(traceId, 'info', 'notifications/send', 'Notification send completed', {
        total: results.length,
        success: successCount,
        failed: failedCount
      });

      return res.status(200).json({ 
        ok: true, 
        sent: successCount,
        failed: failedCount,
        total: results.length,
        results 
      });
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
   
    if (path === "/schedule/extended" && req.method === "POST") {
      const body = req.body || {};
      const { daysBack = 30, daysForward = 60, targetEmail } = body;
      
      // Clamp values for safety
      const pastDays = Math.min(Math.max(parseInt(daysBack, 10) || 30, 0), 30);
      const futureDays = Math.min(Math.max(parseInt(daysForward, 10) || 60, 1), 60);
      
      // Calculate start date (past days ago)
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - pastDays);
      const startISO = startDate.toISOString().split("T")[0];
      
      // Total days to fetch
      const totalDays = pastDays + futureDays;
      
      // Get all teams
      const teamsSnap = await db.collection("teams").get();
      const teams = teamsSnap.docs.map(d => d.id);
      
      // Fetch schedule for all teams
      const allResults = [];
      for (const team of teams) {
        const teamResults = await fetchSchedule(team, startISO, totalDays);
        allResults.push(...teamResults);
      }
      
      // Mark today's date for reference
      const todayISO = today.toISOString().split("T")[0];
      
      return res.status(200).json({
        ok: true,
        results: allResults,
        meta: {
          startDate: startISO,
          endDate: new Date(startDate.getTime() + (totalDays - 1) * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          today: todayISO,
          daysBack: pastDays,
          daysForward: futureDays,
          totalDays: totalDays
        }
      });
    }
// 1C. Add endpoint for loading just past days (for "Load History" button)
    // ============================================
    // LOAD PAST SCHEDULE ONLY
    // ============================================
    if (path === "/schedule/past" && req.method === "POST") {
      const body = req.body || {};
      const { daysBack = 30, agentName, isManager = true } = body;
      
      const pastDays = Math.min(Math.max(parseInt(daysBack, 10) || 30, 1), 30);
      
      // Calculate date range (from X days ago to yesterday)
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - pastDays);
      const startISO = startDate.toISOString().split("T")[0];
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Get all teams
      const teamsSnap = await db.collection("teams").get();
      const teams = teamsSnap.docs.map(d => d.id);
      
      // Fetch past schedule for all teams
      const allResults = [];
      for (const team of teams) {
        const teamResults = await fetchSchedule(team, startISO, pastDays);
        
        // Filter for agent if not manager
        if (!isManager && agentName) {
          teamResults.forEach(day => {
            if (day.assignments) {
              day.assignments = day.assignments.filter(a => {
                const assignedPerson = String(a.person || "").toLowerCase().trim();
                return assignedPerson === String(agentName).toLowerCase().trim();
              });
            }
          });
        }
        
        allResults.push(...teamResults.filter(day => 
          isManager || (day.assignments && day.assignments.length > 0)
        ));
      }
      
      return res.status(200).json({
        ok: true,
        results: allResults,
        meta: {
          startDate: startISO,
          daysBack: pastDays,
          filteredFor: agentName || null
        }
      });
    }
// 1D. Add endpoint for loading extended future (for "Load More Future" button)
    // ============================================
    // LOAD EXTENDED FUTURE SCHEDULE (with auto-generation)
    // ============================================
    if (path === "/schedule/future" && req.method === "POST") {
      const body = req.body || {};
      const { daysForward = 60, startFrom, agentName, isManager = true } = body;
      
      const futureDays = Math.min(Math.max(parseInt(daysForward, 10) || 60, 1), 60);
      
      // Start from today or specified date
      const today = new Date();
      const todayISO = today.toISOString().split("T")[0];
      const startDate = startFrom ? new Date(startFrom + "T00:00:00Z") : today;
      const startISO = startDate.toISOString().split("T")[0];
      
      console.log(`📅 SCHEDULE/FUTURE: Loading ${futureDays} days starting ${startISO} (agent: ${agentName || 'N/A'}, isManager: ${isManager})`);
      
      try {
        // Calculate end date for query
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + futureDays);
        const endISO = endDate.toISOString().split("T")[0];
        
        // Query existing schedule days in the date range
        const existingSnap = await db.collection("scheduleDays")
          .where("date", ">=", startISO)
          .where("date", "<", endISO)
          .get();
        
        console.log(`  ✓ Found ${existingSnap.size} existing schedule documents`);
        
        const results = [];
        
        existingSnap.forEach(snap => {
          const data = snap.data();
          
          // Filter assignments for agents
          let assignments = (data.assignments || []).map(normalizeAssignment);
          if (!isManager && agentName) {
            assignments = assignments.filter(a => {
              const assignedPerson = String(a.person || "").toLowerCase().trim();
              return assignedPerson === String(agentName).toLowerCase().trim();
            });
          }
          
          // Only include if manager or has agent's shifts
          if (isManager || assignments.length > 0) {
            results.push({
              id: snap.id,
              ...normalizeValue(data),
              assignments: assignments
            });
          }
        });
        
        // Sort by date
        results.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
        
        console.log(`  ✓ Returning ${results.length} schedule days (no generation - use Regenerate for that)`);
        
        return res.status(200).json({
          ok: true,
          results: results,
          meta: {
            startDate: startISO,
            endDate: endISO,
            daysForward: futureDays,
            loadedDays: results.length,
            note: "Use 'Regenerate' in Admin Tools to create missing schedules"
          }
        });
        
      } catch (err) {
        console.error("Schedule Future Error:", err);
        return res.status(500).json({ error: err.message });
      }
    }
    // ============================================
    // AGENT NOTIFICATIONS
    // ============================================
    
    // Get notifications for an agent
    if (path === "/agent/notifications" && req.method === "POST") {
      try {
        const body = readJsonBody(req);
        const agentName = String(body.agentName || "").trim();
        
        if (!agentName) {
          return res.status(400).json({ error: "Missing agentName" });
        }
        
        // Get all notifications for this agent (avoid index requirement)
        const snap = await db.collection("agent_notifications")
          .where("recipientName", "==", agentName)
          .get();
        
        const notifications = [];
        snap.forEach(doc => {
          notifications.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by createdAt desc in memory
        notifications.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });
        
        // Limit to 50
        const limited = notifications.slice(0, 50);
        const unreadCount = limited.filter(n => !n.read).length;
        
        return res.status(200).json({ 
          ok: true, 
          notifications: limited,
          unreadCount
        });
        
      } catch (err) {
        console.error("Agent notifications error:", err);
        return res.status(500).json({ error: err.message });
      }
    }
    
    // Mark notification as read
    if (path === "/agent/notifications/read" && req.method === "POST") {
      try {
        const body = readJsonBody(req);
        const notifId = String(body.notifId || "").trim();
        
        if (!notifId) {
          return res.status(400).json({ error: "Missing notifId" });
        }
        
        await db.collection("agent_notifications").doc(notifId).update({
          read: true,
          readAt: new Date().toISOString()
        });
        
        return res.status(200).json({ ok: true });
        
      } catch (err) {
        console.error("Mark notification read error:", err);
        return res.status(500).json({ error: err.message });
      }
    }
    
    // Clear all notifications for an agent
if (path === "/agent/notifications/clear" && req.method === "POST") {
  try {
    const body = await readJsonBody(req); // IMPORTANT: await if your helper returns a Promise
    const agentName = String(body.agentName || "").trim();

    if (!agentName) return res.status(400).json({ ok: false, error: "Missing agentName" });

    const col = db.collection("agent_notifications");
    let deleted = 0;

    while (true) {
      const snap = await col
        .where("recipientName", "==", agentName) // ✅ matches your schema
        .limit(400)
        .get();

      if (snap.empty) break;

      const batch = db.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();

      deleted += snap.size;
      if (snap.size < 400) break;
    }

    return res.json({ ok: true, deleted });
  } catch (err) {
    console.error("agent/notifications/clear failed:", err);
    return res.status(500).json({ ok: false, error: err.message || String(err) });
  }
}

    // Submit a swap request
    if (path === "/swap/request" && req.method === "POST") {
      try {
        const body = readJsonBody(req);
        const { 
          fromPerson, 
          toPerson, 
          shiftDate, 
          shiftStart, 
          shiftEnd, 
          team,
          docId,
          assignmentId,
          note 
        } = body;
        
        if (!fromPerson || !toPerson || !shiftDate) {
          return res.status(400).json({ error: "Missing required fields" });
        }
        
        // Create the swap request
        const swapData = {
          fromPerson,
          toPerson,
          shiftDate,
          shiftStart: shiftStart || "",
          shiftEnd: shiftEnd || "",
          team: team || "",
          docId: docId || "",
          assignmentId: assignmentId || "",
          note: note || "",
          status: "pending",
          createdAt: new Date().toISOString()
        };
        
        const swapRef = await db.collection("swap_requests").add(swapData);
        
        // Create in-app notification for the target person
        await db.collection("agent_notifications").add({
          recipientName: toPerson,
          type: "swap_request",
          message: `${fromPerson} wants to swap their ${shiftDate} shift with you`,
          swapRequestId: swapRef.id,
          fromPerson,
          shiftDate,
          shiftStart,
          shiftEnd,
          createdAt: new Date().toISOString(),
          read: false
        });
        
        // Also send Chat notification to target agent
        try {
          const toEmail = await getAgentEmailByName(toPerson);
          if (toEmail) {
            await sendShiftNotification(toEmail, {
              date: shiftDate,
              start: shiftStart || "N/A",
              end: shiftEnd || "N/A",
              team: team || "Support",
              notes: `🔄 Swap Request from ${fromPerson}: "${note || 'Would you like to swap shifts?'}"`
            });
            console.log(`📱 Chat notification sent to ${toPerson} for swap request`);
          }
        } catch (chatErr) {
          console.warn("Chat notification failed (non-fatal):", chatErr.message);
        }
        
        console.log(`🔄 Swap request created: ${fromPerson} -> ${toPerson} for ${shiftDate}`);
        
        return res.status(200).json({ ok: true, swapId: swapRef.id });
        
      } catch (err) {
        console.error("Swap request error:", err);
        return res.status(500).json({ error: err.message });
      }
    }
    
    // Get pending swap requests for a person
    if (path === "/swap/pending" && req.method === "POST") {
      try {
        const body = readJsonBody(req);
        const agentName = String(body.agentName || "").trim();
        
        if (!agentName) {
          return res.status(400).json({ error: "Missing agentName" });
        }
        
        // Get requests TO this person
        const incomingSnap = await db.collection("swap_requests")
          .where("toPerson", "==", agentName)
          .where("status", "==", "pending")
          .get();
        
        // Get requests FROM this person
        const outgoingSnap = await db.collection("swap_requests")
          .where("fromPerson", "==", agentName)
          .where("status", "==", "pending")
          .get();
        
        const incoming = [];
        incomingSnap.forEach(doc => incoming.push({ id: doc.id, ...doc.data() }));
        
        const outgoing = [];
        outgoingSnap.forEach(doc => outgoing.push({ id: doc.id, ...doc.data() }));
        
        return res.status(200).json({ ok: true, incoming, outgoing });
        
      } catch (err) {
        console.error("Pending swaps error:", err);
        return res.status(500).json({ error: err.message });
      }
    }
    
    // Respond to a swap request (accept/decline)
    if (path === "/swap/respond" && req.method === "POST") {
      try {
        logWithTrace(traceId, 'info', 'swap/respond', 'Processing swap response');

        const body = readJsonBody(req);
        const { swapId, response, responderName } = body; // response: "accepted" or "declined"

        if (!swapId || !response) {
          logWithTrace(traceId, 'error', 'swap/respond', 'Missing required fields', { swapId, response });
          return res.status(400).json({ error: "Missing swapId or response" });
        }

        const swapRef = db.collection("swap_requests").doc(swapId);
        const swapDoc = await swapRef.get();

        if (!swapDoc.exists) {
          logWithTrace(traceId, 'error', 'swap/respond', 'Swap request not found', { swapId });
          return res.status(404).json({ error: "Swap request not found" });
        }

        const swapData = swapDoc.data();
        
        // Update swap request status
        await swapRef.update({
          status: response,
          respondedAt: new Date().toISOString(),
          respondedBy: responderName || swapData.toPerson
        });
        
        // If accepted, perform the actual swap in the schedule
        if (response === "accepted" && swapData.docId && swapData.assignmentId) {
          const schedRef = db.collection("scheduleDays").doc(swapData.docId);
          const schedDoc = await schedRef.get();
          
          if (schedDoc.exists) {
            const schedData = schedDoc.data();
            const assignments = schedData.assignments || [];
            
            const idx = assignments.findIndex(a => 
              String(a.id) === String(swapData.assignmentId) || 
              String(a.assignmentId) === String(swapData.assignmentId)
            );
            
            if (idx !== -1) {
              const updatedAssignments = [...assignments];
              updatedAssignments[idx] = {
                ...updatedAssignments[idx],
                person: swapData.toPerson,
                notes: (updatedAssignments[idx].notes || "") + ` [Swapped from ${swapData.fromPerson}]`,
                updatedAt: new Date().toISOString()
              };
              
              await schedRef.update({
                assignments: updatedAssignments,
                updatedAt: new Date().toISOString()
              });

              logWithTrace(traceId, 'info', 'swap/respond', 'Swap executed in schedule', {
                swapId,
                docId: swapData.docId,
                fromPerson: swapData.fromPerson,
                toPerson: swapData.toPerson
              });
            }
          }
        }
        
        // Notify the requester of the response
        await db.collection("agent_notifications").add({
          recipientName: swapData.fromPerson,
          type: "swap_response",
          message: response === "accepted" 
            ? `${swapData.toPerson} accepted your swap request for ${swapData.shiftDate}`
            : `${swapData.toPerson} declined your swap request for ${swapData.shiftDate}`,
          swapRequestId: swapId,
          decision: response,
          createdAt: new Date().toISOString(),
          read: false
        });

        logWithTrace(traceId, 'info', 'swap/respond', 'Swap response processed', {
          swapId,
          response,
          fromPerson: swapData.fromPerson,
          toPerson: swapData.toPerson
        });

        return res.status(200).json({ ok: true });

      } catch (err) {
        logWithTrace(traceId, 'error', 'swap/respond', 'Error processing swap response', {
          error: err.message,
          stack: err.stack
        });
        return res.status(500).json({ error: err.message });
      }
    }

    // ============================================
    // MANAGER PRESENCE TRACKING
    // ============================================

    // POST /manager/heartbeat - Record manager activity
    if (path === "/manager/heartbeat" && req.method === "POST") {
      try {
        logWithTrace(traceId, 'info', 'manager/heartbeat', 'Recording manager heartbeat');

        const body = readJsonBody(req);
        const { managerName, view, area } = body; // view: "Master Template" | "Daily Schedule" | etc, area: team name or date

        if (!managerName) {
          return res.status(400).json({ error: "Missing managerName" });
        }

        const now = new Date().toISOString();
        const presenceDocId = managerName.replace(/\s+/g, '_').toLowerCase();

        await db.collection("manager_presence").doc(presenceDocId).set({
          managerName,
          view: view || "Unknown",
          area: area || "",
          lastHeartbeat: now,
          updatedAt: now
        }, { merge: true });

        logWithTrace(traceId, 'info', 'manager/heartbeat', 'Heartbeat recorded', {
          managerName,
          view,
          area
        });

        return res.status(200).json({ ok: true });

      } catch (err) {
        logWithTrace(traceId, 'error', 'manager/heartbeat', 'Error recording heartbeat', {
          error: err.message
        });
        return res.status(500).json({ error: err.message });
      }
    }

    // GET or POST /manager/presence - Get active manager presence
    if (path === "/manager/presence" && (req.method === "GET" || req.method === "POST")) {
  const guard = requireManager(req);
  if (!guard.ok) return res.status(guard.status).json(guard.body);
  try {
    // Consider managers active if heartbeat within last 10 minutes
    const cutoffIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    // Query only active managers
    const snap = await db.collection("manager_presence")
      .where("lastHeartbeat", ">=", cutoffIso)
      .get();

    const activeManagers = [];
    snap.forEach(doc => {
      const data = doc.data();
      activeManagers.push({
        managerName: data.managerName,
        view: data.view,
        area: data.area,
        lastHeartbeat: data.lastHeartbeat
      });
    });

    logWithTrace(traceId, 'info', 'manager/presence', 'Fetched active managers', {
      total: activeManagers.length,
      managers: activeManagers.map(m => m.managerName)
    });

    return res.status(200).json({ ok: true, activeManagers });

  } catch (err) {
    logWithTrace(traceId, 'error', 'manager/presence', 'Error fetching manager presence', {
      error: err.message
    });
    return res.status(500).json({ error: err.message });
  }
}

    
    // ============================================
    // MANAGER NOTIFICATIONS
    // ============================================
    
    // GET manager notifications
    if (path === "/manager/notifications" && req.method === "POST") {
      try {
        // Get all manager notifications (no filter by name since all managers see all)
        const snap = await db.collection("manager_notifications").get();
        
        const notifications = [];
        snap.forEach(doc => {
          notifications.push({ id: doc.id, ...doc.data() });
        });
        
        // Sort by createdAt desc
        notifications.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });
        
        const limited = notifications.slice(0, 50);
        const unreadCount = limited.filter(n => !n.read && n.status === "pending").length;
        
        return res.status(200).json({ 
          ok: true, 
          notifications: limited,
          unreadCount
        });
        
      } catch (err) {
        console.error("Manager notifications error:", err);
        return res.status(500).json({ error: err.message });
      }
    }
    
    // Mark manager notification as read
    if (path === "/manager/notifications/read" && req.method === "POST") {
      try {
        const body = readJsonBody(req);
        const notifId = String(body.notifId || "").trim();
        
        if (!notifId) {
          return res.status(400).json({ error: "Missing notifId" });
        }
        
        await db.collection("manager_notifications").doc(notifId).update({
          read: true,
          readAt: new Date().toISOString()
        });
        
        return res.status(200).json({ ok: true });
        
      } catch (err) {
        console.error("Mark notification read error:", err);
        return res.status(500).json({ error: err.message });
      }
    }
    
    // ============================================
    // TIME OFF APPROVE / DENY
    // ============================================
    
    // Approve time off request
    if (path === "/timeoff/approve" && req.method === "POST") {
      try {
        const body = readJsonBody(req);
        const { requestId, managerName, notifId } = body;
        
        if (!requestId) {
          return res.status(400).json({ error: "Missing requestId" });
        }
        
        // Get the request details
        const requestDoc = await db.collection("time_off_requests").doc(requestId).get();
        if (!requestDoc.exists) {
          return res.status(404).json({ error: "Request not found" });
        }
        
        const requestData = requestDoc.data();
        const agentName = requestData.person || requestData.agentName;
        const requestDate = requestData.date;
        
        // Update the request status
        await db.collection("time_off_requests").doc(requestId).update({
          status: "approved",
          approvedBy: managerName || "Manager",
          approvedAt: new Date().toISOString()
        });
        
        // Update the manager notification
        if (notifId) {
          await db.collection("manager_notifications").doc(notifId).update({
            status: "approved",
            resolvedBy: managerName,
            resolvedAt: new Date().toISOString()
          });
        }
        
        // ========================================
        // MARK AGENT'S SHIFTS AS "OPEN" FOR THE DATE
        // ========================================
        let shiftsMarkedOpen = 0;
        const openShifts = [];
        
        try {
          // Find all schedule documents for this date
          const scheduleSnap = await db.collection("scheduleDays")
            .where("date", "==", requestDate)
            .get();
          
          for (const doc of scheduleSnap.docs) {
            const data = doc.data();
            const assignments = data.assignments || [];
            let modified = false;
            
            // Find assignments for this agent
            const updatedAssignments = assignments.map(a => {
              const personName = String(a.person || "").toLowerCase().trim();
              const targetName = String(agentName || "").toLowerCase().trim();
              
              if (personName === targetName || personName.split(" ")[0] === targetName.split(" ")[0]) {
                // Mark this shift as open
                modified = true;
                shiftsMarkedOpen++;
                
                const openShiftData = {
                  docId: doc.id,
                  assignmentId: a.id,
                  originalPerson: a.person,
                  team: data.team || doc.id.split("__")[1] || "",
                  date: requestDate,
                  start: a.start,
                  end: a.end,
                  role: a.role,
                  reason: `PTO approved for ${a.person}`,
                  timeOffType: requestData.type || requestData.timeOffType || "PTO"
                };
                openShifts.push(openShiftData);
                
                return {
                  ...a,
                  person: "Open",
                  originalPerson: a.person,
                  isOpenShift: true,
                  openReason: `PTO: ${requestData.reason || 'Time off approved'}`,
                  timeOffRequestId: requestId,
                  updatedAt: new Date().toISOString()
                };
              }
              return a;
            });
            
            if (modified) {
              await doc.ref.update({ 
                assignments: updatedAssignments, 
                updatedAt: new Date().toISOString() 
              });
            }
          }
          
          console.log(`📋 Marked ${shiftsMarkedOpen} shifts as Open for ${agentName} on ${requestDate}`);
          
        } catch (scheduleErr) {
          console.warn("Could not update schedule (non-fatal):", scheduleErr.message);
        }
        
        // Create notification for the agent (in-app only - no Google Chat DM)
        await db.collection("agent_notifications").add({
          recipientName: agentName,
          type: "timeoff_approved",
          message: `✅ Your ${requestData.type || requestData.timeOffType || 'PTO'} request for ${requestDate} has been approved`,
          requestId: requestId,
          approvedBy: managerName || "Manager",
          createdAt: new Date().toISOString(),
          read: false
        });
        
        console.log(`✅ Time off approved: ${agentName} - ${requestDate} by ${managerName}`);
        
        return res.status(200).json({ 
          ok: true,
          shiftsMarkedOpen,
          openShifts
        });
        
      } catch (err) {
        console.error("Approve time off error:", err);
        return res.status(500).json({ error: err.message });
      }
    }
    
    // Deny time off request
    if (path === "/timeoff/deny" && req.method === "POST") {
      try {
        const body = readJsonBody(req);
        const { requestId, managerName, reason, notifId } = body;
        
        if (!requestId) {
          return res.status(400).json({ error: "Missing requestId" });
        }
        
        // Get the request details
        const requestDoc = await db.collection("time_off_requests").doc(requestId).get();
        if (!requestDoc.exists) {
          return res.status(404).json({ error: "Request not found" });
        }
        
        const requestData = requestDoc.data();
        
        // Update the request status
        await db.collection("time_off_requests").doc(requestId).update({
          status: "denied",
          deniedBy: managerName || "Manager",
          deniedAt: new Date().toISOString(),
          denialReason: reason || ""
        });
        
        // Update the manager notification
        if (notifId) {
          await db.collection("manager_notifications").doc(notifId).update({
            status: "denied",
            resolvedBy: managerName,
            resolvedAt: new Date().toISOString()
          });
        }
        
        // Create notification for the agent (in-app only - no Google Chat DM)
        await db.collection("agent_notifications").add({
          recipientName: requestData.person,
          type: "timeoff_denied",
          message: `❌ Your ${requestData.type || 'PTO'} request for ${requestData.date} was not approved${reason ? ': ' + reason : ''}`,
          requestId: requestId,
          deniedBy: managerName || "Manager",
          reason: reason || "",
          createdAt: new Date().toISOString(),
          read: false
        });
        
        console.log(`❌ Time off denied: ${requestData.person} - ${requestData.date} by ${managerName}`);
        
        return res.status(200).json({ ok: true });
        
      } catch (err) {
        console.error("Deny time off error:", err);
        return res.status(500).json({ error: err.message });
      }
    }
    
    // ============================================
    // OPEN SHIFTS MANAGEMENT
    // ============================================
    
    // Get all open shifts
    if (path === "/open-shifts" && req.method === "GET") {
      try {
        const today = new Date().toISOString().split("T")[0];
        
        // Get schedule days from today onwards
        const snap = await db.collection("scheduleDays")
          .where("date", ">=", today)
          .get();
        
        const openShifts = [];
        
        snap.forEach(doc => {
          const data = doc.data();
          const docDate = data.date || doc.id.split("__")[0];
          const assignments = data.assignments || [];
          
          assignments.forEach(a => {
            const personLower = String(a.person || "").toLowerCase().trim();
            if (personLower === "open" || a.isOpenShift === true) {
              openShifts.push({
                docId: doc.id,
                assignmentId: a.id,
                date: docDate,
                team: data.team || doc.id.split("__")[1]?.replace(/_/g, ' ') || "",
                start: a.start,
                end: a.end,
                startLabel: toAmPm(a.start || ""),
                endLabel: toAmPm(a.end || ""),
                role: a.role || "",
                originalPerson: a.originalPerson || "",
                openReason: a.openReason || "",
                timeOffRequestId: a.timeOffRequestId || ""
              });
            }
          });
        });
        
        // Sort by date then time
        openShifts.sort((a, b) => {
          const dateCompare = a.date.localeCompare(b.date);
          if (dateCompare !== 0) return dateCompare;
          return (a.start || "").localeCompare(b.start || "");
        });
        
        return res.status(200).json({ 
          ok: true, 
          count: openShifts.length,
          openShifts 
        });
        
      } catch (err) {
        console.error("Get open shifts error:", err);
        return res.status(500).json({ error: err.message });
      }
    }
    
    // Fill an open shift with an agent
    if (path === "/open-shifts/fill" && req.method === "POST") {
      try {
        const body = readJsonBody(req);
        const { docId, assignmentId, agentName, notifyAgent } = body;
        
        if (!docId || !assignmentId || !agentName) {
          return res.status(400).json({ error: "Missing required fields: docId, assignmentId, agentName" });
        }
        
        const docRef = db.collection("scheduleDays").doc(docId);
        
        let shiftData = {};
        
        await db.runTransaction(async (tx) => {
          const doc = await tx.get(docRef);
          if (!doc.exists) throw new Error("Schedule document not found");
          
          const data = doc.data();
          const assignments = data.assignments || [];
          
          const idx = assignments.findIndex(a => String(a.id || "") === String(assignmentId));
          if (idx === -1) throw new Error("Assignment not found");
          
          const old = assignments[idx];
          
          // Store shift data for notification
          shiftData = {
            date: data.date || docId.split("__")[0],
            start: toAmPm(old.start || ""),
            end: toAmPm(old.end || ""),
            team: data.team || docId.split("__")[1] || "",
            role: old.role || ""
          };
          
          // Update the assignment
          assignments[idx] = {
            ...old,
            person: agentName,
            isOpenShift: false,
            filledAt: new Date().toISOString(),
            filledFrom: old.originalPerson || "Open",
            notifyStatus: notifyAgent ? "Pending" : "None"
          };
          
          tx.update(docRef, { 
            assignments, 
            updatedAt: new Date().toISOString() 
          });
        });
        
        // Send notification if requested
        let notificationResult = { sent: false };
        if (notifyAgent) {
          try {
            const agentEmail = await getAgentEmailByName(agentName);
            if (agentEmail) {
              const result = await sendShiftNotification(agentEmail, {
                ...shiftData,
                notes: `You have been assigned to cover this shift`
              });
              notificationResult = { sent: result.success, error: result.error };
            }
          } catch (notifErr) {
            notificationResult = { sent: false, error: notifErr.message };
          }
        }
        
        // Create in-app notification for the agent
        await db.collection("agent_notifications").add({
          recipientName: agentName,
          type: "shift_assigned",
          message: `📋 You've been assigned a shift on ${shiftData.date} (${shiftData.start} - ${shiftData.end})`,
          shiftDate: shiftData.date,
          team: shiftData.team,
          createdAt: new Date().toISOString(),
          read: false
        });
        
        console.log(`✅ Open shift filled: ${agentName} assigned to ${docId} - ${shiftData.date}`);
        
        return res.status(200).json({ 
          ok: true, 
          notification: notificationResult 
        });
        
      } catch (err) {
        console.error("Fill open shift error:", err);
        return res.status(500).json({ error: err.message });
      }
    }
    
    // ============================================
    // DOUBLE-BOOKING / CONFLICT CHECK
    // ============================================
    if (path === "/schedule/check-conflict" && req.method === "POST") {
      try {
        logWithTrace(traceId, 'info', 'schedule/check-conflict', 'Checking for scheduling conflicts');

        const body = readJsonBody(req);
        const { personName, date, startTime, endTime, excludeAssignmentId } = body;

        if (!personName || !date || !startTime || !endTime) {
          logWithTrace(traceId, 'error', 'schedule/check-conflict', 'Missing required fields');
          return res.status(400).json({ error: "Missing required fields" });
        }

        const conflicts = await checkDoubleBooking(
          db, 
          personName, 
          date, 
          startTime, 
          endTime, 
          excludeAssignmentId
        );

        logWithTrace(traceId, 'info', 'schedule/check-conflict', 'Conflict check completed', {
          personName,
          date,
          hasConflict: conflicts.length > 0,
          conflictCount: conflicts.length
        });

        return res.status(200).json({ 
          ok: true, 
          hasConflict: conflicts.length > 0,
          conflicts
        });

      } catch (err) {
        logWithTrace(traceId, 'error', 'schedule/check-conflict', 'Error checking conflicts', {
          error: err.message,
          stack: err.stack
        });
        return res.status(500).json({ error: err.message });
      }
    }
    if (path === "/holidays/list" && req.method === "GET") {
      try {
        const snap = await db.collection("holidays").orderBy("date", "asc").get();
        const holidays = [];
        
        snap.forEach(doc => {
          holidays.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        return res.status(200).json({ ok: true, holidays });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }
    // POST - Add a holiday
    if (path === "/holidays/add" && req.method === "POST") {
      try {
        const body = readJsonBody(req);
        const { date, name, theme, emoji } = body;
        
        if (!date || !name) {
          return res.status(400).json({ error: "Date and name are required" });
        }
        
        // Use date as document ID to prevent duplicates
        const docRef = db.collection("holidays").doc(date);
        const existing = await docRef.get();
        
        if (existing.exists) {
          return res.status(400).json({ error: "A holiday already exists on this date" });
        }
        
        await docRef.set({
          date,
          name,
          theme: theme || "default",
          emoji: emoji || "⭐",
          createdAt: new Date().toISOString()
        });
        
        return res.status(200).json({ ok: true, message: "Holiday added" });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }
    // POST - Delete a holiday
    if (path === "/holidays/delete" && req.method === "POST") {
      try {
        const body = readJsonBody(req);
        const { date } = body;
        
        if (!date) {
          return res.status(400).json({ error: "Date is required" });
        }
        
        await db.collection("holidays").doc(date).delete();
        
        return res.status(200).json({ ok: true, message: "Holiday deleted" });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }
    // [index.js] - Updated to fetch LIVE balances
    if (path === "/timeoff/list" && req.method === "GET") {
      try {
        // 1. Fetch pending requests
        const snap = await db.collection("time_off_requests")
          .where("status", "==", "pending")
          .orderBy("createdAt", "desc")
          .get();
        const requests = [];
        const uniqueNames = new Set();
        snap.forEach(doc => {
          const d = doc.data();
          requests.push({ id: doc.id, ...d });
          if (d.person) uniqueNames.add(d.person);
        });
        // 2. Look up live balances
        const balanceMap = {}; 
        if (uniqueNames.size > 0) {
            // Create references for all people in the queue
            const refs = Array.from(uniqueNames).map(name => db.collection("accrued_hours").doc(name));
            const balanceSnaps = await db.getAll(...refs);
            
            balanceSnaps.forEach(doc => {
                if (doc.exists) {
                    // READ 'pto' field from your screenshot
                    balanceMap[doc.id] = doc.data().pto || 0;
                }
            });
        }
        // 3. Attach balance to response
        const finalRequests = requests.map(req => ({
            ...req,
            currentBalance: balanceMap[req.person] !== undefined ? balanceMap[req.person] : 0
        }));
        return res.status(200).json({ ok: true, requests: finalRequests });
      } catch (err) {
        console.error("List Error:", err);
        return res.status(500).json({ error: err.message });
      }
    }
    // [index.js] - 2. Resolve Request (Approve/Deny) AND Sync to Schedule
    if (path === "/timeoff/resolve" && req.method === "POST") {
      try {
        logWithTrace(traceId, 'info', 'timeoff/resolve', 'Processing time-off resolution request');

        const body = readJsonBody(req);
        const { id, decision, manager } = body; 

        if (!id || !decision) {
          logWithTrace(traceId, 'error', 'timeoff/resolve', 'Missing required fields', { id, decision });
          return res.status(400).json({ error: "Missing fields" });
        }

        const docRef = db.collection("time_off_requests").doc(id);

        await db.runTransaction(async (t) => {
            // --- READS FIRST ---
            const doc = await t.get(docRef);
            if (!doc.exists) {
              logWithTrace(traceId, 'error', 'timeoff/resolve', 'Request not found', { id });
              throw new Error("Request not found");
            }

            const data = doc.data();
            const typeKey = data.typeKey || normalizeTimeOffType(data.type || "pto");
            const isMakeUp = typeKey === "make_up";
            const requestedAmount = data.requestedHours || data.hours || null;

            let balanceRef = null;
            let currentPto = 0;
            let shouldDeduct = false;
            let scheduleDocRef = null;
            let scheduleData = null;

            // 1. Prepare Balance Read - only deduct for PTO, not make-up
            if (decision === "approved" && !isMakeUp && data.person) {
                balanceRef = db.collection("accrued_hours").doc(data.person);
                const balSnap = await t.get(balanceRef);
                if (balSnap.exists) {
                    currentPto = parseFloat(balSnap.data().pto || 0);
                    shouldDeduct = true;
                }
            }
            // 2. Prepare Schedule Read (Find the shift to mark OFF)
            if (decision === 'approved' && data.date && data.person) {
                // Construct the ID: "YYYY-MM-DD__TeamName"
                // Note: We might not know the team if it wasn't saved in the request. 
                // If you saved 'team' in the request, use: `${data.date}__${data.team}`
                // Otherwise, we have to query (which calls for a query, not a direct doc read).
                // simpler approach: The user provided 'team' in the new request logic!
                if (data.team) {
                    const schId = `${data.date}__${data.team}`;
                    scheduleDocRef = db.collection("scheduleDays").doc(schId);
                    const sSnap = await t.get(scheduleDocRef);
                    if (sSnap.exists) scheduleData = sSnap.data();
                }
            }
            // --- WRITES LAST ---
            
            // 3. Update Request Status
            t.update(docRef, {
                status: decision,
                resolvedBy: manager || "Admin",
                resolvedAt: new Date().toISOString()
            });

            // 4. Deduct Hours (only for PTO, not make-up)
            if (shouldDeduct && balanceRef) {
                let deduction = 0;

                if (requestedAmount !== null && requestedAmount !== undefined && !Number.isNaN(requestedAmount)) {
                    deduction = parseFloat(requestedAmount);
                } else if (data.duration === 'full_day') {
                    deduction = 8;
                } else {

                    // Try to calculate from shift times if available
                    if (data.shiftStart && data.shiftEnd) {
                        const start = parseTimeDecimal(data.shiftStart);
                        const end = parseTimeDecimal(data.shiftEnd);
                        if (start > 0 && end > 0) {
                            deduction = end - start;
                            if (deduction < 0) deduction += 24; 
                        } else {
                           deduction = 4; // default partial day
                        }
                    } else {

                        deduction = 4; // default partial day when times missing
                    }
                }
                deduction = Math.round(deduction * 100) / 100;
                const nextPto = Math.max(0, (currentPto || 0) - deduction);

                logWithTrace(traceId, 'info', 'timeoff/resolve', 'Deducting PTO hours', {
                  person: data.person,
                  currentPto,
                  deduction,
                  nextPto
                });

                t.update(balanceRef, { pto: nextPto, lastUpdated: new Date().toISOString() });
            }

            // 5. AUTOMATICALLY MARK SCHEDULE OPEN (approved only)
              if (decision === "approved" && scheduleDocRef && scheduleData) {
                const assignments = scheduleData.assignments || [];
                const personKey = String(data.person || "").trim().toLowerCase();
const idx = assignments.findIndex(a => {
  const aPerson = String(a.person || "").trim().toLowerCase();
  if (aPerson !== personKey) return false;
  // if shiftStart/shiftEnd exist on request, try to match them
  if (data.shiftStart && data.shiftEnd) {
    const aStart = toAmPm(a.start || "");
    const aEnd = toAmPm(a.end || "");
    return aStart === data.shiftStart && aEnd === data.shiftEnd;
  }
  return true;
});
                
                if (idx !== -1) {
                    const entry = assignments[idx];
                    // Mark shift as OPEN for managers to reassign
                    const offLabel = isMakeUp ? "Make Up Approved" : "PTO Approved";
                    const managerNote = manager ? ` by ${manager}` : "";
                    const newNotes = `[OPEN] Originally: ${data.person} - ${offLabel}${managerNote}`;

                    // Copy array to modify - mark as OPEN for reassignment
                    const nextAssignments = [...assignments];
                    nextAssignments[idx] = { 
                      ...entry, 
                      person: "OPEN",
                      status: "Open",
                      originalPerson: data.person,
                      notes: newNotes, 
                      updatedAt: new Date().toISOString() 
                    };
                    
                    t.update(scheduleDocRef, { 
                        assignments: nextAssignments, 
                        updatedAt: new Date().toISOString() 
                    });

                    logWithTrace(traceId, 'info', 'timeoff/resolve', 'Marked shift as OPEN for reassignment', {
                      person: data.person,
                      date: data.date,
                      team: data.team
                    });
                }
            }
        });
        // 6. CREATE AGENT NOTIFICATION
        // Need to re-fetch data since transaction is complete
        const resolvedDoc = await docRef.get();
        const resolvedData = resolvedDoc.data();
        
        const notifData = {
          recipientName: resolvedData.person,
          type: "timeoff_decision",
          decision: decision,
          requestType: resolvedData.typeKey || "pto",
          requestDate: resolvedData.date,
          message: decision === "approved" 
            ? `Your ${resolvedData.typeKey === "make_up" ? "make-up" : "time-off"} request for ${resolvedData.date} was approved`
            : `Your time-off request for ${resolvedData.date} was denied`,
          resolvedBy: manager || "Admin",
          createdAt: new Date().toISOString(),
          read: false
        };

        await db.collection("agent_notifications").add(notifData);
        logWithTrace(traceId, 'info', 'timeoff/resolve', 'Created agent notification', {
          person: resolvedData.person,
          decision
        });

        // Add to audit log
        const auditAction = decision === "approved" ? "APPROVE_TIMEOFF" : "DENY_TIMEOFF";
        const typeLabel = resolvedData.typeKey === "make_up" ? "Make-Up" : "PTO";
        await db.collection("audit_log").add({
          action: auditAction,
          manager: manager || "Admin",
          target: resolvedData.person,
          details: `${typeLabel} request for ${resolvedData.date} ${decision}`,
          date: resolvedData.date,
          timestamp: new Date().toISOString()
        });

        return res.status(200).json({ ok: true });
      } catch (err) {
        logWithTrace(traceId, 'error', 'timeoff/resolve', 'Error resolving time-off request', {
          error: err.message,
          stack: err.stack
        });
        return res.status(500).json({ error: err.message });
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
        schedule: { results } // keeps compatibility if UI expects schedule.results
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
    // unified update (used by your newer HTML)
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
    // add shift (creates doc if missing)
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
      
      // Extract date and team from docId (format: "2025-01-12__TEAM_NAME")
      const [docDate, docTeam] = docId.includes("__") ? docId.split("__") : [docId, ""];
      
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
                date: docDate,  // Include date field for query filtering
                team: docTeam.replace(/_/g, ' '),  // Include team field
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
    // delete shift
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
    if (path === "/balances/list" && req.method === "GET") {
  try {
    const snap = await db.collection("accrued_hours").get();
    const balances = [];
    
    snap.forEach(doc => {
      balances.push({
        person: doc.id,
        pto: doc.data().pto || 0,
        sick: doc.data().sick || 0,
        holiday_bank: doc.data().holiday_bank || 0,
        lastUpdated: doc.data().lastUpdated
      });
    });
    
    return res.status(200).json({ ok: true, balances });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
// Update balance
if (path === "/balances/update" && req.method === "POST") {
  try {
    const body = readJsonBody(req);
    const { person, type, hours } = body;
    
    if (!person || !type || hours === undefined) {
      return res.status(400).json({ error: "Missing person, type, or hours" });
    }
    
    // Support pto, sick, and holiday_bank
    if (type !== "pto" && type !== "sick" && type !== "holiday_bank") {
      return res.status(400).json({ error: "Type must be 'pto', 'sick', or 'holiday_bank'" });
    }
    
    const docRef = db.collection("accrued_hours").doc(person);
    const snap = await docRef.get();
    
    const current = snap.exists ? snap.data() : { pto: 0, sick: 0, holiday_bank: 0 };
    current[type] = parseFloat(hours) || 0;
    current.lastUpdated = toIsoNow();
    
    await docRef.set(current, { merge: true });
    
    return res.status(200).json({ ok: true, person, type, hours: current[type] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// Holiday Banking - Calculate and apply holiday hours
if (path === "/holiday/bank" && req.method === "POST") {
  try {
    const body = readJsonBody(req);
    const { person, date, hoursWorked, action } = body;
    // action: "worked" (bank 0.5x extra) or "off" (deduct full hours)
    
    if (!person || !date) {
      return res.status(400).json({ error: "Missing person or date" });
    }
    
    const docRef = db.collection("accrued_hours").doc(person);
    const snap = await docRef.get();
    const current = snap.exists ? snap.data() : { pto: 0 };
    
    let hoursChange = 0;
    let message = "";
    
    if (action === "worked") {
      // Worked holiday: add bonus hours directly to PTO (0.5x bonus)
      const worked = parseFloat(hoursWorked) || 8;
      hoursChange = worked * 0.5; // Add half the hours worked as bonus PTO
      current.pto = (current.pto || 0) + hoursChange;
      message = `Added ${hoursChange}h PTO bonus for working holiday`;
    } else if (action === "off") {
      // Didn't work: deduct from PTO
      hoursChange = parseFloat(hoursWorked) || 8;
      current.pto = Math.max(0, (current.pto || 0) - hoursChange);
      message = `Deducted ${hoursChange}h PTO for holiday absence`;
    }
    
    current.lastUpdated = toIsoNow();
    await docRef.set(current, { merge: true });
    
    // Log the transaction
    await db.collection("holiday_transactions").add({
      person,
      date,
      action,
      hoursChange,
      newBalance: current.pto,
      createdAt: toIsoNow()
    });
    
    return res.status(200).json({ 
      ok: true, 
      person, 
      action,
      hoursChange,
      newPtoBalance: current.pto,
      message 
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
    // Generate future shifts (Supports "ALL" teams to save Scheduler slots)
    if (path === "/admin/generate" && req.method === "POST") {
      const body = readJsonBody(req);
      const daysForward = clampDays(body.days || 14);
      const reqTeam = String(body.teamKey || "ALL").trim(); // Default to ALL
      const baseSnap = await db.collection("base_schedule").get();
      const templates = {}; 
      const allCanonicalTeams = new Set();
      
      baseSnap.forEach(doc => {
        const items = doc.data().items || [];
        templates[doc.id.substring(0, 3)] = items; 
        // Collect canonical team keys
        items.forEach(i => {
           if(i.team) allCanonicalTeams.add(getCanonicalTeamKey(i.team));
        });
      });
      
      // If specific team requested, normalize it. Otherwise, use all canonical teams found.
      const teamsToProcess = (reqTeam !== "ALL" && reqTeam !== "") 
        ? [getCanonicalTeamKey(reqTeam)] 
        : Array.from(allCanonicalTeams);
      
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
        
        // Group raw items by canonical team key
        const itemsByCanonicalTeam = {};
        rawItems.forEach(item => {
          const canonicalKey = getCanonicalTeamKey(item.team);
          if (!itemsByCanonicalTeam[canonicalKey]) {
            itemsByCanonicalTeam[canonicalKey] = {
              displayName: getCanonicalTeamDisplay(item.team),
              items: []
            };
          }
          itemsByCanonicalTeam[canonicalKey].items.push(item);
        });
        
        // Loop canonical teams
        for (const teamKey of teamsToProcess) {
            const teamData = itemsByCanonicalTeam[teamKey];
            if (!teamData || teamData.items.length === 0) continue;
            
            const docId = `${dateStr}__${teamKey}`;
            const docRef = db.collection("scheduleDays").doc(docId);
            await db.runTransaction(async (tx) => {
              const snap = await tx.get(docRef);
              const now = toIsoNow();
              
              let assignments = [];
              if (snap.exists) assignments = snap.data().assignments || [];
              let addedCount = 0;
              teamData.items.forEach(tmpl => {
                 // FIX: Check by TIME SLOT only, not by person+time
                 // This prevents recreating shifts when someone was replaced
                 // A slot is considered filled if ANY person has a shift at that start time
                 const slotFilled = assignments.some(exist => 
                    exist.start === tmpl.start && 
                    exist.status !== "Deleted" // Ignore soft-deleted shifts
                 );
                 if (!slotFilled) {
                   assignments.push({
                     id: "gen_" + Math.random().toString(36).substr(2, 9),
                     start: tmpl.start,
                     end: tmpl.end,
                     role: tmpl.role,
                     person: tmpl.person,
                     status: "Active",
                     notifyStatus: "Generated",
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
                  team: teamData.displayName, // Use canonical display name
                  assignments, 
                  updatedAt: now 
                }, { merge: true });
              }
            });
            log.push(`Checked ${dateStr} for ${teamKey}`);
        }
      }
      return res.status(200).json({ ok: true, daysGenerated: daysForward, details: log });
    }
    // Archive old days
    if (path === "/admin/archive" && req.method === "POST") {
      const body = readJsonBody(req);
      const daysAgo = parseInt(body.daysAgo || "30", 10);
      
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysAgo);
      const cutoffStr = cutoff.toISOString().split("T")[0]; // YYYY-MM-DD
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
        const typeKey = data.typeKey || normalizeTimeOffType(data.type || "");
        const isMakeUp = typeKey === "make_up";
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
    // Import Base Schedule (V2: Includes Team & Time Fix)
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
            // Update and ensure the NEW times are also clean HH:MM
            items[idx].start = hhmm(newStart);
            items[idx].end = hhmm(newEnd);
            
            // Update Team and Role if provided
            if (req.body.newTeam) items[idx].team = String(req.body.newTeam).trim();
            if (req.body.newRole) items[idx].role = String(req.body.newRole).trim();
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
        // 1. Find the agent's email from Firestore
        const { people } = await getCachedMetadata();
        let agentEmail = "";
        
        const target = name.toLowerCase().trim();
        for (const p of people) {
          const dbName = String(p.name || p.id || "").toLowerCase().trim();
          
          // Match full name or first name
          if (dbName === target || dbName.split(" ")[0] === target.split(" ")[0]) {
            agentEmail = p.email; 
            break;
          }
        }
        if (!agentEmail) {
          throw new Error(`Agent ${name} found in Firestore, but they are missing an email address.`);
        }
        // 2. Lookup User in Zendesk
        const userSearchUrl = `https://${ZD_CONFIG.subdomain}.zendesk.com/api/v2/users/search.json?query=${encodeURIComponent(`type:user email:${agentEmail}`)}`;
        const userRes = await zdFetch(userSearchUrl);
        if (!userRes.users?.length) throw new Error("Email not found in Zendesk.");
        
        const user = userRes.users[0];
        
        // 3 & 4. Fetch Open and Solved Tickets with per_page=100 for efficiency
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const date7 = oneWeekAgo.toISOString().split('T')[0];
        
        const openUrl = `https://${ZD_CONFIG.subdomain}.zendesk.com/api/v2/search.json?query=${encodeURIComponent(`type:ticket assignee:${user.id} status<solved`)}&per_page=100`;
        const solvedUrl = `https://${ZD_CONFIG.subdomain}.zendesk.com/api/v2/search.json?query=${encodeURIComponent(`type:ticket assignee:${user.id} status:solved solved>${date7}`)}&per_page=100`;
        // 5. Fetch CSAT (Last 30 Days - optimized for speed)
        const daysBack = 30;
        const endSec = Math.floor(Date.now() / 1000) - 120;
        const startSec = endSec - (daysBack * 24 * 60 * 60);
        
        const getCsatCount = async (score) => {
            let count = 0;
            let url = `https://${ZD_CONFIG.subdomain}.zendesk.com/api/v2/satisfaction_ratings.json?start_time=${startSec}&end_time=${endSec}&score=${encodeURIComponent(score)}&per_page=100`;
            
            let safetyPages = 0;
            const maxPages = 5; // Limit pagination for faster response
            while (url && safetyPages < maxPages) {
                safetyPages++;
                const data = await zdFetch(url);
                const ratings = data.satisfaction_ratings || [];
                for (const r of ratings) {
                    if (Number(r.assignee_id) === Number(user.id)) {
                        count++;
                    }
                }
                
                url = data.next_page || null;
            }
            return count;
        };
        
        // Execute all fetches in parallel for ~60-70% speed improvement
        const [openRes, solvedRes, good, bad] = await Promise.all([
          zdFetch(openUrl),
          zdFetch(solvedUrl),
          getCsatCount("good"),
          getCsatCount("bad")
        ]);
        
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
    if (path === "/zendesk/activity" && req.method === "GET") {
      try {
        const name = String(req.query.name || "").trim();
        const date = String(req.query.date || "").trim();
        const startHourRaw = Number(req.query.startHour ?? 8);
        const endHourRaw = Number(req.query.endHour ?? 21);

        if (!name) return res.status(400).json({ ok: false, error: "Missing agent name." });
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          return res.status(400).json({ ok: false, error: "Invalid date format. Use YYYY-MM-DD." });
        }

        const startHour = Number.isFinite(startHourRaw) ? Math.min(23, Math.max(0, startHourRaw)) : 8;
        const endHour = Number.isFinite(endHourRaw) ? Math.min(23, Math.max(0, endHourRaw)) : 21;
        if (endHour < startHour) {
          return res.status(400).json({ ok: false, error: "End hour must be after start hour." });
        }

        const agentEmail = await getAgentEmailByName(name);
        if (!agentEmail) {
          return res.status(404).json({ ok: false, error: `No email found for ${name}.` });
        }

        const userSearchUrl = `https://${ZD_CONFIG.subdomain}.zendesk.com/api/v2/users/search.json?query=${encodeURIComponent(`type:user email:${agentEmail}`)}`;
        const userRes = await zdFetch(userSearchUrl);
        if (!userRes.users?.length) {
          return res.status(404).json({ ok: false, error: "Email not found in Zendesk." });
        }
        const user = userRes.users[0];

        const nextDate = new Date(`${date}T00:00:00Z`);
        nextDate.setUTCDate(nextDate.getUTCDate() + 1);
        const nextDateStr = nextDate.toISOString().split('T')[0];

        const query = `type:ticket assignee:${user.id} status:solved solved>=${date} solved<${nextDateStr}`;
        let url = `https://${ZD_CONFIG.subdomain}.zendesk.com/api/v2/search.json?query=${encodeURIComponent(query)}&per_page=100`;

        const maxPages = 5;
        let pages = 0;
        let results = [];

        while (url && pages < maxPages) {
          pages++;
          const data = await zdFetch(url);
          results = results.concat(data.results || []);
          url = data.next_page || null;
        }

        const buckets = [];
        for (let h = startHour; h <= endHour; h++) {
          buckets.push({ hour: h, count: 0 });
        }

        for (const ticket of results) {
          const solvedAt = ticket.solved_at || ticket.updated_at || ticket.created_at;
          if (!solvedAt) continue;
          const pstDate = getPstDateKey(solvedAt);
          if (pstDate !== date) continue;
          const hour = getPstHour(solvedAt);
          if (hour === null || hour < startHour || hour > endHour) continue;
          const bucket = buckets[hour - startHour];
          if (bucket) bucket.count++;
        }

        const total = buckets.reduce((sum, b) => sum + b.count, 0);
        return res.status(200).json({
          ok: true,
          name: user.name,
          date,
          startHour,
          endHour,
          total,
          buckets,
          incomplete: Boolean(url)
        });
      } catch (error) {
        console.error("Zendesk Activity Error:", error);
        return res.status(500).json({ ok: false, error: error.message });
      }
    }
    return res.status(404).json({ error: "Not found" });
  } catch (err) {
    console.error("ERROR:", err);
    return res.status(500).json({ error: "Server error", details: String(err?.message || err) });
  }
});
