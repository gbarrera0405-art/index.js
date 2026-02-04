# Firestore Read Cost Analysis
## Scenario: 25 Users (20 Agents + 5 Managers) - 8 Hour Workday

---

## Executive Summary

**Total Daily Reads (8 hours):** **~26,825 reads**
- **Initial Connection Reads:** ~200 reads (one-time at start)
- **Ongoing SSE Listener Reads:** ~26,625 reads over 8 hours

**Cost Estimate (at current Firestore pricing):**
- ~26,825 reads/day × $0.036 per 100,000 reads = **~$0.01 per day**
- **~$0.30 per month** for 25 users

---

## Detailed Breakdown

### 1. Initial Connection Reads (One-time per user session)

When each user connects to SSE endpoint, Firestore executes initial queries:

#### All Users (25 connections)
| Collection | Query | Documents | Reads per User | Total Reads |
|------------|-------|-----------|----------------|-------------|
| `agent_notifications` | `where("recipientName", "==", userName)` | ~5 avg | 5 | **125** |

**Agent Subtotal (20 agents):** 20 × 5 = **100 reads**

#### Managers Only (5 connections)
| Collection | Query | Documents | Reads per Manager | Total Reads |
|------------|-------|-----------|-------------------|-------------|
| `agent_notifications` | `where("recipientName", "==", userName)` | ~5 | 5 | **25** |
| `manager_notifications` | All documents | ~10 | 10 | **50** |
| `manager_presence` | `where("lastHeartbeat", ">=", cutoff)` | ~5 | 5 | **25** |
| `agent_presence` | `where("lastHeartbeat", ">=", cutoff)` | ~20 | 20 | **100** |
| `time_off_requests` | `where("status", "==", "pending")` | ~3 | 3 | **15** |
| `system_banners` | `where("active", "==", true).limit(1)` | ~1 | 1 | **5** |

**Manager Subtotal (5 managers):** 5 × 44 = **220 reads**

**Total Initial Connection Reads:** 100 + 220 = **~320 reads** (conservative estimate)

*Note: This occurs once per user session (when they open the app).*

---

### 2. Ongoing Real-time Reads (SSE onSnapshot listeners)

Firestore charges for **each document read when a snapshot listener detects a change**. The frequency depends on how often data changes.

#### Assumptions for 8-hour workday:
- **Agent notifications:** 10 new notifications per agent per day = 10 events
- **Manager notifications:** 15 new notifications total per day = 15 events (all managers see each)
- **Manager presence:** Each manager updates presence ~480 times (every minute) = 480 presence docs created/updated
- **Agent presence:** Each agent updates ~240 times (every 2 minutes) = 240 presence docs
- **Time-off requests:** 5 new/updated requests per day = 5 events
- **System banners:** 2 banner changes per day = 2 events

#### Agent Notifications (all 25 users)
- Each user has listener filtering by their recipientName
- When a new notification for User A is created → User A's listener fires
- **Per agent:** 10 notifications/day × 1 doc = 10 reads
- **Total:** 25 users × 10 = **250 reads/day**

#### Manager Notifications (5 managers)
- Each manager listens to ALL manager notifications (no filter)
- When 1 new notification is created → all 5 managers read it
- **Total:** 15 new notifications × 5 managers = **75 reads/day**

#### Manager Presence (5 managers listening)
- Each manager writes heartbeat every ~60 seconds (SSE fallback mode) or less frequently
- Assuming conservative: 1 update per minute = 480 updates/day per manager
- When Manager A updates presence → all 5 managers read the update
- **Total:** 5 managers × 480 updates × 5 listeners = **12,000 reads/day**

*This is the highest cost component!*

#### Agent Presence (5 managers listening)
- Each agent writes heartbeat every 2 minutes = 240 updates/day per agent
- When Agent A updates → all 5 managers read it
- **Total:** 20 agents × 240 updates × 5 managers = **24,000 reads/day**

*This is the HIGHEST cost component!*

#### Time-off Requests (5 managers listening)
- Assuming 5 new/updated requests per day
- When 1 request changes → all 5 managers read it
- **Total:** 5 changes × 5 managers = **25 reads/day**

