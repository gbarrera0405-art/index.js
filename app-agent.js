// [SECTION 15] AGENT MODE
// ============================================
async function loadAgentNotifications() {
  if (!window._myName) return;
  
  // Rate limiting - prevent fetching more than once per minute
  const now = Date.now();
  if (now - _lastAgentNotifFetch < AGENT_NOTIF_MIN_INTERVAL) {
    console.log("[Agent] Notifications fetch skipped - rate limited");
    return;
  }
  _lastAgentNotifFetch = now;
  
  try {
    const res = await fetch('./?action=agent/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentName: window._myName })
    });
    
    const data = await res.json();
    
    if (data.ok) {
      const prevUnreadCount = _agentNotifUnreadCount || 0;
      _agentNotifications = data.notifications || [];
      _agentNotifUnreadCount = data.unreadCount || 0;
      
      // Play sound and show visual indicator if NEW notifications arrived
      if (_agentNotifUnreadCount > prevUnreadCount && prevUnreadCount >= 0) {
        playNotificationSound();
        // Flash the bell icon
        const bellBtn = document.querySelector('[onclick="openAgentNotifications()"]');
        if (bellBtn) {
          bellBtn.style.animation = "pulse-bell 0.5s ease 3";
          setTimeout(() => bellBtn.style.animation = "", 1500);
        }
      }
      
      updateAgentNotifBadge();
    }
  } catch (err) {
    console.error("Load agent notifications error:", err);
  }
}
function updateAgentNotifBadge() {
  const badge = $("agentNotifBadge");
  if (!badge) return;
  
  if (_agentNotifUnreadCount > 0) {
    badge.textContent = _agentNotifUnreadCount > 9 ? "9+" : _agentNotifUnreadCount;
    badge.style.display = "flex";
    // Add pulsing animation for unread notifications
    badge.style.animation = "pulse-badge 2s infinite";
  } else {
    badge.style.display = "none";
    badge.style.animation = "";
  }
}
// ============================================
// FUTURE TIME OFF REQUEST (Calendar-based)
// ============================================
// Future Time Off - Multiple Make Up Dates
let _futureMakeUpDates = [];

function addFutureMakeUpDate() {
  const dateInput = $("futureToMakeUpDate");
  if (!dateInput || !dateInput.value) {
    toast("Please select a date first", "error");
    return;
  }
  
  const date = dateInput.value;
  if (_futureMakeUpDates.includes(date)) {
    toast("This date is already added", "error");
    return;
  }
  
  _futureMakeUpDates.push(date);
  dateInput.value = "";
  renderFutureMakeUpDates();
}

function removeFutureMakeUpDate(date) {
  _futureMakeUpDates = _futureMakeUpDates.filter(d => d !== date);
  renderFutureMakeUpDates();
}

function renderFutureMakeUpDates() {
  const container = $("futureMakeUpDatesList");
  if (!container) return;
  
  if (_futureMakeUpDates.length === 0) {
    container.innerHTML = '<span style="font-size:12px; color:#94a3b8; font-style:italic;">No dates added yet</span>';
    return;
  }
  
  container.innerHTML = _futureMakeUpDates.map(date => {
    const d = new Date(date + 'T12:00:00');
    const formatted = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return `
      <span style="display:inline-flex; align-items:center; gap:6px; padding:6px 12px; background:linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border:1px solid #93c5fd; border-radius:20px; font-size:12px; font-weight:600; color:#1e40af;">
        📅 ${formatted}
        <button type="button" onclick="removeFutureMakeUpDate('${date}')" style="background:none; border:none; color:#3b82f6; cursor:pointer; font-size:14px; padding:0; line-height:1;">&times;</button>
      </span>
    `;
  }).join('');
}

function openFutureTimeOffModal() {
  const modal = $("futureTimeOffModal");
  if (!modal) return;
  
  // Reset make-up dates array
  _futureMakeUpDates = [];
  renderFutureMakeUpDates();
  
  // Set default dates
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowISO = tomorrow.toISOString().split("T")[0];
  
  const startInput = $("futureToDateStart");
  const endInput = $("futureToDateEnd");
  const makeUpInput = $("futureToMakeUpDate");
  
  if (startInput) {
    startInput.value = tomorrowISO;
    startInput.min = tomorrowISO;
    startInput.onchange = updateFutureTimeOffDaysCount;
  }
  if (endInput) {
    endInput.value = tomorrowISO;
    endInput.min = tomorrowISO;
    endInput.onchange = updateFutureTimeOffDaysCount;
  }
  if (makeUpInput) {
    makeUpInput.value = "";
    makeUpInput.min = tomorrowISO;
  }
  
  // Clear reason
  if ($("futureToReason")) $("futureToReason").value = "";
  
  // Reset type selection to Make Up
  selectFutureTimeOffType('makeup');
  
  // Update PTO balance display
  const ptoEl = $("futureTimeOffPtoAmount");
  if (ptoEl && _balanceData) {
    const balance = _balanceData.get(window._myName) || { pto: 0 };
    ptoEl.textContent = balance.pto || 0;
  }
  
  // Update days count
  updateFutureTimeOffDaysCount();
  
  modal.style.display = "flex";
}

function updateFutureTimeOffDaysCount() {
  const startInput = $("futureToDateStart");
  const endInput = $("futureToDateEnd");
  const countEl = $("futureTimeOffDaysCount");
  
  if (!startInput || !endInput || !countEl) return;
  
  const start = new Date(startInput.value);
  const end = new Date(endInput.value);
  
  if (start && end && !isNaN(start) && !isNaN(end)) {
    // Ensure end is not before start
    if (end < start) {
      endInput.value = startInput.value;
      countEl.innerHTML = '<span style="color:#16a34a; font-weight:600;">📅 1 day selected</span>';
      return;
    }
    
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    if (diffDays === 1) {
      countEl.innerHTML = '<span style="color:#16a34a; font-weight:600;">📅 1 day selected</span>';
    } else {
      countEl.innerHTML = `<span style="color:#b37e78; font-weight:600;">📅 ${diffDays} days selected</span>`;
    }
  }
}

function selectFutureTimeOffType(type) {
  const makeUpLabel = $("futureTypeMakeUp");
  const ptoLabel = $("futureTypePTO");
  const makeUpWrap = $("futureToMakeUpWrap");
  
  if (type === 'makeup') {
    if (makeUpLabel) {
      makeUpLabel.style.borderColor = '#b37e78';
      makeUpLabel.style.background = '#eff6ff';
      makeUpLabel.querySelector('input').checked = true;
    }
    if (ptoLabel) {
      ptoLabel.style.borderColor = '#e2e8f0';
      ptoLabel.style.background = 'white';
    }
    if (makeUpWrap) makeUpWrap.style.display = 'block';
  } else {
    if (ptoLabel) {
      ptoLabel.style.borderColor = '#16a34a';
      ptoLabel.style.background = '#f0fdf4';
      ptoLabel.querySelector('input').checked = true;
    }
    if (makeUpLabel) {
      makeUpLabel.style.borderColor = '#e2e8f0';
      makeUpLabel.style.background = 'white';
    }
    if (makeUpWrap) makeUpWrap.style.display = 'none';
  }
}

function closeFutureTimeOffModal() {
  const modal = $("futureTimeOffModal");
  if (modal) modal.style.display = "none";
}

async function submitFutureTimeOff() {
  const startDate = $("futureToDateStart")?.value;
  const endDate = $("futureToDateEnd")?.value;
  const typeRadio = document.querySelector('input[name="futureToType"]:checked');
  const type = typeRadio ? typeRadio.value : "Make Up";
  const reason = $("futureToReason")?.value || "";
  
  if (!startDate) {
    toast("Please select a start date", "error");
    return;
  }
  
  if (!reason.trim()) {
    toast("Please provide a reason", "error");
    return;
  }
  
  // If Make Up type, require at least one make up date
  if (type === "Make Up" && _futureMakeUpDates.length === 0) {
    // Check if there's a single date in the input as fallback
    const singleDate = $("futureToMakeUpDate")?.value;
    if (!singleDate) {
      toast("Please add at least one make up date", "error");
      return;
    }
    _futureMakeUpDates.push(singleDate);
  }
  
  // Calculate dates in range
  const start = new Date(startDate);
  const end = new Date(endDate || startDate);
  const dates = [];
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().split("T")[0]);
  }
  
  // Format make up dates string
  const makeUpDatesStr = _futureMakeUpDates.join(', ');
  
  try {
    Swal.fire({
      title: 'Submitting...',
      text: `Requesting ${dates.length} day${dates.length > 1 ? 's' : ''} off`,
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading()
    });
    
    // Submit each date as a separate request
    let successCount = 0;
    let errors = [];
    
    for (const date of dates) {
      try {
        const res = await fetch('./?action=timeoff/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            person: window._myName,
            date: date,
            typeKey: type.toLowerCase().replace(" ", "_"),
            duration: "full_day",
            reason: reason,
            makeUpDate: type === "Make Up" ? makeUpDatesStr : null,
            makeUpDates: type === "Make Up" ? _futureMakeUpDates : [],
            shiftStart: null,
            shiftEnd: null,
            team: null
          })
        });
        
        const data = await res.json();
        if (data.ok) {
          successCount++;
        } else {
          errors.push(`${date}: ${data.error || 'Unknown error'}`);
        }
      } catch (err) {
        errors.push(`${date}: ${err.message}`);
      }
    }
    
    closeFutureTimeOffModal();
    
    if (successCount === dates.length) {
      Swal.fire({
        icon: 'success',
        title: 'Request Submitted!',
        html: `<div style="text-align:center;">
          <p>✅ ${successCount} day${successCount > 1 ? 's' : ''} requested</p>
          ${type === "Make Up" ? `<p style="font-size:12px; color:#64748b; margin-top:4px;">Make up dates: ${makeUpDatesStr}</p>` : ''}
          <p style="font-size:12px; color:#64748b; margin-top:8px;">Your manager will review your request.</p>
        </div>`,
        confirmButtonColor: '#16a34a'
      });
    } else if (successCount > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Partially Submitted',
        html: `<div style="text-align:left;">
          <p>✅ ${successCount} day${successCount > 1 ? 's' : ''} submitted</p>
          <p>❌ ${errors.length} failed:</p>
          <ul style="font-size:12px; color:#dc2626;">${errors.map(e => `<li>${e}</li>`).join('')}</ul>
        </div>`,
        confirmButtonColor: '#f59e0b'
      });
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Submission Failed',
        text: errors[0] || 'Unknown error',
        confirmButtonColor: '#ef4444'
      });
    }
  } catch (err) {
    console.error("Submit future time off error:", err);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Failed to submit request: ' + err.message,
      confirmButtonColor: '#ef4444'
    });
  }
}
function openAgentNotifications() {
  const panel = $("agentNotifPanel");
  if (!panel) return;
  
  renderAgentNotifications();
  panel.style.display = "flex";
}
function closeAgentNotifications() {
  const panel = $("agentNotifPanel");
  if (panel) panel.style.display = "none";
}

// Clear all agent notifications
async function clearAgentNotifications() {
  if (_agentNotifications.length === 0) {
    toast("No notifications to clear");
    return;
  }
  
  const confirmed = await Swal.fire({
    title: 'Clear All Notifications?',
    text: `This will remove all ${_agentNotifications.length} notification(s).`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Yes, clear all',
    cancelButtonText: 'Cancel'
  });
  
  if (!confirmed.isConfirmed) return;
  
  try {
    const res = await fetch("./?action=agent/notifications/clear", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentName: window._myName })
    });
    
    const data = await res.json();
    
    if (data.ok) {
      _agentNotifications = [];
      _agentNotifUnreadCount = 0; // ✅ FIX: Reset unread count to clear badge
      renderAgentNotifications();
      updateAgentNotifBadge();
      toast("✅ Notifications cleared");
    } else {
      toast("Failed to clear notifications", "error");
    }
  } catch (err) {
    console.error("Clear notifications error:", err);
    toast("Error clearing notifications", "error");
  }
}

function renderAgentNotifications() {
  const list = $("agentNotifList");
  if (!list) return;
  
  if (_agentNotifications.length === 0) {
    list.innerHTML = `<div style="text-align:center; color:var(--text-secondary, #94a3b8); padding:40px;">
      <div style="font-size:48px; margin-bottom:12px;">🎉</div>
      <div>No notifications</div>
    </div>`;
    return;
  }
  
  list.innerHTML = _agentNotifications.map(n => {
    const isUnread = !n.read;
    const icon = getNotifIcon(n.type, n.decision);
    const timeAgo = getTimeAgo(n.createdAt);
    
    return `
      <div class="agent-notif-item ${isUnread ? 'unread' : ''}" onclick="markNotifRead('${n.id}')">
        <div class="agent-notif-icon">${icon}</div>
        <div class="agent-notif-content">
          <div class="agent-notif-message">${escapeHtml(n.message)}</div>
          <div class="agent-notif-time">${timeAgo}</div>
        </div>
        ${isUnread ? '<div class="agent-notif-dot"></div>' : ''}
      </div>
    `;
  }).join("");
}
function getNotifIcon(type, decision) {
  if (type === "timeoff_decision") {
    return decision === "approved" ? "✅" : "❌";
  }
  if (type === "timeoff_approved") return "✅";
  if (type === "timeoff_denied") return "❌";
  if (type === "shift_assigned") return "📋";
  if (type === "swap_request") return "🔄";
  if (type === "swap_response") {
    return decision === "accepted" ? "✅" : "❌";
  }
  if (type === "shift_change") return "📅";
  return "🔔";
}
function getTimeAgo(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
async function markNotifRead(notifId) {
  try {
    await fetch('./?action=agent/notifications/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notifId })
    });
    
    // Update local state
    const notif = _agentNotifications.find(n => n.id === notifId);
    if (notif && !notif.read) {
      notif.read = true;
      _agentNotifUnreadCount = Math.max(0, _agentNotifUnreadCount - 1);
      updateAgentNotifBadge();
      renderAgentNotifications();
    }
  } catch (err) {
    console.error("Mark notif read error:", err);
  }
}
// Load pending swap requests
async function loadPendingSwaps() {
  if (!window._myName) return;
  
  try {
    const res = await fetch('./?action=swap/pending', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentName: window._myName })
    });
    
    const data = await res.json();
    
    if (data.ok && data.incoming && data.incoming.length > 0) {
      // Show swap requests in notifications
      data.incoming.forEach(swap => {
        toast(`🔄 ${swap.fromPerson} wants to swap a shift with you`, "info");
      });
    }
  } catch (err) {
    console.error("Load pending swaps error:", err);
  }
}

// Helper: Check for scheduling conflicts
async function checkSchedulingConflicts(personName, date, startTime, endTime, excludeAssignmentId = null) {
  try {
    const res = await fetch('./?action=schedule/check-conflict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personName,
        date,
        startTime,
        endTime,
        excludeAssignmentId
      })
    });

    const data = await res.json();

    if (data.ok) {
      return {
        hasConflict: data.hasConflict,
        conflicts: data.conflicts || []
      };
    }

    return { hasConflict: false, conflicts: [] };
  } catch (err) {
    console.error('Conflict check error:', err);
    return { hasConflict: false, conflicts: [] };
  }
}

async function respondToSwap(swapId, response) {
  if (response === 'accepted') {
    // Show confirmation with swap details
    const swapRequest = _agentNotifications?.find(n => n.swapRequestId === swapId);

    if (swapRequest) {
      // Check for conflicts before accepting
      try {
        const conflictRes = await fetch('./?action=schedule/check-conflict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personName: window._myName,
            date: swapRequest.shiftDate || swapRequest.date,
            startTime: swapRequest.shiftStart || swapRequest.start,
            endTime: swapRequest.shiftEnd || swapRequest.end
          })
        });

        const conflictData = await conflictRes.json();

        if (conflictData.ok && conflictData.hasConflict && conflictData.conflicts.length > 0) {
          // Show conflicts and block acceptance
          const conflictsList = conflictData.conflicts.map(c => 
            `• ${escapeHtml(c.team)}: ${escapeHtml(c.start)} - ${escapeHtml(c.end)}`
          ).join('<br>');

          Swal.fire({
            title: '⚠️ Scheduling Conflict Detected',
            html: `
              <div style="text-align: left; font-size: 14px; line-height: 1.6;">
                <p style="color: #dc2626; font-weight: 600; margin-bottom: 12px;">
                  You are already scheduled during this time:
                </p>
                <div style="padding: 12px; background: #fee2e2; border-left: 3px solid #dc2626; border-radius: 4px; margin-bottom: 12px;">
                  ${conflictsList}
                </div>
                <p>You cannot accept this swap request due to the conflict.</p>
              </div>
            `,
            icon: 'error',
            confirmButtonColor: '#dc2626',
            confirmButtonText: 'OK'
          });
          return; // Block the acceptance
        }
      } catch (err) {
        console.error('Conflict check error:', err);
        // Continue with acceptance if conflict check fails
      }

      // Confirm acceptance
      const result = await Swal.fire({
        title: '🔄 Accept Swap Request?',
        html: `
          <div style="text-align: left; font-size: 14px;">
            <p><strong>From:</strong> ${swapRequest.fromPerson || 'Unknown'}</p>
            <p><strong>Date:</strong> ${swapRequest.shiftDate || swapRequest.date}</p>
            <p><strong>Time:</strong> ${swapRequest.shiftStart || swapRequest.start} - ${swapRequest.shiftEnd || swapRequest.end}</p>
            ${swapRequest.team ? `<p><strong>Team:</strong> ${swapRequest.team}</p>` : ''}
          </div>
        `,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Yes, Accept',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#16a34a'
      });

      if (!result.isConfirmed) return;
    }
  }

  try {
    const res = await fetch('./?action=swap/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        swapId, 
        response, 
        responderName: window._myName 
      })
    });
    
    const data = await res.json();
    
    if (data.ok) {
      toast(`✅ Swap ${response}`, "success");
      loadAgentNotifications();
      loadSystemData(); // Refresh schedule
    } else {
      toast("Failed to respond: " + (data.error || "Unknown error"), "error");
    }
  } catch (err) {
    console.error("Swap respond error:", err);
    toast("Failed to respond to swap", "error");
  }
}
  // ============================================
// ACCRUED HOURS SYSTEM
// ============================================
let _balanceData = new Map(); // person -> {pto, sick}
async function loadBalances() {
  try {
    const res = await fetch('/?action=balances/list');
    const data = await res.json();
    
    if (data.ok) {
      _balanceData.clear();
      (data.balances || []).forEach(b => {
        _balanceData.set(b.person, {
          pto: b.pto || 0,
          sick: b.sick || 0
        });
      });
      
      updateBalancePill();
    }
  } catch (err) {
    console.error("Load balances error:", err);
  }
}
function updateBalancePill() {
  const agentPill = $("balancePill");
  const managerSignOutPill = $("managerSignOutPill");
  
  if (window._isManager) {
    // ✅ MANAGERS: Hide agent profile pill, show simple sign out pill
    if (agentPill) agentPill.style.display = "none";
    if (managerSignOutPill) managerSignOutPill.style.display = "inline-flex";
  } else if (window._myName) {
    // ✅ AGENTS: Show profile pill with PTO, hide manager sign out pill
    if (managerSignOutPill) managerSignOutPill.style.display = "none";
    
    if (agentPill) {
      const balance = _balanceData.get(window._myName);
      if (balance) {
        const badge = $("ptoBadge");
        if (badge) {
          badge.textContent = `${balance.pto}h PTO`;
        }
        const text = $("balanceText");
        if (text) text.textContent = "My Profile";
        agentPill.style.display = "inline-flex";
      }
    }
  }
}
function openBalanceModal() {
  const agentView = $("agentBalanceView");
  const managerView = $("managerBalanceView");
  const modalTitle = $("balanceModalTitle");
  
  if (window._isManager) {
    // Manager view - PTO Balance management
    agentView.style.display = "none";
    managerView.style.display = "block";
    if (modalTitle) modalTitle.innerHTML = "📊 Team PTO Balances";
    renderBalanceList();
  } else {
    // Agent view - Personal profile
    managerView.style.display = "none";
    agentView.style.display = "block";
    if (modalTitle) modalTitle.innerHTML = "👤 My Profile";
    
    const balance = _balanceData.get(window._myName) || {pto: 0, sick: 0, holiday_bank: 0};
    const ptoHours = parseFloat(balance.pto) || 0;
    $("agentPtoBalance").textContent = ptoHours;
    
    // Update PTO ring visualization (max 80 hours for full ring)
    const ringFill = $("ptoRingFill");
    if (ringFill) {
      const maxHours = 80;
      const percentage = Math.min(ptoHours / maxHours, 1);
      const circumference = 283; // 2 * PI * 45
      const offset = circumference * (1 - percentage);
      ringFill.style.strokeDashoffset = offset;
      
      // Change ring color based on PTO level
      if (ptoHours <= 0) {
        ringFill.style.stroke = '#ef4444';
      } else if (ptoHours < 16) {
        ringFill.style.stroke = '#f59e0b';
      } else {
        ringFill.style.stroke = '#22c55e';
      }
    }
    
    // Find next shift
    if ($("agentNextShift")) {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const nowHour = today.getHours();
      
      const futureShifts = _allData.filter(s => {
        const shiftDate = s.dayKey || s.dateISO || dayKeyPST(s.date);
        if (s.person !== window._myName) return false;
        if (String(s.notes || "").toUpperCase().includes("[OFF]")) return false;
        
        // Include today if shift hasn't ended yet
        if (shiftDate === todayStr) {
          const endHour = parseTimeDecimal(s.end);
          return endHour > nowHour;
        }
        return shiftDate > todayStr;
      }).sort((a, b) => {
        const dateA = a.dayKey || a.dateISO || "";
        const dateB = b.dayKey || b.dateISO || "";
        if (dateA !== dateB) return dateA.localeCompare(dateB);
        return (a.start || "").localeCompare(b.start || "");
      });
      
      if (futureShifts.length > 0) {
        const next = futureShifts[0];
        const nextDate = next.dayKey || next.dateISO || "";
        if (nextDate === todayStr) {
          $("agentNextShift").textContent = "Today";
        } else {
          const d = new Date(nextDate + "T12:00:00");
          const tomorrow = new Date(today);
          tomorrow.setDate(today.getDate() + 1);
          if (nextDate === tomorrow.toISOString().split('T')[0]) {
            $("agentNextShift").textContent = "Tomorrow";
          } else {
            $("agentNextShift").textContent = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          }
        }
      } else {
        $("agentNextShift").textContent = "None";
      }
    }
    
    // Calculate upcoming shifts this week
    if ($("agentUpcomingShifts")) {
      const today = new Date();
      const endOfWeek = new Date(today);
      endOfWeek.setDate(today.getDate() + 7);
      const todayStr = today.toISOString().split('T')[0];
      const endStr = endOfWeek.toISOString().split('T')[0];
      
      const myShifts = _allData.filter(s => {
        const shiftDate = s.dayKey || s.dateISO || dayKeyPST(s.date);
        return s.person === window._myName && 
               shiftDate >= todayStr && 
               shiftDate <= endStr &&
               !String(s.notes || "").toUpperCase().includes("[OFF]");
      });
      $("agentUpcomingShifts").textContent = myShifts.length;
    }
    
    // Fetch Zendesk stats for agent
    fetchAgentZendeskStats();
    
    // Load agent's weekly assignments
    loadAgentWeeklyAssignments();
    
    // Load rotation info (if they're covering Thursday)
    loadAgentRotationInfo();
  }
  
  $("balanceModal").style.display = "flex";
}

