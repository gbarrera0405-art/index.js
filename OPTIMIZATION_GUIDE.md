# Firestore Cost Optimization - Implementation Guide

## Quick Wins (5 Minutes)

### Option 1: Increase Agent Heartbeat Interval (Recommended)

**Impact:** 60% reduction in agent presence reads  
**Savings:** ~9,600 reads/day, ~$0.11/month  
**Trade-off:** Presence updates every 5 minutes instead of 2 minutes

#### File: `index.html`
**Line:** 10623

**Before:**
```javascript
setInterval(sendHeartbeat, 2 * 60 * 1000);
```

**After:**
```javascript
setInterval(sendHeartbeat, 5 * 60 * 1000); // Reduced frequency: 5 minutes
```

---

### Option 2: Increase Manager Heartbeat Interval

**Impact:** 67% reduction in manager presence reads  
**Savings:** ~8,000 reads/day, ~$0.09/month  
**Trade-off:** Manager presence updates every 3 minutes

#### File: `index.html`
**Line:** 10856 (fallback polling mode)

**Before:**
```javascript
_presenceHeartbeatTimer = setInterval(sendManagerHeartbeat, 60000);
```

**After:**
```javascript
_presenceHeartbeatTimer = setInterval(sendManagerHeartbeat, 3 * 60 * 1000); // 3 minutes
```

---

### Combined Phase 1 Optimization

Applying both changes above results in:
- **Total Savings:** 45% cost reduction
- **New Daily Reads:** ~20,000 reads/day (was 36,680)
- **New Monthly Cost:** $0.22/month (was $0.40)

---

## Advanced Optimization (2-4 Hours)

### Option 3: Batched Presence Document

**Impact:** 95% reduction in presence reads  
**Savings:** ~34,000 reads/day, ~$0.32/month  
**Trade-off:** Requires backend and frontend refactoring

#### Backend Changes

##### File: `index.js` - Replace individual heartbeat endpoints

**Replace manager heartbeat (line ~3247):**

```javascript
// OLD: Individual doc per manager
if (path === "/manager/heartbeat" && req.method === "POST") {
  const body = readJsonBody(req);
  const { managerName, view, area, isEditing } = body;
  const presenceDocId = managerName.replace(/\s+/g, '_').toLowerCase();
  
  await db.collection("manager_presence").doc(presenceDocId).set({
    managerName,
    view,
    area,
    isEditing,
    lastHeartbeat: new Date().toISOString()
  }, { merge: true });
  
  return res.status(200).json({ ok: true });
}
```

**NEW: Batched presence document:**

```javascript
if (path === "/manager/heartbeat" && req.method === "POST") {
  const body = readJsonBody(req);
  const { managerName, view, area, isEditing } = body;
  const now = new Date().toISOString();
  
  // Use single document with map of all active users
  const updateData = {};
  updateData[`managers.${managerName}`] = {
    view,
    area,
    isEditing,
    lastHeartbeat: now
  };
  
  await db.collection("active_presence").doc("current").set(
    updateData,
    { merge: true }
  );
  
  return res.status(200).json({ ok: true });
}
```

**Replace agent heartbeat (line ~3330):**

```javascript
// OLD: Individual doc per agent
if (path === "/agent/heartbeat" && req.method === "POST") {
  const body = readJsonBody(req);
  const { agentName, view } = body;
  const presenceDocId = agentName.replace(/\s+/g, '_').toLowerCase();
  
  await db.collection("agent_presence").doc(presenceDocId).set({
    agentName,
    view,
    lastHeartbeat: new Date().toISOString()
  }, { merge: true });
  
  return res.status(200).json({ ok: true });
}
```

**NEW: Batched presence:**

```javascript
if (path === "/agent/heartbeat" && req.method === "POST") {
  const body = readJsonBody(req);
  const { agentName, view } = body;
  const now = new Date().toISOString();
  
  const updateData = {};
  updateData[`agents.${agentName}`] = {
    view,
    lastHeartbeat: now
  };
  
  await db.collection("active_presence").doc("current").set(
    updateData,
    { merge: true }
  );
  
  return res.status(200).json({ ok: true });
}
```

##### File: `index.js` - Update SSE listeners (line ~1282)

**Replace manager presence listener:**