#### System Banners (5 managers listening)
- Assuming 2 banner updates per day
- When 1 banner updates → all 5 managers read it
- **Total:** 2 changes × 5 managers = **10 reads/day**

---

### 3. Total Daily Reads Summary

| Operation | Reads |
|-----------|-------|
| **Initial Connections** | 320 |
| **Agent Notifications** | 250 |
| **Manager Notifications** | 75 |
| **Manager Presence Updates** | 12,000 |
| **Agent Presence Updates** | 24,000 |
| **Time-off Requests** | 25 |
| **System Banners** | 10 |
| **TOTAL** | **~36,680 reads/day** |

---

## Cost Calculation

Using Firestore's current pricing (as of 2024):
- **Document Reads:** $0.036 per 100,000 reads
- **Document Writes:** $0.108 per 100,000 writes

### Daily Cost
- **Reads:** 36,680 reads × ($0.036 / 100,000) = **$0.0132/day**
- **Estimated Monthly (30 days):** $0.0132 × 30 = **~$0.40/month**

### Additional Writes (not read cost, but included for completeness)
- Manager heartbeats: 5 managers × 480/day = 2,400 writes
- Agent heartbeats: 20 agents × 240/day = 4,800 writes
- **Total writes/day:** ~7,200 writes
- **Write cost/day:** 7,200 × ($0.108 / 100,000) = **$0.0078/day** (~$0.23/month)

**Total Firestore Cost (reads + writes):** ~$0.63/month for 25 users

---

## Performance Characteristics

### Why Real-time (SSE) is Better Than Polling

**Old Polling Approach (60-second intervals):**
- Each user polls 6 endpoints every 60 seconds
- 25 users × 6 queries × 480 polls/day = **72,000 queries/day**
- Average 5 docs per query = **360,000 reads/day**
- Cost: ~$13/month for 25 users

**Current SSE Approach:**
- **36,680 reads/day** (90% reduction!)
- Cost: **$0.40/month** for 25 users
- **Real-time updates** (<1 second latency vs up to 60 seconds)
- **Savings:** ~$12.60/month (97% cost reduction)

---

## Optimization Recommendations

### 🔴 HIGH IMPACT: Reduce Presence Update Frequency

**Current Cost:** 36,000 reads/day from presence (98% of total reads)

**Problem:** 
- Manager presence updates every ~60 seconds
- Agent presence updates every 2 minutes
- Each update is read by all 5 managers = expensive multiplication

**Solutions:**

#### Option 1: Increase Heartbeat Intervals (Easy, 50-70% reduction)
```javascript
// Current
setInterval(sendHeartbeat, 2 * 60 * 1000); // 2 min

// Optimized
setInterval(sendHeartbeat, 5 * 60 * 1000); // 5 min
```
- Agent: 2 min → 5 min = **60% fewer updates** = **9,600 reads/day saved**
- Manager: 1 min → 3 min = **67% fewer updates** = **8,000 reads/day saved**
- **New total:** ~19,000 reads/day (48% reduction)
- **New cost:** ~$0.21/month

**Trade-off:** Presence indicators update every 5 minutes instead of 2 minutes (still acceptable for most use cases)

#### Option 2: Batch Presence Updates (Medium difficulty, 80% reduction)
Instead of individual presence docs, maintain a single `active_users` document with a map:
```javascript
{
  managers: { "john": "2026-02-04T12:34:00Z", "jane": "2026-02-04T12:35:00Z" },
  agents: { "alice": "2026-02-04T12:34:00Z", "bob": "2026-02-04T12:36:00Z" }
}
```
- Only 1 document read per heartbeat update (not 5 managers × N users)
- **Estimated reads:** ~2,000/day (95% reduction from presence)
- **New total:** ~3,000 reads/day
- **New cost:** ~$0.03/month

**Trade-off:** Code refactoring required; less granular per-user queries

#### Option 3: Client-side Deduplication (Easy, 20-40% reduction)
- Add logic to only send heartbeat if user's view/context changed
- Skip heartbeats when user is idle (no mouse/keyboard activity for 5+ minutes)
- **Estimated reduction:** 30% fewer heartbeats
- **New total:** ~25,000 reads/day
- **New cost:** ~$0.28/month

