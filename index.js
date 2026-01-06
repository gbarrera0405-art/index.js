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
          notes: shiftData.notes || "Your shift has been updated."
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
  
  const snap = await db.collection("people").get();
  const target = String(name).toLowerCase().trim();
  
  for (const doc of snap.docs) {
    const d = doc.data();
    const dbName = String(d.name || "").toLowerCase().trim();
    
    // Match full name or first name
    if (dbName === target || dbName.split(" ")[0] === target.split(" ")[0]) {
      return d.email || null;
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

// Separate cache for agent profiles (using Map for dynamic keys)
const agentProfileCache = new Map();
const AGENT_PROFILE_TTL = 5 * 60 * 1000; // 5 minutes

// Zendesk CSAT rating pagination safety limit
const MAX_CSAT_RATINGS_PER_AGENT = 1000;

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
    
    // Enhanced error handling
    if (!res.ok) {
        let errorMsg = `Zendesk API Error: ${res.statusText}`;
        if (res.status === 401) {
            errorMsg = 'Zendesk authentication failed. Please check credentials.';
        } else if (res.status === 403) {
            errorMsg = 'Access denied to Zendesk resource. Please check permissions.';
        } else if (res.status === 429) {
            errorMsg = 'Zendesk rate limit exceeded. Please try again later.';
        }
        const error = new Error(errorMsg);
        error.status = res.status;
        throw error;
    }
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

/**
 * Sanitize email for use in Zendesk search queries
 * Escapes special characters that could break the query
 */
function sanitizeZendeskEmail(email) {
  if (!email) return '';
  // Escape double quotes and backslashes
  return String(email).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Validate and clamp days parameter for Zendesk queries
 */
function validateDaysParam(days, defaultValue = 30) {
  const parsed = parseInt(days || defaultValue, 10);
  return Math.max(1, Math.min(parsed, 90)); // Clamp between 1-90
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
    // Generate or extract trace ID
    const traceId = req.get('X-Trace-Id') || `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // CORS first
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type,Authorization,x-preview-key,X-Trace-Id");
    res.set("X-Trace-Id", traceId);

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
      "/holiday/accrue",
      "/holiday/history",
      "/agent/schedule",
      "/balances/list",        
      "/balances/update",
      "/audit/logs",
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
      "/agent/notifications",
      "/agent/notifications/read",
      "/swap/request",
      "/swap/pending",
      "/swap/respond",
      "/schedule/check-conflict",
      "/manager/heartbeat",
      "/manager/presence",
      "/zendesk/agent/open",
      "/zendesk/agent/badcsat",
      "/zendesk/agent/csat"
    ].includes(path);

    if (!isApi) {
      if (servePublicFile(req.path || "/", res)) return;
    }
    // Health
    if (path === "/health") return res.status(200).json({ ok: true, service: "scheduler-api" });
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
      
      if (!confirmWipe) {
        return res.status(400).json({ 
          error: "Safety check failed", 
          message: "You must pass confirm: true to wipe future days" 
        });
      }
      try {
        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split("T")[0];
        
        console.log(`🗑️ WIPE REQUEST: Deleting all scheduleDays from ${today} onwards...`);
        // Find all future schedule days
        const futureDocs = await db.collection("scheduleDays")
          .where("date", ">=", today)
          .get();
        if (futureDocs.empty) {
          return res.status(200).json({ 
            ok: true, 
            deleted: 0, 
            message: "No future schedule days found to delete." 
          });
        }
        // Delete in batches (Firestore limit is 500 per batch)
        const batchSize = 450;
        let deleted = 0;
        let batch = db.batch();
        let batchCount = 0;
        for (const doc of futureDocs.docs) {
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
        console.log(`✅ WIPE COMPLETE: Deleted ${deleted} future schedule days`);
        return res.status(200).json({ 
          ok: true, 
          deleted: deleted,
          fromDate: today,
          message: `Successfully deleted ${deleted} future schedule days.`
        });
      } catch (err) {
        console.error("Wipe Future Error:", err);
        return res.status(500).json({ error: err.message });
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
          templates[doc.id] = items;
          items.forEach(i => {
            if (i.team) allTeams.add(i.team);
          });
        });
        const teamsToProcess = Array.from(allTeams);
        log.push(`Found ${teamsToProcess.length} teams: ${teamsToProcess.join(", ")}`);
        console.log(`  ✓ Loaded templates for teams: ${teamsToProcess.join(", ")}`);
        // ========== STEP 3: GENERATE NEW DAYS ==========
        console.log(`🔄 REGENERATE: Step 3 - Generating ${daysForward} days...`);
        const dayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const todayDate = new Date();
        let generated = 0;
        for (let i = 0; i < daysForward; i++) {
          const d = new Date(todayDate);
          d.setDate(todayDate.getDate() + i);
          const dateStr = d.toISOString().split("T")[0];
          const dow = dayMap[d.getDay()];
          const rawItems = templates[dow] || [];
          if (rawItems.length === 0) continue;
          for (const team of teamsToProcess) {
            const dailyItems = rawItems.filter(item => item.team === team);
            if (dailyItems.length === 0) continue;
            const docId = `${dateStr}__${team}`;
            const docRef = db.collection("scheduleDays").doc(docId);
            const now = toIsoNow();
            const assignments = dailyItems.map(tmpl => ({
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
              team: team,
              assignments: assignments,
              createdAt: now,
              updatedAt: now
            });
            generated++;
          }
        }
        log.push(`Generated ${generated} new schedule day documents`);
        console.log(`✅ REGENERATE COMPLETE: Created ${generated} new schedule days`);
        return res.status(200).json({
          ok: true,
          deleted: deleted,
          generated: generated,
          daysForward: daysForward,
          teams: teamsToProcess,
          log: log,
          message: `Wiped ${deleted} old days and generated ${generated} new days for ${daysForward} days forward.`
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
        const { person, reason, type, date, shiftStart, shiftEnd, duration, team, makeUpDate } = body;
        const typeKey = normalizeTimeOffType(type); 
        if (typeKey === "make_up" && !String(makeUpDate || "").trim()) {
        return res.status(400).json({ error: "Make Up Time requires a make-up date." });
}
        
        if (!person || !reason) return res.status(400).json({ error: "Missing fields" });
        const docRef = db.collection("time_off_requests").doc();
        await docRef.set({
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
          makeUpDate: makeUpDate || "", // <--- Saving the Team now
          createdAt: new Date().toISOString()
        });
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
        // Get schedule days from today onwards
        const today = new Date().toISOString().split("T")[0];
        
        const snap = await db.collection("scheduleDays")
          .where("date", ">=", today)
          .orderBy("date", "asc")
          .get();
        
        const pending = [];
        
        snap.forEach(doc => {
          const data = doc.data();
          const assignments = data.assignments || [];
          
          assignments.forEach(a => {
            if (a.notifyStatus === "Pending") {
              pending.push({
                docId: doc.id,
                assignmentId: a.id,
                date: data.date || doc.id.split("__")[0],
                team: data.team || doc.id.split("__")[1] || "",
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
      const notifyMode = String(body.notifyMode || "defer").trim(); // "defer" | "send"

      if (!docId || !assignmentId || !newPerson) {
        logWithTrace(traceId, 'error', 'assignment/replace', 'Missing required fields', { docId, assignmentId, newPerson });
        return res.status(400).json({ error: "Missing docId, assignmentId, or newPerson" });
      }

      // Validate notifyMode
      if (!["defer", "send"].includes(notifyMode)) {
        logWithTrace(traceId, 'error', 'assignment/replace', 'Invalid notifyMode', { notifyMode });
        return res.status(400).json({ error: "notifyMode must be 'defer' or 'send'" });
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
      
      try {
        // 1. Get all teams (1 read)
        const teamsSnap = await db.collection("teams").get();
        const teams = teamsSnap.docs.map(d => d.id);
        
        // 2. Build list of all expected doc IDs for the date range
        const dayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const expectedDocs = [];
        for (let i = 0; i < futureDays; i++) {
          const d = new Date(startDate);
          d.setDate(startDate.getDate() + i);
          const dateStr = d.toISOString().split("T")[0];
          const dow = dayMap[d.getDay()];
          
          teams.forEach(team => {
            expectedDocs.push({
              docId: `${dateStr}__${team}`,
              date: dateStr,
              dow: dow,
              team: team
            });
          });
        }
        
        // 3. Batch fetch existing docs (efficient - 1 read per doc, batched)
        const docRefs = expectedDocs.map(e => db.collection("scheduleDays").doc(e.docId));
        const existingSnaps = await db.getAll(...docRefs);
        
        // 4. Find which docs exist and which are missing
        const existingIds = new Set();
        const existingResults = [];
        
        existingSnaps.forEach((snap, idx) => {
          if (snap.exists) {
            existingIds.add(expectedDocs[idx].docId);
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
              existingResults.push({
                id: snap.id,
                ...normalizeValue(data),
                assignments: assignments
              });
            }
          }
        });
        
        // 5. Load base_schedule templates (1 read for collection)
        const baseSnap = await db.collection("base_schedule").get();
        const templates = {};
        baseSnap.forEach(doc => {
          templates[doc.id] = doc.data().items || [];
        });
        
        // 6. Generate missing future days (only if they don't exist)
        const missingDocs = expectedDocs.filter(e => !existingIds.has(e.docId));
        let generated = 0;
        const newResults = [];
        
        if (missingDocs.length > 0) {
          // Batch writes for efficiency (max 500 per batch)
          const batchSize = 450;
          let batch = db.batch();
          let batchCount = 0;
          
          for (const missing of missingDocs) {
            const rawItems = templates[missing.dow] || [];
            const dailyItems = rawItems.filter(item => item.team === missing.team);
            
            if (dailyItems.length === 0) continue;
            
            const docRef = db.collection("scheduleDays").doc(missing.docId);
            const now = toIsoNow();
            
            const assignments = dailyItems.map(tmpl => ({
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
            
            const docData = {
              id: missing.docId,
              date: missing.date,
              team: missing.team,
              assignments: assignments,
              createdAt: now,
              updatedAt: now
            };
            
            batch.set(docRef, docData);
            batchCount++;
            generated++;
            
            // Add to results - filter for agents
            let resultAssignments = assignments.map(normalizeAssignment);
            if (!isManager && agentName) {
              resultAssignments = resultAssignments.filter(a => {
                const assignedPerson = String(a.person || "").toLowerCase().trim();
                return assignedPerson === String(agentName).toLowerCase().trim();
              });
            }
            
            if (isManager || resultAssignments.length > 0) {
              newResults.push({
                id: missing.docId,
                ...docData,
                assignments: resultAssignments
              });
            }
            
            // Commit batch if we hit the limit
            if (batchCount >= batchSize) {
              await batch.commit();
              batch = db.batch();
              batchCount = 0;
            }
          }
          
          // Commit any remaining
          if (batchCount > 0) {
            await batch.commit();
          }
          
          console.log(`📅 Generated ${generated} missing future schedule days`);
        }
        
        // 7. Combine and return all results
        const allResults = [...existingResults, ...newResults];
        
        return res.status(200).json({
          ok: true,
          results: allResults,
          meta: {
            startDate: startISO,
            daysForward: futureDays,
            existingDays: existingResults.length,
            generatedDays: generated
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
        
        const snap = await db.collection("agent_notifications")
          .where("recipientName", "==", agentName)
          .orderBy("createdAt", "desc")
          .limit(50)
          .get();
        
        const notifications = [];
        snap.forEach(doc => {
          notifications.push({ id: doc.id, ...doc.data() });
        });
        
        const unreadCount = notifications.filter(n => !n.read).length;
        
        return res.status(200).json({ 
          ok: true, 
          notifications,
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
    // ============================================
    // SHIFT SWAP REQUESTS
    // ============================================
    
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
        
        // Create notification for the target person
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

    // GET /manager/presence - Get active manager presence
    if (path === "/manager/presence" && req.method === "GET") {
      try {
        // Consider managers active if heartbeat within last 2 minutes
        const cutoffTime = new Date(Date.now() - 2 * 60 * 1000).toISOString();

        const snap = await db.collection("manager_presence")
          .where("lastHeartbeat", ">=", cutoffTime)
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

        return res.status(200).json({ ok: true, activeManagers });

      } catch (err) {
        logWithTrace(traceId, 'error', 'manager/presence', 'Error fetching manager presence', {
          error: err.message
        });
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

            // 5. AUTOMATICALLY MARK SCHEDULE OFF (approved only)
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
                    // Append [OFF] if not already there
                    if (!entry.notes || !entry.notes.includes("[OFF]")) {

                        const offLabel = isMakeUp ? "Make Up Approved" : "PTO Approved";
                        const managerNote = manager ? ` by ${manager}` : "";
                        const newNotes = (entry.notes ? entry.notes + " " : "") + `[OFF] - ${offLabel}${managerNote}`;

                        // Copy array to modify
                        const nextAssignments = [...assignments];
                        nextAssignments[idx] = { ...entry, notes: newNotes, updatedAt: new Date().toISOString() };
                        
                        t.update(scheduleDocRef, { 
                            assignments: nextAssignments, 
                            updatedAt: new Date().toISOString() 
                        });

                        logWithTrace(traceId, 'info', 'timeoff/resolve', 'Marked shift as OFF', {
                          person: data.person,
                          date: data.date,
                          team: data.team
                        });
                    }
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
      const data = doc.data();
      balances.push({
        person: doc.id,
        pto: data.pto || 0,
        holiday_hours: data.holiday_hours || 0,
        lastUpdated: data.lastUpdated
      });
    });
    
    return res.status(200).json({ ok: true, balances });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
// Update balance (PTO and Holiday Hours)
if (path === "/balances/update" && req.method === "POST") {
  try {
    const body = readJsonBody(req);
    const { person, type, hours } = body;
    
    if (!person || hours === undefined) {
      return res.status(400).json({ error: "Missing person or hours" });
    }
    
    // Support PTO and holiday_hours for contractors
    const validTypes = ["pto", "holiday_hours"];
    const balanceType = type || "pto";
    if (!validTypes.includes(balanceType)) {
      return res.status(400).json({ error: "Type must be 'pto' or 'holiday_hours'" });
    }
    
    const docRef = db.collection("accrued_hours").doc(person);
    const snap = await docRef.get();
    
    const current = snap.exists ? snap.data() : { pto: 0, holiday_hours: 0 };
    current[balanceType] = parseFloat(hours) || 0;
    current.lastUpdated = toIsoNow();
    
    await docRef.set(current, { merge: true });
    
    return res.status(200).json({ ok: true, person, type: balanceType, hours: current[balanceType] });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// Holiday Hours Accrual - When agent works on a holiday
if (path === "/holiday/accrue" && req.method === "POST") {
  try {
    const body = readJsonBody(req);
    const { person, date, hoursWorked } = body;
    
    if (!person || !date) {
      return res.status(400).json({ error: "Missing person or date" });
    }
    
    // Verify this date is actually a holiday
    const holidayDoc = await db.collection("holidays").doc(date).get();
    if (!holidayDoc.exists) {
      return res.status(400).json({ error: "This date is not a registered holiday" });
    }
    
    const docRef = db.collection("accrued_hours").doc(person);
    const snap = await docRef.get();
    const current = snap.exists ? snap.data() : { pto: 0 };
    
    // Accrue 0.5x the hours worked as holiday bonus - ADD TO PTO
    const worked = parseFloat(hoursWorked) || 8;
    const accrued = worked * 0.5;
    current.pto = (current.pto || 0) + accrued;
    current.lastUpdated = toIsoNow();
    
    await docRef.set(current, { merge: true });
    
    // Log the accrual
    await db.collection("holiday_accruals").add({
      person,
      date,
      hoursWorked: worked,
      hoursAccrued: accrued,
      holidayName: holidayDoc.data().name || "Holiday",
      addedToPto: true,
      createdAt: toIsoNow()
    });
    
    return res.status(200).json({ 
      ok: true, 
      person, 
      hoursAccrued: accrued,
      newPtoBalance: current.pto,
      message: `Added ${accrued}h to PTO for working on ${holidayDoc.data().name}`
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// Get holiday accrual history for a person
if (path === "/holiday/history" && req.method === "POST") {
  try {
    const body = readJsonBody(req);
    const { person } = body;
    
    if (!person) {
      return res.status(400).json({ error: "Missing person" });
    }
    
    const snap = await db.collection("holiday_accruals")
      .where("person", "==", person)
      .orderBy("createdAt", "desc")
      .limit(50)
      .get();
    
    const history = [];
    snap.forEach(doc => {
      history.push({ id: doc.id, ...doc.data() });
    });
    
    return res.status(200).json({ ok: true, history });
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
    // ============================================
    // ZENDESK AGENT TICKET SEARCH ENDPOINTS
    // ============================================
    
    // GET /zendesk/agent/open?email=...&days=7
    if (path === "/zendesk/agent/open" && req.method === "GET") {
      try {
        logWithTrace(traceId, 'info', 'zendesk/agent/open', 'Fetching open tickets');
        
        const email = String(req.query.email || "").trim();
        
        if (!email) {
          logWithTrace(traceId, 'error', 'zendesk/agent/open', 'Missing email parameter');
          return res.status(400).json({ error: "Missing email parameter" });
        }
        
        // Validate days parameter (default 7, clamp 1-90) and sanitize email
        const validDays = validateDaysParam(req.query.days, 7);
        const sanitizedEmail = sanitizeZendeskEmail(email);
        
        // Pagination parameters
        const page = Math.max(1, parseInt(req.query.page || "1", 10));
        const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page || "100", 10)));
        
        // Calculate date range for query
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - validDays);
        const daysAgoISO = daysAgo.toISOString().split('T')[0];
        
        // Build Zendesk search query - use status<solved to get all non-solved tickets
        // type:ticket ensures we only get tickets, not other objects
        const query = `type:ticket assignee:"${sanitizedEmail}" status<solved created>=${daysAgoISO}`;
        const searchUrl = `https://${ZD_CONFIG.subdomain}.zendesk.com/api/v2/search.json?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`;
        
        logWithTrace(traceId, 'info', 'zendesk/agent/open', 'Calling Zendesk API', { 
          email, 
          days: validDays, 
          page, 
          perPage,
          dateFilter: daysAgoISO
        });
        
        const data = await zdFetch(searchUrl);
        
        // Extract ticket IDs and build UI URL
        const tickets = (data.results || []).map(t => ({
          id: t.id,
          subject: t.subject,
          status: t.status,
          created_at: t.created_at,
          updated_at: t.updated_at
        }));
        const count = data.count || 0;
        const zendeskSearchUIUrl = `https://${ZD_CONFIG.subdomain}.zendesk.com/agent/search/1?query=${encodeURIComponent(query)}`;
        
        logWithTrace(traceId, 'info', 'zendesk/agent/open', 'Open tickets found', { 
          email, 
          count, 
          days: validDays,
          page,
          returned: tickets.length
        });
        
        return res.status(200).json({
          ok: true,
          count,
          tickets,
          ticketIds: tickets.map(t => t.id),
          searchUrl: zendeskSearchUIUrl,
          query,
          days: validDays,
          email,
          page,
          perPage,
          hasMore: data.next_page !== null,
          nextPage: data.next_page
        });
        
      } catch (err) {
        logWithTrace(traceId, 'error', 'zendesk/agent/open', 'Error fetching open tickets', {
          error: err.message,
          status: err.status
        });
        
        return res.status(err.status || 500).json({
          error: err.message || "Failed to fetch open tickets"
        });
      }
    }
    
    // GET /zendesk/agent/badcsat?email=...&days=60
    if (path === "/zendesk/agent/badcsat" && req.method === "GET") {
      try {
        logWithTrace(traceId, 'info', 'zendesk/agent/badcsat', 'Fetching bad CSAT tickets');
        
        const email = String(req.query.email || "").trim();
        
        if (!email) {
          logWithTrace(traceId, 'error', 'zendesk/agent/badcsat', 'Missing email parameter');
          return res.status(400).json({ error: "Missing email parameter" });
        }
        
        // Validate days parameter (default 60, clamp 1-90) and sanitize email
        const validDays = validateDaysParam(req.query.days, 60);
        const sanitizedEmail = sanitizeZendeskEmail(email);
        
        // Pagination parameters
        const page = Math.max(1, parseInt(req.query.page || "1", 10));
        const perPage = Math.min(100, Math.max(1, parseInt(req.query.per_page || "100", 10)));
        
        // Calculate date range for query
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - validDays);
        const daysAgoISO = daysAgo.toISOString().split('T')[0];
        
        // Build Zendesk search query - use type:ticket and date filter
        const query = `type:ticket assignee:"${sanitizedEmail}" satisfaction_rating:bad created>=${daysAgoISO}`;
        const searchUrl = `https://${ZD_CONFIG.subdomain}.zendesk.com/api/v2/search.json?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`;
        
        logWithTrace(traceId, 'info', 'zendesk/agent/badcsat', 'Calling Zendesk API', { 
          email, 
          days: validDays,
          page,
          perPage,
          dateFilter: daysAgoISO
        });
        
        const data = await zdFetch(searchUrl);
        
        // Extract ticket details and build UI URL
        const tickets = (data.results || []).map(t => ({
          id: t.id,
          subject: t.subject,
          status: t.status,
          created_at: t.created_at,
          updated_at: t.updated_at,
          satisfaction_rating: t.satisfaction_rating
        }));
        const count = data.count || 0;
        const zendeskSearchUIUrl = `https://${ZD_CONFIG.subdomain}.zendesk.com/agent/search/1?query=${encodeURIComponent(query)}`;
        
        logWithTrace(traceId, 'info', 'zendesk/agent/badcsat', 'Bad CSAT tickets found', { 
          email, 
          count, 
          days: validDays,
          page,
          returned: tickets.length
        });
        
        return res.status(200).json({
          ok: true,
          count,
          tickets,
          ticketIds: tickets.map(t => t.id),
          searchUrl: zendeskSearchUIUrl,
          query,
          days: validDays,
          email,
          page,
          perPage,
          hasMore: data.next_page !== null,
          nextPage: data.next_page
        });
        
      } catch (err) {
        logWithTrace(traceId, 'error', 'zendesk/agent/badcsat', 'Error fetching bad CSAT tickets', {
          error: err.message,
          status: err.status
        });
        
        return res.status(err.status || 500).json({
          error: err.message || "Failed to fetch bad CSAT tickets"
        });
      }
    }
    
    // GET /zendesk/agent/csat?email=...&days=7
    if (path === "/zendesk/agent/csat" && req.method === "GET") {
      try {
        logWithTrace(traceId, 'info', 'zendesk/agent/csat', 'Fetching accurate CSAT counts');
        
        const email = String(req.query.email || "").trim();
        
        if (!email) {
          logWithTrace(traceId, 'error', 'zendesk/agent/csat', 'Missing email parameter');
          return res.status(400).json({ error: "Missing email parameter" });
        }
        
        // Validate days parameter (default 7, clamp 1-90) and sanitize email
        const validDays = validateDaysParam(req.query.days, 7);
        const sanitizedEmail = sanitizeZendeskEmail(email);
        
        logWithTrace(traceId, 'info', 'zendesk/agent/csat', 'Resolving user by email', { 
          email: sanitizedEmail
        });
        
        // Step 1: Resolve user via /users/search.json by email
        const userSearchUrl = `https://${ZD_CONFIG.subdomain}.zendesk.com/api/v2/users/search.json?query=${encodeURIComponent(sanitizedEmail)}`;
        const userRes = await zdFetch(userSearchUrl);
        
        if (!userRes.users || userRes.users.length === 0) {
          logWithTrace(traceId, 'error', 'zendesk/agent/csat', 'User not found in Zendesk', { 
            email: sanitizedEmail 
          });
          return res.status(404).json({ 
            error: "User not found in Zendesk",
            email: sanitizedEmail
          });
        }
        
        const user = userRes.users[0];
        const userId = user.id;
        
        logWithTrace(traceId, 'info', 'zendesk/agent/csat', 'User resolved', { 
          userId,
          userName: user.name,
          email: sanitizedEmail
        });
        
        // Step 2: Calculate start_time for incremental API (Unix timestamp)
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - validDays);
        const startTimeUnix = Math.floor(daysAgo.getTime() / 1000);
        
        logWithTrace(traceId, 'info', 'zendesk/agent/csat', 'Fetching incremental satisfaction ratings', {
          userId,
          startTimeUnix,
          days: validDays
        });
        
        // Step 3: Call incremental satisfaction ratings API
        // Fetch all pages to get accurate counts
        let allRatings = [];
        let nextUrl = `https://${ZD_CONFIG.subdomain}.zendesk.com/api/v2/incremental/satisfaction_ratings.json?start_time=${startTimeUnix}`;
        
        while (nextUrl) {
          const ratingsRes = await zdFetch(nextUrl);
          const ratings = ratingsRes.satisfaction_ratings || [];
          
          // Filter ratings for this specific user (assignee_id matches) during collection
          const userRatings = ratings.filter(rating => rating.assignee_id === userId);
          allRatings = allRatings.concat(userRatings);
          
          // Check for next page - stop if end of stream OR no next_page
          nextUrl = (ratingsRes.end_of_stream || !ratingsRes.next_page) ? null : ratingsRes.next_page;
          
          // Safety limit: stop after reaching max ratings to prevent excessive queries
          if (allRatings.length >= MAX_CSAT_RATINGS_PER_AGENT) {
            logWithTrace(traceId, 'warn', 'zendesk/agent/csat', 'Hit rating limit, stopping pagination', {
              ratingsCount: allRatings.length,
              limit: MAX_CSAT_RATINGS_PER_AGENT
            });
            break;
          }
        }
        
        // Step 4: Calculate CSAT metrics
        let csatGood = 0;
        let csatBad = 0;
        
        for (const rating of allRatings) {
          if (rating.score === "good") {
            csatGood++;
          } else if (rating.score === "bad") {
            csatBad++;
          }
          // "offered" and "unoffered" don't count as actual ratings
        }
        
        const totalRatings = csatGood + csatBad;
        const csatPercentage = totalRatings > 0 ? Math.round((csatGood / totalRatings) * 100) : null;
        
        logWithTrace(traceId, 'info', 'zendesk/agent/csat', 'CSAT calculated', {
          userId,
          email: sanitizedEmail,
          good: csatGood,
          bad: csatBad,
          total: totalRatings,
          percentage: csatPercentage
        });
        
        return res.status(200).json({
          ok: true,
          userId: userId,
          userName: user.name,
          email: sanitizedEmail,
          days: validDays,
          csat: {
            good: csatGood,
            bad: csatBad,
            total: totalRatings,
            percentage: csatPercentage,
            display: csatPercentage !== null ? `${csatPercentage}%` : "--"
          }
        });
        
      } catch (err) {
        logWithTrace(traceId, 'error', 'zendesk/agent/csat', 'Error fetching CSAT', {
          error: err.message,
          status: err.status
        });
        
        return res.status(err.status || 500).json({
          error: err.message || "Failed to fetch CSAT data"
        });
      }
    }
    
    if (path === "/agent-profile" && req.method === "POST") {
      try {
        const { name } = readJsonBody(req);
        if (!name) return res.status(400).json({ error: "No name provided" });
        
        // Check cache first (5 minute TTL)
        const cacheKey = name.toLowerCase().trim();
        const cached = agentProfileCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < AGENT_PROFILE_TTL)) {
          console.log(`📦 Agent profile cache hit for ${name}`);
          return res.status(200).json(cached.data);
        }
        
        // 1. Find the agent's email from Firestore
        const { people } = await getCachedMetadata();
        let agentEmail = "";
        
        const target = name.toLowerCase().trim();
        for (const p of people) {
          const dbName = String(p.name || p.id || "").toLowerCase().trim();
          if (dbName === target || dbName.split(" ")[0] === target.split(" ")[0]) {
            agentEmail = p.email; 
            break;
          }
        }
        if (!agentEmail) {
          throw new Error(`Agent ${name} not found or missing email address.`);
        }
        
        // 2. Lookup User in Zendesk
        const userSearchUrl = `https://${ZD_CONFIG.subdomain}.zendesk.com/api/v2/users/search.json?query=${encodeURIComponent(agentEmail)}`;
        const userRes = await zdFetch(userSearchUrl);
        if (!userRes.users?.length) throw new Error("Email not found in Zendesk.");
        
        const user = userRes.users[0];
        const zendeskUserId = user.id;
        
        // 3. Calculate date boundaries (7 days ago)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoISO = sevenDaysAgo.toISOString().split('T')[0];
        const sevenDaysAgoUnix = Math.floor(sevenDaysAgo.getTime() / 1000);
        
        // 4. Fetch ticket counts - use a single query for open tickets
        let openCount = 0;
        let solvedCount = 0;
        
        try {
          // Single query for all unsolved tickets (status:new OR status:open OR status:pending)
          const unsolvedQuery = `assignee_id:${zendeskUserId} -status:solved -status:closed`;
          const solvedQuery = `assignee_id:${zendeskUserId} status:solved solved>=${sevenDaysAgoISO}`;
          
          const [unsolvedRes, solvedRes] = await Promise.all([
            zdFetch(`https://${ZD_CONFIG.subdomain}.zendesk.com/api/v2/search.json?query=${encodeURIComponent(unsolvedQuery)}`),
            zdFetch(`https://${ZD_CONFIG.subdomain}.zendesk.com/api/v2/search.json?query=${encodeURIComponent(solvedQuery)}`)
          ]);
          
          openCount = unsolvedRes.count || 0;
          solvedCount = solvedRes.count || 0;
        } catch (ticketErr) {
          console.warn("Ticket count failed:", ticketErr.message);
        }
        
        // 5. Fetch CSAT by searching for tickets with satisfaction ratings
        // Match the Zendesk View filter: "Request date in the last 7 days" + assignee + has rating
        let csatDisplay = "--";
        let csatGood = 0;
        let csatBad = 0;
        
        try {
          // Search for tickets created in last 7 days for this assignee
          // The Search API returns tickets with satisfaction_rating object embedded
          const ticketSearchQuery = `assignee_id:${zendeskUserId} created>=${sevenDaysAgoISO}`;
          const ticketSearchUrl = `https://${ZD_CONFIG.subdomain}.zendesk.com/api/v2/search.json?query=${encodeURIComponent(ticketSearchQuery)}&per_page=100`;
          
          const ticketRes = await zdFetch(ticketSearchUrl);
          const tickets = ticketRes.results || [];
          
          // Count satisfaction ratings from tickets
          for (const ticket of tickets) {
            if (ticket.satisfaction_rating && ticket.satisfaction_rating.score) {
              const score = ticket.satisfaction_rating.score;
              if (score === "good") csatGood++;
              else if (score === "bad") csatBad++;
              // "offered" and "unoffered" don't count as actual ratings
            }
          }
          
          // Log for debugging
          console.log(`CSAT for ${user.name} (ID: ${zendeskUserId}): Good=${csatGood}, Bad=${csatBad}, Total tickets searched=${tickets.length}`);
          
          const total = csatGood + csatBad;
          csatDisplay = total > 0 ? Math.round((csatGood / total) * 100) + "%" : "--";
        } catch (csatErr) {
          console.warn("CSAT lookup failed:", csatErr.message);
        }
        
        // 6. Build response
        const profileData = {
          found: true,
          id: zendeskUserId,
          zendeskUserId: zendeskUserId,
          name: user.name,
          email: user.email,
          avatar: user.photo ? user.photo.content_url : null,
          role: user.role,
          lastLogin: user.last_login_at,
          openTickets: openCount,
          solvedWeek: solvedCount,
          csatScore: csatDisplay,
          csatGood: csatGood,
          csatBad: csatBad
        };
        
        // Cache the result using the proper Map
        agentProfileCache.set(cacheKey, { data: profileData, timestamp: Date.now() });
        
        return res.status(200).json(profileData);
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