```javascript
// OLD: Query collection with filter
if (isManager) {
  const cutoffTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const presenceListener = db.collection("manager_presence")
    .where("lastHeartbeat", ">=", cutoffTime)
    .onSnapshot(snapshot => {
      const activeManagers = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        activeManagers.push({
          managerName: data.managerName,
          view: data.view,
          area: data.area,
          isEditing: data.isEditing || false,
          lastHeartbeat: data.lastHeartbeat
        });
      });
      sendEvent("presence", {
        online: activeManagers,
        updatedAt: new Date().toISOString()
      });
    });
  listeners.push(presenceListener);
}
```

**NEW: Watch single document:**

```javascript
if (isManager) {
  const presenceListener = db.collection("active_presence")
    .doc("current")
    .onSnapshot(doc => {
      const data = doc.data();
      const cutoff = Date.now() - 10 * 60 * 1000;
      
      // Filter active managers from the batch
      const activeManagers = [];
      if (data && data.managers) {
        for (const [name, info] of Object.entries(data.managers)) {
          if (new Date(info.lastHeartbeat).getTime() > cutoff) {
            activeManagers.push({
              managerName: name,
              view: info.view,
              area: info.area,
              isEditing: info.isEditing || false,
              lastHeartbeat: info.lastHeartbeat
            });
          }
        }
      }
      
      sendEvent("presence", {
        online: activeManagers,
        updatedAt: new Date().toISOString()
      });
    });
  listeners.push(presenceListener);
}
```

**Replace agent presence listener (line ~1285):**

```javascript
// OLD: Query collection
if (isManager) {
  const agentPresenceListener = db.collection("agent_presence")
    .where("lastHeartbeat", ">=", agentCutoff)
    .onSnapshot(snapshot => {
      const activeAgents = [];
      snapshot.forEach(doc => activeAgents.push(doc.data()));
      sendEvent("agent_presence", {
        online: activeAgents,
        updatedAt: new Date().toISOString()
      });
    });
  listeners.push(agentPresenceListener);
}
```

**NEW: Filter from batch document:**

```javascript
if (isManager) {
  // Reuse the same listener as manager presence
  // Agent data is in the same document under data.agents
  // Already handled by the presence listener above
  
  // If you want separate events, add to the existing listener:
  const presenceListener = db.collection("active_presence")
    .doc("current")
    .onSnapshot(doc => {
      const data = doc.data();
      const managerCutoff = Date.now() - 10 * 60 * 1000;
      const agentCutoff = Date.now() - 5 * 60 * 1000;
      
      // Parse managers
      const activeManagers = [];
      if (data && data.managers) {
        for (const [name, info] of Object.entries(data.managers)) {
          if (new Date(info.lastHeartbeat).getTime() > managerCutoff) {
            activeManagers.push({
              managerName: name,
              view: info.view,
              area: info.area,
              isEditing: info.isEditing || false,
              lastHeartbeat: info.lastHeartbeat
            });
          }
        }
      }
      
      // Parse agents
      const activeAgents = [];
      if (data && data.agents) {
        for (const [name, info] of Object.entries(data.agents)) {
          if (new Date(info.lastHeartbeat).getTime() > agentCutoff) {
            activeAgents.push({
              agentName: name,
              view: info.view,
              lastHeartbeat: info.lastHeartbeat
            });
          }
        }
      }
      
      // Send both events
      sendEvent("presence", {
        online: activeManagers,
        updatedAt: new Date().toISOString()
      });
      
      sendEvent("agent_presence", {
        online: activeAgents,
        updatedAt: new Date().toISOString()
      });
    });
  listeners.push(presenceListener);
}
```

#### Benefits of Batched Approach

**Before (individual docs):**
- 20 agent updates/min × 5 managers = 100 reads/min
- 5 manager updates/min × 5 managers = 25 reads/min
- **Total:** 125 reads/min = 60,000 reads/day

**After (single doc):**
- 1 doc update from any user × 5 managers = 5 reads per update
- 25 total users updating → 5 reads per update
- **Total:** ~1,500 reads/day (95% reduction!)

#### Migration Notes

1. **Data Structure Change:**
   ```javascript
   // Old structure
   agent_presence/{agentName}
   manager_presence/{managerName}
   
   // New structure
   active_presence/current {
     agents: {
       "John": { view: "schedule", lastHeartbeat: "..." },
       "Jane": { view: "schedule", lastHeartbeat: "..." }
     },
     managers: {
       "Alice": { view: "day", area: "2026-02", isEditing: false, lastHeartbeat: "..." }
     }
   }
   ```