// Fetch Zendesk stats for agent profile
async function fetchAgentZendeskStats() {
  const opensEl = $("agentZendeskOpens");
  const ticketsListEl = $("agentTicketsList");
  const ticketsLoadingEl = $("agentTicketsLoading");
  const ticketsEmptyEl = $("agentTicketsEmpty");
  
  if (!opensEl) return;
  
  // Set loading state
  opensEl.textContent = "...";
  if (ticketsLoadingEl) ticketsLoadingEl.style.display = "block";
  if (ticketsListEl) ticketsListEl.style.display = "none";
  if (ticketsEmptyEl) ticketsEmptyEl.style.display = "none";
  
  try {
    // Fetch from agent-profile API
    const res = await fetch('./?action=agent-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: window._myName })
    });
    
    const data = await res.json();
    console.log("[Profile] Zendesk data:", data);
    
    if (data && !data.error && data.found) {
      // Display open tickets count
      const openCount = data.openTickets || 0;
      opensEl.textContent = openCount;
      
      // Hide loading
      if (ticketsLoadingEl) ticketsLoadingEl.style.display = "none";
      
      // Render clickable ticket list
      if (ticketsListEl) {
        if (data.openTicketsList && data.openTicketsList.length > 0) {
          ticketsListEl.innerHTML = data.openTicketsList.map(ticket => {
            const priorityClass = ticket.priority ? `ticket-priority ${ticket.priority}` : '';
            const priorityBadge = ticket.priority ? 
              `<span class="${priorityClass}">${ticket.priority}</span>` : '';
            
            return `
              <a href="${ticket.url}" target="_blank" rel="noopener" class="ticket-list-item">
                <span class="ticket-id-badge">#${ticket.id}</span>
                <span class="ticket-subject" title="${(ticket.subject || '').replace(/"/g, '&quot;')}">${ticket.subject || '(No subject)'}</span>
                ${priorityBadge}
                <span class="ticket-arrow">→</span>
              </a>
            `;
          }).join('');
          ticketsListEl.style.display = "block";
        } else {
          // No open tickets
          if (ticketsEmptyEl) ticketsEmptyEl.style.display = "block";
        }
      }
    } else {
      // If API fails, show N/A
      console.error("[Profile] Zendesk error:", data?.error);
      opensEl.textContent = "N/A";
      if (ticketsLoadingEl) ticketsLoadingEl.style.display = "none";
    }
  } catch (err) {
    console.error("[Profile] Error fetching Zendesk stats:", err);
    opensEl.textContent = "N/A";
    if (ticketsLoadingEl) ticketsLoadingEl.style.display = "none";
  }
}

// Load agent's weekly assignments for their profile
async function loadAgentWeeklyAssignments() {
  const sectionEl = $("agentWeeklyAssignmentsSection");
  const containerEl = $("agentWeeklyAssignments");
  
  // Also update dashboard banner
  const dashboardCard = $("agentWeeklyAssignCard");
  const dashboardList = $("agentWeeklyAssignList");
  const dashboardWeek = $("agentWeeklyAssignWeek");
  const dashboardBanner = $("agentAssignmentsBanner");
  
  try {
    const res = await fetch(`/weekly-assignments/my?name=${encodeURIComponent(window._myName)}`);
    const data = await res.json();
    
    if (data.ok && data.assignments && data.assignments.length > 0) {
      // Update profile modal section (if exists)
      if (sectionEl && containerEl) {
        sectionEl.style.display = "block";
        containerEl.innerHTML = data.assignments.map(a => {
          const rolesList = a.roles.join(', ');
          const eventsNote = a.events && a.events.length > 0 ? 
            `<div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">📆 ${a.events.join(', ')}</div>` : '';
          
          return `
            <div style="padding: 10px; background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-radius: 8px; margin-bottom: 8px; border-left: 3px solid #3b82f6;">
              <div style="font-weight: 600; color: #1e40af;">Week of ${a.weekOf}</div>
              <div style="color: #1e3a8a; margin-top: 4px;">🎯 ${rolesList}</div>
              ${eventsNote}
            </div>
          `;
        }).join('');
      }
      
      // Update dashboard banner
      if (dashboardCard && dashboardList && dashboardBanner) {
        dashboardBanner.style.display = "block";
        dashboardCard.style.display = "block";
        
        const firstAssign = data.assignments[0];
        dashboardWeek.textContent = `Week of ${firstAssign.weekOf}`;
        
        // Create assignment chips
        const allRoles = data.assignments.flatMap(a => a.roles);
        dashboardList.innerHTML = allRoles.map(role => `
          <span style="display: inline-flex; align-items: center; padding: 4px 10px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border-radius: 12px; font-size: 11px; font-weight: 500;">
            ${role}
          </span>
        `).join('');
      }
    } else {
      if (sectionEl) sectionEl.style.display = "none";
      if (dashboardCard) dashboardCard.style.display = "none";
    }
  } catch (err) {
    console.error("Error loading agent weekly assignments:", err);
    if (sectionEl) sectionEl.style.display = "none";
    if (dashboardCard) dashboardCard.style.display = "none";
  }
}

// Load agent's meeting rotation info (for dashboard banner)
async function loadAgentRotationInfo() {
  const meetingCard = $("agentMeetingRoleCard");
  const roleLabel = $("agentMeetingRoleLabel");
  const roleDate = $("agentMeetingRoleDate");
  const roleDesc = $("agentMeetingRoleDesc");
  const roleIcon = $("agentMeetingRoleIcon");
  const dashboardBanner = $("agentAssignmentsBanner");
  
  if (!meetingCard || !window._myName) return;
  
  try {
    // Ensure meeting rotations are loaded
    let rotations = window._meetingRotationsCache || {};
    
    // If cache is empty, try to fetch
    if (Object.keys(rotations).length === 0) {
      try {
        const res = await fetch('/meeting-rotation/list');
        const data = await res.json();
        if (data.rotations) {
          rotations = {};
          data.rotations.forEach(r => {
            rotations[r.date] = r;
          });
          window._meetingRotationsCache = rotations;
        }
      } catch (e) {
        console.warn("Failed to fetch meeting rotations:", e);
      }
    }
    
    const myNameLower = window._myName.toLowerCase().trim();
    let foundRole = null;
    let foundDate = null;
    let icon = '📅';
    let description = '';
    
    // Check next 7 days for meeting roles
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() + i);
      const dateKey = checkDate.toISOString().split('T')[0];
      const meeting = rotations[dateKey];
      
      if (!meeting) continue;
      
      if ((meeting.captain || '').toLowerCase().trim() === myNameLower) {
        foundRole = 'Captain';
        foundDate = dateKey;
        icon = '👤';
        description = 'You are the Captain for this meeting. Lead the LC coverage rotation.';
        break;
      } else if ((meeting.backup1 || '').toLowerCase().trim() === myNameLower) {
        foundRole = 'Backup #1';
        foundDate = dateKey;
        icon = '🔄';
        description = 'You are Backup #1. Cover if the Captain is unavailable.';
        break;
      } else if ((meeting.backup2 || '').toLowerCase().trim() === myNameLower) {
        foundRole = 'Backup #2';
        foundDate = dateKey;
        icon = '🔄';
        description = 'You are Backup #2. Cover if Captain and Backup #1 are unavailable.';
        break;
      } else if ((meeting.lcAgents || []).map(a => a.toLowerCase().trim()).includes(myNameLower)) {
        foundRole = 'LC Agent';
        foundDate = dateKey;
        icon = '💬';
        description = 'You are assigned to cover Live Chat during the meeting.';
        break;
      }
    }
    
    if (foundRole && foundDate) {
      const d = new Date(foundDate + 'T12:00:00');
      const dateStr = d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
      
      meetingCard.style.display = "block";
      if (dashboardBanner) dashboardBanner.style.display = "block";
      if (roleIcon) roleIcon.textContent = icon;
      if (roleLabel) roleLabel.textContent = foundRole;
      if (roleDate) roleDate.textContent = `Thursday Meeting • ${dateStr}`;
      if (roleDesc) roleDesc.textContent = description;
    } else {
      meetingCard.style.display = "none";
    }
  } catch (err) {
    console.error("Error loading agent rotation info:", err);
    meetingCard.style.display = "none";
  }
}

function closeBalanceModal() {
  $("balanceModal").style.display = "none";
}
function renderBalanceList() {
  const list = $("balanceList");
  const search = ($("balanceSearch").value || "").toLowerCase();
  
  list.innerHTML = "";
  
  _people
    .filter(p => !search || p.toLowerCase().includes(search))
    .forEach(person => {
      const balance = _balanceData.get(person) || {pto: 0};
      const ptoHours = parseFloat(balance.pto) || 0;
      
      // Color coding based on PTO amount
      let ptoColor = '#16a34a'; // Green
      let ptoBg = '#f0fdf4';
      let ptoBorder = '#86efac';
      if (ptoHours <= 0) {
        ptoColor = '#dc2626';
        ptoBg = '#fef2f2';
        ptoBorder = '#fecaca';
      } else if (ptoHours < 8) {
        ptoColor = '#f59e0b';
        ptoBg = '#fef3c7';
        ptoBorder = '#fcd34d';
      }
      
      const item = document.createElement("div");
      item.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 14px; background: var(--card-bg, #fff); border: 1px solid var(--border-color, #e2e8f0); border-radius: 12px; transition: all 0.2s;";
      item.onmouseover = () => { item.style.borderColor = '#b37e78'; item.style.boxShadow = '0 2px 8px rgba(179,126,120,0.1)'; };
      item.onmouseout = () => { item.style.borderColor = 'var(--border-color, #e2e8f0)'; item.style.boxShadow = 'none'; };
      
      item.innerHTML = `
        <div style="flex: 1;">
          <div style="font-weight: 700; color: var(--text-primary, #1e293b); margin-bottom: 4px; font-size: 14px;">${person}</div>
          <div style="font-size: 12px; color: ${ptoColor}; font-weight: 600;">
            ${ptoHours}h PTO available
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 11px; color: var(--text-secondary, #64748b);">PTO:</span>
          <input type="number" value="${ptoHours}" min="0" step="0.5" 
                 onchange="updateBalance('${person}', 'pto', this.value)"
                 style="width: 70px; padding: 8px 10px; border: 2px solid ${ptoBorder}; border-radius: 8px; text-align: center; font-size: 14px; font-weight: 600; background: ${ptoBg}; color: ${ptoColor};"
                 title="PTO Hours">
          <span style="font-size: 12px; color: var(--text-secondary, #64748b);">hrs</span>
        </div>
      `;
      
      list.appendChild(item);
    });
}
function filterBalanceList() {
  renderBalanceList();
}
async function updateBalance(person, type, value) {
  try {
    const hours = parseFloat(value) || 0;
    
    const res = await fetch('/?action=balances/update', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        person: person,
        type: type,
        hours: hours
      })
    });
    
    const data = await res.json();
    
    if (data.ok) {
      // Update local cache
      if (!_balanceData.has(person)) {
        _balanceData.set(person, {pto: 0, sick: 0});
      }
      _balanceData.get(person)[type] = hours;
      
      toast(`Updated ${person}'s ${type.toUpperCase()} to ${hours} hours`, "success");
    } else {
      toast(`Failed to update balance`, "error");
    }
  } catch (err) {
    console.error("Update balance error:", err);
    toast(`Error: ${err.message}`, "error");
  }
}
// Load balances when page loads
window.addEventListener('DOMContentLoaded', () => {
  loadBalances();
});

// Bulk PTO Modal Functions
function openBulkPtoModal() {
  const modal = $("bulkPtoModal");
  if (!modal) return;

  // Reset form
  if ($("bulkPtoHours")) $("bulkPtoHours").value = "1";
  if ($("bulkPtoReason")) $("bulkPtoReason").value = "";

  // Update agent count
  const activeAgents = (_people || []).filter(p => p && String(p).trim());
  if ($("bulkPtoAgentCount")) $("bulkPtoAgentCount").textContent = String(activeAgents.length);

  // Show (stacked above Admin/PTO)
  modal.style.display = "flex";
  modal.style.zIndex = "10060";
}


function closeBulkPtoModal() {
  const modal = $("bulkPtoModal");
  if (modal) modal.style.display = "none";
}

async function applyBulkPto() {
  const hours = parseFloat($("bulkPtoHours")?.value) || 0;
  const reason = $("bulkPtoReason")?.value || "Bulk PTO addition";
  
  if (hours <= 0) {
    toast("Please enter a valid number of hours", "error");
    return;
  }
  
  const activeAgents = _people.filter(p => p && p.trim());
  
  if (activeAgents.length === 0) {
    toast("No agents found", "error");
    return;
  }
  
  const confirmed = await Swal.fire({
    title: 'Confirm Bulk PTO',
    html: `<div style="text-align:center;">
      <p>Add <strong>${hours} hours</strong> to <strong>${activeAgents.length} agents</strong>?</p>
      <p style="font-size:12px; color:#64748b; margin-top:8px;">${reason}</p>
    </div>`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#22c55e',
    cancelButtonColor: '#94a3b8',
    confirmButtonText: 'Yes, Add Hours',
    cancelButtonText: 'Cancel'
  });
  
  if (!confirmed.isConfirmed) return;
  
  Swal.fire({
    title: 'Applying...',
    text: `Adding ${hours} hours to all agents`,
    allowOutsideClick: false,
    showConfirmButton: false,
    didOpen: () => Swal.showLoading()
  });
  
  let successCount = 0;
  let errors = [];
  
  for (const person of activeAgents) {
    try {
      const currentBalance = _balanceData.get(person) || { pto: 0 };
      const newPto = parseFloat(currentBalance.pto || 0) + hours;
      
      const res = await fetch('/?action=balances/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person: person,
          type: 'pto',
          hours: newPto
        })
      });
      
      const data = await res.json();
      
      if (data.ok) {
        // Update local cache
        if (!_balanceData.has(person)) {
          _balanceData.set(person, { pto: 0 });
        }
        _balanceData.get(person).pto = newPto;
        successCount++;
      } else {
        errors.push(person);
      }
    } catch (err) {
      errors.push(person);
    }
  }
  
  // Log to audit
  try {
    await fetch('/?action=audit/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'BULK_PTO_ADD',
        manager: window._myName || 'Unknown',
        target: `All Agents (${successCount})`,
        details: `Added ${hours} hours PTO. Reason: ${reason}`,
        date: new Date().toISOString().split('T')[0]
      })
    });
  } catch (err) {
    console.error("Failed to log audit:", err);
  }
  
  closeBulkPtoModal();
  
  if (errors.length === 0) {
    Swal.fire({
      icon: 'success',
      title: 'PTO Added!',
      html: `<p>Added ${hours} hours to ${successCount} agents</p>`,
      confirmButtonColor: '#22c55e'
    });
  } else {
    Swal.fire({
      icon: 'warning',
      title: 'Partially Complete',
      html: `<p>Added to ${successCount} agents</p><p>Failed for: ${errors.join(', ')}</p>`,
      confirmButtonColor: '#f59e0b'
    });
  }
}
  
  function updateTeamAgentList() { 
  const t = $("teamDropdown").value; 
  const agentList = $("teamAgentList");
  agentList.innerHTML = ""; 
  // Update global active team
  _activeTeam = t;
  _selectedPeople.clear();
  
  // Apply the filters to the data
  applyLocalFilters(); 
  // Create the "Quick Filter" chips in the sidebar
  if (t) {
    const agentsInChannel = [... new Set(
      _allData.filter(x => x.team === t).map(x => x.person)
    )].sort();
    
    agentsInChannel.forEach(p => { 
      const b = document.createElement("button"); 
      b.className = "btn-pill"; 
      b.innerText = p; 
      b.onclick = () => {
        _selectedPeople.clear();
        _selectedPeople.add(p);
        applyLocalFilters();
        showToast(`Filtered to ${p}`);
      };
      agentList.appendChild(b); 
    }); 
  }
  
  // Re-render the view
  renderView();
}
  // Helper:  escape HTML to prevent XSS
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
function rgbaFromHex(hex, alpha) {
  try {
    const h = String(hex || "").trim().replace("#", "");
    const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
    const n = parseInt(full, 16);
    if (!isFinite(n) || full.length !== 6) throw new Error("bad hex");
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const a = Math.max(0, Math.min(1, Number(alpha)));
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  } catch {
    return `rgba(148, 163, 184, ${alpha || 0.2})`;
  }
}

  function filterToday() {
    const today = pstISODate();
    _filteredData = _allData.filter(x => x.dateISO === today);
    if (_activeTeam) {
        _filteredData = _filteredData.filter(x => x.team === _activeTeam);
    }
    if (_selectedPeople.size > 0) {
        _filteredData = _filteredData.filter(x => _selectedPeople.has(x.person));
    }
    renderView();
    toast("Showing Today Only");
    if (_view === 'calendar') {
        setView('list');
    }
  }
  function setView(v) {
  // 1. 🚨 AUTO-EXIT MASTER MODE
  // If we are currently editing the template, force an exit before switching views
  if (typeof _isMasterMode !== 'undefined' && _isMasterMode) {
    exitMasterMode();
  }
  _view = v;
  
  // Toggle Buttons
  const btnSched = document.getElementById("btnSchedule");
  const btnGoals = document.getElementById("btnGoals");
  const btnMet = document.getElementById("btnMetrics");
  if(btnSched) btnSched.className = v === "schedule" ? "segBtn active" : "segBtn";
  if(btnGoals) btnGoals.className = v === "goals" ? "segBtn active" : "segBtn";
  if(btnMet) btnMet.className = v === "metrics" ? "segBtn active" : "segBtn";
  
  // Toggle Views
  const schedView = document.getElementById("scheduleView");
  const goalsView = document.getElementById("goalsView");
  const metView = document.getElementById("metricsView");
  const masterView = document.getElementById("masterView");
  const agentGoalsView = document.getElementById("agentGoalsView");
  
  if(schedView) schedView.style.display = v === "schedule" ? "flex" : "none";
  if(goalsView) goalsView.style.display = v === "goals" ? "flex" : "none";
  if(metView) metView.style.display = v === "metrics" ? "block" : "none";
  if(agentGoalsView) agentGoalsView.style.display = v === "mygoals" ? "block" : "none";
  
  // Ensure Master View is hidden
  if(masterView) masterView.style.display = "none";
  
  if (v === "schedule") {
    renderScheduleView();
  } else if (v === "metrics") {
    renderMetricsList();
  } else if (v === "goals") {
    renderGoalsAgentList();
  } else if (v === "mygoals") {
    loadMyGoals();
  }
}

// Cache for meeting rotations
let _meetingRotationsCache = {};
let _meetingRotationsCacheTime = 0;
window._meetingRotationsCache = _meetingRotationsCache;