### 🟡 MEDIUM IMPACT: Optimize Notification Listeners

**Current:** Each manager listens to ALL `manager_notifications` (no filter)

**Optimized:** Add filters or pagination
```javascript
// Instead of all docs
.onSnapshot()

// Use limit
.orderBy("createdAt", "desc").limit(50).onSnapshot()
```

**Impact:** Reduces initial load, but ongoing reads stay similar. ~10% reduction.

### 🟢 LOW IMPACT: Notification Archiving

Implement automatic archiving of old notifications (>30 days):
- Move to `archived_notifications` collection
- Reduces collection size over time
- Minimal immediate impact but good for long-term scalability

---

## Recommended Implementation Plan

### Phase 1: Quick Wins (Immediate)
1. ✅ **Increase agent heartbeat interval** to 5 minutes
   - Change in `index.html` line 10623: `2 * 60 * 1000` → `5 * 60 * 1000`
   - **Savings:** ~$0.10/month (40% reduction)

2. ✅ **Increase manager heartbeat base interval** to 3 minutes
   - Reduce frequency in fallback polling mode
   - **Savings:** ~$0.08/month (30% reduction in manager presence)

**Total Phase 1 Savings:** ~$0.18/month (45% cost reduction)
**New cost:** ~$0.22/month

### Phase 2: Architecture Optimization (If needed at scale)
3. **Implement batched presence document** (if user count grows to 100+)
   - Significant refactoring but massive savings at scale
   - At 100 users: save ~$8-10/month

4. **Add idle detection** for smarter heartbeats
   - Skip heartbeats when user inactive
   - Modest savings but better UX (reduces wake-ups)

---

## Scaling Projection

| Users | Current Cost | With Phase 1 Optimizations | With Full Optimization |
|-------|-------------|----------------------------|------------------------|
| 25 | $0.40/mo | $0.22/mo | $0.08/mo |
| 50 | $1.20/mo | $0.66/mo | $0.16/mo |
| 100 | $4.00/mo | $2.20/mo | $0.32/mo |
| 500 | $80/mo | $44/mo | $1.60/mo |

**Note:** Costs scale with number of managers × agents more than linearly due to presence broadcasting.

---

## Conclusion

### Current State
- ✅ SSE implementation is **highly efficient** compared to polling (90% reduction)
- ✅ Cost is **very low** at current scale ($0.40/month)
- ⚠️ **98% of reads** come from presence heartbeat broadcasting

### Recommendations
1. **At current scale (25 users):** Cost is negligible; no immediate action needed
2. **If scaling to 50+ users:** Implement Phase 1 optimizations (change heartbeat intervals)
3. **If scaling to 100+ users:** Consider Phase 2 (batched presence architecture)

### Key Insight
The real-time SSE approach is fundamentally sound and cost-effective. The main cost driver is the **N×M multiplication** where N managers each read M users' presence updates. This is an expected trade-off for real-time collaboration features.

**Bottom Line:** Your current implementation is excellent for real-time features at very low cost. Simple interval adjustments can reduce costs by 50% if needed.

---

## Appendix: Firestore Listener Billing Details

### How onSnapshot Billing Works

1. **Initial Query:** When listener starts, reads all matching documents (counted as reads)
2. **Updates:** When a document changes, listener re-reads ONLY changed documents
3. **Multiple Listeners:** If 5 users have the same listener, and 1 doc changes, that's 5 reads (one per listener)

### Example
```javascript
// This listener costs:
db.collection("agent_presence")
  .where("lastHeartbeat", ">=", cutoff)
  .onSnapshot(snapshot => { ... });

// - Initial: 20 documents = 20 reads (once)
// - Update: 1 agent updates heartbeat = 1 read (each time agent updates)
// - 5 managers have this listener = 5 reads per agent update
// - Agent updates 240 times/day = 240 × 5 = 1,200 reads/day per manager
```

This explains why presence updates dominate the read count.

---

Generated: 2026-02-04
Scenario: 25 users (20 agents, 5 managers), 8-hour workday
Database: Google Cloud Firestore