2. **Cleanup:** After migration, delete old collections to avoid confusion

3. **Testing:** Test with small group before full rollout

---

## Option 4: Idle Detection (1-2 Hours)

**Impact:** 30% reduction in heartbeats  
**Savings:** ~10,000 reads/day during idle periods  
**Trade-off:** Slightly more complex code

#### File: `index.html`

**Add idle tracking:**

```javascript
// Track user activity
let lastUserActivity = Date.now();

function updateLastActivity() {
  lastUserActivity = Date.now();
}

// Listen to user interactions
document.addEventListener('mousemove', updateLastActivity, { passive: true });
document.addEventListener('keydown', updateLastActivity, { passive: true });
document.addEventListener('click', updateLastActivity, { passive: true });
document.addEventListener('scroll', updateLastActivity, { passive: true });

// Check if user is active before sending heartbeat
function isUserActive() {
  const idleThreshold = 5 * 60 * 1000; // 5 minutes
  return (Date.now() - lastUserActivity) < idleThreshold;
}
```

**Modify heartbeat functions (line ~10610):**

```javascript
// Agent heartbeat with idle detection
const sendHeartbeat = () => {
  // Only send if user was active recently
  if (!isUserActive()) {
    console.log('[Heartbeat] Skipping - user idle');
    return;
  }
  
  fetch('/agent/heartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentName: window._myName,
      view: 'schedule'
    })
  }).catch(err => console.warn('Agent heartbeat failed:', err));
};

setInterval(sendHeartbeat, 2 * 60 * 1000);
```

**Modify manager heartbeat (line ~10335):**

```javascript
function sendManagerHeartbeat() {
  if (!window._isManager || !window._myName) return;
  
  // Skip if user is idle
  if (!isUserActive()) {
    console.log('[Presence] Skipping heartbeat - user idle');
    return;
  }
  
  const { view, area, isEditing, editingTarget } = getPresenceContext();
  
  fetch('./?action=manager/heartbeat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      managerName: window._myName,
      view: view,
      area: area,
      isEditing: isEditing,
      editingTarget: editingTarget
    })
  })
  .then(res => res.json())
  .then(data => {
    if (data.ok) {
      console.log('[Presence] Heartbeat sent successfully');
    }
  })
  .catch(err => console.error('[Presence] Heartbeat error:', err));
}
```

---

## Recommendation Matrix

| Scale | Recommended Actions | Effort | Savings |
|-------|-------------------|--------|---------|
| **< 50 users** | Nothing (cost is negligible) | 0 min | N/A |
| **50-100 users** | Phase 1: Adjust intervals | 5 min | 45% |
| **100-500 users** | Phase 1 + Idle detection | 2 hrs | 60% |
| **500+ users** | Full batched architecture | 4 hrs | 95% |

---

## Testing Checklist

After implementing optimizations:

- [ ] SSE connection still establishes correctly
- [ ] Presence indicators update (verify timing matches new intervals)
- [ ] Notifications still arrive in real-time
- [ ] Manager presence UI shows active users
- [ ] No console errors in browser
- [ ] Check Firestore console: reads should decrease
- [ ] Verify disconnect cleanup still works

---

## Monitoring

Add logging to track actual read counts:

```javascript
// Backend (index.js) - Add to each listener
.onSnapshot(snapshot => {
  console.log(`[Firestore] Presence read: ${snapshot.size} docs`);
  // ... rest of handler
});
```

Check Firestore Console:
1. Go to Cloud Console → Firestore → Usage tab
2. Monitor "Document Reads" metric
3. Compare before/after optimization

---

## Rollback Plan

If issues occur:

1. Revert to original intervals:
   ```javascript
   setInterval(sendHeartbeat, 2 * 60 * 1000); // Original 2 minutes
   ```

2. For batched approach, keep both collections running during migration:
   ```javascript
   // Write to both old and new structure temporarily
   await Promise.all([
     db.collection("agent_presence").doc(id).set({...}),
     db.collection("active_presence").doc("current").set({...}, {merge: true})
   ]);
   ```

---

Generated: 2026-02-04T05:07:00Z
Last Updated: 2026-02-04T05:07:00Z