// Check and display meeting banner for a specific date
async function checkAndDisplayMeetingBanner(dateKey, container) {
  // Check cache (refresh every 5 minutes)
  const now = Date.now();
  if (now - _meetingRotationsCacheTime > 300000 || Object.keys(_meetingRotationsCache).length === 0) {
    try {
      const res = await fetch('/meeting-rotation/list');
      const data = await res.json();
      if (data.rotations) {
        _meetingRotationsCache = {};
        data.rotations.forEach(r => {
          _meetingRotationsCache[r.date] = r;
        });
        _meetingRotationsCacheTime = now;
        // Update global reference
        window._meetingRotationsCache = _meetingRotationsCache;
        
        // Check if agent needs to acknowledge meeting rotation
        if (typeof window.checkMeetingRotationAcknowledgment === 'function' && !window._isManager) {
          setTimeout(() => window.checkMeetingRotationAcknowledgment(), 500);
        }
      }
    } catch (e) {
      console.error("Failed to fetch meeting rotations:", e);
    }
  }
  
  const meeting = _meetingRotationsCache[dateKey];
  const isManager = window._isManager;
  
  // Check if this is a meeting day (Thursday/Wednesday/All Hands day)
  const d = new Date(dateKey + "T12:00:00");
  const dayOfWeek = d.getDay(); // 0=Sun, 1=Mon... 4=Thu
  const isMeetingDay = dayOfWeek === 4; // Thursday
  
  // If no meeting rotation exists but it's a meeting day, show a warning banner for managers
  if (!meeting && isManager && isMeetingDay) {
    const warningBanner = document.createElement("div");
    warningBanner.className = "meeting-day-banner meeting-unconfigured";
    warningBanner.style.cssText = `
      background: linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(239,68,68,0.08) 100%);
      border: 2px dashed #ef4444;
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 16px;
      animation: pulse 2s infinite;
      cursor: pointer;
    `;
    warningBanner.onclick = () => openMeetingRotationModal();
    warningBanner.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 24px;">⚠️</span>
          <div>
            <div style="font-weight: 700; font-size: 14px; color: #dc2626;">Meeting Rotation Not Configured</div>
            <div style="font-size: 12px; color: #ef4444;">Thursday meeting needs LC coverage setup</div>
          </div>
        </div>
        <button style="padding: 8px 16px; background: #dc2626; color: white; border: none; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer;">
          ⚙️ Configure Now
        </button>
      </div>
    `;
    container.insertBefore(warningBanner, container.firstChild);
    return;
  }
  
  if (!meeting) return;
  
  const myName = window._myName || "";
  const myNameLower = myName.toLowerCase().trim();
  
  // Determine user's role in this meeting
  let myRole = null;
  let roleColor = isManager ? "#f59e0b" : "#6366f1"; // Manager gets yellow, default blue
  let roleEmoji = "📅";
  
  if ((meeting.captain || "").toLowerCase().trim() === myNameLower) {
    myRole = "Captain (Attends Meeting - Last Resort)";
    roleColor = "#f59e0b";
    roleEmoji = "👤";
  } else if ((meeting.backup1 || "").toLowerCase().trim() === myNameLower) {
    myRole = "Backup #1 (Attends Meeting - Away in Zendesk)";
    roleColor = "#10b981";
    roleEmoji = "🔄";
  } else if ((meeting.backup2 || "").toLowerCase().trim() === myNameLower) {
    myRole = "Backup #2 (Attends Meeting - Away in Zendesk)";
    roleColor = "#10b981";
    roleEmoji = "🔄";
  } else if ((meeting.lcAgents || []).map(a => a.toLowerCase().trim()).includes(myNameLower)) {
    myRole = "LC Agent (Misses Meeting - LC Coverage)";
    roleColor = "#3b82f6";
    roleEmoji = "💬";
  }
  
  const meetingTypeLabel = meeting.meetingType === "allhands" ? "All Hands" : 
                           meeting.meetingType === "wednesday" ? "Wednesday Meeting" : "Thursday Meeting";
  const meetingEmoji = meeting.meetingType === "allhands" ? "🎉" : "📅";
  
  // Create meeting banner - make it more prominent for managers
  const banner = document.createElement("div");
  banner.className = "meeting-day-banner";
  
  if (isManager) {
    // Manager view: More prominent, clickable, shows full details
    banner.style.cssText = `
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border: 2px solid #f59e0b;
      border-left: 5px solid #f59e0b;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 16px;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2);
      cursor: pointer;
      transition: all 0.2s ease;
    `;
    banner.onclick = () => { 
      $("rotationDate").value = dateKey;
      openMeetingRotationModal();
    };
    banner.onmouseenter = function() { this.style.transform = 'translateY(-2px)'; this.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.3)'; };
    banner.onmouseleave = function() { this.style.transform = 'translateY(0)'; this.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.2)'; };
  } else {
    // Agent view: Simpler display
    banner.style.cssText = `
      background: linear-gradient(135deg, ${roleColor}15 0%, ${roleColor}08 100%);
      border: 1px solid ${roleColor}40;
      border-left: 4px solid ${roleColor};
      border-radius: 10px;
      padding: 12px 16px;
      margin-bottom: 16px;
      animation: fadeIn 0.3s ease;
    `;
  }
  
  // Build banner content
  let bannerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 24px;">${meetingEmoji}</span>
        <div>
          <div style="font-weight: 700; font-size: 14px; color: ${isManager ? '#92400e' : 'var(--text-primary)'};">${meetingTypeLabel}</div>
          <div style="font-size: 12px; color: ${isManager ? '#b45309' : 'var(--text-secondary)'};">${meeting.meetingTimePST || "12:00 PM - 1:15 PM"} PST</div>
        </div>
      </div>`;
  
  // Show user's role badge or edit button for managers
  if (isManager) {
    bannerHTML += `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="background: #10b981; color: white; padding: 4px 10px; border-radius: 12px; font-size: 10px; font-weight: 600;">✓ Configured</span>
        <span style="background: #f59e0b; color: white; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 600;">✏️ Edit</span>
      </div>`;
  } else if (myRole) {
    bannerHTML += `
      <div style="background: ${roleColor}; color: white; padding: 6px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;">
        ${roleEmoji} ${myRole.split('(')[0].trim()}
      </div>`;
  }
  
  bannerHTML += `</div>`;
  
  // Show coverage team (for managers or if user wants details)
  if (isManager) {
    const lcCount = (meeting.lcAgents || []).length;
    const lcNames = (meeting.lcAgents || []).slice(0, 3).join(', ') + (lcCount > 3 ? ` +${lcCount - 3} more` : '');
    bannerHTML += `
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(245, 158, 11, 0.3); font-size: 12px; color: #78350f;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px;">
          <div><span style="opacity: 0.7;">👤 Captain:</span> <strong>${meeting.captain || '-'}</strong></div>
          <div><span style="opacity: 0.7;">🔄 Backup 1:</span> <strong>${meeting.backup1 || '-'}</strong></div>
          <div><span style="opacity: 0.7;">🔄 Backup 2:</span> <strong>${meeting.backup2 || '-'}</strong></div>
          <div><span style="opacity: 0.7;">💬 LC (${lcCount}):</span> <strong>${lcNames || '-'}</strong></div>
        </div>
        ${meeting.notes ? `<div style="margin-top: 8px; padding: 8px; background: rgba(255,255,255,0.5); border-radius: 6px;"><span style="opacity: 0.7;">📝 Notes:</span> ${meeting.notes}</div>` : ''}
      </div>`;
  } else if (myRole) {
    // For agents with a role, show brief coverage info
    bannerHTML += `
      <div style="margin-top: 8px; font-size: 10px; color: var(--text-tertiary);">
        Coverage team: ${meeting.captain || '-'}, ${meeting.backup1 || '-'}, ${meeting.backup2 || '-'}${(meeting.lcAgents || []).length > 0 ? ` + ${meeting.lcAgents.length} LC agents` : ''}
      </div>`;
  }
  
  banner.innerHTML = bannerHTML;
  container.insertBefore(banner, container.firstChild);
}

let _selectedDateISO = null;
let _focusedChannel = null; // null = all channels (day view), string = channel focus (weekly grid)

function renderScheduleView() {
  // Hide loading placeholder since we're rendering
  if ($("loadingPlaceholder")) $("loadingPlaceholder").style.display = "none";
  
  // 1. Get unique days from data
  const groups = groupShifts(_filteredData); // Reuse your existing grouper
  const sortedDates = Array.from(groups.keys()).sort(); // ["2025-01-06", "2025-01-07"...]
  if (sortedDates.length === 0) {
    document.getElementById("dayTabs").innerHTML = "";
    document.getElementById("viewDayTitle").textContent = "No Schedule";
    document.getElementById("viewDayStats").textContent = "";
    document.getElementById("dayContentBody").innerHTML = `
      <div style="text-align:center; color:#94a3b8; margin-top:50px;">
        <svg style="width:48px; height:48px; margin-bottom:12px; opacity:0.5;" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/>
        </svg>
        <div style="font-size:15px; font-weight:600;">No shifts found</div>
        <div style="font-size:13px; margin-top:4px;">Try adjusting your filters or loading more days</div>
      </div>`;
    return;
  }
  // Default to first day if none selected
  if (!_selectedDateISO || !groups.has(_selectedDateISO)) {
    _selectedDateISO = sortedDates[0];
  }
  
  // ── CHANNEL FOCUS MODE: Weekly grid view ──
  if (_focusedChannel) {
    document.getElementById("dayTabs").style.display = "none";
    renderChannelFocusView(sortedDates, groups);
    return;
  }
  
  // ── NORMAL MODE: Day tabs + detail ──
  document.getElementById("dayTabs").style.display = "";
  
  // 2. Render Tabs (Left Sidebar)
  const tabsContainer = document.getElementById("dayTabs");
  tabsContainer.innerHTML = sortedDates.map(dateKey => {
    const d = new Date(dateKey + "T12:00:00"); // Safe parsing
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const isActive = dateKey === _selectedDateISO ? 'active' : '';
    return `
      <div class="day-tab ${isActive}" onclick="_selectedDateISO = '${dateKey}'; renderScheduleView();">
        <div class="day-name">${dayName}</div>
        <div class="day-date">${dayDate}</div>
      </div>
    `;
  }).join("");
  // 3. Render Main Content (Right Side)
  renderDayDetail(_selectedDateISO, groups.get(_selectedDateISO));
}
function renderDayDetail(dateKey, shifts) {
  // 1. Setup Date & Holiday Logic
  const d = new Date(dateKey + "T12:00:00");
  const dayOfWeek = d.toLocaleDateString("en-US", { weekday: 'short' });
  const holiday = getHoliday(dateKey); 
  
  // Holiday theme configurations
  const holidayThemes = {
    christmas: { bg: 'linear-gradient(135deg, #166534 0%, #15803d 50%, #dc2626 100%)', badge: '#dcfce7', badgeText: '#166534', emoji: '🎄' },
    newyear: { bg: 'linear-gradient(135deg, #1e40af 0%, #7c3aed 100%)', badge: '#e0e7ff', badgeText: '#4338ca', emoji: '🎆' },
    thanksgiving: { bg: 'linear-gradient(135deg, #c2410c 0%, #ea580c 100%)', badge: '#ffedd5', badgeText: '#c2410c', emoji: '🦃' },
    halloween: { bg: 'linear-gradient(135deg, #1e1e1e 0%, #f97316 100%)', badge: '#fff7ed', badgeText: '#c2410c', emoji: '🎃' },
    july4th: { bg: 'linear-gradient(135deg, #1e40af 0%, #dc2626 50%, #1e40af 100%)', badge: '#dbeafe', badgeText: '#1e40af', emoji: '🇺🇸' },
    valentines: { bg: 'linear-gradient(135deg, #be185d 0%, #ec4899 100%)', badge: '#fce7f3', badgeText: '#be185d', emoji: '💕' },
    stpatricks: { bg: 'linear-gradient(135deg, #166534 0%, #22c55e 100%)', badge: '#dcfce7', badgeText: '#166534', emoji: '☘️' },
    easter: { bg: 'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #fbbf24 100%)', badge: '#faf5ff', badgeText: '#7e22ce', emoji: '🐰' },
    default: { bg: 'linear-gradient(135deg, #b37e78 0%, #8f5f5a 100%)', badge: '#e0e7ff', badgeText: '#4338ca', emoji: '🎉' }
  };
  
  // Get header element to update background
  const dayHeader = document.querySelector('.day-content-header');
  
  // Title
  let titleHtml = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  
  if (holiday) {
    const theme = holidayThemes[holiday.theme] || holidayThemes.default;
    titleHtml += ` <span style="font-size:13px; background:${theme.badge}; color:${theme.badgeText}; padding:4px 12px; border-radius:20px; border:1px solid rgba(0,0,0,0.1); margin-left:10px; animation:pulse 2s infinite;">${holiday.emoji} ${holiday.name}</span>`;
    
    // Update header background for holiday
    if (dayHeader) {
      dayHeader.style.background = theme.bg;
      dayHeader.style.color = 'white';
      dayHeader.style.transition = 'all 0.5s ease';
    }
  } else {
    // Reset to default
    if (dayHeader) {
      dayHeader.style.background = 'var(--header-gradient, linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%))';
      dayHeader.style.color = 'white';
    }
  }
  
  document.getElementById("viewDayTitle").innerHTML = titleHtml;
  document.getElementById("viewDayStats").textContent = `${shifts.length} shifts scheduled`;
  const container = document.getElementById("dayContentBody");
  container.innerHTML = "";
  
  // Check for meeting on this day and add banner
  checkAndDisplayMeetingBanner(dateKey, container);
  
  // 2. Group by Channel (normalize team names to group variations together)
  const byTeam = {};
  const teamDisplayNames = {};
  shifts.forEach(s => {
    const rawTeam = s.team || "Other";
    // Normalize to group variations together (Email/Floater, EmailFloater, Email-Floater all become "emailfloater")
    const normalizedKey = normalizeChannelName(rawTeam);
    if (!byTeam[normalizedKey]) {
      byTeam[normalizedKey] = [];
      // Store the best display name (prefer proper capitalization)
      teamDisplayNames[normalizedKey] = getCanonicalDisplayName(rawTeam);
    }
    byTeam[normalizedKey].push(s);
  });
  
  // Helper to get proper display name
  function getCanonicalDisplayName(team) {
    const key = normalizeChannelName(team);
    const displayMap = {
      'livechat': 'Live Chat',
      'phone': 'Phone Support',
      'phonesupport': 'Phone Support',
      'emailfloater': 'Email/Floater',
      'floater': 'Email/Floater',
      'socials': 'Socials',
      'disputes': 'Disputes',
      'mdsupport': 'MD Support',
      'projects': 'Projects',
      'lunch': 'Lunch',
      '1:1meetings': '1:1 Meetings',
      'meeting': 'Meeting',
      'defcon': 'Defcon',
      'custom': 'Custom',
      'other': 'Other'
    };
    return displayMap[key] || team;
  }
  
  // 3. Channel Filter Bar
  const channelKeys = Object.keys(byTeam).sort();
  if (channelKeys.length > 1) {
    const filterBar = document.createElement("div");
    filterBar.className = "channel-filter-bar";
    filterBar.innerHTML = `
      <span class="channel-filter-label">View by Channel:</span>
      ${channelKeys.map(key => {
        const displayName = teamDisplayNames[key];
        const cfg = getChannelConfig(displayName);
        const cnt = byTeam[key].length;
        return `<button class="channel-filter-pill" 
                  style="--pill-bg:${cfg.color};--pill-border:${cfg.border};--pill-text:${cfg.text};"
                  onclick="_focusedChannel='${key}'; renderScheduleView();">
                  ${displayName} <span class="cfp-count">${cnt}</span>
                </button>`;
      }).join("")}
    `;
    container.appendChild(filterBar);
  }
  
  // 4. Render Sections
  Object.keys(byTeam).sort().forEach(teamKey => {
    const teamShifts = byTeam[teamKey];
    const team = teamDisplayNames[teamKey]; // Use display name for UI
    const count = teamShifts.length;
    
    // Alert Logic - Check if any rule applies to this day
    const isWeekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(dayOfWeek);
    const isWeekend = ['Sat', 'Sun'].includes(dayOfWeek);
    const rule = _staffingRules.find(r => {
      if (r.team !== team) return false;
      return r.day === "All" || 
             r.day === dayOfWeek ||
             (r.day === 'Weekday' && isWeekday) ||
             (r.day === 'Weekend' && isWeekend);
    });
    const config = getChannelConfig(team);
const accent = (config.border || "#cbd5e1");
const accentBg = rgbaFromHex(accent, document.body.classList.contains("dark-mode") ? 0.18 : 0.28);
    let countBadge = "";
    
    // Only show staffing count badge to managers
    if (window._isManager) {
      if (rule) {
        const min = parseInt(rule.min);
        countBadge = (count < min)
  ? `<span class="countBadge warn">⚠️ ${count}/${min}</span>`
  : `<span class="countBadge ok">✓ ${count}/${min}</span>`;
      } else {
        countBadge = `<span class="countBadge neutral">${count} Agents</span>`;
      }
    } else {
      // For agents, just show simple count
      countBadge = `<span class="countBadge agent">${count} scheduled</span>`;
    }
    // Sort shifts by role priority: Captain → Agent → Backup, then by start time
    teamShifts.sort((a, b) => {
      const pa = getShiftRolePriority(a);
      const pb = getShiftRolePriority(b);
      if (pa !== pb) return pa - pb;
      return (a.start || "").localeCompare(b.start || "");
    });
    const section = document.createElement("div");
    section.className = "channel-section";
    
    // Apply view preference
    const prefs = typeof getUserPrefs === 'function' ? getUserPrefs() : { shiftView: 'grid' };
    const viewClass = prefs.shiftView === 'list' ? 'shifts-grid view-list' : 'shifts-grid';
    
    section.innerHTML = `
  <div class="channel-header" style="--ch-accent:${accent}; --ch-accent-bg:${accentBg};">
    <span class="channel-title">${team}</span>
    ${countBadge}
  </div>
  <div class="${viewClass}"></div>
`;
    const grid = section.querySelector(".shifts-grid");
    
    // Track role groups for sub-headers
    let lastRolePriority = -1;
    const roleGroupLabels = { 0: '👑 Team Captain', 1: '👤 Agents', 2: '🔄 Backup' };
    const roleGroupClasses = { 0: 'role-group-captain', 1: 'role-group-agent', 2: 'role-group-backup' };
    const distinctGroups = new Set(teamShifts.map(s => getShiftRolePriority(s)));
    const showGroupHeaders = distinctGroups.size > 1;
    
    teamShifts.forEach(shift => {
      // Insert role group sub-header when transitioning to a new group
      const priority = getShiftRolePriority(shift);
      if (showGroupHeaders && priority !== lastRolePriority) {
        lastRolePriority = priority;
        const groupCount = teamShifts.filter(s => getShiftRolePriority(s) === priority).length;
        const header = document.createElement("div");
        header.className = `role-group-header ${roleGroupClasses[priority] || ''}`;
        header.innerHTML = `<span class="role-group-label">${roleGroupLabels[priority] || 'Other'}</span><span class="role-group-count">${groupCount}</span>`;
        grid.appendChild(header);
      }
  const notesStr = String(shift.notes || "");
  const isOff = notesStr.toLowerCase().includes("[off]");
  const isOpen = String(shift.person || "").trim().toUpperCase() === "OPEN"
             || notesStr.toUpperCase().includes("[OPEN]");

  const displayName = isOpen ? "Open" : (shift.person || "");
  const rawRole = isOpen ? "Open Shift" : (shift.role || "");
  // Format role display: "Backup1" → "Backup #1", "Backup2" → "Backup #2"
  const displayRole = rawRole.replace(/^(Backup)\s*(\d+)$/i, (_, base, num) => `${base} #${num}`);

  const card = document.createElement("div");
  card.className = "shift-card-b";

  if (isOff) card.classList.add("is-off");
if (isOpen) card.classList.add("is-open");
      
      // Check if selected (for bulk actions)
      if (_teamSelected.has(String(shift.assignmentId))) {
    card.style.outline = "2px solid #b37e78";
    card.style.zIndex = "10";
  }
      // Styling
      if (isOff) {
    card.style.borderLeftColor = "#ef4444";
    card.style.background = "#fef2f2";
    card.style.opacity = "0.8";
  } else if (isOpen) {
    card.style.borderLeftColor = "#f59e0b";
  } else {
    card.style.borderLeftColor = (config.border || "#cbd5e1");
  }
      card.innerHTML = `
    <div class="sc-time">
      <span>${shift.startLabel} - ${shift.endLabel}</span>
      ${
        isOff
          ? '<span style="color:#ef4444; font-weight:800; font-size:10px;">OFF</span>'
          : isOpen
            ? '<span style="color:#f59e0b; font-weight:900; font-size:10px;">OPEN</span>'
            : ''
      }
    </div>

    <div class="sc-name">${displayName}</div>

    ${displayRole ? `<div class="sc-role">${displayRole}</div>` : ''}

    ${notesStr && !isOff ? `<div style="font-size:11px; color:var(--text-secondary); margin-top:6px; font-style:italic;">${notesStr}</div>` : ''}
  `;

      // --- 🚨 RESTORED INTERACTIONS ---
      
      // 1. Click Handler (Smart switching between Edit vs. Select)
      card.onclick = (e) => {
        if (window._isManager) {
          // If in "Channel" mode OR holding Shift key OR already selecting items -> Toggle Selection
          if (_mode === "team" || _teamSelected.size > 0 || e.shiftKey) {
            // We reuse your existing toggle logic, but adapt UI manually since 'selected' class works differently here
            const id = String(shift.assignmentId);
            if (_teamSelected.has(id)) {
                _teamSelected.delete(id);
                card.style.outline = "none";
            } else {
                _teamSelected.add(id);
                card.style.outline = "2px solid #b37e78";
                _lastSelectedPerson = shift.person;
            }
            updateSelectionBar();
          } else {
            // Otherwise -> Open Edit Modal
            openReplaceModal(shift);
          }
        } else if (shift.person === window._myName) {
          openAgentActionModal(shift);
        }
      };
      // 2. Drag and Drop (Managers Only)
      if (window._isManager) {
          card.draggable = true;
          
          card.ondragstart = (e) => { 
             // Prevent dragging purely for visual noise, we only want drag *into* cards usually
             // But if you want to drag shifts, keep this. 
             e.preventDefault(); 
          }; 
          
          // Allow dropping names from the Quick Sidebar onto this card
          card.ondragover = (e) => { 
             if(_mode === "quick" && _dragPerson) { 
                 e.preventDefault(); 
                 card.style.background = "#eff6ff"; // Highlight on hover
                 card.style.borderColor = "#b37e78";
             } 
          };
          
          card.ondragleave = () => { 
             // Reset styles on leave
             card.style.background = isOff ? "#fef2f2" : "white";
             card.style.borderColor = "#e2e8f0";
             card.style.borderLeftColor = isOff ? "#ef4444" : (config.border || "#cbd5e1");
          };
          
          card.ondrop = (e) => { 
             e.preventDefault(); 
             // Reset styles
             card.style.background = isOff ? "#fef2f2" : "white";
             card.style.borderColor = "#e2e8f0";
             card.style.borderLeftColor = isOff ? "#ef4444" : (config.border || "#cbd5e1");
             if(_dragPerson && _dragPerson !== shift.person) { 
                 // Open modal pre-filled with dragged name
                 _editing = shift; 
                 openReplaceModal(shift); 
                 setTimeout(() => {
                     const select = document.getElementById("mNewPerson");
                     if(select) select.value = _dragPerson;
                 }, 50); 
             } 
          };
      }
      // --------------------------------
      grid.appendChild(card);
    });
    container.appendChild(section);
  });
}

// ============================================
// CHANNEL FOCUS VIEW - Weekly Time-Block Grid
// ============================================
function renderChannelFocusView(sortedDates, groups) {
  const container = document.getElementById("dayContentBody");
  const titleEl = document.getElementById("viewDayTitle");
  const statsEl = document.getElementById("viewDayStats");
  
  // Resolve display name for focused channel
  const channelDisplayMap = {
    'livechat': 'Live Chat', 'phone': 'Phone Support', 'phonesupport': 'Phone Support',
    'emailfloater': 'Email/Floater', 'floater': 'Email/Floater', 'socials': 'Socials',
    'disputes': 'Disputes', 'mdsupport': 'MD Support', 'projects': 'Projects',
    'lunch': 'Lunch', '1:1meetings': '1:1 Meetings', 'meeting': 'Meeting',
    'defcon': 'Defcon', 'custom': 'Custom', 'other': 'Other'
  };
  const channelDisplay = channelDisplayMap[_focusedChannel] || _focusedChannel;
  const config = getChannelConfig(channelDisplay);
  
  // Get all shifts for this channel across all dates
  const allChannelShifts = _filteredData.filter(s => {
    return normalizeChannelName(s.team || "Other") === _focusedChannel;
  });
  
  // Determine time blocks from channel config hours (2-hour blocks)
  const [openHour, closeHour] = config.hours || [8, 17];
  const timeBlocks = [];
  for (let h = openHour; h < closeHour; h += 2) {
    const endH = Math.min(h + 2, closeHour);
    if (endH <= h) break;
    const label = formatBlockLabel(h) + ' - ' + formatBlockLabel(endH);
    timeBlocks.push({ start: h, end: endH, label });
  }
  
  // Use actual dates from the data as columns (limit to 7)
  const dayColumns = sortedDates.slice(0, 7).map(dateKey => {
    const d = new Date(dateKey + "T12:00:00");
    return {
      dateKey,
      dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
      dayDate: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };
  });
  
  // Update header
  titleEl.innerHTML = `
    <span style="display:inline-flex; align-items:center; gap:10px;">
      <span class="cfv-channel-badge" style="background:${config.color};color:${config.text};border:1px solid ${config.border};">${channelDisplay}</span>
      <span style="font-size:16px;">Weekly View</span>
    </span>`;
  statsEl.textContent = `${allChannelShifts.length} shifts across ${dayColumns.length} days`;
  
  // Build content
  container.innerHTML = "";
  
  // Toolbar: back button + channel switcher
  const toolbar = document.createElement("div");
  toolbar.className = "cfv-toolbar";
  
  const allChannelKeys = new Set();
  _filteredData.forEach(s => allChannelKeys.add(normalizeChannelName(s.team || "Other")));
  
  toolbar.innerHTML = `
    <button class="cfv-back-btn" onclick="_focusedChannel=null; renderScheduleView();">
      ← Back to Day View
    </button>
    <div class="cfv-pill-row">
      ${Array.from(allChannelKeys).sort().map(key => {
        const dn = channelDisplayMap[key] || key;
        const cc = getChannelConfig(dn);
        const isActive = key === _focusedChannel;
        return `<button class="channel-filter-pill ${isActive ? 'active' : ''}" 
                  style="--pill-bg:${cc.color};--pill-border:${cc.border};--pill-text:${cc.text};"
                  onclick="_focusedChannel='${key}'; renderScheduleView();">
                  ${dn}
                </button>`;
      }).join("")}
    </div>
  `;
  container.appendChild(toolbar);
  
  // Build the weekly grid table
  const gridWrapper = document.createElement("div");
  gridWrapper.className = "cfv-grid-wrapper";
  
  let html = `<table class="cfv-table"><thead><tr>
    <th class="cfv-th-time">Time Block</th>
    ${dayColumns.map(col => 
      `<th class="cfv-th-day"><div class="cfv-th-dayname">${col.dayName}</div><div class="cfv-th-date">${col.dayDate}</div></th>`
    ).join("")}
  </tr></thead><tbody>`;
  
  timeBlocks.forEach((block, bi) => {
    html += `<tr>`;
    html += `<td class="cfv-td-time">${block.label}</td>`;
    
    dayColumns.forEach(col => {
      const dayShifts = allChannelShifts.filter(s => {
        const sDate = s.dateISO || s.dayKey || s.date || "";
        if (sDate !== col.dateKey) return false;
        const sStart = parseTimeDecimal(s.start);
        const sEnd = parseTimeDecimal(s.end);
        return sStart < block.end && sEnd > block.start;
      });
      
      dayShifts.sort((a, b) => {
        const pa = getShiftRolePriority(a);
        const pb = getShiftRolePriority(b);
        if (pa !== pb) return pa - pb;
        return (a.start || "").localeCompare(b.start || "");
      });
      
      if (dayShifts.length === 0) {
        html += `<td class="cfv-td-cell cfv-empty"><span>—</span></td>`;
      } else {
        const chips = dayShifts.map(s => {
          const notes = String(s.notes || "").toLowerCase();
          const isOff = notes.includes("[off]");
          const isOpen = String(s.person || "").trim().toUpperCase() === "OPEN";
          const rp = getShiftRolePriority(s);
          const cls = [
            'cfv-agent',
            rp === 0 ? 'cfv-captain' : rp === 2 ? 'cfv-backup' : '',
            isOff ? 'cfv-off' : '',
            isOpen ? 'cfv-open' : ''
          ].filter(Boolean).join(' ');
          const name = isOpen ? '⚠️ OPEN' : (s.person || 'Unassigned');
          const rawRole = s.role || "";
          const roleTag = rawRole && rawRole !== "Agent" 
            ? `<span class="cfv-role-tag">${rawRole.replace(/^(Backup)\s*(\d+)$/i, (_, b, n) => b + ' #' + n)}</span>` 
            : '';
          const click = window._isManager 
            ? `onclick='openReplaceModal(${JSON.stringify(s).replace(/</g,"\\u003c").replace(/'/g,"\\u0027")})'` 
            : '';
          return `<div class="${cls}" ${click}><span class="cfv-agent-name">${escapeHtml(name)}</span>${roleTag}</div>`;
        }).join("");
        html += `<td class="cfv-td-cell">${chips}</td>`;
      }
    });
    html += `</tr>`;
  });
  html += `</tbody></table>`;
  
  gridWrapper.innerHTML = html;
  container.appendChild(gridWrapper);
}

function formatBlockLabel(hour) {
  if (hour === 0 || hour === 24) return '12a';
  if (hour === 12) return '12p';
  if (hour < 12) return hour + 'a';
  return (hour - 12) + 'p';
}
function exitMasterMode() {
  _isMasterMode = false;
  const btn = document.getElementById("btnMasterMode");
  const title = document.querySelector(".hTitle");
  const contextPill = document.getElementById("managerContextPill");

  if (btn) {
    btn.innerText = "Edit Master Schedule";
    btn.style.backgroundColor = "";
    btn.style.color = "";
  }
  if (title) title.innerText = "Scheduling Manager";
  if (contextPill) {
    if (_currentManagerName) {
      contextPill.innerText = "Viewing: " + _currentManagerName;
      contextPill.style.backgroundColor = "#a45953";
      contextPill.style.borderColor = "#6b21a8";
    } else {
      contextPill.style.display = "none";
    }
  }

  // ✅ Reset master draft/edit state
  _masterOriginalData = null;
  _masterDraftData = null;
  _masterRawData = null;
  _masterEditEnabled = false;

  if (typeof _masterSelected !== "undefined" && _masterSelected && _masterSelected.clear) {
    _masterSelected.clear();
  }
  updateMasterSelectionBar?.();

  const mv = document.getElementById("masterView");
  if (mv) mv.innerHTML = "";
}

  function resetAllFilters() {
    _activeTeam = '';
    _selectedPeople.clear();
    const teamDropdown = document.getElementById('teamDropdown');
    if (teamDropdown) teamDropdown.value = '';
    
    const calWrapper = document.getElementById('calViewWrapper');
    if (calWrapper) {
        const calGrid = $("calView");
        if (calGrid) calGrid.classList.remove('channel-filtered');
    }
    
    applyLocalFilters();
}
  function scrollCal(px) { const el=$("calView"); if(el) el.scrollBy({left:px,behavior:"smooth"}); }
  // --- NOTIFICATION SOUND ---
  function playNotificationSound() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(800, now); 
    gain1.gain.setValueAtTime(0.1, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc1.start(now);
    osc1.stop(now + 0.3);
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(600, now + 0.1); 
    gain2.gain.setValueAtTime(0.1, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6); 
    osc2.start(now + 0.1);
    osc2.stop(now + 0.6);
  }
  function playSendSound() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const playTone = (freq, delay) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "triangle"; 
        osc.frequency.setValueAtTime(freq, now + delay);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + delay + 0.4);
        gain.gain.setValueAtTime(0, now + delay);
        gain.gain.linearRampToValueAtTime(0.15, now + delay + 0.05); 
        gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.4); 
        osc.start(now + delay);
        osc.stop(now + delay + 0.5);
    };
    playTone(440, 0);   
    playTone(659, 0.05); 
  }
  // ============================================
// INITIALIZATION - Runs when page loads
// ============================================
document.addEventListener("DOMContentLoaded", function() {
  console.log("Musely Scheduler: Loaded");
  // 1. Initialize notification badge as hidden
  const badge = document.getElementById("notifCount");
  if (badge) {
    badge.classList.add("hidden");
    badge.textContent = "0";
  }
  // 2. Setup notification button
  const btn = document.getElementById("btnNotif");
  const panel = document.getElementById("notifPanel");
  if (!btn) {
    console.warn("btnNotif not found");
    return;
  }
  if (!panel) {
    console.warn("notifPanel not found");
    return;
  }
  // Move panel to body to prevent z-index issues
  if (panel.parentElement !== document.body) {
    document.body.appendChild(panel);
  }
  // Ensure hidden by default
  panel.style.display = "none";
  // Style the button to be clickable
  btn.style.pointerEvents = "auto";
  btn.style.cursor = "pointer";
  // Single click handler for notification button
  btn.addEventListener("click", function(e) {
    e.preventDefault();
    e.stopPropagation();
    console.log("Notification button clicked!");
    toggleNotifPanel();
  }, true);
  // Click-away to close panel
  document.addEventListener("click", function(e) {
    if (panel.style.display !== "block") return;
    if (e.target.closest("#btnNotif") || e.target.closest("#notifPanel")) return;
    toggleNotifPanel(true);
  }, true);

});

/* ============================================================ */
/* GOALS WORKSPACE — MODERNIZED FRONTEND JS                     */
/* Replaces original goals JS block (~lines 18725-19350+)       */
/* ============================================================ */

// ── State ──
let _currentGoalsAgent = null;
let _currentGoalsData = null;
let _goalsUnsavedChanges = false;
let _editingGoalIndex = null;  // null = new, number = editing
let _editingTaskIndex = null;
let _editingCsatIndex = null;

// ── Zendesk Ticket Linking ──
const ZENDESK_BASE_URL = 'https://musely.zendesk.com/agent/tickets/';

function formatTicketLink(ticketNumber, text) {
  if (!ticketNumber) return text || '—';
  const num = ticketNumber.toString().replace(/[^0-9]/g, '');
  if (!num) return escapeHtml(ticketNumber);
  return `<a href="${ZENDESK_BASE_URL}${num}" target="_blank" rel="noopener" class="ticket-link" onclick="event.stopPropagation();">#${num}</a>`;
}


// ══════════════════════════════════════════════
// B1 — DATA MODEL MIGRATION
// Transforms old fixed Goal #1/#2 → array model
// ══════════════════════════════════════════════

function migrateGoalsData(data) {
  // Already migrated if goals have `id` fields
  if (data.smartGoals && data.smartGoals.length > 0 && data.smartGoals[0].id) {
    return data;
  }

  // Migrate old smartGoals (array of {specific, measurable, ...}) → new shape
  if (data.smartGoals && Array.isArray(data.smartGoals)) {
    data.smartGoals = data.smartGoals
      .filter(g => g.specific || g.measurable || g.attainable || g.relevant || g.timeBound)
      .map((g, i) => ({
        id: 'goal_' + Date.now() + '_' + i,
        title: g.specific ? g.specific.substring(0, 80) : `Goal #${i + 1}`,
        status: 'active',
        dueDate: '',
        reviewCadence: '',
        nextCheckInDate: '',
        specific: g.specific || '',
        measurable: g.measurable || '',
        attainable: g.attainable || '',
        relevant: g.relevant || '',
        timeBound: g.timeBound || '',
        createdAt: data.updatedAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString()
      }));
  }

  // Migrate tasks → add id, status normalization
  if (data.tasks && Array.isArray(data.tasks)) {
    data.tasks = data.tasks.map((t, i) => ({
      id: t.id || 'task_' + Date.now() + '_' + i,
      title: t.task || t.title || '',
      priority: t.priority || '',
      dueDate: t.dueDate || '',
      status: t.status || 'open',
      notes: t.notes || '',
      createdAt: t.createdAt || new Date().toISOString(),
      updatedAt: t.updatedAt || new Date().toISOString()
    }));
  }

  // Initialize CSAT follow-ups if absent + migrate old fields
  if (!data.csatFollowups) {
    data.csatFollowups = [];
  } else {
    data.csatFollowups = data.csatFollowups.map(fu => {
      // Migrate old issueSummary → coachingTips
      if (fu.issueSummary && !fu.coachingTips) {
        fu.coachingTips = fu.issueSummary;
        delete fu.issueSummary;
      }
      // Migrate old star ratings → "Bad" (all entries are low CSATs)
      if (fu.rating && !isNaN(parseInt(fu.rating))) {
        fu.rating = 'Bad';
      }
      return fu;
    });
  }

  // Initialize meeting follow-ups if absent
  if (!data.meetingFollowups) {
    data.meetingFollowups = [];
  }

  return data;
}


// ══════════════════════════════════════════════
// SIDEBAR — Agent List
// ══════════════════════════════════════════════

async function renderGoalsAgentList() {
  const container = document.getElementById('goalsAgentList');
  if (!container) return;

  container.innerHTML = '<div class="timeline-loading">Loading agents...</div>';

  try {
    const attRes = await fetch('/attendance/all?days=90');
    const attData = await attRes.json();
    const attendanceMap = new Map();
    if (attData.ok && attData.attendance) {
      attData.attendance.forEach(a => attendanceMap.set(a.agentName, a));
    }

    const people = _people || [];
    let html = '';

    people.forEach(name => {
      const attendance = attendanceMap.get(name) || {};
      const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

      let badge = '';
      if (attendance.concernLevel === 'critical') {
        badge = '<span class="goals-agent-badge critical">Critical</span>';
      } else if (attendance.concernLevel === 'serious') {
        badge = '<span class="goals-agent-badge serious">Serious</span>';
      } else if (attendance.concernLevel === 'concern') {
        badge = '<span class="goals-agent-badge concern">Concern</span>';
      } else if (attendance.concernLevel === 'watch') {
        badge = '<span class="goals-agent-badge watch">Watch</span>';
      }

      html += `
        <div class="goals-agent-item" data-agent="${escapeHtml(name)}" onclick="selectGoalsAgent('${escapeHtml(name)}')">
          <div class="goals-agent-avatar">${initials}</div>
          <div class="goals-agent-item-info">
            <div class="goals-agent-item-name">${escapeHtml(name)}</div>
            <div class="goals-agent-item-meta">Bradford: ${attendance.bradfordFactor || 0}</div>
          </div>
          ${badge}
        </div>
      `;
    });

    container.innerHTML = html || '<div class="timeline-loading">No agents found</div>';
  } catch (err) {
    console.error('Error loading goals agent list:', err);
    container.innerHTML = '<div class="timeline-loading">Error loading agents</div>';
  }
}

function filterGoalsAgentList() {
  const search = document.getElementById('goalsAgentSearch')?.value?.toLowerCase() || '';
  const items = document.querySelectorAll('.goals-agent-item');
  items.forEach(item => {
    const name = item.dataset.agent?.toLowerCase() || '';
    item.style.display = name.includes(search) ? 'flex' : 'none';
  });
}


// ══════════════════════════════════════════════
// AGENT SELECTION + LOAD
// ══════════════════════════════════════════════

async function selectGoalsAgent(agentName) {
  if (_goalsUnsavedChanges) {
    const result = await Swal.fire({
      title: 'Unsaved Changes',
      text: 'You have unsaved changes. Do you want to save them before switching?',
      icon: 'warning',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Save',
      denyButtonText: "Don't Save",
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      await saveAgentGoals();
    } else if (result.isDismissed) {
      return;
    }
  }

  _currentGoalsAgent = agentName;
  _goalsUnsavedChanges = false;

  document.querySelectorAll('.goals-agent-item').forEach(item => {
    item.classList.toggle('active', item.dataset.agent === agentName);
  });

  document.getElementById('goalsPlaceholder').style.display = 'none';
  document.getElementById('goalsContent').style.display = 'flex';
  document.getElementById('goalsAgentName').textContent = agentName;

  // Reset to overview tab
  switchGoalsTab('overview');

  await loadAgentGoals(agentName);
  await loadAgentAttendance();
}

async function loadAgentGoals(agentName) {
  try {
    const res = await fetch('./?action=goals/get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentName })
    });

    const data = await res.json();
    if (data.ok) {
      // B1: Migrate data model
      _currentGoalsData = migrateGoalsData(data.goals);

      // Update last-updated meta
      if (_currentGoalsData.updatedAt) {
        const date = new Date(_currentGoalsData.updatedAt);
        document.getElementById('goalsAgentMeta').textContent =
          `Last updated: ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} by ${_currentGoalsData.updatedBy || 'Unknown'}`;
      } else {
        document.getElementById('goalsAgentMeta').textContent = 'Last updated: Never';
      }

      // Render all tabs
      renderGoalCards();
      renderTaskList();
      renderCsatFollowups();
      renderPerformanceSummary();
      updateOverviewTab();
      updateQaBadge();

      // Populate table-based tabs (QA reviews, Topics, 1:1 Notes)
      populateTable('metricsTableBody', _currentGoalsData.performanceMetrics || [], createMetricsRow);
      populateTable('qaTableBody', _currentGoalsData.qaTickets || [], createQaRow);
      populateTable('topicsTableBody', _currentGoalsData.topicsDiscussed || [], createTopicRow);
      populateTable('notesTableBody', _currentGoalsData.oneOnOneNotes || [], createNoteRow);
    }
  } catch (err) {
    console.error('Error loading goals:', err);
    toast('Failed to load goals', 'error');
  }
}


// ══════════════════════════════════════════════
// TAB SWITCHING (updated for new tab IDs)
// ══════════════════════════════════════════════

function switchGoalsTab(tabId) {
  // Map tab IDs to pane IDs
  const tabToPaneMap = {
    'overview': 'tabOverview',
    'smart': 'tabSmart',
    'tasks': 'tabTasks',
    'attendance': 'tabAttendance',
    'metrics': 'tabMetrics',
    'qa': 'tabQa',
    'topics': 'tabTopics',
    'notes': 'tabNotes'
  };

  document.querySelectorAll('.goals-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabId);
  });

  document.querySelectorAll('.goals-tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === tabToPaneMap[tabId]);
  });

  if (tabId === 'attendance') {
    loadAgentAttendance();
  }
  if (tabId === 'overview') {
    updateOverviewTab();
  }
  if (tabId === 'metrics') {
    renderPerformanceSummary();
  }
}


// ══════════════════════════════════════════════
// A3 — OVERVIEW TAB
// ══════════════════════════════════════════════

function updateOverviewTab() {
  if (!_currentGoalsData) return;
  const d = _currentGoalsData;
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Goals
  const activeGoals = (d.smartGoals || []).filter(g => g.status === 'active' || g.status === 'at_risk');
  document.getElementById('ovGoalsActive').textContent = activeGoals.length;
  const dueSoon = activeGoals.filter(g => g.dueDate && g.dueDate <= new Date(now.getTime() + 14 * 86400000).toISOString().split('T')[0]);
  document.getElementById('ovGoalsDue').textContent = dueSoon.length > 0 ? `${dueSoon.length} due within 2 weeks` : 'No goals due soon';

  // Tasks
  const tasks = d.tasks || [];
  const openTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'completed');
  const overdueTasks = openTasks.filter(t => t.dueDate && t.dueDate < today);
  document.getElementById('ovTasksOpen').textContent = openTasks.length;
  document.getElementById('ovTasksOverdue').textContent = overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : 'None overdue';

  // QA
  const qaTickets = d.qaTickets || [];
  const pendingQa = qaTickets.filter(q => q.goneOver === 'pending' || q.goneOver === '');
  document.getElementById('ovQaCount').textContent = qaTickets.length;
  document.getElementById('ovQaPending').textContent = `${pendingQa.length} pending review`;

  // CSAT follow-ups
  const csatFollowups = d.csatFollowups || [];
  const pendingCsat = csatFollowups.filter(c => !c.followUpCompleted);
  document.getElementById('ovCsatPending').textContent = pendingCsat.length;
  document.getElementById('ovCsatSub').textContent = pendingCsat.length === 1 ? 'needing follow-up' : 'needing follow-up';

  // Performance
  const metrics = d.performanceMetrics || [];
  document.getElementById('ovPerfWeeks').textContent = metrics.length;
  document.getElementById('ovPerfSub').textContent = metrics.length === 1 ? 'week tracked' : 'weeks tracked';

  // Bradford (will be updated when attendance loads)
  // (handled by loadAgentAttendance)

  // Build action items
  const actionsContainer = document.getElementById('overviewActions');
  let actionsHtml = '';

  if (overdueTasks.length > 0) {
    actionsHtml += `<div class="overview-action-item urgent" onclick="switchGoalsTab('tasks'); filterTasks('overdue');">
      <div class="overview-action-icon">🔴</div>
      <div class="overview-action-text">${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''} need attention</div>
      <div class="overview-action-meta">View Tasks →</div>
    </div>`;
  }

  if (pendingCsat.length > 0) {
    actionsHtml += `<div class="overview-action-item urgent" onclick="switchGoalsTab('qa'); filterCsatFollowups('pending');">
      <div class="overview-action-icon">⚠️</div>
      <div class="overview-action-text">${pendingCsat.length} low CSAT follow-up${pendingCsat.length > 1 ? 's' : ''} incomplete</div>
      <div class="overview-action-meta">View CSAT →</div>
    </div>`;
  }

  if (pendingQa.length > 0) {
    actionsHtml += `<div class="overview-action-item warning" onclick="switchGoalsTab('qa');">
      <div class="overview-action-icon">✅</div>
      <div class="overview-action-text">${pendingQa.length} QA review${pendingQa.length > 1 ? 's' : ''} pending</div>
      <div class="overview-action-meta">View QA →</div>
    </div>`;
  }

  const goalsNeedingReview = activeGoals.filter(g => g.nextCheckInDate && g.nextCheckInDate <= today);
  if (goalsNeedingReview.length > 0) {
    actionsHtml += `<div class="overview-action-item info" onclick="switchGoalsTab('smart');">
      <div class="overview-action-icon">🎯</div>
      <div class="overview-action-text">${goalsNeedingReview.length} goal${goalsNeedingReview.length > 1 ? 's' : ''} due for review check-in</div>
      <div class="overview-action-meta">View Goals →</div>
    </div>`;
  }

  if (!actionsHtml) {
    actionsHtml = `<div class="overview-action-item info">
      <div class="overview-action-icon">✨</div>
      <div class="overview-action-text">All caught up! No urgent items.</div>
    </div>`;
  }

  actionsContainer.innerHTML = actionsHtml;
}


// ══════════════════════════════════════════════
// B2 — SMART GOALS CARDS + EDITOR
// ══════════════════════════════════════════════

function renderGoalCards() {
  const container = document.getElementById('smartGoalsList');
  if (!container) return;
  const goals = _currentGoalsData?.smartGoals || [];

  if (goals.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🎯</div>
        <div class="empty-state-title">No Goals Yet</div>
        <div class="empty-state-text">Add your first SMART goal to get started with performance tracking.</div>
        <button class="btn-modern primary-sm" onclick="openGoalEditor()">+ Add First Goal</button>
      </div>`;
    return;
  }

  let html = '';
  goals.forEach((goal, index) => {
    const statusLabel = { draft: '📝 Draft', active: '🟢 Active', at_risk: '🟡 At Risk', complete: '✅ Complete', archived: '📦 Archived' };
    const dueDateStr = goal.dueDate ? new Date(goal.dueDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

    html += `
      <div class="smart-goal-card-v2" onclick="openGoalEditor(${index})">
        <div class="smart-goal-card-header">
          <div class="smart-goal-card-title">${escapeHtml(goal.title || 'Untitled Goal')}</div>
          <span class="status-pill ${goal.status || 'draft'}">${statusLabel[goal.status] || '📝 Draft'}</span>
        </div>
        <div class="smart-goal-card-meta">
          ${dueDateStr ? `<span class="smart-goal-card-meta-item">📅 Due: ${dueDateStr}</span>` : ''}
          ${goal.reviewCadence ? `<span class="smart-goal-card-meta-item">🔄 ${goal.reviewCadence}</span>` : ''}
          ${goal.nextCheckInDate ? `<span class="smart-goal-card-meta-item">📌 Next check-in: ${new Date(goal.nextCheckInDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>` : ''}
        </div>
        <div class="smart-goal-card-preview">
          <div class="smart-goal-preview-field">
            <div class="smart-goal-preview-label">Specific</div>
            <div class="smart-goal-preview-value">${escapeHtml(goal.specific || '—')}</div>
          </div>
          <div class="smart-goal-preview-field">
            <div class="smart-goal-preview-label">Measurable</div>
            <div class="smart-goal-preview-value">${escapeHtml(goal.measurable || '—')}</div>
          </div>
          <div class="smart-goal-preview-field">
            <div class="smart-goal-preview-label">Attainable</div>
            <div class="smart-goal-preview-value">${escapeHtml(goal.attainable || '—')}</div>
          </div>
          <div class="smart-goal-preview-field">
            <div class="smart-goal-preview-label">Relevant</div>
            <div class="smart-goal-preview-value">${escapeHtml(goal.relevant || '—')}</div>
          </div>
          <div class="smart-goal-preview-field">
            <div class="smart-goal-preview-label">Time Bound</div>
            <div class="smart-goal-preview-value">${escapeHtml(goal.timeBound || '—')}</div>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function openGoalEditor(index = null) {
  _editingGoalIndex = index;
  const drawer = document.getElementById('goalEditorDrawer');
  const deleteBtn = document.getElementById('goalEditorDeleteBtn');

  if (index !== null && _currentGoalsData?.smartGoals?.[index]) {
    // Editing existing
    const goal = _currentGoalsData.smartGoals[index];
    document.getElementById('goalEditorTitle').textContent = 'Edit Goal';
    document.getElementById('goalEditorId').value = goal.id || '';
    document.getElementById('goalEditorTitleInput').value = goal.title || '';
    document.getElementById('goalEditorStatus').value = goal.status || 'active';
    document.getElementById('goalEditorDue').value = goal.dueDate || '';
    document.getElementById('goalEditorCadence').value = goal.reviewCadence || '';
    document.getElementById('goalEditorNextCheckin').value = goal.nextCheckInDate || '';
    document.getElementById('goalEditorSpecific').value = goal.specific || '';
    document.getElementById('goalEditorMeasurable').value = goal.measurable || '';
    document.getElementById('goalEditorAttainable').value = goal.attainable || '';
    document.getElementById('goalEditorRelevant').value = goal.relevant || '';
    document.getElementById('goalEditorTimeBound').value = goal.timeBound || '';
    deleteBtn.style.display = 'inline-flex';
  } else {
    // New goal
    document.getElementById('goalEditorTitle').textContent = 'New Goal';
    document.getElementById('goalEditorId').value = '';
    document.getElementById('goalEditorTitleInput').value = '';
    document.getElementById('goalEditorStatus').value = 'active';
    document.getElementById('goalEditorDue').value = '';
    document.getElementById('goalEditorCadence').value = '';
    document.getElementById('goalEditorNextCheckin').value = '';
    document.getElementById('goalEditorSpecific').value = '';
    document.getElementById('goalEditorMeasurable').value = '';
    document.getElementById('goalEditorAttainable').value = '';
    document.getElementById('goalEditorRelevant').value = '';
    document.getElementById('goalEditorTimeBound').value = '';
    deleteBtn.style.display = 'none';
  }

  drawer.style.display = 'block';
  drawer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeGoalEditor() {
  document.getElementById('goalEditorDrawer').style.display = 'none';
  _editingGoalIndex = null;
}

function saveGoalFromEditor() {
  if (!_currentGoalsData) return;
  if (!_currentGoalsData.smartGoals) _currentGoalsData.smartGoals = [];

  const goalData = {
    id: document.getElementById('goalEditorId').value || 'goal_' + Date.now(),
    title: document.getElementById('goalEditorTitleInput').value || 'Untitled Goal',
    status: document.getElementById('goalEditorStatus').value || 'active',
    dueDate: document.getElementById('goalEditorDue').value || '',
    reviewCadence: document.getElementById('goalEditorCadence').value || '',
    nextCheckInDate: document.getElementById('goalEditorNextCheckin').value || '',
    specific: document.getElementById('goalEditorSpecific').value || '',
    measurable: document.getElementById('goalEditorMeasurable').value || '',
    attainable: document.getElementById('goalEditorAttainable').value || '',
    relevant: document.getElementById('goalEditorRelevant').value || '',
    timeBound: document.getElementById('goalEditorTimeBound').value || '',
    updatedAt: new Date().toISOString()
  };

  if (_editingGoalIndex !== null && _currentGoalsData.smartGoals[_editingGoalIndex]) {
    goalData.createdAt = _currentGoalsData.smartGoals[_editingGoalIndex].createdAt;
    _currentGoalsData.smartGoals[_editingGoalIndex] = goalData;
  } else {
    goalData.createdAt = new Date().toISOString();
    _currentGoalsData.smartGoals.push(goalData);
  }

  _goalsUnsavedChanges = true;
  closeGoalEditor();
  renderGoalCards();
  updateOverviewTab();
}

function deleteCurrentGoal() {
  if (_editingGoalIndex === null || !_currentGoalsData?.smartGoals) return;

  Swal.fire({
    title: 'Archive Goal?',
    text: 'This will archive the goal. You can restore it later.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Archive',
    cancelButtonText: 'Cancel'
  }).then(result => {
    if (result.isConfirmed) {
      _currentGoalsData.smartGoals[_editingGoalIndex].status = 'archived';
      _goalsUnsavedChanges = true;
      closeGoalEditor();
      renderGoalCards();
      updateOverviewTab();
    }
  });
}


// ══════════════════════════════════════════════
// C2 — TASKS LIST + FILTERS
// ══════════════════════════════════════════════

function renderTaskList(filter = 'all') {
  const container = document.getElementById('tasksList');
  if (!container) return;
  const tasks = _currentGoalsData?.tasks || [];
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const soonDate = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];

  // Apply filter
  let filtered = tasks;
  if (filter === 'overdue') {
    filtered = tasks.filter(t => t.dueDate && t.dueDate < today && t.status !== 'done' && t.status !== 'completed');
  } else if (filter === 'due_soon') {
    filtered = tasks.filter(t => t.dueDate && t.dueDate >= today && t.dueDate <= soonDate && t.status !== 'done' && t.status !== 'completed');
  } else if (filter === 'in_progress') {
    filtered = tasks.filter(t => t.status === 'in_progress');
  } else if (filter === 'done') {
    filtered = tasks.filter(t => t.status === 'done' || t.status === 'completed');
  }

  if (filtered.length === 0 && tasks.length === 0) {
    container.innerHTML = '';
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📌</div><div class="empty-state-title">No Tasks Yet</div><div class="empty-state-text">Add tasks and projects to track deliverables.</div><button class="btn-modern primary-sm" onclick="openTaskEditor()">+ Add First Task</button></div>';
    return;
  }

  let html = '';
  if (filtered.length === 0) {
    html = `<div style="text-align:center; padding:24px; color:var(--text-secondary); font-size:13px;">No tasks match this filter.</div>`;
  }

  filtered.forEach((task, index) => {
    const originalIndex = tasks.indexOf(task);
    const isOverdue = task.dueDate && task.dueDate < today && task.status !== 'done' && task.status !== 'completed';
    const isDone = task.status === 'done' || task.status === 'completed';
    const dueDateStr = task.dueDate ? new Date(task.dueDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    const statusLabels = { open: 'Open', in_progress: 'In Progress', done: 'Completed', blocked: 'Blocked', completed: 'Completed', not_started: 'Not Started' };

    html += `
      <div class="task-card ${isOverdue ? 'overdue' : ''} ${isDone ? 'done' : ''}" onclick="openTaskEditor(${originalIndex})">
        <div class="task-card-priority ${task.priority || ''}"></div>
        <div class="task-card-body">
          <div class="task-card-title">${escapeHtml(task.title || 'Untitled Task')}</div>
          <div class="task-card-subtitle">
            ${dueDateStr ? `<span>${isOverdue ? '🔴' : '📅'} ${dueDateStr}</span>` : ''}
            ${task.notes ? `<span>📝 ${escapeHtml(task.notes.substring(0, 50))}${task.notes.length > 50 ? '...' : ''}</span>` : ''}
          </div>
        </div>
        <div class="task-card-actions">
          <span class="status-pill ${task.status || 'open'}">${statusLabels[task.status] || 'Open'}</span>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function filterTasks(filter) {
  document.querySelectorAll('#taskFilterChips .filter-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.filter === filter);
  });
  renderTaskList(filter);
}

function openTaskEditor(index = null) {
  _editingTaskIndex = index;
  const panel = document.getElementById('taskEditorPanel');
  const deleteBtn = document.getElementById('taskEditorDeleteBtn');

  if (index !== null && _currentGoalsData?.tasks?.[index]) {
    const task = _currentGoalsData.tasks[index];
    document.getElementById('taskEditorId').value = task.id || '';
    document.getElementById('taskEditorTitle').value = task.title || '';
    document.getElementById('taskEditorPriority').value = task.priority || '';
    document.getElementById('taskEditorDue').value = task.dueDate || '';
    document.getElementById('taskEditorStatus').value = task.status || 'open';
    document.getElementById('taskEditorNotes').value = task.notes || '';
    deleteBtn.style.display = 'inline-flex';
  } else {
    document.getElementById('taskEditorId').value = '';
    document.getElementById('taskEditorTitle').value = '';
    document.getElementById('taskEditorPriority').value = '';
    document.getElementById('taskEditorDue').value = '';
    document.getElementById('taskEditorStatus').value = 'open';
    document.getElementById('taskEditorNotes').value = '';
    deleteBtn.style.display = 'none';
  }

  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeTaskEditor() {
  document.getElementById('taskEditorPanel').style.display = 'none';
  _editingTaskIndex = null;
}

function saveTaskFromEditor() {
  if (!_currentGoalsData) return;
  if (!_currentGoalsData.tasks) _currentGoalsData.tasks = [];

  const taskData = {
    id: document.getElementById('taskEditorId').value || 'task_' + Date.now(),
    title: document.getElementById('taskEditorTitle').value || 'Untitled Task',
    priority: document.getElementById('taskEditorPriority').value || '',
    dueDate: document.getElementById('taskEditorDue').value || '',
    status: document.getElementById('taskEditorStatus').value || 'open',
    notes: document.getElementById('taskEditorNotes').value || '',
    updatedAt: new Date().toISOString()
  };

  if (_editingTaskIndex !== null && _currentGoalsData.tasks[_editingTaskIndex]) {
    taskData.createdAt = _currentGoalsData.tasks[_editingTaskIndex].createdAt;
    _currentGoalsData.tasks[_editingTaskIndex] = taskData;
  } else {
    taskData.createdAt = new Date().toISOString();
    _currentGoalsData.tasks.push(taskData);
  }

  _goalsUnsavedChanges = true;
  closeTaskEditor();
  renderTaskList();
  updateOverviewTab();
}

function deleteCurrentTask() {
  if (_editingTaskIndex === null || !_currentGoalsData?.tasks) return;
  _currentGoalsData.tasks.splice(_editingTaskIndex, 1);
  _goalsUnsavedChanges = true;
  closeTaskEditor();
  renderTaskList();
  updateOverviewTab();
}


// ══════════════════════════════════════════════
// D1/D2 — CSAT FOLLOW-UPS
// ══════════════════════════════════════════════

function renderCsatFollowups(filter = 'all') {
  const container = document.getElementById('csatFollowupsList');
  const emptyState = document.getElementById('csatEmpty');
  const followups = _currentGoalsData?.csatFollowups || [];

  let filtered = followups;
  if (filter === 'pending') {
    filtered = followups.filter(c => !c.followUpCompleted);
  } else if (filter === 'completed') {
    filtered = followups.filter(c => c.followUpCompleted);
  }

  if (filtered.length === 0 && followups.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">👍</div>
        <div class="empty-state-title">No Low CSAT Follow-ups</div>
        <div class="empty-state-text">Add follow-up entries when agents receive a bad CSAT rating.</div>
      </div>`;
    return;
  }

  let html = '';
  if (filtered.length === 0) {
    html = `<div style="text-align:center; padding:24px; color:var(--text-secondary); font-size:13px;">No follow-ups match this filter.</div>`;
  }

  filtered.forEach((fu, i) => {
    const originalIndex = followups.indexOf(fu);
    const ratingBadge = (fu.rating === 'Good')
      ? '<span style="background:#dcfce7; color:#166534; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700;">👍 Good</span>'
      : '<span style="background:#fee2e2; color:#991b1b; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700;">👎 Bad</span>';
    const dateStr = fu.dateReceived ? new Date(fu.dateReceived + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    const methodIcons = { email: '📧', chat: '💬', phone: '📞' };
    const isDone = !!fu.followUpCompleted;
    const doneDate = fu.followUpCompletedAt ? new Date(fu.followUpCompletedAt + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    const doneBy = fu.completedByAgent ? ' by ' + escapeHtml(fu.completedByAgent) : '';

    html += `
      <div class="csat-followup-card ${isDone ? 'completed' : 'pending'}" onclick="openCsatFollowupEditor(${originalIndex})"
        style="${isDone ? 'background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%); border-color:#bbf7d0;' : ''}">
        <div class="csat-followup-rating">${isDone ? '<span style="font-size:20px;">✅</span>' : ratingBadge}</div>
        <div class="csat-followup-body">
          <div class="csat-followup-title">Ticket ${formatTicketLink(fu.ticketNumber)} · ${escapeHtml(fu.channel || '—')}</div>
          <div class="csat-followup-subtitle">
            ${dateStr ? `<span>📅 ${dateStr}</span>` : ''}
            ${fu.coachingTips ? `<span>💡 ${escapeHtml(fu.coachingTips.substring(0, 60))}${fu.coachingTips.length > 60 ? '...' : ''}</span>` : ''}
          </div>
        </div>
        <div class="csat-followup-actions">
          ${isDone
            ? `<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:8px;background:#dcfce7;color:#166534;font-size:11px;font-weight:700;">${methodIcons[fu.followUpMethod] || '✅'} Done${doneDate ? ' · '+doneDate : ''}${doneBy}</span>`
            : `<span class="status-pill pending">⏳ Needs Follow-up</span>`
          }
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function filterCsatFollowups(filter) {
  document.querySelectorAll('#csatFilterChips .filter-chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.filter === filter);
  });
  renderCsatFollowups(filter);
}

function openCsatFollowupEditor(index = null) {
  _editingCsatIndex = index;
  const panel = document.getElementById('csatEditorPanel');

  // Dynamically generate the editor form HTML
  panel.innerHTML = `
    <input type="hidden" id="csatEditorId">
    <div class="task-editor-grid">
      <div>
        <label style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-secondary); margin-bottom:4px; display:block;">Date Received</label>
        <input type="date" id="csatEditorDate" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:8px; background:var(--input-bg); color:var(--text-primary); font-size:13px;">
      </div>
      <div>
        <label style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-secondary); margin-bottom:4px; display:block;">Ticket Number</label>
        <input type="text" id="csatEditorTicket" placeholder="e.g. 766576" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:8px; background:var(--input-bg); color:var(--text-primary); font-size:13px;">
      </div>
      <div>
        <label style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-secondary); margin-bottom:4px; display:block;">Channel</label>
        <select id="csatEditorChannel" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:8px; background:var(--input-bg); color:var(--text-primary); font-size:13px;">
          <option value="">Select</option>
          <option value="Live Chat">Live Chat</option>
          <option value="Phone">Phone</option>
          <option value="Email">Email</option>
          <option value="Socials">Socials</option>
          <option value="MD Support">MD Support</option>
        </select>
      </div>
    </div>
    <div class="task-editor-grid" style="grid-template-columns: 1fr 1fr;">
      <div>
        <label style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-secondary); margin-bottom:4px; display:block;">Rating</label>
        <select id="csatEditorRating" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:8px; background:var(--input-bg); color:var(--text-primary); font-size:13px;">
          <option value="Bad">👎 Bad</option>
          <option value="Good">👍 Good</option>
        </select>
      </div>
      <div>
        <label style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-secondary); margin-bottom:4px; display:block;">Follow-Up Method</label>
        <select id="csatEditorMethod" style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:8px; background:var(--input-bg); color:var(--text-primary); font-size:13px;">
          <option value="">Select</option>
          <option value="email">📧 Email</option>
          <option value="chat">💬 Chat</option>
          <option value="phone">📞 Phone</option>
        </select>
      </div>
    </div>
    <div style="margin-bottom:16px;">
      <label style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-secondary); margin-bottom:4px; display:block;">Coaching Tips / Suggestions</label>
      <textarea id="csatEditorCoaching" rows="3" placeholder="How should the agent follow up on this ticket? Include specific tips or coaching points..." style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:8px; background:var(--input-bg); color:var(--text-primary); font-size:13px; resize:vertical; font-family:inherit;"></textarea>
    </div>
    <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
      <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:13px; color:var(--text-primary);">
        <input type="checkbox" id="csatEditorCompleted" onchange="toggleCsatCompletedDate()" style="width:16px; height:16px;">
        Patient Contacted / Completed
      </label>
      <input type="date" id="csatEditorCompletedAt" style="display:none; padding:8px; border:1px solid var(--border-color); border-radius:8px; background:var(--input-bg); color:var(--text-primary); font-size:12px;">
    </div>
    <div style="margin-bottom:16px;">
      <label style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-secondary); margin-bottom:4px; display:block;">Notes</label>
      <textarea id="csatEditorNotes" rows="2" placeholder="Follow-up notes..." style="width:100%; padding:10px; border:1px solid var(--border-color); border-radius:8px; background:var(--input-bg); color:var(--text-primary); font-size:13px; resize:vertical; font-family:inherit;"></textarea>
    </div>
    <div class="task-editor-actions">
      <button id="csatEditorDeleteBtn" onclick="deleteCurrentCsatFollowup()" style="display:none; padding:8px 16px; background:#fee2e2; color:#dc2626; border:none; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer;">🗑 Delete</button>
      <button id="csatEditorRemindBtn" onclick="sendCsatReminder(_editingCsatIndex)" style="display:none; padding:8px 16px; background:#fef3c7; color:#92400e; border:1px solid #fcd34d; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer;">🔔 Remind Agent</button>
      <div style="flex:1;"></div>
      <button onclick="closeCsatEditor()" style="padding:8px 16px; background:var(--bg-tertiary); color:var(--text-secondary); border:1px solid var(--border-color); border-radius:8px; font-size:12px; font-weight:600; cursor:pointer;">Cancel</button>
      <button onclick="saveCsatFollowupFromEditor()" style="padding:8px 16px; background:var(--accent-primary); color:white; border:none; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer;">Save Follow-up</button>
    </div>
  `;

  const deleteBtn = document.getElementById('csatEditorDeleteBtn');
  const remindBtn = document.getElementById('csatEditorRemindBtn');

  if (index !== null && _currentGoalsData?.csatFollowups?.[index]) {
    const fu = _currentGoalsData.csatFollowups[index];
    document.getElementById('csatEditorId').value = fu.id || '';
    document.getElementById('csatEditorDate').value = fu.dateReceived || '';
    document.getElementById('csatEditorTicket').value = fu.ticketNumber || '';
    document.getElementById('csatEditorChannel').value = fu.channel || '';
    document.getElementById('csatEditorRating').value = fu.rating || 'Bad';
    document.getElementById('csatEditorCoaching').value = fu.coachingTips || fu.issueSummary || '';
    document.getElementById('csatEditorMethod').value = fu.followUpMethod || '';
    document.getElementById('csatEditorCompleted').checked = !!fu.followUpCompleted;
    document.getElementById('csatEditorCompletedAt').value = fu.followUpCompletedAt || '';
    document.getElementById('csatEditorCompletedAt').style.display = fu.followUpCompleted ? 'block' : 'none';
    document.getElementById('csatEditorNotes').value = fu.notes || '';
    deleteBtn.style.display = 'inline-flex';
    // Show remind button only for pending (not yet completed) existing follow-ups
    remindBtn.style.display = fu.followUpCompleted ? 'none' : 'inline-flex';
  } else {
    document.getElementById('csatEditorDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('csatEditorRating').value = 'Bad';
    deleteBtn.style.display = 'none';
    remindBtn.style.display = 'none';
  }

  panel.style.display = 'block';
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeCsatEditor() {
  document.getElementById('csatEditorPanel').style.display = 'none';
  _editingCsatIndex = null;
}

function toggleCsatCompletedDate() {
  const checked = document.getElementById('csatEditorCompleted').checked;
  const dateInput = document.getElementById('csatEditorCompletedAt');
  dateInput.style.display = checked ? 'block' : 'none';
  if (checked && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }
}

function saveCsatFollowupFromEditor() {
  if (!_currentGoalsData) return;
  if (!_currentGoalsData.csatFollowups) _currentGoalsData.csatFollowups = [];

  const isCompleted = document.getElementById('csatEditorCompleted').checked;
  const method = document.getElementById('csatEditorMethod').value;

  // D0: Validation — cannot mark complete without method
  if (isCompleted && !method) {
    toast('Please select a follow-up method before marking as complete.', 'error');
    return;
  }

  const fuData = {
    id: document.getElementById('csatEditorId').value || 'csat_' + Date.now(),
    dateReceived: document.getElementById('csatEditorDate').value || '',
    ticketNumber: document.getElementById('csatEditorTicket').value || '',
    channel: document.getElementById('csatEditorChannel').value || '',
    rating: document.getElementById('csatEditorRating').value || 'Bad',
    coachingTips: document.getElementById('csatEditorCoaching').value || '',
    followUpRequired: true,
    followUpCompleted: isCompleted,
    followUpMethod: method,
    followUpCompletedAt: isCompleted ? (document.getElementById('csatEditorCompletedAt').value || new Date().toISOString().split('T')[0]) : '',
    notes: document.getElementById('csatEditorNotes').value || '',
    updatedAt: new Date().toISOString()
  };

  if (_editingCsatIndex !== null && _currentGoalsData.csatFollowups[_editingCsatIndex]) {
    fuData.createdAt = _currentGoalsData.csatFollowups[_editingCsatIndex].createdAt;
    _currentGoalsData.csatFollowups[_editingCsatIndex] = fuData;
  } else {
    fuData.createdAt = new Date().toISOString();
    _currentGoalsData.csatFollowups.push(fuData);
  }

  _goalsUnsavedChanges = true;
  closeCsatEditor();
  renderCsatFollowups();
  updateQaBadge();
  updateOverviewTab();
}

function deleteCurrentCsatFollowup() {
  if (_editingCsatIndex === null || !_currentGoalsData?.csatFollowups) return;
  _currentGoalsData.csatFollowups.splice(_editingCsatIndex, 1);
  _goalsUnsavedChanges = true;
  closeCsatEditor();
  renderCsatFollowups();
  updateQaBadge();
  updateOverviewTab();
}

// ── Agent marks a CSAT follow-up as completed from their own view ──
async function agentMarkCsatComplete(index) {
  if (!window._myName) { toast('Please log in first', 'error'); return; }

  const btn = event?.target?.closest?.('button') || event?.target;
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Saving...'; }

  try {
    const res = await fetch('./?action=goals/csat-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentName: window._myName,
        csatIndex: index,
        completedBy: window._myName
      })
    });
    const data = await res.json();
    if (data.ok) {
      toast('✅ Follow-up marked as completed!', 'success');
      // Reload the agent goals view to reflect the change
      await loadMyGoals();
    } else {
      toast(data.error || 'Failed to save', 'error');
      if (btn) { btn.disabled = false; btn.textContent = '☑️ Mark as Completed'; }
    }
  } catch (err) {
    console.error('agentMarkCsatComplete error:', err);
    toast('Failed to save — please try again', 'error');
    if (btn) { btn.disabled = false; btn.textContent = '☑️ Mark as Completed'; }
  }
}

// ── Manager sends a CSAT follow-up reminder notification to the agent ──
async function sendCsatReminder(csatIndex) {
  if (!_currentGoalsAgent) { toast('No agent selected', 'error'); return; }

  const fu = _currentGoalsData?.csatFollowups?.[csatIndex];
  if (!fu) { toast('Follow-up not found', 'error'); return; }

  const btn = event?.target?.closest?.('button') || event?.target;
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Sending...'; }

  try {
    const res = await fetch('./?action=goals/csat-remind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentName: _currentGoalsAgent,
        ticketNumber: fu.ticketNumber || '',
        channel: fu.channel || '',
        coachingTips: fu.coachingTips || '',
        sentBy: window._myName || 'Manager'
      })
    });
    const data = await res.json();
    if (data.ok) {
      toast('🔔 Reminder sent to ' + _currentGoalsAgent, 'success');
      if (btn) {
        btn.textContent = '✓ Sent!';
        btn.style.background = '#dcfce7';
        btn.style.color = '#166534';
        btn.style.borderColor = '#bbf7d0';
        setTimeout(() => { btn.disabled = false; btn.textContent = '🔔 Remind Agent'; btn.style.background = '#fef3c7'; btn.style.color = '#92400e'; btn.style.borderColor = '#fcd34d'; }, 3000);
      }
    } else {
      toast(data.error || 'Failed to send reminder', 'error');
      if (btn) { btn.disabled = false; btn.textContent = '🔔 Remind Agent'; }
    }
  } catch (err) {
    console.error('sendCsatReminder error:', err);
    toast('Failed to send reminder', 'error');
    if (btn) { btn.disabled = false; btn.textContent = '🔔 Remind Agent'; }
  }
}


// ══════════════════════════════════════════════
// D3 — QA TAB BADGE
// ══════════════════════════════════════════════

function updateQaBadge() {
  const badge = document.getElementById('qaTabBadge');
  if (!badge) return;

  const pending = (_currentGoalsData?.csatFollowups || []).filter(c => !c.followUpCompleted).length;
  if (pending > 0) {
    badge.textContent = pending;
    badge.style.display = 'inline-flex';
  } else {
    badge.style.display = 'none';
  }
}


// ══════════════════════════════════════════════
// F2 — PERFORMANCE SUMMARY BAND
// ══════════════════════════════════════════════

function renderPerformanceSummary() {
  const metrics = _currentGoalsData?.performanceMetrics || [];
  if (metrics.length === 0) {
    document.getElementById('perfAvgTickets').textContent = '--';
    document.getElementById('perfAvgCsat').textContent = '--';
    document.getElementById('perfTrend').textContent = '--';
    document.getElementById('perfTotalCallOuts').textContent = '--';
    return;
  }

  const validTickets = metrics.filter(m => m.ticketsSolved);
  const avgTickets = validTickets.length > 0
    ? Math.round(validTickets.reduce((s, m) => s + (parseInt(m.ticketsSolved) || 0), 0) / validTickets.length)
    : '--';

  const validCsat = metrics.filter(m => m.csat);
  const avgCsat = validCsat.length > 0
    ? (validCsat.reduce((s, m) => s + (parseFloat(m.csat) || 0), 0) / validCsat.length).toFixed(1) + '%'
    : '--';

  const totalCallOuts = metrics.reduce((s, m) => s + (parseInt(m.callOuts) || 0), 0);

  // Trend: compare last 2 weeks
  let trend = '--';
  if (metrics.length >= 2) {
    const sorted = [...metrics].sort((a, b) => (b.weekStarting || '').localeCompare(a.weekStarting || ''));
    const latest = parseInt(sorted[0]?.ticketsSolved) || 0;
    const prior = parseInt(sorted[1]?.ticketsSolved) || 0;
    if (prior > 0) {
      const pct = Math.round(((latest - prior) / prior) * 100);
      trend = pct >= 0 ? `↑ ${pct}%` : `↓ ${Math.abs(pct)}%`;
    }
  }

  document.getElementById('perfAvgTickets').textContent = avgTickets;
  document.getElementById('perfAvgCsat').textContent = avgCsat;
  document.getElementById('perfTrend').textContent = trend;
  document.getElementById('perfTotalCallOuts').textContent = totalCallOuts;
}


// ══════════════════════════════════════════════
// E1/E2 — ATTENDANCE TIMELINE
// ══════════════════════════════════════════════

async function loadAgentAttendance() {
  if (!_currentGoalsAgent) return;

  const days = document.getElementById('attendancePeriod')?.value || 90;
  const timelineContainer = document.getElementById('attendanceTimeline');
  timelineContainer.innerHTML = '<div class="timeline-loading">Loading attendance data...</div>';

  try {
    const res = await fetch('/attendance/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentName: _currentGoalsAgent, days: parseInt(days) })
    });

    const data = await res.json();
    if (data.ok && data.summary) {
      const s = data.summary;

      // Update summary cards
      document.getElementById('attBradford').textContent = s.bradfordFactor;
      const statusEl = document.getElementById('attBradfordStatus');
      statusEl.textContent = s.concernLevel.charAt(0).toUpperCase() + s.concernLevel.slice(1);
      statusEl.className = 'summary-card-status ' + s.concernLevel;

      document.getElementById('attCallOuts').textContent = s.stats.callOuts;
      document.getElementById('attPTO').textContent = s.stats.ptoRequests;
      document.getElementById('attSwapsInit').textContent = s.stats.swapsInitiated;
      document.getElementById('attReplaced').textContent = s.stats.timesReplaced;
      document.getElementById('attCovered').textContent = s.stats.coveredForOthers;

      // Update overview Bradford
      if (document.getElementById('ovBradford')) {
        document.getElementById('ovBradford').textContent = s.bradfordFactor;
        const ovLabel = document.getElementById('ovBradfordLabel');
        if (ovLabel) {
          ovLabel.textContent = `Bradford Factor · ${s.concernLevel.charAt(0).toUpperCase() + s.concernLevel.slice(1)}`;
        }
      }

      // Render timeline (E1 + E2)
      renderAttendanceTimeline(s.events || []);
    }
  } catch (err) {
    console.error('Error loading attendance:', err);
    timelineContainer.innerHTML = '<div class="timeline-loading">Error loading attendance data</div>';
  }
}

function renderAttendanceTimeline(events, filter = 'all') {
  const container = document.getElementById('attendanceTimeline');

  // Filter
  let filtered = events;
  if (filter === 'timeoff') {
    filtered = events.filter(e => e.type === 'timeoff' && !e.isCallOut);
  } else if (filter === 'callout') {
    filtered = events.filter(e => e.isCallOut || (e.type === 'timeoff' && e.isCallOut));
  } else if (filter === 'swap') {
    filtered = events.filter(e => e.type === 'swap_initiated' || e.type === 'swap_received');
  }

  if (filtered.length === 0) {
    container.innerHTML = '<div class="timeline-loading">No attendance events found</div>';
    return;
  }

  // E2: Group by date
  const groups = {};
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  filtered.forEach(e => {
    const eventDate = e.date || (e.createdAt ? e.createdAt.split('T')[0] : '');
    let groupLabel = eventDate;
    if (eventDate === today) groupLabel = 'Today';
    else if (eventDate === yesterday) groupLabel = 'Yesterday';
    else if (eventDate) groupLabel = new Date(eventDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    else groupLabel = 'Unknown Date';

    if (!groups[groupLabel]) groups[groupLabel] = [];
    groups[groupLabel].push(e);
  });

  let html = '';
  Object.entries(groups).forEach(([dateLabel, groupEvents]) => {
    html += `<div class="timeline-date-group">${dateLabel}</div>`;

    groupEvents.forEach(e => {
      let icon = '📅';
      let iconClass = 'timeoff';
      let title = '';
      let subtitle = '';

      if (e.type === 'timeoff') {
        icon = e.isCallOut ? '🤒' : '🏖️';
        iconClass = e.isCallOut ? 'callout' : 'timeoff';
        title = e.isCallOut ? 'Call Out / Sick Day' : 'PTO Request';
        subtitle = e.reason || '';
      } else if (e.type === 'swap_initiated') {
        icon = '🔄';
        iconClass = 'swap';
        title = `Swap requested with ${e.withPerson || 'Unknown'}`;
      } else if (e.type === 'swap_received') {
        icon = '🔄';
        iconClass = 'swap';
        title = `Swap received from ${e.withPerson || 'Unknown'}`;
      } else if (e.type === 'replaced') {
        icon = '🔁';
        iconClass = 'replaced';
        title = `Replaced by ${e.newPerson || 'Unknown'}`;
      } else if (e.type === 'replacement_took') {
        icon = '✋';
        iconClass = 'covered';
        title = `Covered for ${e.originalPerson || 'Unknown'}`;
      }

      const statusPill = e.status ? `<span class="status-pill ${e.status}">${e.status.charAt(0).toUpperCase() + e.status.slice(1)}</span>` : '';

      html += `
        <div class="timeline-item" data-type="${e.type || ''}" data-callout="${e.isCallOut ? 'true' : 'false'}">
          <div class="timeline-item-icon ${iconClass}">${icon}</div>
          <div class="timeline-item-body">
            <div class="timeline-item-title">${title}</div>
            ${subtitle ? `<div class="timeline-item-subtitle">${escapeHtml(subtitle)}</div>` : ''}
          </div>
          <div class="timeline-item-right">
            ${statusPill}
          </div>
        </div>
      `;
    });
  });

  container.innerHTML = html;

  // Store events for filtering
  container._allEvents = events;
}

function filterTimeline(filter, context) {
  if (context === 'attendance') {
    const container = document.getElementById('attendanceTimeline');
    const events = container._allEvents || [];

    // Update chips
    const chipsContainer = container.previousElementSibling?.querySelector('.filter-chips') ||
      document.querySelector('#tabAttendance .filter-chips');
    if (chipsContainer) {
      chipsContainer.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.filter === filter);
      });
    }

    renderAttendanceTimeline(events, filter);
  }
}


// ══════════════════════════════════════════════
// F1 — MEETING FOLLOW-UPS
// ══════════════════════════════════════════════

function addMeetingFollowup() {
  Swal.fire({
    title: 'Log Meeting Follow-up',
    html: `
      <div style="text-align: left; padding: 0 8px;">
        <div style="margin-bottom: 16px;">
          <label style="display:block; font-size:11px; font-weight:700; margin-bottom:6px; text-transform:uppercase; color:#64748b;">Type</label>
          <select id="swal-meeting-type" style="width:100%; padding:12px; border:2px solid var(--border-color, #e2e8f0); border-radius:10px; font-size:14px; background:var(--input-bg, white); color:var(--text-primary, #1e293b);">
            <option value="meeting_missed">Meeting Missed</option>
            <option value="video_watched">Training Video Watched</option>
            <option value="coaching">Coaching Session</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div style="margin-bottom: 16px;">
          <label style="display:block; font-size:11px; font-weight:700; margin-bottom:6px; text-transform:uppercase; color:#64748b;">Date</label>
          <input type="date" id="swal-meeting-date" value="${new Date().toISOString().split('T')[0]}" style="width:100%; padding:12px; border:2px solid var(--border-color, #e2e8f0); border-radius:10px; font-size:14px; background:var(--input-bg, white); color:var(--text-primary, #1e293b); box-sizing:border-box;">
        </div>
        <div style="margin-bottom: 8px;">
          <label style="display:block; font-size:11px; font-weight:700; margin-bottom:6px; text-transform:uppercase; color:#64748b;">Notes</label>
          <textarea id="swal-meeting-notes" placeholder="Details..." style="width:100%; padding:12px; border:2px solid var(--border-color, #e2e8f0); border-radius:10px; font-size:14px; background:var(--input-bg, white); color:var(--text-primary, #1e293b); min-height:100px; resize:vertical; box-sizing:border-box;"></textarea>
        </div>
      </div>
    `,
    width: 420,
    confirmButtonText: 'Save',
    confirmButtonColor: '#b37e78',
    showCancelButton: true,
    cancelButtonColor: '#64748b',
    customClass: {
      popup: 'swal-dark-mode',
      htmlContainer: 'swal-no-overflow'
    },
    preConfirm: () => {
      return {
        type: document.getElementById('swal-meeting-type').value,
        date: document.getElementById('swal-meeting-date').value,
        notes: document.getElementById('swal-meeting-notes').value
      };
    }
  }).then(result => {
    if (result.isConfirmed && result.value) {
      if (!_currentGoalsData.meetingFollowups) _currentGoalsData.meetingFollowups = [];
      _currentGoalsData.meetingFollowups.push({
        id: 'mfu_' + Date.now(),
        ...result.value,
        createdAt: new Date().toISOString()
      });
      _goalsUnsavedChanges = true;
      renderMeetingFollowups();
    }
  });
}

function renderMeetingFollowups() {
  const container = document.getElementById('meetingFollowups');
  const followups = _currentGoalsData?.meetingFollowups || [];

  if (followups.length === 0) {
    container.innerHTML = `<div style="text-align:center; padding:16px; color:var(--text-secondary); font-size:13px; border:1px dashed var(--border-color); border-radius:10px;">No meeting follow-ups logged yet.</div>`;
    return;
  }

  const typeLabels = { meeting_missed: '❌ Meeting Missed', video_watched: '🎥 Video Watched', coaching: '🗣️ Coaching Session', other: '📋 Other' };
  let html = '';

  followups.forEach(fu => {
    const dateStr = fu.date ? new Date(fu.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    html += `
      <div class="timeline-item">
        <div class="timeline-item-icon meeting">${fu.type === 'meeting_missed' ? '❌' : fu.type === 'video_watched' ? '🎥' : '🗣️'}</div>
        <div class="timeline-item-body">
          <div class="timeline-item-title">${typeLabels[fu.type] || fu.type}</div>
          ${fu.notes ? `<div class="timeline-item-subtitle">${escapeHtml(fu.notes)}</div>` : ''}
        </div>
        <div class="timeline-item-right">
          <div class="timeline-item-date">${dateStr}</div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}


// ══════════════════════════════════════════════
// TABLE-BASED TABS (QA Reviews, Metrics, Topics, 1:1)
// (Kept mostly as-is, minor cleanups)
// ══════════════════════════════════════════════

function populateTable(tableBodyId, data, createRowFn) {
  const tbody = document.getElementById(tableBodyId);
  if (!tbody) return;

  tbody.innerHTML = '';
  data.forEach((item, index) => {
    tbody.appendChild(createRowFn(item, index));
  });

  if (data.length === 0) {
    const row = createRowFn({}, 0);
    tbody.appendChild(row);
  }
}

function createMetricsRow(data = {}, index) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="date" value="${data.weekStarting || ''}" data-field="weekStarting" onchange="_goalsUnsavedChanges=true"></td>
    <td><input type="number" value="${data.ticketsSolved || ''}" data-field="ticketsSolved" placeholder="0" onchange="_goalsUnsavedChanges=true"></td>
    <td><input type="text" value="${escapeHtml(data.csat || '')}" data-field="csat" placeholder="%" onchange="_goalsUnsavedChanges=true"></td>
    <td><textarea data-field="winsChallenges" onchange="_goalsUnsavedChanges=true">${escapeHtml(data.winsChallenges || '')}</textarea></td>
    <td><input type="number" value="${data.callOuts || ''}" data-field="callOuts" placeholder="0" onchange="_goalsUnsavedChanges=true"></td>
    <td><input type="text" value="${escapeHtml(data.makeUpHours || '')}" data-field="makeUpHours" placeholder="0" onchange="_goalsUnsavedChanges=true"></td>
    <td><textarea data-field="notes" onchange="_goalsUnsavedChanges=true">${escapeHtml(data.notes || '')}</textarea></td>
    <td><button class="btn-delete" onclick="this.closest('tr').remove(); _goalsUnsavedChanges=true;">✕</button></td>
  `;
  return tr;
}

function createQaRow(data = {}, index) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="date" value="${data.date || ''}" data-field="date" onchange="_goalsUnsavedChanges=true"></td>
    <td>
      <select data-field="channel" onchange="_goalsUnsavedChanges=true">
        <option value="">Select</option>
        <option value="Live Chat" ${data.channel === 'Live Chat' ? 'selected' : ''}>Live Chat</option>
        <option value="Phone" ${data.channel === 'Phone' ? 'selected' : ''}>Phone</option>
        <option value="Email" ${data.channel === 'Email' ? 'selected' : ''}>Email</option>
        <option value="Socials" ${data.channel === 'Socials' ? 'selected' : ''}>Socials</option>
      </select>
    </td>
    <td>
      <div style="display:flex; align-items:center; gap:4px;">
        <input type="text" value="${escapeHtml(data.ticketNumber || '')}" data-field="ticketNumber" placeholder="#" onchange="_goalsUnsavedChanges=true" style="flex:1;">
        ${data.ticketNumber ? `<a href="${ZENDESK_BASE_URL}${data.ticketNumber.toString().replace(/[^0-9]/g, '')}" target="_blank" rel="noopener" class="ticket-link-icon" title="Open in Zendesk">🔗</a>` : ''}
      </div>
    </td>
    <td><textarea data-field="notes" onchange="_goalsUnsavedChanges=true">${escapeHtml(data.notes || '')}</textarea></td>
    <td>
      <select data-field="goneOver" onchange="_goalsUnsavedChanges=true">
        <option value="">Select</option>
        <option value="yes" ${data.goneOver === 'yes' ? 'selected' : ''}>Yes</option>
        <option value="no" ${data.goneOver === 'no' ? 'selected' : ''}>No</option>
        <option value="pending" ${data.goneOver === 'pending' ? 'selected' : ''}>Pending</option>
      </select>
    </td>
    <td><textarea data-field="followUpNotes" onchange="_goalsUnsavedChanges=true">${escapeHtml(data.followUpNotes || '')}</textarea></td>
    <td><button class="btn-delete" onclick="this.closest('tr').remove(); _goalsUnsavedChanges=true;">✕</button></td>
  `;
  return tr;
}

function createTopicRow(data = {}, index) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="date" value="${data.date || ''}" data-field="date" onchange="_goalsUnsavedChanges=true"></td>
    <td><textarea data-field="topic" onchange="_goalsUnsavedChanges=true">${escapeHtml(data.topic || '')}</textarea></td>
    <td><textarea data-field="theirThoughts" onchange="_goalsUnsavedChanges=true">${escapeHtml(data.theirThoughts || '')}</textarea></td>
    <td>
      <select data-field="followUpNeeded" onchange="_goalsUnsavedChanges=true">
        <option value="">Select</option>
        <option value="yes" ${data.followUpNeeded === 'yes' ? 'selected' : ''}>Yes</option>
        <option value="no" ${data.followUpNeeded === 'no' ? 'selected' : ''}>No</option>
      </select>
    </td>
    <td><textarea data-field="notes" onchange="_goalsUnsavedChanges=true">${escapeHtml(data.notes || '')}</textarea></td>
    <td><button class="btn-delete" onclick="this.closest('tr').remove(); _goalsUnsavedChanges=true;">✕</button></td>
  `;
  return tr;
}

function createNoteRow(data = {}, index) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input type="date" value="${data.date || ''}" data-field="date" onchange="_goalsUnsavedChanges=true"></td>
    <td><textarea data-field="question" onchange="_goalsUnsavedChanges=true">${escapeHtml(data.question || '')}</textarea></td>
    <td><textarea data-field="answer" onchange="_goalsUnsavedChanges=true">${escapeHtml(data.answer || '')}</textarea></td>
    <td>
      <select data-field="followUpNeeded" onchange="_goalsUnsavedChanges=true">
        <option value="">Select</option>
        <option value="yes" ${data.followUpNeeded === 'yes' ? 'selected' : ''}>Yes</option>
        <option value="no" ${data.followUpNeeded === 'no' ? 'selected' : ''}>No</option>
      </select>
    </td>
    <td><textarea data-field="notes" onchange="_goalsUnsavedChanges=true">${escapeHtml(data.notes || '')}</textarea></td>
    <td><button class="btn-delete" onclick="this.closest('tr').remove(); _goalsUnsavedChanges=true;">✕</button></td>
  `;
  return tr;
}

// Add row functions
function addMetricsRow() {
  document.getElementById('metricsTableBody').appendChild(createMetricsRow({}, 0));
  _goalsUnsavedChanges = true;
}

function addQaRow() {
  document.getElementById('qaTableBody').appendChild(createQaRow({}, 0));
  _goalsUnsavedChanges = true;
}

function addTopicRow() {
  document.getElementById('topicsTableBody').appendChild(createTopicRow({}, 0));
  _goalsUnsavedChanges = true;
}

function addNoteRow() {
  document.getElementById('notesTableBody').appendChild(createNoteRow({}, 0));
  _goalsUnsavedChanges = true;
}

// Legacy compatibility aliases
function addTaskRow() { openTaskEditor(); }


// ══════════════════════════════════════════════
// SAVE — Updated for new data model
// ══════════════════════════════════════════════

async function saveAgentGoals() {
  if (!_currentGoalsAgent) {
    toast('No agent selected', 'error');
    return;
  }

  try {
    // Collect table data (for table-based tabs)
    const collectTableData = (tableBodyId) => {
      const rows = [];
      document.querySelectorAll(`#${tableBodyId} tr`).forEach(tr => {
        const row = {};
        tr.querySelectorAll('input, select, textarea').forEach(el => {
          if (el.dataset.field) {
            row[el.dataset.field] = el.value;
          }
        });
        if (Object.values(row).some(v => v)) {
          rows.push(row);
        }
      });
      return rows;
    };

    const goals = {
      // B1: New goal model (already in _currentGoalsData.smartGoals)
      smartGoals: _currentGoalsData?.smartGoals || [],
      // C1: Tasks (already in _currentGoalsData.tasks)
      tasks: _currentGoalsData?.tasks || [],
      // D1: CSAT follow-ups
      csatFollowups: _currentGoalsData?.csatFollowups || [],
      // F1: Meeting follow-ups
      meetingFollowups: _currentGoalsData?.meetingFollowups || [],
      // Table-based data
      performanceMetrics: collectTableData('metricsTableBody'),
      qaTickets: collectTableData('qaTableBody'),
      topicsDiscussed: collectTableData('topicsTableBody'),
      oneOnOneNotes: collectTableData('notesTableBody')
    };

    const res = await fetch('./?action=goals/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentName: _currentGoalsAgent,
        goals,
        updatedBy: window._myName || 'Manager'
      })
    });

    const data = await res.json();
    if (data.ok) {
      _goalsUnsavedChanges = false;
      toast('Goals saved successfully!', 'success');

      document.getElementById('goalsAgentMeta').textContent =
        `Last updated: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} by ${window._myName || 'Manager'}`;

      // Update the in-memory data with what was just saved
      _currentGoalsData.performanceMetrics = goals.performanceMetrics;
      _currentGoalsData.qaTickets = goals.qaTickets;
      _currentGoalsData.topicsDiscussed = goals.topicsDiscussed;
      _currentGoalsData.oneOnOneNotes = goals.oneOnOneNotes;

      // Refresh summaries
      renderPerformanceSummary();
      updateOverviewTab();
    } else {
      toast('Failed to save goals: ' + (data.error || 'Unknown error'), 'error');
    }
  } catch (err) {
    console.error('Error saving goals:', err);
    toast('Failed to save goals', 'error');
  }
}


// ══════════════════════════════════════════════
// AGENT VIEW (read-only, for agents)
// Updated to support new data model
// ══════════════════════════════════════════════

async function loadMyGoals() {
  const container = document.getElementById('agentGoalsContent');
  if (!container) return;

  if (!window._myName) {
    container.innerHTML = '<div class="timeline-loading">Please log in to view your goals</div>';
    return;
  }

  container.innerHTML = '<div class="timeline-loading">Loading your goals...</div>';

  try {
    const res = await fetch('./?action=goals/get', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentName: window._myName })
    });

    if (!res.ok) {
      container.innerHTML = '<div class="timeline-loading" style="color: #f87171;">Unable to load goals.</div>';
      return;
    }

    const data = await res.json();
    if (!data.ok) {
      container.innerHTML = '<div class="timeline-loading" style="color: #f87171;">Unable to load goals.</div>';
      return;
    }

    const g = migrateGoalsData(data.goals);

    // Update meta
    const metaEl = document.getElementById('agentGoalsMeta');
    if (metaEl && g.updatedAt) {
      metaEl.textContent = `Last updated: ${new Date(g.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} by ${g.updatedBy || 'Manager'}`;
    }

    let html = '';
    let hasContent = false;

    // ── Tab bar for agent view ──
    html += `<div class="agent-view-tabs" style="display:flex; gap:6px; flex-wrap:wrap; margin-bottom:20px; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
      <button class="agent-view-tab active" onclick="switchAgentViewTab(this, 'agentTabGoals')">🎯 Goals</button>
      <button class="agent-view-tab" onclick="switchAgentViewTab(this, 'agentTabTasks')">📌 Tasks</button>
      <button class="agent-view-tab" onclick="switchAgentViewTab(this, 'agentTabPerf')">📊 Performance</button>
      <button class="agent-view-tab" onclick="switchAgentViewTab(this, 'agentTabQa')">✅ QA & CSAT</button>
      <button class="agent-view-tab" onclick="switchAgentViewTab(this, 'agentTabAttendance')">📅 Attendance</button>
    </div>`;

    // ── GOALS SECTION ──
    const activeGoals = (g.smartGoals || []).filter(goal => goal.status !== 'archived' && (goal.specific || goal.title));
    html += '<div id="agentTabGoals" class="agent-view-pane">';
    if (activeGoals.length > 0) {
      hasContent = true;
      html += '<div class="agent-goals-section"><div class="agent-goals-section-title">🎯 My Goals</div>';
      activeGoals.forEach((goal, i) => {
        const statusLabels = { draft: '📝 Draft', active: '🟢 Active', at_risk: '🟡 At Risk', complete: '✅ Complete' };
        html += `<div class="agent-goal-item">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <strong style="font-size:14px;">${escapeHtml(goal.title || 'Goal #' + (i+1))}</strong>
            <span class="status-pill ${goal.status || 'active'}">${statusLabels[goal.status] || '🟢 Active'}</span>
          </div>
          ${goal.dueDate ? `<div style="font-size:11px; color:var(--text-tertiary); margin-bottom:8px;">📅 Due: ${new Date(goal.dueDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>` : ''}
          ${goal.reviewCadence ? `<div style="font-size:11px; color:var(--text-tertiary); margin-bottom:8px;">🔄 Review: ${goal.reviewCadence}</div>` : ''}
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:10px;">
            ${goal.specific ? `<div><span class="agent-goal-label">Specific</span><div class="agent-goal-value">${escapeHtml(goal.specific)}</div></div>` : ''}
            ${goal.measurable ? `<div><span class="agent-goal-label">Measurable</span><div class="agent-goal-value">${escapeHtml(goal.measurable)}</div></div>` : ''}
            ${goal.attainable ? `<div><span class="agent-goal-label">Attainable</span><div class="agent-goal-value">${escapeHtml(goal.attainable)}</div></div>` : ''}
            ${goal.relevant ? `<div><span class="agent-goal-label">Relevant</span><div class="agent-goal-value">${escapeHtml(goal.relevant)}</div></div>` : ''}
            ${goal.timeBound ? `<div><span class="agent-goal-label">Time Bound</span><div class="agent-goal-value">${escapeHtml(goal.timeBound)}</div></div>` : ''}
          </div>
        </div>`;
      });
      html += '</div>';
    } else {
      html += `<div class="empty-state" style="padding:30px;"><div class="empty-state-icon">🎯</div><div class="empty-state-title">No Goals Set Yet</div><div class="empty-state-text">Your manager will set up your goals during your next 1:1.</div></div>`;
    }
    html += '</div>';

    // ── TASKS SECTION ──
    const visibleTasks = (g.tasks || []).filter(t => t.title || t.task);
    html += '<div id="agentTabTasks" class="agent-view-pane" style="display:none;">';
    if (visibleTasks.length > 0) {
      hasContent = true;
      html += '<div class="agent-goals-section"><div class="agent-goals-section-title">📌 My Tasks</div>';
      visibleTasks.forEach(task => {
        const statusIcons = { done: '✅', completed: '✅', in_progress: '🔄', blocked: '🚫', open: '⏳', not_started: '⏳' };
        const priorityDots = { high: '🔴', medium: '🟡', low: '🟢' };
        const isOverdue = task.dueDate && task.dueDate < new Date().toISOString().split('T')[0] && task.status !== 'done' && task.status !== 'completed';
        html += `<div class="agent-goal-item" style="${isOverdue ? 'border-left: 3px solid #ef4444;' : ''}">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <div style="display:flex; align-items:center; gap:6px;">
              ${task.priority ? `<span>${priorityDots[task.priority] || ''}</span>` : ''}
              <strong style="${task.status === 'done' || task.status === 'completed' ? 'text-decoration:line-through; opacity:0.6;' : ''}">${escapeHtml(task.title || task.task)}</strong>
            </div>
            <span class="status-pill ${task.status || 'open'}">${statusIcons[task.status] || '⏳'} ${(task.status || 'open').replace('_', ' ')}</span>
          </div>
          ${task.dueDate ? `<div style="font-size:11px; color:${isOverdue ? '#ef4444' : 'var(--text-tertiary)'}; font-weight:${isOverdue ? '600' : '400'};">${isOverdue ? '⚠️ Overdue — ' : ''}Due: ${new Date(task.dueDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>` : ''}
          ${task.notes ? `<div style="font-size:12px; margin-top:6px; color:var(--text-secondary);">${escapeHtml(task.notes)}</div>` : ''}
        </div>`;
      });
      html += '</div>';
    } else {
      html += `<div class="empty-state" style="padding:30px;"><div class="empty-state-icon">📌</div><div class="empty-state-title">No Tasks Assigned</div><div class="empty-state-text">Your manager will assign tasks as needed.</div></div>`;
    }
    html += '</div>';

    // ── PERFORMANCE SECTION ──
    html += '<div id="agentTabPerf" class="agent-view-pane" style="display:none;">';
    if (g.performanceMetrics?.length > 0 && g.performanceMetrics.some(m => m.weekStarting)) {
      hasContent = true;

      // Summary band
      const validMetrics = g.performanceMetrics.filter(m => m.weekStarting);
      const avgTickets = validMetrics.length > 0 ? Math.round(validMetrics.reduce((s, m) => s + (parseInt(m.ticketsSolved) || 0), 0) / validMetrics.length) : 0;
      const csatValues = validMetrics.filter(m => m.csat).map(m => parseFloat(m.csat));
      const avgCsat = csatValues.length > 0 ? (csatValues.reduce((s, v) => s + v, 0) / csatValues.length).toFixed(1) : '—';

      html += `<div class="summary-band" style="grid-template-columns: repeat(3, 1fr); margin-bottom:20px;">
        <div class="summary-card"><div class="summary-card-label">Avg Tickets/Week</div><div class="summary-card-value">${avgTickets}</div></div>
        <div class="summary-card"><div class="summary-card-label">Avg CSAT</div><div class="summary-card-value">${avgCsat}%</div></div>
        <div class="summary-card"><div class="summary-card-label">Weeks Tracked</div><div class="summary-card-value">${validMetrics.length}</div></div>
      </div>`;

      html += '<div class="agent-goals-section"><div class="agent-goals-section-title">📊 Weekly Performance</div>';
      html += '<div class="goals-table-wrap"><table class="goals-table"><thead><tr><th>Week</th><th>Tickets</th><th>CSAT</th><th>Wins / Challenges</th><th>Notes</th></tr></thead><tbody>';
      validMetrics.slice().reverse().forEach(m => {
        const csatColor = (parseFloat(m.csat) >= 90) ? '#dcfce7' : (parseFloat(m.csat) >= 70) ? '#fef3c7' : '#fecaca';
        const csatText = (parseFloat(m.csat) >= 90) ? '#166534' : (parseFloat(m.csat) >= 70) ? '#92400e' : '#b91c1c';
        html += `<tr>
          <td>${new Date(m.weekStarting + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
          <td style="font-weight:600;">${m.ticketsSolved || '—'}</td>
          <td>${m.csat ? `<span style="padding:2px 8px; border-radius:4px; background:${csatColor}; color:${csatText}; font-weight:600;">${m.csat}%</span>` : '—'}</td>
          <td style="font-size:12px;">${escapeHtml(m.winsChallenges || '—')}</td>
          <td style="font-size:12px;">${escapeHtml(m.notes || '—')}</td>
        </tr>`;
      });
      html += '</tbody></table></div></div>';
    } else {
      html += `<div class="empty-state" style="padding:30px;"><div class="empty-state-icon">📊</div><div class="empty-state-title">No Performance Data</div><div class="empty-state-text">Performance metrics will appear here once your manager starts tracking.</div></div>`;
    }
    html += '</div>';

    // ── QA & CSAT SECTION ──
    html += '<div id="agentTabQa" class="agent-view-pane" style="display:none;">';
    const qaTickets = g.qaTickets || [];
    const csatFollowups = g.csatFollowups || [];
    
    if (qaTickets.length > 0 && qaTickets.some(t => t.ticketNumber)) {
      hasContent = true;
      html += '<div class="agent-goals-section"><div class="agent-goals-section-title">✅ QA Reviews</div>';
      html += '<div class="goals-table-wrap"><table class="goals-table"><thead><tr><th>Date</th><th>Channel</th><th>Ticket</th><th>Reviewed?</th><th>Notes</th></tr></thead><tbody>';
      qaTickets.filter(t => t.ticketNumber).slice().reverse().forEach(t => {
        const reviewed = t.goneOver === 'yes';
        const num = t.ticketNumber.toString().replace(/[^0-9]/g, '');
        html += `<tr>
          <td>${t.date ? new Date(t.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}</td>
          <td>${escapeHtml(t.channel || '—')}</td>
          <td>${num ? `<a href="${ZENDESK_BASE_URL}${num}" target="_blank" class="ticket-link">#${num}</a>` : escapeHtml(t.ticketNumber)}</td>
          <td><span class="status-pill ${reviewed ? 'complete' : 'pending'}">${reviewed ? '✅ Yes' : '⏳ Pending'}</span></td>
          <td style="font-size:12px;">${escapeHtml(t.notes || '—')}</td>
        </tr>`;
      });
      html += '</tbody></table></div></div>';
    }

    if (csatFollowups.length > 0) {
      hasContent = true;
      const pending = csatFollowups.filter(c => !c.followUpCompleted);
      html += `<div class="agent-goals-section"><div class="agent-goals-section-title">⚠️ Low CSAT Follow-ups ${pending.length > 0 ? `<span style="color:#ef4444; font-size:12px; font-weight:600; margin-left:8px;">(${pending.length} pending)</span>` : '<span style="color:#22c55e; font-size:12px; font-weight:600; margin-left:8px;">All done ✓</span>'}</div>`;
      csatFollowups.forEach((fu, idx) => {
        const ratingBadge = (fu.rating === 'Good')
          ? '<span style="background:#dcfce7; color:#166534; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700;">👍 Good</span>'
          : '<span style="background:#fee2e2; color:#991b1b; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700;">👎 Bad</span>';
        const num = (fu.ticketNumber || '').toString().replace(/[^0-9]/g, '');
        const isDone = !!fu.followUpCompleted;
        const doneDate = fu.followUpCompletedAt ? new Date(fu.followUpCompletedAt + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
        html += `<div class="agent-goal-item" style="border-left:3px solid ${isDone ? '#22c55e' : '#ef4444'}; ${isDone ? 'background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%); border:1px solid #bbf7d0; border-left:3px solid #22c55e;' : ''}">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <div style="display:flex; align-items:center; gap:8px;">
              ${ratingBadge}
              <strong>${num ? `<a href="${ZENDESK_BASE_URL}${num}" target="_blank" class="ticket-link">Ticket #${num}</a>` : 'Ticket ' + escapeHtml(fu.ticketNumber || '—')}</strong>
              <span style="font-size:11px; color:var(--text-tertiary);">· ${escapeHtml(fu.channel || '')}</span>
            </div>
            ${isDone
              ? `<span style="display:inline-flex;align-items:center;gap:4px;padding:4px 12px;border-radius:8px;background:#dcfce7;color:#166534;font-size:12px;font-weight:700;">✅ Completed${doneDate ? ' · '+doneDate : ''}</span>`
              : `<button onclick="agentMarkCsatComplete(${idx})" style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:8px;background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);color:white;border:none;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 2px 6px rgba(34,197,94,0.3);transition:all 0.15s;" onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">☑️ Mark as Completed</button>`
            }
          </div>
          ${fu.coachingTips ? `<div style="font-size:12px; color:var(--text-secondary); margin-bottom:4px; padding:8px 10px; background:${isDone ? 'rgba(255,255,255,0.7)' : 'var(--bg-tertiary)'}; border-radius:8px; border-left:3px solid #f59e0b;">💡 <strong>Coaching:</strong> ${escapeHtml(fu.coachingTips)}</div>` : ''}
          ${fu.notes ? `<div style="font-size:12px; color:var(--text-secondary); margin-bottom:4px; padding:8px 10px; background:${isDone ? 'rgba(255,255,255,0.7)' : 'var(--bg-tertiary)'}; border-radius:8px;">📝 ${escapeHtml(fu.notes)}</div>` : ''}
          ${fu.dateReceived ? `<div style="font-size:11px; color:var(--text-tertiary);">📅 ${new Date(fu.dateReceived + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>` : ''}
        </div>`;
      });
      html += '</div>';
    }

    if (qaTickets.length === 0 && csatFollowups.length === 0) {
      html += `<div class="empty-state" style="padding:30px;"><div class="empty-state-icon">✅</div><div class="empty-state-title">No QA Data</div><div class="empty-state-text">QA reviews and CSAT follow-ups will appear here.</div></div>`;
    }
    html += '</div>';

    // ── ATTENDANCE SECTION ──
    html += '<div id="agentTabAttendance" class="agent-view-pane" style="display:none;">';
    html += `<div id="agentAttendanceContent"><div class="timeline-loading">Loading attendance...</div></div>`;
    html += '</div>';

    container.innerHTML = html;

    // Load attendance data for agent view
    loadAgentAttendanceForAgentView();

  } catch (err) {
    console.error('Error loading my goals:', err);
    container.innerHTML = `
      <div style="text-align:center; padding:40px 20px;">
        <div style="font-size:48px; margin-bottom:16px;">⚠️</div>
        <div style="font-size:16px; font-weight:600; color:var(--text-primary);">Unable to Load Goals</div>
        <div style="font-size:13px; color:var(--text-secondary);">Please check your connection and try again.</div>
      </div>`;
  }
}

// Agent view tab switching (read-only)
function switchAgentViewTab(btn, paneId) {
  const parent = btn.closest('.modal') || btn.closest('#agentGoalsView') || document.getElementById('agentGoalsContent')?.parentElement;
  if (!parent) return;

  parent.querySelectorAll('.agent-view-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');

  parent.querySelectorAll('.agent-view-pane').forEach(p => p.style.display = 'none');
  const target = document.getElementById(paneId);
  if (target) target.style.display = 'block';
}

// Load attendance for agent's own view
async function loadAgentAttendanceForAgentView() {
  const container = document.getElementById('agentAttendanceContent');
  if (!container || !window._myName) return;

  try {
    const res = await fetch('/attendance/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentName: window._myName, days: 90 })
    });

    const data = await res.json();
    if (data.ok && data.summary) {
      const s = data.summary;
      let html = '';

      // Summary cards
      html += `<div class="summary-band" style="grid-template-columns: repeat(3, 1fr); margin-bottom:20px;">
        <div class="summary-card bradford">
          <div class="summary-card-label">Bradford Factor</div>
          <div class="summary-card-value">${s.bradfordFactor}</div>
          <div class="summary-card-status ${s.concernLevel}">${s.concernLevel.charAt(0).toUpperCase() + s.concernLevel.slice(1)}</div>
        </div>
        <div class="summary-card"><div class="summary-card-label">Call Outs</div><div class="summary-card-value">${s.stats.callOuts}</div></div>
        <div class="summary-card"><div class="summary-card-label">PTO Requests</div><div class="summary-card-value">${s.stats.ptoRequests}</div></div>
      </div>`;

      // Events list
      if (s.events && s.events.length > 0) {
        html += '<div class="agent-goals-section"><div class="agent-goals-section-title">📜 Recent Events</div>';
        s.events.slice(0, 10).forEach(e => {
          let icon = '📅', title = '';
          if (e.type === 'timeoff') {
            icon = e.isCallOut ? '🤒' : '🏖️';
            title = e.isCallOut ? 'Call Out / Sick Day' : 'PTO Request';
          } else if (e.type === 'swap_initiated') {
            icon = '🔄'; title = `Swap with ${e.withPerson || 'Unknown'}`;
          } else if (e.type === 'swap_received') {
            icon = '🔄'; title = `Swap from ${e.withPerson || 'Unknown'}`;
          } else if (e.type === 'replaced') {
            icon = '🔁'; title = `Replaced by ${e.newPerson || 'Unknown'}`;
          } else if (e.type === 'replacement_took') {
            icon = '✋'; title = `Covered for ${e.originalPerson || 'Unknown'}`;
          }
          const dateStr = e.date ? new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
          html += `<div style="display:flex; align-items:center; gap:12px; padding:10px; border-bottom:1px solid var(--border-color);">
            <span style="font-size:20px;">${icon}</span>
            <div style="flex:1;"><div style="font-weight:600; font-size:13px;">${title}</div>${e.reason ? `<div style="font-size:11px; color:var(--text-tertiary);">${escapeHtml(e.reason)}</div>` : ''}</div>
            <div style="font-size:11px; color:var(--text-secondary); white-space:nowrap;">${dateStr}</div>
          </div>`;
        });
        html += '</div>';
      } else {
        html += `<div class="empty-state" style="padding:30px;"><div class="empty-state-icon">📅</div><div class="empty-state-title">No Recent Events</div><div class="empty-state-text">Your attendance history will appear here.</div></div>`;
      }

      container.innerHTML = html;
    } else {
      container.innerHTML = '<div class="empty-state" style="padding:30px;"><div class="empty-state-icon">📅</div><div class="empty-state-title">Attendance Data Unavailable</div></div>';
    }
  } catch (err) {
    console.error('Error loading agent attendance:', err);
    container.innerHTML = '<div class="timeline-loading" style="color: #f87171;">Unable to load attendance data.</div>';
  }
}

/* ============================================
   COMPACT SUMMARY BAR INITIALIZATION
   ============================================ */
(function() {
  // Initialize when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCompactBar);
  } else {
    setTimeout(initCompactBar, 300);
  }
  
  function initCompactBar() {
    // Set timezone dropdown to current preference
    const tzSelect = document.getElementById('compactTzSelect');
    if (tzSelect) {
      try {
        const prefs = getUserPrefs();
        tzSelect.value = prefs.timezone || 'PST';
      } catch(e) {}
    }
    
    // Update summary bar periodically - 5 minutes to minimize background activity
    // This only uses cached/local data, no network calls
    setInterval(updateCompactBar, 300000); // 5 minutes
    setTimeout(updateCompactBar, 1000);
    
    // ONE-TIME INITIAL LOADS for agent cards (after auth is ready)
    setTimeout(async () => {
      if (!document.body.classList.contains('agent-mode')) return;
      
      console.log("[CompactBar] Loading initial data for agent cards...");
      
      // 1. Load meeting rotations for "Your Role" card
      try {
        if (!window._meetingRotationsCache || Object.keys(window._meetingRotationsCache).length === 0) {
          const res = await fetch('/meeting-rotation/list');
          const data = await res.json();
          if (data.rotations) {
            window._meetingRotationsCache = {};
            data.rotations.forEach(r => {
              window._meetingRotationsCache[r.date] = r;
            });
            console.log("[CompactBar] Meeting rotations loaded");
          }
        }
      } catch (e) {
        console.warn("[CompactBar] Failed to load meeting rotations:", e);
      }
      
      // 2. Load open shifts for "Open Shifts" card
      if (typeof updateAgentOpenShifts === 'function') {
        updateAgentOpenShifts();
      }
      
      // 3. Update compact bar with fresh data
      updateCompactBar();
      
    }, 2000); // Wait 2 seconds for auth to be ready
    
    // Watch for agent mode changes
    const observer = new MutationObserver(() => {
      if (document.body.classList.contains('agent-mode')) {
        setTimeout(updateCompactBar, 100);
      }
    });
    observer.observe(document.body, { attributes: true });
  }
  
  window.updateCompactBar = function() {
    if (!document.body.classList.contains('agent-mode')) return;
    
    const myName = window._myName || '';
    if (!myName) return;
    
    const allData = window._filteredData || window._data || [];
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentHour = now.getHours() + now.getMinutes() / 60;
    
    // Get my shifts sorted
    const myShifts = allData
      .filter(s => s.person && s.person.toLowerCase().trim() === myName.toLowerCase().trim())
      .sort((a, b) => {
        if (a.date !== b.date) return (a.date || '').localeCompare(b.date || '');
        return (a.start || '').localeCompare(b.start || '');
      });
    
    // Find current shift
    let currentShift = null;
    for (const shift of myShifts) {
      if (shift.date !== today) continue;
      const startH = parseTimeHour(shift.start);
      const endH = parseTimeHour(shift.end);
      if (currentHour >= startH && currentHour < endH) {
        currentShift = shift;
        break;
      }
    }
    
    // Find next shift
    let nextShift = null;
    for (const shift of myShifts) {
      if (shift.date < today) continue;
      if (shift.date === today) {
        const startH = parseTimeHour(shift.start);
        if (startH <= currentHour) continue;
      }
      nextShift = shift;
      break;
    }
    
    // Update NOW card
    const nowValue = document.getElementById('summaryNowValue');
    const nowTeam = document.getElementById('summaryNowTeam');
    if (nowValue) {
      if (currentShift) {
        nowValue.textContent = `${toAmPm(currentShift.start)} - ${toAmPm(currentShift.end)}`;
        if (nowTeam) nowTeam.textContent = currentShift.team || '';
      } else {
        nowValue.textContent = 'Off Shift';
        if (nowTeam) nowTeam.textContent = 'No active shift right now';
      }
    }
    
    // Update NEXT card
    const nextValue = document.getElementById('summaryNextValue');
    const nextDate = document.getElementById('summaryNextDate');
    if (nextValue) {
      if (nextShift) {
        nextValue.textContent = `${toAmPm(nextShift.start)} - ${toAmPm(nextShift.end)}`;
        if (nextDate) {
          const d = new Date(nextShift.date + 'T12:00:00');
          const dateStr = nextShift.date === today ? 'Today' : 
            d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
          nextDate.textContent = `${dateStr} • ${nextShift.team || ''}`;
        }
      } else {
        nextValue.textContent = 'No upcoming shifts';
        if (nextDate) nextDate.textContent = '';
      }
    }
    
    // Update Meeting Role Card (updates the Your Role card with meeting rotation info)
    updateAgentMeetingRole(myName);
    
    // NOTE: Open Shifts Card is loaded ONCE on init, not on every interval
    // This prevents excessive Firestore reads
    // updateAgentOpenShifts(); // DISABLED from interval - see initCompactBar for initial load
  };
  
  // Check meeting rotations for agent's role
  async function updateAgentMeetingRole(myName) {
    // Update the Your Role card (summaryRoleCard) with meeting role info
    const roleCard = document.getElementById('summaryRoleCard');
    const roleValue = document.getElementById('summaryRoleValue');
    const roleDate = document.getElementById('summaryRoleDate');
    
    if (!roleCard || !myName) return;
    
    try {
      // Check for upcoming meetings in the next 7 days
      const rotations = window._meetingRotationsCache || {};
      const myNameLower = myName.toLowerCase().trim();
      let foundRole = null;
      let foundDate = null;
      let roleIcon = '🎯';
      
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        const dateKey = checkDate.toISOString().split('T')[0];
        const meeting = rotations[dateKey];
        
        if (!meeting) continue;
        
        if ((meeting.captain || '').toLowerCase().trim() === myNameLower) {
          foundRole = 'Captain';
          foundDate = dateKey;
          roleIcon = '👤';
          break;
        } else if ((meeting.backup1 || '').toLowerCase().trim() === myNameLower) {
          foundRole = 'Backup #1';
          foundDate = dateKey;
          roleIcon = '🔄';
          break;
        } else if ((meeting.backup2 || '').toLowerCase().trim() === myNameLower) {
          foundRole = 'Backup #2';
          foundDate = dateKey;
          roleIcon = '🔄';
          break;
        } else if ((meeting.lcAgents || []).map(a => a.toLowerCase().trim()).includes(myNameLower)) {
          foundRole = 'LC Agent';
          foundDate = dateKey;
          roleIcon = '💬';
          break;
        }
      }
      
      if (foundRole && foundDate) {
        roleCard.style.display = 'flex';
        // Update the icon
        const iconEl = roleCard.querySelector('.summary-icon');
        if (iconEl) iconEl.textContent = roleIcon;
        
        if (roleValue) roleValue.textContent = foundRole;
        if (roleDate) {
          const d = new Date(foundDate + 'T12:00:00');
          roleDate.textContent = `Thursday Meeting • ${d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })}`;
        }
      } else {
        roleCard.style.display = 'none';
      }
    } catch (e) {
      console.error('Error updating meeting role:', e);
      roleCard.style.display = 'none';
    }
  }
  
  // Check for open shifts
  async function updateAgentOpenShifts() {
    const openShiftsCard = document.getElementById('summaryOpenShiftsCard');
    const openShiftsCount = document.getElementById('summaryOpenShiftsCount');
    
    if (!openShiftsCard) return;
    
    try {
      const res = await fetch('/open-shifts');
      const data = await res.json();
      
      if (data.ok && data.openShifts && data.openShifts.length > 0) {
        openShiftsCard.style.display = 'flex';
        openShiftsCount.textContent = `${data.openShifts.length} Available`;
      } else {
        openShiftsCard.style.display = 'none';
      }
    } catch (e) {
      openShiftsCard.style.display = 'none';
    }
  }
  
  function parseTimeHour(timeStr) {
    if (!timeStr) return 0;
    const parts = String(timeStr).split(':');
    return parseInt(parts[0], 10) + (parseInt(parts[1], 10) || 0) / 60;
  }
  
  // ══════════════════════════════════════════════
  // AGENT GOALS PANEL
  // ══════════════════════════════════════════════
  
  window.toggleAgentGoalsPanel = function() {
    const panel = document.getElementById('agentGoalsPanel');
    if (!panel) return;
    
    if (panel.classList.contains('active')) {
      panel.classList.remove('active');
    } else {
      panel.classList.add('active');
      loadAgentGoalsData();
    }
  };
  
  window.switchAgentGoalsTab = function(tab) {
    // Update tab buttons
    document.querySelectorAll('.agent-goals-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    // Show/hide sections
    document.querySelectorAll('.agent-goals-section').forEach(section => {
      section.classList.remove('active');
    });
    
    const sectionMap = {
      'overview': 'agentGoalsOverview',
      'goals': 'agentGoalsGoals',
      'metrics': 'agentGoalsMetrics',
      'tasks': 'agentGoalsTasks'
    };
    
    const activeSection = document.getElementById(sectionMap[tab]);
    if (activeSection) activeSection.classList.add('active');
  };
  
  async function loadAgentGoalsData() {
    const myName = window._myName;
    if (!myName) return;
    
    try {
      // Load goals data for this agent using POST endpoint
      const res = await fetch('./?action=goals/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentName: myName })
      });
      
      // Check response before parsing
      if (!res.ok) {
        console.warn('Goals endpoint returned status:', res.status);
        return;
      }
      
      const text = await res.text();
      if (!text || text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
        console.warn('Goals endpoint returned HTML instead of JSON');
        return;
      }
      
      const data = JSON.parse(text);
      
      if (data.ok && data.goals) {
        const goals = data.goals;
        
        // Overview Stats
        const activeGoals = (goals.smartGoals || []).filter(g => g.status === 'active' || g.status === 'at_risk');
        document.getElementById('agentActiveGoals').textContent = activeGoals.length;
        
        const today = new Date().toISOString().split('T')[0];
        const twoWeeks = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
        const dueSoon = activeGoals.filter(g => g.dueDate && g.dueDate <= twoWeeks);
        document.getElementById('agentGoalsDueSub').textContent = dueSoon.length > 0 
          ? `${dueSoon.length} due within 2 weeks` 
          : 'No goals due soon';
        
        // Tasks
        const tasks = goals.tasks || [];
        const openTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'completed');
        const overdueTasks = openTasks.filter(t => t.dueDate && t.dueDate < today);
        document.getElementById('agentOpenTasks').textContent = openTasks.length;
        document.getElementById('agentTasksSub').textContent = overdueTasks.length > 0 
          ? `${overdueTasks.length} overdue` 
          : 'None overdue';
        
        // Metrics weeks
        const metrics = goals.performanceMetrics || [];
        document.getElementById('agentWeeksTracked').textContent = metrics.length;
        
        // Render Goals List
        renderAgentGoalsList(goals.smartGoals || []);
        
        // Render Metrics Table
        renderAgentMetricsTable(metrics);
        
        // Render Bad CSAT Follow-ups
        renderAgentBadCsatList(goals.csatFollowups || []);
        
        // Render Tasks List
        renderAgentTasksList(tasks);
        
        // Build action items
        buildAgentActionItems(goals, overdueTasks, dueSoon);
      }
      
      // Load open tickets count
      const metricsRes = await fetch('./?action=roster/get');
      const metricsData = await metricsRes.json();
      if (metricsData.ok && metricsData.members) {
        const me = metricsData.members.find(m => m.name === myName);
        if (me && me.opens !== undefined) {
          document.getElementById('agentOpenTickets').textContent = me.opens || 0;
        }
      }
      
    } catch (e) {
      console.error('Error loading agent goals:', e);
    }
  }
  
  function renderAgentGoalsList(goals) {
    const container = document.getElementById('agentGoalsList');
    if (!container) return;
    
    if (!goals || goals.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
          <div style="font-size: 48px; margin-bottom: 12px;">🎯</div>
          <div style="font-size: 14px;">No active goals yet.</div>
          <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 4px;">Check with your manager about your development goals.</div>
        </div>`;
      return;
    }
    
    container.innerHTML = goals.map(goal => {
      const progress = goal.progress || 0;
      const statusColors = {
        'active': { bg: '#dcfce7', color: '#16a34a', bar: '#22c55e' },
        'at_risk': { bg: '#fef3c7', color: '#d97706', bar: '#f59e0b' },
        'completed': { bg: '#dbeafe', color: '#2563eb', bar: '#3b82f6' },
        'on_hold': { bg: '#f1f5f9', color: '#64748b', bar: '#94a3b8' }
      };
      const colors = statusColors[goal.status] || statusColors['active'];
      const dueDate = goal.dueDate ? new Date(goal.dueDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No due date';
      
      return `
        <div class="agent-goal-card">
          <div class="agent-goal-header">
            <div class="agent-goal-title">${escapeHtml(goal.title || 'Untitled Goal')}</div>
            <span class="agent-goal-status ${goal.status}" style="background: ${colors.bg}; color: ${colors.color};">
              ${goal.status === 'at_risk' ? 'At Risk' : (goal.status || 'active').charAt(0).toUpperCase() + (goal.status || 'active').slice(1)}
            </span>
          </div>
          ${goal.specific ? `<div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">${escapeHtml(goal.specific)}</div>` : ''}
          <div class="agent-goal-progress">
            <div class="agent-goal-progress-bar" style="width: ${progress}%; background: ${colors.bar};"></div>
          </div>
          <div class="agent-goal-meta">
            <span>📅 Due: ${dueDate}</span>
            <span>📊 ${progress}% complete</span>
          </div>
        </div>
      `;
    }).join('');
  }
  
  function renderAgentMetricsTable(metrics) {
    const tbody = document.getElementById('agentMetricsTableBody');
    if (!tbody) return;
    
    if (!metrics || metrics.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="padding: 20px; text-align: center; color: var(--text-tertiary);">No metrics data available</td></tr>';
      return;
    }
    
    // Sort by week date descending
    const sorted = [...metrics].sort((a, b) => (b.weekStartDate || '').localeCompare(a.weekStartDate || ''));
    
    tbody.innerHTML = sorted.slice(0, 8).map(m => {
      const weekDate = m.weekStartDate ? new Date(m.weekStartDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '--';
      return `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid var(--border-color);">${weekDate}</td>
          <td style="padding: 10px; border-bottom: 1px solid var(--border-color); text-align: center;">${m.ticketsSolved || '--'}</td>
          <td style="padding: 10px; border-bottom: 1px solid var(--border-color); text-align: center;">${m.avgHandleTime || '--'}</td>
          <td style="padding: 10px; border-bottom: 1px solid var(--border-color); text-align: center;">${m.csat ? m.csat + '%' : '--'}</td>
          <td style="padding: 10px; border-bottom: 1px solid var(--border-color); text-align: center;">${m.lcCsat ? m.lcCsat + '%' : '--'}</td>
        </tr>
      `;
    }).join('');
  }
  
  function renderAgentBadCsatList(csatFollowups) {
    const container = document.getElementById('agentBadCsatList');
    const countEl = document.getElementById('agentBadCsatCount');
    if (!container) return;
    
    // Filter to show pending (not completed) follow-ups
    const pending = (csatFollowups || []).filter(c => !c.followUpCompleted);
    
    if (countEl) {
      countEl.textContent = `${csatFollowups.length} total, ${pending.length} pending`;
    }
    
    if (!csatFollowups || csatFollowups.length === 0) {
      container.innerHTML = `
        <div style="padding: 20px; text-align: center; color: var(--text-tertiary);">
          <div style="font-size: 32px; margin-bottom: 8px;">✨</div>
          <div style="font-size: 13px;">No bad CSAT follow-ups</div>
          <div style="font-size: 12px; margin-top: 4px;">Keep up the great work!</div>
        </div>`;
      return;
    }
    
    // Sort by date (most recent first), then by completion status (pending first)
    const sorted = [...csatFollowups].sort((a, b) => {
      // Pending items first
      if (!a.followUpCompleted && b.followUpCompleted) return -1;
      if (a.followUpCompleted && !b.followUpCompleted) return 1;
      // Then by date
      return (b.ticketDate || b.createdAt || '').localeCompare(a.ticketDate || a.createdAt || '');
    });
    
    container.innerHTML = sorted.map((csat, sortedIdx) => {
      const isPending = !csat.followUpCompleted;
      const ticketDate = (csat.ticketDate || csat.dateReceived) ? new Date((csat.ticketDate || csat.dateReceived) + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '--';
      const ratingBadge = (csat.rating === 'Good')
        ? '<span style="background:#dcfce7; color:#166534; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700;">👍 Good</span>'
        : '<span style="background:#fee2e2; color:#991b1b; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:700;">👎 Bad</span>';
      const doneDate = csat.followUpCompletedAt ? new Date(csat.followUpCompletedAt + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      const origIdx = csatFollowups.indexOf(csat);
      
      return `
        <div style="
          padding: 14px;
          background: ${isPending ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' : 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'};
          border: 1px solid ${isPending ? '#fca5a5' : '#bbf7d0'};
          border-radius: 10px;
          margin-bottom: 10px;
        ">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
                <span style="font-size: 16px;">${isPending ? '⚠️' : '✅'}</span>
                <span style="font-weight: 700; font-size: 13px; color: ${isPending ? '#dc2626' : '#166534'};">
                  Ticket #${csat.ticketId || csat.ticketNumber || 'Unknown'}
                </span>
                ${ratingBadge}
              </div>
              <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">
                📅 ${ticketDate} · ${escapeHtml(csat.channel || '')}
              </div>
              ${csat.coachingTips ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 6px; padding: 8px 10px; background: rgba(255,255,255,0.7); border-radius: 6px; border-left: 3px solid #f59e0b;">💡 <strong>Coaching:</strong> ${escapeHtml(csat.coachingTips)}</div>` : ''}
              ${csat.notes ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 6px; padding: 8px; background: rgba(255,255,255,0.7); border-radius: 6px;">📝 ${escapeHtml(csat.notes)}</div>` : ''}
              ${csat.reason ? `<div style="font-size: 12px; color: var(--text-tertiary); margin-top: 4px;">💬 ${escapeHtml(csat.reason)}</div>` : ''}
              ${csat.followUpNotes ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 6px; padding: 8px; background: rgba(255,255,255,0.7); border-radius: 6px;">📝 ${escapeHtml(csat.followUpNotes)}</div>` : ''}
            </div>
          </div>
          <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
            ${isPending
              ? `<button onclick="agentMarkCsatComplete(${origIdx})" style="display:inline-flex;align-items:center;gap:6px;padding:8px 16px;border-radius:8px;background:linear-gradient(135deg,#22c55e 0%,#16a34a 100%);color:white;border:none;font-size:12px;font-weight:600;cursor:pointer;box-shadow:0 2px 6px rgba(34,197,94,0.3);">☑️ Mark as Completed</button>`
              : `<span style="display:inline-flex;align-items:center;gap:4px;padding:6px 14px;border-radius:8px;background:#dcfce7;color:#166534;font-size:12px;font-weight:700;">✅ Completed${doneDate ? ' · '+doneDate : ''}</span>`
            }
          </div>
        </div>
      `;
    }).join('');
  }
  
  function renderAgentTasksList(tasks) {
    const container = document.getElementById('agentTasksList');
    if (!container) return;
    
    const openTasks = (tasks || []).filter(t => t.status !== 'done' && t.status !== 'completed');
    
    if (openTasks.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
          <div style="font-size: 48px; margin-bottom: 12px;">📝</div>
          <div style="font-size: 14px;">No open tasks!</div>
          <div style="font-size: 12px; color: var(--text-tertiary); margin-top: 4px;">You're all caught up.</div>
        </div>`;
      return;
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    container.innerHTML = openTasks.map(task => {
      const isOverdue = task.dueDate && task.dueDate < today;
      const dueDate = task.dueDate ? new Date(task.dueDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No due date';
      const priorityColors = {
        'high': '#dc2626',
        'medium': '#f59e0b',
        'low': '#22c55e'
      };
      
      return `
        <div class="agent-goal-card" style="${isOverdue ? 'border-color: #dc2626; background: rgba(220, 38, 38, 0.05);' : ''}">
          <div class="agent-goal-header">
            <div class="agent-goal-title">${escapeHtml(task.title || 'Untitled Task')}</div>
            <span style="padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; background: ${priorityColors[task.priority] || '#64748b'}20; color: ${priorityColors[task.priority] || '#64748b'};">
              ${(task.priority || 'normal').toUpperCase()}
            </span>
          </div>
          ${task.notes ? `<div style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">${escapeHtml(task.notes)}</div>` : ''}
          <div class="agent-goal-meta">
            <span style="${isOverdue ? 'color: #dc2626; font-weight: 600;' : ''}">${isOverdue ? '⚠️ OVERDUE: ' : '📅 Due: '}${dueDate}</span>
            <span>Status: ${(task.status || 'pending').replace('_', ' ')}</span>
          </div>
        </div>
      `;
    }).join('');
  }
  
  function buildAgentActionItems(goals, overdueTasks, dueSoonGoals) {
    const container = document.getElementById('agentActionItems');
    if (!container) return;
    
    let html = '';
    
    if (overdueTasks && overdueTasks.length > 0) {
      html += `
        <div onclick="switchAgentGoalsTab('tasks')" style="padding: 12px; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border: 1px solid #fca5a5; border-radius: 8px; display: flex; align-items: center; gap: 10px; cursor: pointer; margin-bottom: 8px;">
          <span style="font-size: 18px;">🔴</span>
          <div style="flex: 1;">
            <div style="font-size: 13px; font-weight: 600; color: #dc2626;">${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''} need attention</div>
          </div>
          <span style="color: #dc2626; font-size: 12px;">View →</span>
        </div>
      `;
    }
    
    if (dueSoonGoals && dueSoonGoals.length > 0) {
      html += `
        <div onclick="switchAgentGoalsTab('goals')" style="padding: 12px; background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border: 1px solid #fcd34d; border-radius: 8px; display: flex; align-items: center; gap: 10px; cursor: pointer; margin-bottom: 8px;">
          <span style="font-size: 18px;">🎯</span>
          <div style="flex: 1;">
            <div style="font-size: 13px; font-weight: 600; color: #d97706;">${dueSoonGoals.length} goal${dueSoonGoals.length > 1 ? 's' : ''} due within 2 weeks</div>
          </div>
          <span style="color: #d97706; font-size: 12px;">View →</span>
        </div>
      `;
    }
    
    if (!html) {
      html = `
        <div style="padding: 12px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 1px solid #86efac; border-radius: 8px; display: flex; align-items: center; gap: 10px; color: #16a34a; font-size: 13px;">
          <span>✨</span> All caught up! No urgent items.
        </div>
      `;
    }
    
    container.innerHTML = html;
  }
  
  // ══════════════════════════════════════════════
  // MEETING ROTATION ACKNOWLEDGMENT
  // ══════════════════════════════════════════════
  
  window.checkMeetingRotationAcknowledgment = async function() {
    const myName = window._myName;
    if (!myName || window._isManager) return;
    
    try {
      const rotations = window._meetingRotationsCache || {};
      const myNameLower = myName.toLowerCase().trim();
      let foundRole = null;
      let foundDate = null;
      let meetingTime = null;
      
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        const dateKey = checkDate.toISOString().split('T')[0];
        const meeting = rotations[dateKey];
        
        if (!meeting) continue;
        
        if ((meeting.captain || '').toLowerCase().trim() === myNameLower) {
          foundRole = 'Captain';
          foundDate = dateKey;
          meetingTime = meeting.time || '12:00 PM - 1:15 PM PST';
          break;
        } else if ((meeting.backup1 || '').toLowerCase().trim() === myNameLower) {
          foundRole = 'Backup 1';
          foundDate = dateKey;
          meetingTime = meeting.time || '12:00 PM - 1:15 PM PST';
          break;
        } else if ((meeting.backup2 || '').toLowerCase().trim() === myNameLower) {
          foundRole = 'Backup 2';
          foundDate = dateKey;
          meetingTime = meeting.time || '12:00 PM - 1:15 PM PST';
          break;
        } else if ((meeting.lcAgents || []).map(a => a.toLowerCase().trim()).includes(myNameLower)) {
          foundRole = 'LC Agent';
          foundDate = dateKey;
          meetingTime = meeting.time || '12:00 PM - 1:15 PM PST';
          break;
        }
      }
      
      if (foundRole && foundDate) {
        // Check if already acknowledged
        const ackKey = `meeting_ack_${myName}_${foundDate}`;
        const acknowledged = localStorage.getItem(ackKey);
        
        if (!acknowledged) {
          showMeetingAcknowledgmentModal(foundRole, foundDate, meetingTime);
        }
      }
    } catch (e) {
      console.error('Error checking meeting acknowledgment:', e);
    }
  };
  
  function showMeetingAcknowledgmentModal(role, date, time) {
    const modal = document.getElementById('meetingRotationAckModal');
    const details = document.getElementById('meetingAckDetails');
    const message = document.getElementById('meetingAckMessage');
    
    if (!modal || !details) return;
    
    const dateObj = new Date(date + 'T12:00:00');
    const dateStr = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    
    message.innerHTML = `You have been assigned to the <strong>Thursday Meeting Rotation</strong> with an important role.`;
    
    const roleIcons = {
      'Captain': '👤',
      'Backup 1': '🔄',
      'Backup 2': '🔄',
      'LC Agent': '💬'
    };
    
    const roleDescriptions = {
      'Captain': 'You will be leading the meeting and facilitating discussion.',
      'Backup 1': 'You are the primary backup if the Captain is unavailable.',
      'Backup 2': 'You are the secondary backup for this meeting.',
      'LC Agent': 'You will be participating in the Live Chat portion of the meeting.'
    };
    
    details.innerHTML = `
      <div style="text-align: center;">
        <div style="font-size: 32px; margin-bottom: 8px;">${roleIcons[role] || '📅'}</div>
        <div style="font-size: 18px; font-weight: 800; color: #92400e; margin-bottom: 4px;">${role}</div>
        <div style="font-size: 14px; color: #78350f; margin-bottom: 12px;">${dateStr}</div>
        <div style="font-size: 13px; color: #92400e; background: rgba(255,255,255,0.5); padding: 8px 12px; border-radius: 8px; margin-bottom: 8px;">
          🕐 ${time}
        </div>
        <div style="font-size: 12px; color: #78350f; font-style: italic;">
          ${roleDescriptions[role] || 'Please be prepared for your role.'}
        </div>
      </div>
    `;
    
    // Store the date for acknowledgment
    modal.dataset.ackDate = date;
    modal.style.display = 'flex';
  }
  
  window.acknowledgeMeetingRotation = function() {
    const modal = document.getElementById('meetingRotationAckModal');
    if (!modal) return;
    
    const date = modal.dataset.ackDate;
    const myName = window._myName;
    
    if (date && myName) {
      const ackKey = `meeting_ack_${myName}_${date}`;
      localStorage.setItem(ackKey, new Date().toISOString());
    }
    
    modal.style.display = 'none';
    
    // Show confirmation toast
    if (typeof toast === 'function') {
      toast('Meeting rotation acknowledged! ✓', 'success');
    }
  };
  
  // Call check on schedule load (delay to ensure rotations are loaded)
  setTimeout(() => {
    if (window._meetingRotationsCache && Object.keys(window._meetingRotationsCache).length > 0) {
      checkMeetingRotationAcknowledgment();
    }
  }, 2000);
  
})();