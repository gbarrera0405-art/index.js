// [SECTION 9] COVERAGE DASHBOARD
// ============================================
function renderCoverageDashboard() {
  const dashboard = document.getElementById("coverageDashboard");
  const panel = document.getElementById("covPanel");
  const badge = document.getElementById("covBadge");
  const badgeText = document.getElementById("covBadgeText");
  const subtitle = document.getElementById("covSubtitle");
  const content = document.getElementById("covContent");

  // Coverage dashboard only for managers
  if (!dashboard || !window._isManager) {
    if (dashboard) dashboard.style.display = "none";
    return;
  }

  dashboard.style.display = "block";
  const todayKey = pstISODate();

  // Shifts today (exclude OFF)
  const todayShifts = _filteredData.filter(s => {
    const k = s.dayKey || s.dateISO || dayKeyPST(s.date);
    return k === todayKey && !String(s.notes || "").toUpperCase().includes("[OFF]");
  });

  // Time blocks
  const blocks = [
    { label: "6a-8a", start: 6, end: 8 },
    { label: "8a-10a", start: 8, end: 10 },
    { label: "10a-12p", start: 10, end: 12 },
    { label: "12p-2p", start: 12, end: 14 },
    { label: "2p-4p", start: 14, end: 16 },
    { label: "4p-6p", start: 16, end: 18 },
    { label: "6p-8p", start: 18, end: 20 }
  ];

  const nowPST = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
  const currentHour = nowPST.getHours();

  // Count active shifts
  const activeNow = todayShifts.filter(s => {
    const startH = parseTimeDecimal(s.start);
    const endH = parseTimeDecimal(s.end);
    return startH <= currentHour && endH > currentHour;
  }).length;

  const coversBlock = (shift, blockStart, blockEnd) => {
    if (!shift.start || !shift.end) return false;
    const s = parseTimeDecimal(shift.start);
    const e = parseTimeDecimal(shift.end);
    return s <= blockStart && e >= blockEnd;
  };

  // If no rules, show empty state
  if (!_staffingRules || _staffingRules.length === 0) {
    badge.className = "cov-badge warn";
    badgeText.textContent = "No Rules";
    subtitle.textContent = "Add staffing rules in Admin Tools";
    content.innerHTML = `
      <div class="cov-empty">
        <div class="cov-empty-icon">📋</div>
        <div class="cov-empty-title">No Staffing Rules</div>
        <div class="cov-empty-desc">Add staffing rules in Admin Tools to see coverage analysis</div>
      </div>`;
    return;
  }

  const todayDOW = new Date().toLocaleDateString("en-US", { weekday: "short", timeZone: PST_TZ });
  const isWeekday = ["Mon", "Tue", "Wed", "Thu", "Fri"].includes(todayDOW);
  const isWeekend = ["Sat", "Sun"].includes(todayDOW);

  let totalGaps = 0;
  const teamsWithGaps = [];

  _staffingRules.forEach(rule => {
    const dayMatch =
      rule.day === "All" ||
      rule.day === todayDOW ||
      (rule.day === "Weekday" && isWeekday) ||
      (rule.day === "Weekend" && isWeekend);

    if (!dayMatch) return;

    const min = parseInt(rule.min) || 0;
    const channel = rule.team;
    const config = getChannelConfig(channel);

    let openHour, closeHour;
    if (rule.startHour !== undefined && rule.endHour !== undefined && rule.timeBlock !== "all") {
      openHour = parseInt(rule.startHour) || 0;
      closeHour = parseInt(rule.endHour) || 24;
    } else {
      [openHour, closeHour] = config.hours || [8, 17];
    }

    const gaps = [];

    blocks.forEach(blk => {
      if (blk.end <= currentHour) return;
      if (blk.start < openHour || blk.end > closeHour) return;

      const count = todayShifts.filter(s =>
        s.team === channel && coversBlock(s, blk.start, blk.end)
      ).length;

      if (count < min) {
        gaps.push({ label: blk.label, count, min });
        totalGaps++;
      }
    });

    if (gaps.length > 0) {
      teamsWithGaps.push({
        channel,
        abbrev: config.abbrev || channel.substring(0, 3).toUpperCase(),
        color: config.color,
        textColor: config.text,
        min,
        gaps
      });
    }
  });

  // Update badge and subtitle
  if (totalGaps > 0) {
    badge.className = "cov-badge alert";
    badgeText.textContent = totalGaps + " Gap" + (totalGaps === 1 ? "" : "s");
    subtitle.textContent = totalGaps + " staffing gap" + (totalGaps === 1 ? "" : "s") + " detected";
  } else if (currentHour >= 20) {
    badge.className = "cov-badge ok";
    badgeText.textContent = "Day Complete";
    subtitle.textContent = "All shifts completed successfully";
  } else {
    badge.className = "cov-badge ok";
    badgeText.textContent = "All Good";
    subtitle.textContent = "All channels fully staffed";
  }

  // Build content
  let html = '';

  // Stats row
  html += `
    <div class="cov-stats">
      <div class="cov-stat">
        <div class="cov-stat-num">${todayShifts.length}</div>
        <div class="cov-stat-label">Total Shifts</div>
      </div>
      <div class="cov-stat">
        <div class="cov-stat-num">${activeNow}</div>
        <div class="cov-stat-label">Active Now</div>
      </div>
      <div class="cov-stat ${totalGaps > 0 ? 'gap-stat' : ''}">
        <div class="cov-stat-num">${totalGaps > 0 ? totalGaps : '✓'}</div>
        <div class="cov-stat-label">${totalGaps > 0 ? 'Coverage Gaps' : 'Fully Staffed'}</div>
      </div>
    </div>`;

  // Show gaps or all-good message
  if (teamsWithGaps.length === 0) {
    html += `
      <div class="cov-all-good">
        <div class="cov-all-good-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div class="cov-all-good-title">All Channels Fully Staffed</div>
        <div class="cov-all-good-desc">No coverage gaps detected for remaining time blocks</div>
      </div>`;
  } else {
    html += `
      <div class="cov-gaps-section">
        <div class="cov-gaps-header">
          <span class="cov-gaps-title">Gaps Requiring Coverage</span>
          <span class="cov-gaps-hint">Click a shift to reassign</span>
        </div>
        <div class="cov-gaps-list">`;

    teamsWithGaps.forEach(team => {
      const shifts = todayShifts
        .filter(s => s.team === team.channel && !String(s.notes || "").toUpperCase().includes("[OFF]"))
        .sort((a, b) => {
          const pa = getShiftRolePriority(a);
          const pb = getShiftRolePriority(b);
          if (pa !== pb) return pa - pb;
          return parseTimeDecimal(a.start) - parseTimeDecimal(b.start);
        });

      const timePills = team.gaps.map(g => 
        `<span class="cov-time-pill">${escapeHtml(g.label)} <span class="cov-time-count">${g.count}/${g.min}</span></span>`
      ).join("");

      const shiftButtons = shifts.length ? shifts.map(s => {
        const dayKey = s.dateISO || s.dayKey || dayKeyPST(s.date) || s.date;
        const item = {
          ...s,
          dateISO: dayKey,
          dateLabel: s.dateLabel || displayDayLabel(dayKey),
          startLabel: s.startLabel || toAmPm(s.start) || s.start || "",
          endLabel: s.endLabel || toAmPm(s.end) || s.end || ""
        };
        return `<button type="button" class="cov-shift-btn" onclick='openReplaceModal(${JSON.stringify(item).replace(/</g,"\\u003c")})'>
          <span class="cov-shift-time">${escapeHtml(item.startLabel)} - ${escapeHtml(item.endLabel)}</span>
          <span class="cov-shift-person">${escapeHtml(item.person || "Unassigned")}</span>
        </button>`;
      }).join("") : `<div style="padding:8px;color:var(--text-secondary);font-size:12px;">No shifts scheduled</div>`;

      html += `
        <div class="cov-gap-card">
          <div class="cov-gap-head">
            <div class="cov-gap-team">
              <span class="cov-gap-badge" style="background:${team.color};color:${team.textColor};">${escapeHtml(team.abbrev)}</span>
              <span class="cov-gap-name">${escapeHtml(team.channel)}</span>
            </div>
            <span class="cov-gap-info">${team.gaps.length} gap${team.gaps.length === 1 ? '' : 's'}</span>
          </div>
          <div class="cov-gap-times">${timePills}</div>
          <div class="cov-gap-shifts">${shiftButtons}</div>
        </div>`;
    });

    html += `</div></div>`;
  }

  content.innerHTML = html;
  
  // Also check for open shifts
  updateCoverageOpenShifts();
}

// Toggle coverage dashboard expansion
function toggleCoverageDashboard() {
  const panel = document.getElementById("covPanel");
  if (panel) panel.classList.toggle("expanded");
}

// Legacy compatibility
function toggleCoverage() {
  toggleCoverageDashboard();
}

function normalizeChannelName(name) {
  if (!name) return 'other';
  const n = name.toLowerCase().replace(/[\s\-_\/]+/g, '');
  
  if (n.includes('livechat') || n === 'lc') return 'livechat';
  if (n.includes('phone') || n === 'ph') return 'phone';
  if (n.includes('email') || n.includes('floater') || n === 'float') return 'emailfloater';
  if (n.includes('social') || n === 'ss' || n === 'soc') return 'socials';
  if (n.includes('dispute') || n === 'dis') return 'disputes';
  if (n.includes('md') || n.includes('medical')) return 'mdsupport';
  if (n.includes('project') || n === 'proj') return 'projects';
  if (n.includes('lunch')) return 'lunch';
  if (n.includes('1:1') || n.includes('11meeting')) return '1:1meetings';
  if (n.includes('meeting') || n === 'mtg') return 'meeting';
  if (n.includes('custom')) return 'custom';
  if (n.includes('defcon')) return 'defcon';
  
  return n;
}
async function logEndOfDaySummary() {
  const result = await Swal.fire({
    title: 'Log End-of-Day Report?',
    text: "This will analyze today's staffing and save a summary to the Audit Log.",
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes, Save Log',
    confirmButtonColor: '#1e293b'
  });
  if (!result.isConfirmed) return;
  // 1. Setup Data
  const todayKey = pstISODate();
  const todayShifts = _allData.filter(s => 
    (s.dateISO === todayKey || dayKeyPST(s.date) === todayKey) && 
    !(s.notes || '').includes('[OFF]')
  );
  const blocks = [
    { label: "6a-8a", start: 6, end: 8 },
    { label: "8a-10a", start: 8, end: 10 },
    { label: "10a-12p", start: 10, end: 12 },
    { label: "12p-2p", start: 12, end: 14 },
    { label: "2p-4p", start: 14, end: 16 },
    { label: "4p-6p", start: 16, end: 18 },
    { label: "6p-8p", start: 18, end: 20 }
  ];
  let report = [];
  
  if (!_staffingRules || _staffingRules.length === 0) {
    return toast("No staffing rules to check against", "warning");
  }
  const todayDOW = new Date().toLocaleDateString('en-US', { weekday: 'short' });
  const isWeekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(todayDOW);
  const isWeekend = ['Sat', 'Sun'].includes(todayDOW);
  
  _staffingRules.forEach(rule => {
    // Check if rule applies to today
    const dayMatch = rule.day === 'All' || 
                     rule.day === todayDOW ||
                     (rule.day === 'Weekday' && isWeekday) ||
                     (rule.day === 'Weekend' && isWeekend);
    if (!dayMatch) return;
    const channel = rule.team;
    const min = parseInt(rule.min) || 0;
    
    // Use rule's time block hours if specified, otherwise use config hours
    const config = getChannelConfig(channel);
    let openHour, closeHour;
    if (rule.startHour !== undefined && rule.endHour !== undefined && rule.timeBlock !== 'all') {
      openHour = parseInt(rule.startHour) || 0;
      closeHour = parseInt(rule.endHour) || 24;
    } else {
      [openHour, closeHour] = config.hours || [8, 17];
    }
    const teamGaps = [];
    blocks.forEach(blk => {
      // Skip this block if it's outside the rule's time range
      if (blk.start < openHour || blk.end > closeHour) return;
      const count = todayShifts.filter(s => {
        if (s.team !== channel) return false;
        if (!s.start || !s.end) return false;
        
        const start = parseTimeDecimal(s.start);
        const end = parseTimeDecimal(s.end);
        
        // Strict Check: Shift must cover this block
        return start <= blk.start && end >= blk.end;
      }).length;
      if (count < min) {
        teamGaps.push(`${blk.label} (${count}/${min})`);
      }
    });
    if (teamGaps.length > 0) {
      report.push(`${config.abbrev}: ${teamGaps.join(', ')}`);
    }
  });
  // 3. Create Log Message
  let summary = "";
  let actionType = "EOD REPORT";
  
  if (report.length === 0) {
    summary = "✅ All staffing targets met for the day.";
    actionType = "EOD SUCCESS";
  } else {
    summary = "⚠️ Gaps: " + report.join(" | ");
    actionType = "EOD ALERT";
  }
  // 4. Send to Backend
  logAuditEntry({
    action: actionType,
    manager: window._myName || "System",
    target: "Daily Schedule",
    date: todayKey,
    details: summary
  });
  toast("Daily summary logged to Audit History", "success");
}
function parseTimeDecimal(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h + (m || 0) / 60;
}
async function regenerateAllSchedule() {
  const result = await Swal.fire({
    title: '🔄 Regenerate Entire Schedule?',
    html: `
      <div style="text-align:left; padding:10px;">
        <p style="font-weight:600; color:#1e293b;">This will:</p>
        <ol style="font-size:13px; color:#64748b; margin-top:10px;">
          <li style="margin-bottom:8px;"><span style="color:#ef4444; font-weight:600;">DELETE</span> all scheduled shifts from today onwards</li>
          <li style="margin-bottom:8px;"><span style="color:#16a34a; font-weight:600;">GENERATE</span> fresh shifts from the Master Schedule template</li>
        </ol>
        <div style="margin-top:15px; padding:10px; background:#fef3c7; border-radius:8px; border:1px solid #fcd34d;">
          <strong style="color:#92400e;">⚠️ Warning:</strong>
          <span style="color:#92400e; font-size:12px;">Any manual changes made to existing shifts will be lost!</span>
        </div>
      </div>
      <div style="margin-top:15px;">
        <label style="font-size:12px; font-weight:600; color:#64748b;">Days to Generate:</label>
        <input type="number" id="regenDays" value="14" min="1" max="31" 
               style="width:80px; padding:8px; border:1px solid #cbd5e1; border-radius:6px; margin-left:10px;">
      </div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#b37e78',
    cancelButtonColor: '#64748b',
    confirmButtonText: '🔄 Yes, Regenerate',
    cancelButtonText: 'Cancel',
    preConfirm: () => {
      const days = document.getElementById('regenDays').value;
      return { days: parseInt(days) || 14 };
    }
  });
  if (!result.isConfirmed) return;
  const daysToGen = result.value.days;
  // Show loading
  Swal.fire({
    title: 'Regenerating Schedule...',
    html: `
      <div style="margin-bottom:10px;">Step 1: Wiping old schedule...</div>
      <div style="font-size:12px; color:#64748b;">This may take a moment...</div>
    `,
    allowOutsideClick: false,
    showConfirmButton: false,
    didOpen: () => Swal.showLoading()
  });
  try {
    const res = await fetch('./?action=admin/regenerate-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true, days: daysToGen })
    });
    
    const data = await res.json();
    
    if (data.ok) {
      Swal.fire({
        icon: 'success',
        title: '✅ Schedule Regenerated!',
        html: `
          <div style="text-align:left; padding:10px; background:#f0fdf4; border-radius:8px; border:1px solid #bbf7d0;">
            <div style="margin-bottom:8px;">🗑️ <strong>Deleted:</strong> ${data.deleted} old schedule days</div>
            <div style="margin-bottom:8px;">✨ <strong>Generated:</strong> ${data.generated} new schedule documents</div>
            <div style="margin-bottom:8px;">👤 <strong>Total Shifts:</strong> ${data.totalAssignments || 'N/A'}</div>
            <div style="margin-bottom:8px;">📅 <strong>Days Forward:</strong> ${data.daysForward}</div>
            <div>👥 <strong>Teams:</strong> ${data.teams?.join(', ') || 'All'}</div>
          </div>
        `,
        confirmButtonColor: '#16a34a',
        confirmButtonText: 'Refresh Dashboard'
      }).then(() => {
        // Clear cache and reload
        clearScheduleCache();
        load(true);
      });
    } else {
      throw new Error(data.error || 'Regeneration failed');
    }
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Regeneration Failed',
      text: err.message,
      confirmButtonColor: '#ef4444'
    });
  }
}
async function regenerateSchedule() {
  return regenerateAllSchedule();
}
  async function saveShift() {
  if (!_isMasterMode) {
    Swal.fire({ icon:"info", title:"Not available here", text:"This editor is only for Master Schedule." });
    return;
  }

  const person = document.getElementById("modalEmployee").value;
  const day = document.getElementById("modalDay").value;
  const newStart = document.getElementById("modalStart").value;
  const newEnd = document.getElementById("modalEnd").value;
  const newTeam = getSelectedChannel(); // Use the helper function for custom channels
  const newRole = document.getElementById("modalRole")?.value || "";
  const origStart = document.getElementById("modalOrigStart").value;
  const origEnd = document.getElementById("modalOrigEnd").value;
  const origTeam = document.getElementById("modalOrigTeam")?.value || "";
  const origRole = document.getElementById("modalOrigRole")?.value || "";
  const isAdding = origStart === "NEW";

  if (!newStart || !newEnd) {
    Swal.fire({ icon:'warning', title:'Missing Times', text:'Please enter both start and end times.', confirmButtonColor:'#b37e78' });
    return;
  }
  
  if (!newTeam) {
    Swal.fire({ icon:'warning', title:'Missing Channel', text:'Please select or enter a channel.', confirmButtonColor:'#b37e78' });
    return;
  }

  if (!_masterEditEnabled) {
    toast("Click Edit to make draft changes first.", "info");
    return;
  }

  const dayData = _masterRawData[day] || [];
  if (isAdding) {
    const newShift = { person, start: newStart, end: newEnd, team: newTeam };
    if (newRole) newShift.role = newRole;
    dayData.push(newShift);
    _masterRawData[day] = dayData;
  } else {
    const sameValue = (a, b) => (a || "") === (b || "");
    let shiftToUpdate = dayData.find(s =>
      s.person === person &&
      s.start === origStart &&
      s.end === origEnd &&
      sameValue(s.team, origTeam) &&
      sameValue(s.role, origRole)
    );
    if (!shiftToUpdate) {
      shiftToUpdate = dayData.find(s =>
        s.person === person &&
        s.start === origStart &&
        s.end === origEnd
      );
    }
    if (!shiftToUpdate) {
      toast("Shift not found. Try re-opening the shift.", "error");
      return;
    }
    shiftToUpdate.start = newStart;
    shiftToUpdate.end = newEnd;
    shiftToUpdate.team = newTeam;
    if (newRole) {
      shiftToUpdate.role = newRole;
    } else {
      delete shiftToUpdate.role;
    }
  }

  renderMasterView(_masterRawData);
  closeModal();
  toast("Draft updated. Click Preview to apply.", "success");
}

// 1. Open the Queue (uses SweetAlert for simplicity)
async function openTimeOffQueue() {

  Swal.fire({ title: 'Loading...', didOpen: () => Swal.showLoading() });
  try {
    const res = await fetch('./?action=timeoff/list');
    const data = await res.json();
    
    if (!data.ok) throw new Error(data.error);
    if (!data.requests || data.requests.length === 0) {
      Swal.fire("All caught up!", "No pending time off requests.", "success");
      return;
    }
    let html = `<div style="text-align:left; max-height:400px; overflow-y:auto;">`;
    
    // Helper to calculate hours for UI (handles AM/PM)
    const calcHours = (s, e) => {
        if(!s || !e) return 4;
        const parse = (t) => {
           const match = t.match(/(\d+):(\d+)\s?(AM|PM)?/i);
           if(!match) return 0;
           let h = parseInt(match[1]);
           let ampm = match[3] ? match[3].toUpperCase() : null;
           if (ampm === "PM" && h < 12) h += 12;
           if (ampm === "AM" && h === 12) h = 0;
           return h + (parseInt(match[2])/60);
        };
        let diff = parse(e) - parse(s);
        if(diff < 0) diff += 24;
        return Math.round(diff * 100) / 100;
    };
    data.requests.forEach(req => {
      // 1. Date & Team Label
      let dateDisplay = req.date || "Date Pending";
      let teamLabel = req.team ? `<span style="font-size:10px; background:#e0e7ff; color:#4338ca; padding:2px 5px; border-radius:4px; margin-left:6px; font-weight:700;">${req.team}</span>` : "";
      const reqType = (req.type || "PTO").toString();
      const isMakeUp = reqType.toLowerCase().includes("make");
      const typePill = isMakeUp
        ? `<span style="font-size:10px; background:#dbeafe; color:#b37e78; padding:2px 6px; border-radius:999px; margin-left:8px; font-weight:800;">MAKE UP</span>`
        : `<span style="font-size:10px; background:#f0e6e4; color:#166534; padding:2px 6px; border-radius:999px; margin-left:8px; font-weight:800;">PTO</span>`;
      const makeUpLine = isMakeUp
        ? (req.makeUpDate
            ? `<div style="margin-top:6px; font-size:12px; color:#475569;"><strong>Make Up Date:</strong> ${req.makeUpDate}</div>`
            : `<div style="margin-top:6px; font-size:12px; color:#ef4444;"><strong>Make Up Date:</strong> Not provided</div>`)
        : "";
      // 2. Calculate Deduction Logic
      let deductAmount = 0;
      let timeDisplay = "";
      
      if (req.duration === 'full_day') {
          deductAmount = 8;
      } else if (req.shiftStart && req.shiftEnd) {
          deductAmount = calcHours(req.shiftStart, req.shiftEnd);
          // Only use fallback if math returns 0
          if (deductAmount === 0) deductAmount = 4; 
          timeDisplay = `<div style="font-size:11px; color:#64748b; margin-top:2px;">${req.shiftStart} - ${req.shiftEnd} (${deductAmount} hrs)</div>`;
      } else {
          deductAmount = 4; 
      }
      const bal = req.currentBalance !== undefined ? req.currentBalance : 0;
      const typeBadge = req.duration === 'full_day' 
          ? `<span style="background:#dbeafe; color:#8f5f5a; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:700; margin-right:6px;">FULL DAY</span>`
          : `<span style="background:#f3f4f6; color:#374151; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:700; margin-right:6px;">SHIFT</span>`;
      const actionButtons = isMakeUp
        ? `<button onclick="resolveTimeOff('${req.id}', 'approved', { deduct: false })" 
                  style="padding:8px 16px; background:#b37e78; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:700;">Approve (No Deduct)</button>`
        : `<button onclick="animateDeduction('bal-${req.id}', ${bal}, ${deductAmount}); resolveTimeOff('${req.id}', 'approved', { deduct: true, amount: ${deductAmount} })" 
                  style="padding:8px 16px; background:#1e293b; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:700;">Approve & Deduct</button>`;
      html += `
        <div id="req-${req.id}" style="border:1px solid #e2e8f0; padding:16px; margin-bottom:12px; border-radius:12px; background:#fff;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <div style="font-weight:800; color:#0f172a; font-size:15px;">
                ${req.person} ${teamLabel} ${typePill}
            </div>
            <div style="font-size:11px; background:#f0fdf4; color:#166534; padding:4px 10px; border-radius:20px; border:1px solid #bbf7d0; font-weight:700;">
               Balance: <span id="bal-${req.id}">${bal}</span> hrs
            </div>
          </div>
          <div style="font-size:13px; color:#334155; margin-bottom:12px; padding-bottom:12px; border-bottom:1px solid #f1f5f9;">
             <div style="margin-bottom:4px;">${typeBadge} <strong>${dateDisplay}</strong> ${timeDisplay}</div>
             <div style="color:#64748b; font-style:italic;">"${req.reason || 'No reason provided'}"</div>
             ${makeUpLine}
          </div>
          <div style="display:flex; gap:10px; justify-content:flex-end;">
            <button onclick="resolveTimeOff('${req.id}', 'rejected')" style="padding:8px 16px; background:#fff; color:#ef4444; border:1px solid #fee2e2; border-radius:8px; cursor:pointer; font-weight:600;">Deny</button>
            ${actionButtons}
          </div>
        </div>
      `;
    });
    html += `</div>`;
    Swal.fire({ title: 'Time Off Requests', html: html, width: 600, showConfirmButton: false, showCloseButton: true });
  } catch (err) {
    Swal.fire("Error", err.message, "error");
  }
}
// 2. Handle Decision
async function resolveTimeOff(id, decision, opts = {}) {
  // Optimistic UI: Remove the card immediately to feel "snappy"
  const card = document.getElementById(`req-${id}`);
  if(card) card.style.opacity = "0.5";
  
  toast(decision === 'approved' ? "Approving..." : "Denying...");
  try {
    // CLOUD RUN FETCH CALL
    const res = await fetch('./?action=timeoff/resolve', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        id: id,
        decision: decision,
        manager: window._myName, // Send who made the decision
        // If caller passes deduct, use it. Otherwise:
// - deny => never deduct
// - approve => leave undefined so backend can decide (or your caller can decide)
deduct: (opts && typeof opts.deduct === "boolean")
  ? opts.deduct
  : (decision === "approved" ? undefined : false),
// allow 0 as a valid amount (your old check would drop it)
amount: (opts && opts.amount != null) ? opts.amount : null,
      })
    });
    const text = await res.text(); 
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        console.error("CRITICAL SERVER ERROR:", text);
        throw new Error("Server returned HTML. Check Console (F12) for the real error.");
    }
    
    if (data.ok) {
      toast(`Request ${decision}!`, "success");
      if(card) card.remove(); // Remove from UI
      // 1. Reload balances so Admin Tools shows the new numbers
      loadBalances();
      // 2. Refresh the "Review Queue" Badge Count (THIS WAS MISSING)
      fetch('./?action=timeoff/count')
        .then(r => r.json())
        .then(d => {
           const btnQueue = document.getElementById("btnReviewQueue");
           const notifCountEl = document.getElementById("notifCount");

           
           // Update the "Review Queue" button text
           if (btnQueue) {
    if (d.count > 0) {
      btnQueue.innerHTML = `
        Review Queue
        <span style="
          background:white;
          color:#c2410c;
          padding:2px 6px;
          border-radius:10px;
          font-size:11px;
          font-weight:800;
          margin-left:6px;
        ">
          ${d.count}
        </span>
      `;
    } else {
      btnQueue.innerHTML = "Review Queue";
    }
  }

  // --- Notification dot / badge ---
  if (notifCountEl) {
    if (d.count > 0) {
      notifCountEl.textContent = d.count;
      notifCountEl.classList.remove("hidden");
    } else {
      notifCountEl.textContent = "0";
      notifCountEl.classList.add("hidden");
    }
  }
});
      
      // If there are no more requests, refresh the list to show "All caught up"
      const remaining = document.querySelectorAll('[id^="req-"]').length;
      if(remaining === 0) setTimeout(openTimeOffQueue, 500);
      
    } else {
      if(card) card.style.opacity = "1"; // Revert UI on failure
      toast(data.error || "Error saving decision", "error");
    }
  } catch (err) {
    if(card) card.style.opacity = "1";
    console.error(err);
    toast(err.message, "error");
  }
}
function animateDeduction(elementId, startVal, amountToDeduct) {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    let start = parseFloat(startVal) || 0;
    let end = start - amountToDeduct;
    let duration = 800; // Animation speed in ms
    let startTime = null;
    function step(timestamp) {
        if (!startTime) startTime = timestamp;
        let progress = Math.min((timestamp - startTime) / duration, 1);
        
        // Easing function for smooth look
        let current = start - (amountToDeduct * progress);
        
        el.innerHTML = current.toFixed(1);
        el.style.color = "#ef4444"; // Flash red
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            el.innerHTML = end.toFixed(1); // Ensure exact end value
            el.style.color = "#166534"; // Return to green
        }
    }
    window.requestAnimationFrame(step);
}
// ============================================
// [SECTION 10] SHIFT MANAGEMENT
// ============================================
function deleteShift() {
  // These MUST be defined before branching, otherwise SweetAlert string interpolation breaks
  const person = document.getElementById("modalEmployee").value;
  const day = document.getElementById("modalDay").value;
  const origStart = document.getElementById("modalOrigStart").value;
  const origEnd = document.getElementById("modalOrigEnd").value;
  const origTeam = document.getElementById("modalOrigTeam")?.value || "";
  const origRole = document.getElementById("modalOrigRole")?.value || "";

  // ✅ MASTER MODE = draft-only delete (no backend)
  if (_isMasterMode) {
    if (!_masterEditEnabled) {
      toast("Click Edit to make draft changes first.", "info");
      return;
    }

    const dayData = _masterRawData[day] || [];
    const sameValue = (a, b) => (a || "") === (b || "");
    let removed = false;
    _masterRawData[day] = dayData.filter(s => {
      if (removed) return true;
      const matches = s.person === person &&
        s.start === origStart &&
        s.end === origEnd &&
        sameValue(s.team, origTeam) &&
        sameValue(s.role, origRole);
      if (matches) {
        removed = true;
        return false;
      }
      return true;
    });
    if (!removed) {
      toast("Shift not found. Try re-opening the shift.", "error");
      return;
    }

    renderMasterView(_masterRawData);
    closeModal();
    toast("Draft updated. Click Preview to apply.", "success");
    return;
  }

  // ✅ NON-MASTER MODE = delete LIVE assignment (Firestore scheduleDays)
  // Requires modal to hold docId + assignmentId (see section 3)
  const docId = document.getElementById("modalDocId")?.value || "";
  const assignmentId = document.getElementById("modalAssignmentId")?.value || "";

  if (!docId || !assignmentId) {
    Swal.fire({
      icon: "error",
      title: "Missing delete info",
      text: "Could not find docId/assignmentId for this shift. Re-open the shift and try again.",
      confirmButtonColor: "#ef4444"
    });
    return;
  }

  Swal.fire({
    title: "Delete This Shift?",
    html: `
      <div style="text-align:left; padding:12px; background:#fef2f2; border-radius:8px; border:1px solid #fecaca;">
        <div style="margin-bottom:8px;"><strong>👤 Employee:</strong> ${person}</div>
        <div style="margin-bottom:8px;"><strong>📅 Day:</strong> ${day}</div>
        <div><strong>🕐 Time:</strong> ${toAmPm(origStart)} - ${toAmPm(origEnd)}</div>
      </div>
      <div style="margin-top:12px; font-size:13px; color:#64748b;">
        This will permanently remove the shift from the live schedule.
      </div>
    `,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#64748b",
    confirmButtonText: "🗑️ Yes, Delete It",
    cancelButtonText: "Cancel"
  }).then((result) => {
    if (result.isConfirmed) {
      executeDeleteAssignmentShift(docId, assignmentId);
    }
  });
}
async function executeDeleteAssignmentShift(docId, assignmentId) {
  Swal.fire({
    title: "Deleting Shift...",
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => Swal.showLoading()
  });

  try {
    const res = await fetch("./?action=assignment/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ docId, assignmentId })
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || "Delete failed");
    }

    // ✅ Refresh UI (pick the one you already use after changes)
    // Option 1: full reload (simple + reliable)
    closeModal();
await load(true);;

    Swal.fire({
      icon: "success",
      title: "Shift Deleted!",
      text: "Removed from the live schedule.",
      confirmButtonColor: "#16a34a",
      timer: 2200,
      timerProgressBar: true
    });
  } catch (e) {
    console.error("Live delete failed:", e);
    Swal.fire({
      icon: "error",
      title: "Delete Failed",
      text: e.message || "Could not delete",
      confirmButtonColor: "#ef4444"
    });
  }
}

function checkTimeMatch(targetTime, compareTime) {
  const normalize = (t) => {
    if (!t) return "";
    // Standard JS way to handle Date objects instead of Apps Script
    if (t instanceof Date) {
      return t.getHours().toString().padStart(2, '0') + ":" + 
             t.getMinutes().toString().padStart(2, '0');
    }
    return String(t).trim().substring(0, 5);
  };
  return normalize(targetTime) === normalize(compareTime);
}
  // Timezone-aware time formatting
  function toAmPm(timeString) {
    if (!timeString) return "";
    
    // Parse time
    const parts = String(timeString).split(":");
    let hours = parseInt(parts[0], 10);
    const minutes = parts[1] || "00";
    
    if (isNaN(hours)) return "";
    
    // Get user timezone and apply offset
    const tzOffsets = { 'PST': 0, 'MST': 1, 'CST': 2, 'EST': 3 };
    let userTz = 'PST';
    try {
      const prefs = getUserPrefs();
      userTz = prefs.timezone || 'PST';
    } catch(e) {}
    
    const offset = tzOffsets[userTz] || 0;
    const adjustedHours = hours + offset;
    
    // Format with overflow handling (e.g., 25 -> 1 AM)
    const hr = ((adjustedHours % 24) + 24) % 24;
    const suffix = hr >= 12 ? 'PM' : 'AM';
    const displayHr = hr % 12 || 12;
    
    return `${displayHr}:${minutes} ${suffix}`;
  }
// ============================================
// [SECTION 14] METRICS & REPORTING
// ============================================
function renderMetricsView() {
    $("listView").style.display = "none"; $("calViewWrapper").style.display = "none"; $("metricsView").style.display = "block";
    renderMetricsList();
  }
  // ============================================
// AUDIT LOGGING
// ============================================
async function logAuditEntry(entry) {
  try {
    await fetch('/?action=audit/log', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        ...entry,
        timestamp: new Date().toISOString()
      })
    });
  } catch (err) {
    console.error("Audit log failed:", err);
  }
}
  function renderShiftCard(it, mode) {
  const card = mkDiv(`shift ${getTeamClass(it.team)}`);
  
  // Check selection
  if (_teamSelected.has(String(it.assignmentId))) card.classList.add("selected");
  
  // ============================================
  // SHIFT STATUS DETECTION
  // ============================================
  const notes = String(it.notes || "").toLowerCase();
  const personLower = String(it.person || "").toLowerCase().trim();
  const isOff = _timeOff.has(`${it.person}|${it.dateISO}`) || notes.includes("[off]");
  const isOpen = personLower === "open" || it.isOpenShift === true;
  const isBackup = notes.includes("back up") || 
                   notes.includes("backup") || 
                   notes.includes("coverage") ||
                   notes.includes("temp") ||
                   notes.includes("replacing") ||
                   notes.includes("replaced");
  const isCaptain = notes.includes("captain");
  
  // ============================================
  // GET CHANNEL CONFIG FOR COLORS - WITH FALLBACK
  // ============================================
  const config = getChannelConfig(it.team) || {
    abbrev: "—",
    color: "#f8fafc",
    border: "#e2e8f0",
    text: "#475569"
  };
  
  // Ensure all properties exist with fallbacks
  const channelAbbrev = config.abbrev || "—";
  const channelColor = config.color || "#f8fafc";
  const channelBorder = config.border || "#e2e8f0";
  const channelText = config.text || "#475569";
  const channelDisplay = getChannelDisplayName ?  getChannelDisplayName(it.team) : (it.team || "Unknown");
  
  // ============================================
  // APPLY VISUAL STYLES BASED ON STATUS
  // ============================================
  
  // Priority 0: OPEN shift (needs coverage)
  if (isOpen) {
    card.style.border = "3px dashed #dc2626";
    card.style.background = "repeating-linear-gradient(45deg, #fef2f2, #fef2f2 10px, #fee2e2 10px, #fee2e2 20px)";
    card.style.boxShadow = "0 2px 12px rgba(220, 38, 38, 0.3)";
    card.style.animation = "pulse-open 2s infinite";
    card.classList.add("open-shift");
  }
  // Priority 1: OFF status
  else if (isOff) { 
    card.style.border = "2px solid #f87171"; 
    card.style.background = "#fef2f2"; 
    card.style.opacity = "0.7";
  }
  // Priority 2: Backup/Coverage shift
  else if (isBackup) {
    card.style.border = "2px solid #ef4444";
    card.style.background = "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)";
    card.style.boxShadow = "0 2px 8px rgba(239, 68, 68, 0.25)";
    card.classList.add("backup-shift");
  }
  // Priority 3: Captain
  else if (isCaptain) {
    card.style.border = "2px solid #f59e0b";
    card.style.background = "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)";
    card.style.boxShadow = "0 2px 8px rgba(245, 158, 11, 0.25)";
  }
  
  // ============================================
  // BUILD CARD CONTENT
  // ============================================
  let metaIcon = "";
  if (window._isManager && it.notes && it.notes.length > 0) {
    metaIcon = `<span style="font-size: 10px; margin-left: 6px; cursor:help;" title="Notes: ${it.notes}">📝</span>`;
  }
  // Role badge
  const formattedRole = (it.role || "").replace(/^(Backup)\s*(\d+)$/i, (_, base, num) => `${base} #${num}`);
  const roleDisplay = formattedRole 
    ? `<span style="font-size:9px; background:#e0e7ff; color:#4c51bf; padding:2px 6px; border-radius:4px; font-weight:700; margin-left: 4px;">${formattedRole}</span>` 
    : "";
  
  // Status badge for backup shifts
  let statusBadge = "";
  if (isOpen) {
    statusBadge = `<span style="font-size:8px; background:#dc2626; color:#fff; padding:2px 6px; border-radius:4px; font-weight:700; margin-left:4px; animation:blink 1s infinite;">⚠️ OPEN</span>`;
  } else if (isBackup && ! isOff) {
    statusBadge = `<span style="font-size:8px; background:#ef4444; color:#fff; padding:2px 6px; border-radius:4px; font-weight:700; margin-left:4px;">COVERAGE</span>`;
  } else if (isCaptain) {
    statusBadge = `<span style="font-size: 8px; background:#f59e0b; color:#fff; padding:2px 6px; border-radius:4px; font-weight:700; margin-left: 4px;">CAPTAIN</span>`;
  }
  
  // ============================================
  // CHECK FOR REPLACEMENT INFO IN NOTES
  // ============================================
  let replacementDisplay = "";
  const notesStr = String(it.notes || "");
  const replacedMatch = notesStr.match(/(?:replaced|covering for|was)\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i);
  if (replacedMatch && replacedMatch[1] && window._isManager && !isOpen) {
    const originalPerson = replacedMatch[1].trim();
    if (originalPerson.toLowerCase() !== (it.person || "").toLowerCase()) {
      replacementDisplay = `<span style="font-size:9px; color:#6b7280; text-decoration:line-through; margin-right:4px;">${escapeHtml(originalPerson)}</span>→ `;
      statusBadge = `<span style="font-size:8px; background:#8b5cf6; color:#fff; padding:2px 6px; border-radius:4px; font-weight:700; margin-left:4px;">SWAP</span>`;
    }
  }
  
  // Show original person for open shifts
  let openOriginalDisplay = "";
  if (isOpen && it.originalPerson) {
    openOriginalDisplay = `<div style="font-size:9px; color:#dc2626; margin-top:4px; font-weight:600;">Was: ${escapeHtml(it.originalPerson)} ${it.openReason ? '• ' + escapeHtml(it.openReason) : ''}</div>`;
  }
  
  // ============================================
  // SPECIAL STYLING FOR LUNCH/1:1 (Break types)
  // ============================================
  const isBreakType = config.isBreak === true;
  if (isBreakType && !isOff && !isOpen) {
    card.style.opacity = "0.85";
    card.style.background = channelColor;
    card.style.borderStyle = "dashed";
  }
  
  // Build the HTML with color-coded channel badge
  card.innerHTML = `
    <div class="sRow" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 4px;">
      <span class="sTime" style="font-weight:800; font-size: 11px;">${it.startLabel || ''}-${it.endLabel || ''}</span>
      <span style="font-size:10px; background: ${channelColor}; color: ${channelText}; padding: 2px 6px; border-radius:4px; font-weight: 700; border:1px solid ${channelBorder};" title="${channelDisplay}">${channelAbbrev}</span>
      ${metaIcon}
    </div>
    <div class="sName" title="${it.person || ''}" style="font-weight: 600; ${isOpen ? 'color:#dc2626;' : ''}">
      ${replacementDisplay}${isOpen ? '⚠️ NEEDS COVERAGE' : (it.person || 'Unassigned')}${roleDisplay}${statusBadge}
    </div>
    ${openOriginalDisplay}
    ${isBackup && it.notes && !isOpen ?  `<div style="font-size:9px; color:#dc2626; margin-top:4px; font-weight:600;">${escapeHtml(it.notes)}</div>` : ''}
  `;
  
  const sel = mkDiv("selBox"); 
  sel.textContent = "✓"; 
  card.appendChild(sel);
  
  if (mode === "list") card.style.width = "220px";
  
  // ============================================
  // CLICK HANDLING
  // ============================================
  const currentName = String(window._myName || "").trim().toLowerCase();
  const shiftPerson = String(it.person || "").trim().toLowerCase();
  const isMe = currentName && shiftPerson === currentName;
  const isManager = window._isManager === true;
  if (isManager || isMe) {
    card.style.cursor = "pointer";
    
    card.onclick = (e) => { 
      if (isManager) {
        if(_mode === "team" || _teamSelected.size > 0 || e.shiftKey) { 
          toggleTeamSelect(it, card); 
        } else { 
          openReplaceModal(it); 
        } 
      } 
      else if (isMe) {
        openAgentActionModal(it);
      }
    };
    if (isManager) {
      card.draggable = true;
      card.ondragstart = (e) => { e.preventDefault(); }; 
      card.ondragover = (e) => { if(_mode === "quick") { e.preventDefault(); card.classList.add("dropTarget"); } };
      card.ondragleave = () => card.classList.remove("dropTarget");
      card.ondrop = (e) => { 
        e.preventDefault(); 
        card.classList.remove("dropTarget"); 
        if(_dragPerson && _dragPerson !== it.person) { 
          _editing.docId = it.docId || "";
_editing.assignmentId = it.assignmentId || it.id || "";

// ✅ Show delete button for managers only
const delBtn = document.getElementById("btnDeleteShift");
if (delBtn) delBtn.style.display = window._isManager ? "inline-flex" : "none";
          openReplaceModal(it); 
          setTimeout(() => $("mNewPerson").value = _dragPerson, 50); 
        } 
      };
    }
  }
  
  return card;
}

function deleteLiveShiftFromReplace() {
  if (!_editing?.docId || !_editing?.assignmentId) {
    Swal.fire({
      icon: "error",
      title: "Missing delete info",
      text: "docId/assignmentId not found for this shift.",
      confirmButtonColor: "#ef4444"
    });
    return;
  }

  const person = _editing.person || "Unassigned";
  const day = _editing.dateLabel || "";
  const time = `${_editing.startLabel || _editing.start || ""} - ${_editing.endLabel || _editing.end || ""}`;

  Swal.fire({
    title: "Delete This Shift?",
    html: `
      <div style="text-align:left; padding:12px; background:#fef2f2; border-radius:8px; border:1px solid #fecaca;">
        <div style="margin-bottom:8px;"><strong>👤 Employee:</strong> ${person}</div>
        <div style="margin-bottom:8px;"><strong>📅 Date:</strong> ${day}</div>
        <div><strong>🕐 Time:</strong> ${time}</div>
      </div>
      <div style="margin-top:12px; font-size:13px; color:#64748b;">
        This will permanently remove the shift from the live schedule.
      </div>
    `,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#64748b",
    confirmButtonText: "🗑️ Yes, Delete It",
    cancelButtonText: "Cancel"
  }).then((r) => {
    if (r.isConfirmed) {
      // close the replace modal first for smoother UX
      const overlay = document.getElementById("modalOverlay");
      if (overlay) overlay.style.display = "none";
      executeDeleteAssignmentShift(_editing.docId, _editing.assignmentId);
    }
  });
}

  // --- 6. AGENT ACTIONS (MOVED TO GLOBAL SCOPE) ---
  // These functions are now accessible by the HTML buttons
 function openAgentActionModal(it) {
  console.log("Opening Agent Modal for:", it);
  _editing = it; 
  // Update shift time display
  if($("agShiftTimeDisplay")) {
    $("agShiftTimeDisplay").innerText = `${it.startLabel} - ${it.endLabel}`;
  }
  
  // Update new shift info card elements
  const dateEl = document.getElementById("agShiftDate");
  const timeEl = document.getElementById("agShiftTime");
  const teamEl = document.getElementById("agShiftTeam");
  
  if (dateEl) {
    const d = new Date(it.dateISO + "T12:00:00");
    dateEl.textContent = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }
  if (timeEl) {
    timeEl.textContent = `${it.startLabel} - ${it.endLabel}`;
  }
  if (teamEl) {
    teamEl.textContent = it.team || "General";
  }
  
  // Legacy: Update title card (for backwards compat)
  const title = `${it.dateLabel} • ${it.startLabel} - ${it.endLabel}`;
  const titleEl = document.getElementById("agShiftDetails");
  if(titleEl) titleEl.innerText = title;
  
  // Reset modal view
  resetAgentModal();
  
  // Fill coworker dropdown
  try {
    const peopleList = Array.isArray(_people) ? _people : [];
    const currentName = window._myName || "";
    const coworkers = peopleList.filter(p => p !== currentName);
    if (typeof fillSelect === "function") {
      fillSelect("agSwapPerson", coworkers, false);
    }
  } catch (err) {
    console.error("Error filling swap list (non-fatal):", err);
  }
  
  // ✅ NEW: Load and display PTO balance
  loadAgentPtoDisplay();
  
  // Show overlay
  const overlay = document.getElementById("agentOverlay");
  if(overlay) {
    if (overlay.parentElement !== document.body) {
      document.body.appendChild(overlay);
    }
    overlay.style.display = "flex";
    overlay.style.visibility = "visible"; 
    overlay.style.opacity = "1";
    overlay.style.zIndex = "20000";
  } else {
    alert("Error: The 'agentOverlay' HTML is missing.");
  }
}
// ✅ Function to load and display agent's PTO in the modal
function loadAgentPtoDisplay() {
  const ptoEl = document.getElementById("agPtoHours");
  
  if (!ptoEl) return;
  
  // Get balance from cached data
  const balance = _balanceData.get(window._myName) || { pto: 0 };
  
  ptoEl.textContent = balance.pto || 0;
  
  // Color code based on balance
  if (balance.pto <= 0) {
    ptoEl.style.color = "#ef4444"; // Red if zero
  } else if (balance.pto < 8) {
    ptoEl.style.color = "#f59e0b"; // Orange if low
  } else {
    ptoEl.style.color = "#16a34a"; // Green if good
  }
}
// Helper to update visual selection on type radio buttons
function updateTypeSelection() {
  const radios = document.querySelectorAll('input[name="timeOffType"]');
  radios.forEach(radio => {
    const label = radio.closest('label');
    if (radio.checked) {
      if (radio.value === 'Make Up') {
        label.style.borderColor = '#b37e78';
        label.style.background = '#eff6ff';
      } else {
        label.style.borderColor = '#16a34a';
        label.style.background = '#f0fdf4';
      }
    } else {
      label.style.borderColor = '#e2e8f0';
      label.style.background = '#fff';
    }
  });
  // Toggle Make Up Date field
  const selected = document.querySelector('input[name="timeOffType"]:checked');
  const isMakeUp = selected && selected.value === "Make Up";
  const wrap = document.getElementById("agMakeUpWrap");
  const dateEl = document.getElementById("agMakeUpDate");
  if (wrap) wrap.style.display = isMakeUp ? "block" : "none";
  if (!isMakeUp && dateEl) dateEl.value = "";

  // ✅ Show PTO balance warnings based on selection
  if (!isMakeUp) {
    const balance = _balanceData.get(window._myName) || { pto: 0, sick: 0 };
    const currentPto = parseFloat(balance.pto) || 0;

    // Update PTO display with warning color
    const ptoEl = document.getElementById("agPtoHours");
    if (ptoEl) {
      if (currentPto <= 0) {
        ptoEl.style.color = "#ef4444"; // Red if zero
        ptoEl.parentElement.style.borderColor = "#fca5a5";
        ptoEl.parentElement.style.background = "#fee2e2";
      } else if (currentPto < 8) {
        ptoEl.style.color = "#f59e0b"; // Orange if low
        ptoEl.parentElement.style.borderColor = "#fbbf24";
        ptoEl.parentElement.style.background = "#fef3c7";
      }
    }
  }
}

// showToast - alias for main toast function
function showToast(message, type = 'info') {
    toast(message, type);
}
  function showAgentForm(type) {
    if($("agActionSelect")) $("agActionSelect").style.display = "none";
    if (type === 'timeoff') {
        if($("agFormTimeOff")) $("agFormTimeOff").style.display = "block";
        updateTypeSelection();
        if($("agToReason")) {
            $("agToReason").value = "";
            $("agToReason").focus();
        }
    } else {
        if($("agFormSwap")) $("agFormSwap").style.display = "block";
        if($("agSwapNote")) $("agSwapNote").value = "";
    }
  }
  function resetAgentModal() {
    if($("agActionSelect")) $("agActionSelect").style.display = "block";
    if($("agFormTimeOff")) $("agFormTimeOff").style.display = "none";
    if($("agFormSwap")) $("agFormSwap").style.display = "none";
  }
  function openStaffingModal() {
  
  const modal = $("staffingModal");
  if(!modal) return console.error("Staffing modal div not found!");
  // Ensure it sits on top of the Admin modal (z-index)
  modal.style.zIndex = "10010"; 
  modal.style.display = "flex";
  
  // Fill the dropdown immediately using cached data (prevents "loading" delay)
  const sel = $("ruleTeam");
  sel.innerHTML = '<option value="">Select Team...</option>';
  if (_teams && _teams.length > 0) {
    _teams.forEach(t => sel.appendChild(new Option(t, t)));
  }
  
  // Load the list
  loadRules();
}
function closeStaffingModal() {
  $("staffingModal").style.display = "none";
}

// ============================================
// CLEAR EVENTS MODAL FUNCTIONS
// ============================================
function openClearEventsModal() {
  $("clearEventsModal").style.display = "flex";
  
  // Reset form
  document.getElementById("clearEventsConfirm").checked = false;
  document.getElementById("clearEventsUseDateFilter").checked = false;
  document.getElementById("clearEventsBeforeDate").style.display = "none";
  document.getElementById("clearEventsBeforeDate").value = "";
  
  // Reset checkboxes to default (time_off_requests and swap_requests checked)
  document.querySelectorAll(".clearEventsCollection").forEach(cb => {
    cb.checked = (cb.value === "time_off_requests" || cb.value === "swap_requests");
  });
}

function closeClearEventsModal() {
  $("clearEventsModal").style.display = "none";
}

function toggleClearEventsDateFilter() {
  const checkbox = document.getElementById("clearEventsUseDateFilter");
  const dateInput = document.getElementById("clearEventsBeforeDate");
  
  if (checkbox.checked) {
    dateInput.style.display = "block";
    // Set default to 30 days ago
    const date = new Date();
    date.setDate(date.getDate() - 30);
    dateInput.value = date.toISOString().split('T')[0];
  } else {
    dateInput.style.display = "none";
    dateInput.value = "";
  }
}

async function executeClearEvents() {
  // Validate confirmation
  const confirmCheckbox = document.getElementById("clearEventsConfirm");
  if (!confirmCheckbox.checked) {
    toast("Please confirm you understand this action is permanent", "error");
    return;
  }
  
  // Get selected collections
  const selectedCollections = Array.from(document.querySelectorAll(".clearEventsCollection:checked"))
    .map(cb => cb.value);
  
  if (selectedCollections.length === 0) {
    toast("Please select at least one data type to clear", "error");
    return;
  }
  
  // Get date filter if enabled
  let beforeDate = null;
  const useDateFilter = document.getElementById("clearEventsUseDateFilter").checked;
  if (useDateFilter) {
    beforeDate = document.getElementById("clearEventsBeforeDate").value;
    if (!beforeDate) {
      toast("Please select a date or disable the date filter", "error");
      return;
    }
  }
  
  // Final confirmation with SweetAlert
  const dateText = beforeDate ? ` created before ${beforeDate}` : '';
  const result = await Swal.fire({
    title: 'Confirm Deletion',
    html: `
      <div style="text-align:left; padding:0 20px;">
        <p style="margin-bottom:12px;">You are about to permanently delete:</p>
        <ul style="margin:12px 0; padding-left:20px;">
          ${selectedCollections.map(c => `<li style="margin:6px 0;">${c.replace(/_/g, ' ')}</li>`).join('')}
        </ul>
        ${dateText ? `<p style="margin-top:12px; font-weight:600;">Only events${dateText}</p>` : '<p style="margin-top:12px; font-weight:600; color:#dc2626;">All events in these collections</p>'}
        <p style="margin-top:12px; color:#dc2626; font-weight:700;">This action cannot be undone!</p>
      </div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#64748b',
    confirmButtonText: 'Yes, Delete',
    cancelButtonText: 'Cancel'
  });
  
  if (!result.isConfirmed) return;
  
  // Show loading
  Swal.fire({
    title: 'Clearing Events...',
    html: 'Please wait while we delete the selected data.',
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    }
  });
  
  try {
    // Call the API
    const response = await fetch('/admin/clear-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        confirm: true,
        beforeDate: beforeDate || undefined,
        collections: selectedCollections
      })
    });
    
    const data = await response.json();
    
    if (response.ok && data.ok) {
      // Success - show results
      const deletedByCollection = data.deletedByCollection || {};
      const totalDeleted = data.totalDeleted || 0;
      
      const resultsHtml = Object.entries(deletedByCollection)
        .map(([collection, count]) => `<li style="margin:6px 0;">${collection.replace(/_/g, ' ')}: <strong>${count}</strong> deleted</li>`)
        .join('');
      
      await Swal.fire({
        icon: 'success',
        title: 'Event History Cleared',
        html: `
          <div style="text-align:left; padding:0 20px;">
            <p style="margin-bottom:12px;">Successfully deleted <strong>${totalDeleted}</strong> total entries:</p>
            <ul style="margin:12px 0; padding-left:20px;">
              ${resultsHtml}
            </ul>
            <p style="margin-top:12px; color:#64748b; font-size:14px;">
              Attendance scores will update automatically on next refresh.
            </p>
          </div>
        `,
        confirmButtonColor: '#16a34a'
      });
      
      closeClearEventsModal();
      
      // If on goals page, reload attendance data
      if (typeof loadAgentAttendance === 'function' && window._currentGoalsAgent) {
        loadAgentAttendance();
      }
    } else {
      throw new Error(data.error || 'Failed to clear events');
    }
  } catch (err) {
    console.error('Clear events error:', err);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: err.message || 'Failed to clear event history. Please try again.',
      confirmButtonColor: '#dc2626'
    });
  }
}

// ============================================
// MEETING ROTATION MODAL FUNCTIONS (Enhanced)
// ============================================
let _currentLcAgents = [];
let _currentPtoAgents = [];
let _lcEligibleAgents = []; // Agents with LC experience

async function openMeetingRotationModal() {
  const modal = $("meetingRotationModal");
  modal.style.display = "flex";
  
  // Reset state
  _currentLcAgents = [];
  _currentPtoAgents = [];
  _lcEligibleAgents = [];
  
  // Set default to next Thursday first (needed for eligible endpoint)
  const today = new Date();
  const daysUntilThursday = (4 - today.getDay() + 7) % 7;
  const nextThursday = new Date(today);
  nextThursday.setDate(today.getDate() + (daysUntilThursday === 0 ? 7 : daysUntilThursday));
  const defaultDate = nextThursday.toISOString().split('T')[0];
  $("rotationDate").value = defaultDate;
  
  // Populate agent dropdowns - use _peopleMeta or fetch from API
  let people = [];
  if (typeof _peopleMeta !== 'undefined' && Array.isArray(_peopleMeta) && _peopleMeta.length > 0) {
    people = _peopleMeta;
  } else if (window.__peopleCache && Array.isArray(window.__peopleCache) && window.__peopleCache.length > 0) {
    people = window.__peopleCache;
  } else {
    // Fetch from API as fallback
    try {
      const res = await fetch("/people");
      if (res.ok) {
        const data = await res.json();
        people = data.people || [];
        window.__peopleCache = people;
      }
    } catch (e) {
      console.error("Failed to fetch people for rotation modal:", e);
    }
  }
  
  // Fetch LC eligible agents (historical LC workers)
  try {
    const eligibleRes = await fetch(`/meeting-rotation/eligible?date=${defaultDate}&type=thursday`);
    const eligibleData = await eligibleRes.json();
    if (eligibleData.ok) {
      _lcEligibleAgents = eligibleData.historicalLcAgents || [];
    }
  } catch (e) {
    console.error("Failed to fetch LC eligible agents:", e);
  }
  
  // Build dropdown options - prioritize LC agents
  populateRotationDropdowns(people);
  
  // Set defaults
  $("rotationMeetingType").value = "thursday";
  $("rotationTimeEST").value = "3:00 PM - 4:15 PM";
  convertMeetingTime();
  onMeetingTypeChange();
  
  loadRotationForDate();
  loadRotationHistory();
  loadFairnessStats(); // Load fairness stats when modal opens
  renderLcAgentsChips();
  renderPtoAgentsChips();
}

// Populate rotation dropdowns with LC agents prioritized
function populateRotationDropdowns(people) {
  const activeAgents = people.filter(p => p.active !== false);
  
  // Separate LC agents and others
  const lcAgents = activeAgents.filter(p => _lcEligibleAgents.includes(p.name));
  const otherAgents = activeAgents.filter(p => !_lcEligibleAgents.includes(p.name));
  
  // Build options with LC agents first, then a separator, then others
  let rotationOptions = '<option value="">-- Select --</option>';
  
  if (lcAgents.length > 0) {
    rotationOptions += '<optgroup label="★ Live Chat Agents">';
    rotationOptions += lcAgents.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
    rotationOptions += '</optgroup>';
  }
  
  if (otherAgents.length > 0) {
    rotationOptions += '<optgroup label="Other Agents">';
    rotationOptions += otherAgents.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
    rotationOptions += '</optgroup>';
  }
  
  // LC-specific dropdowns (Captain, Backup, LC Agents)
  $("rotationCaptain").innerHTML = rotationOptions;
  $("rotationBackup1").innerHTML = rotationOptions;
  $("rotationBackup2").innerHTML = rotationOptions;
  $("addLcAgentSelect").innerHTML = rotationOptions;
  
  // All agents for PTO (All Hands)
  const allAgentOptions = '<option value="">-- Select --</option>' + 
    activeAgents.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
  $("addPtoAgentSelect").innerHTML = allAgentOptions;
}

function closeMeetingRotationModal() {
  $("meetingRotationModal").style.display = "none";
}

function onMeetingTypeChange() {
  const meetingType = $("rotationMeetingType").value;
  const allHandsSection = $("allHandsPtoSection");
  const timeSelect = $("rotationTimeEST");
  
  if (meetingType === "allhands") {
    allHandsSection.style.display = "block";
    timeSelect.value = "7:00 PM - 8:00 PM";
  } else {
    allHandsSection.style.display = "none";
    timeSelect.value = "3:00 PM - 4:15 PM";
  }
  convertMeetingTime();
}

function convertMeetingTime() {
  const estTime = $("rotationTimeEST").value;
  const pstInput = $("rotationTimePST");
  
  // EST to PST (EST is 3 hours ahead)
  const timeMap = {
    "3:00 PM - 4:15 PM": "12:00 PM - 1:15 PM",
    "3:45 PM - 5:00 PM": "12:45 PM - 2:00 PM",
    "7:00 PM - 8:00 PM": "4:00 PM - 5:00 PM"
  };
  
  pstInput.value = timeMap[estTime] || estTime;
}

function addLcAgent() {
  const select = $("addLcAgentSelect");
  const agent = select.value;
  if (!agent) return;
  if (_currentLcAgents.includes(agent)) {
    toast("Agent already added", "error");
    return;
  }
  _currentLcAgents.push(agent);
  select.value = "";
  renderLcAgentsChips();
}

function removeLcAgent(agent) {
  _currentLcAgents = _currentLcAgents.filter(a => a !== agent);
  renderLcAgentsChips();
}

function renderLcAgentsChips() {
  const container = $("lcAgentsContainer");
  if (_currentLcAgents.length === 0) {
    container.innerHTML = '<span style="color: #64748b; font-size: 10px; font-style: italic;">None assigned</span>';
    return;
  }
  container.innerHTML = _currentLcAgents.map(agent => `
    <span style="display: inline-flex; align-items: center; gap: 3px; padding: 3px 8px; background: #1e40af; color: white; border-radius: 10px; font-size: 10px;">
      ${agent}
      <button type="button" onclick="removeLcAgent('${agent}')" style="background: none; border: none; color: white; cursor: pointer; font-size: 12px; padding: 0 2px; line-height: 1;">×</button>
    </span>
  `).join('');
}

function addPtoAgent() {
  const select = $("addPtoAgentSelect");
  const agent = select.value;
  if (!agent) return;
  if (_currentPtoAgents.includes(agent)) {
    toast("Agent already added", "error");
    return;
  }
  _currentPtoAgents.push(agent);
  select.value = "";
  renderPtoAgentsChips();
}

function removePtoAgent(agent) {
  _currentPtoAgents = _currentPtoAgents.filter(a => a !== agent);
  renderPtoAgentsChips();
}

function renderPtoAgentsChips() {
  const container = $("allHandsPtoAgents");
  if (_currentPtoAgents.length === 0) {
    container.innerHTML = '<span style="color: #64748b; font-size: 10px; font-style: italic;">None</span>';
    return;
  }
  container.innerHTML = _currentPtoAgents.map(agent => `
    <span style="display: inline-flex; align-items: center; gap: 3px; padding: 3px 8px; background: #9d174d; color: white; border-radius: 10px; font-size: 10px;">
      ${agent}
      <button type="button" onclick="removePtoAgent('${agent}')" style="background: none; border: none; color: white; cursor: pointer; font-size: 12px; padding: 0 2px; line-height: 1;">×</button>
    </span>
  `).join('');
}

async function loadRotationForDate() {
  const date = $("rotationDate").value;
  if (!date) return;
  
  const meetingType = $("rotationMeetingType").value;
  
  // Refresh eligible agents for this date
  try {
    const eligibleRes = await fetch(`/meeting-rotation/eligible?date=${date}&type=${meetingType}`);
    const eligibleData = await eligibleRes.json();
    if (eligibleData.ok) {
      _lcEligibleAgents = eligibleData.historicalLcAgents || [];
      // Re-populate dropdowns with updated eligible agents
      const people = window.__peopleCache || [];
      if (people.length > 0) {
        populateRotationDropdowns(people);
      }
    }
  } catch (e) {
    console.error("Failed to refresh LC eligible agents:", e);
  }
  
  try {
    const res = await fetch(`/meeting-rotation/list?start=${date}&end=${date}`);
    const data = await res.json();
    
    if (data.rotations && data.rotations.length > 0) {
      const r = data.rotations[0];
      $("rotationMeetingType").value = r.meetingType || "thursday";
      $("rotationTimeEST").value = r.meetingTimeEST || "3:00 PM - 4:15 PM";
      $("rotationTimePST").value = r.meetingTimePST || "";
      $("rotationCaptain").value = r.captain || "";
      $("rotationBackup1").value = r.backup1 || "";
      $("rotationBackup2").value = r.backup2 || "";
      $("rotationNotes").value = r.notes || "";
      _currentLcAgents = r.lcAgents || [];
      _currentPtoAgents = r.allHandsPtoAgents || [];
      onMeetingTypeChange();
      convertMeetingTime();
    } else {
      // Clear for new date
      $("rotationCaptain").value = "";
      $("rotationBackup1").value = "";
      $("rotationBackup2").value = "";
      $("rotationNotes").value = "";
      _currentLcAgents = [];
      _currentPtoAgents = [];
    }
    renderLcAgentsChips();
    renderPtoAgentsChips();
  } catch (err) {
    console.error("Error loading rotation:", err);
  }
}

async function loadRotationHistory() {
  try {
    const res = await fetch('/meeting-rotation/list');
    const data = await res.json();
    
    const historyEl = $("rotationHistory");
    if (!data.rotations || data.rotations.length === 0) {
      historyEl.innerHTML = '<div style="color: var(--text-secondary);">No rotations saved yet.</div>';
      return;
    }
    
    historyEl.innerHTML = data.rotations.slice(0, 12).map(r => {
      const typeEmoji = r.meetingType === "allhands" ? "🎉" : r.meetingType === "wednesday" ? "📆" : "📅";
      const lcCount = (r.lcAgents || []).length;
      return `
        <div style="padding: 6px 8px; border-bottom: 1px solid var(--border-color); background: var(--bg-tertiary); margin-bottom: 4px; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 600; cursor: pointer;" onclick="loadRotationByDate('${r.date}')" title="Click to edit">${typeEmoji} ${r.date}</span>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span style="font-size: 10px; color: var(--text-secondary);">${r.meetingTimePST || ''}</span>
              <button type="button" onclick="deleteRotation('${r.date}')" style="background: none; border: none; color: #dc2626; cursor: pointer; font-size: 12px; padding: 2px;" title="Delete">🗑️</button>
            </div>
          </div>
          <div style="font-size: 10px; color: var(--text-secondary); margin-top: 2px;">
            Capt: <strong>${r.captain || '-'}</strong> | 
            Backups: ${r.backup1 || '-'}, ${r.backup2 || '-'} | 
            LC: ${lcCount}
          </div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error("Error loading rotation history:", err);
  }
}

// Load a specific rotation by date
function loadRotationByDate(date) {
  $("rotationDate").value = date;
  loadRotationForDate();
}

// Delete a rotation
async function deleteRotation(date) {
  const result = await Swal.fire({
    title: 'Delete Rotation?',
    text: `Remove meeting rotation for ${date}? This will also remove it from agent schedules.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, Delete',
    confirmButtonColor: '#dc2626'
  });
  
  if (!result.isConfirmed) return;
  
  try {
    const res = await fetch('/meeting-rotation/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date })
    });
    const data = await res.json();
    
    if (data.ok) {
      toast("✅ Rotation deleted", "success");
      loadRotationHistory();
      loadFairnessStats();
      // Clear form if viewing this date
      if ($("rotationDate").value === date) {
        $("rotationCaptain").value = "";
        $("rotationBackup1").value = "";
        $("rotationBackup2").value = "";
        $("rotationNotes").value = "";
        _currentLcAgents = [];
        _currentPtoAgents = [];
        renderLcAgentsChips();
        renderPtoAgentsChips();
      }
    } else {
      toast(data.error || "Failed to delete", "error");
    }
  } catch (err) {
    toast("Error deleting rotation", "error");
    console.error(err);
  }
}

async function loadFairnessStats() {
  const statsEl = $("fairnessStats");
  statsEl.innerHTML = '<div style="color: var(--text-secondary);">Loading fairness data...</div>';
  
  try {
    const res = await fetch('/meeting-rotation/fairness?weeks=12');
    const data = await res.json();
    
    if (!data.ok || !data.fairnessReport) {
      statsEl.innerHTML = '<div style="color: var(--text-secondary);">Could not load fairness data.</div>';
      return;
    }
    
    // Filter to people with assignments
    const report = data.fairnessReport.filter(p => p.meetingsMissed > 0 || p.asBackup > 0);
    
    if (report.length === 0) {
      statsEl.innerHTML = '<div style="color: var(--text-secondary);">No rotation history yet. Save some rotations first!</div>';
      return;
    }
    
    statsEl.innerHTML = `
      <div style="margin-bottom: 8px; font-size: 10px; color: var(--text-secondary);">
        📊 Last ${data.lookbackWeeks} weeks (${data.totalMeetings} meetings tracked)
      </div>
      <table style="width: 100%; font-size: 10px; border-collapse: collapse;">
        <tr style="background: var(--card-bg);">
          <th style="padding: 6px; text-align: left; border-bottom: 2px solid var(--border-color);">Agent</th>
          <th style="padding: 6px; text-align: center; border-bottom: 2px solid var(--border-color);" title="As Backup (attends meeting)">Backup</th>
          <th style="padding: 6px; text-align: center; border-bottom: 2px solid var(--border-color);" title="As LC Agent (misses meeting)">LC Agent</th>
          <th style="padding: 6px; text-align: center; border-bottom: 2px solid var(--border-color);" title="Total meetings missed">Missed</th>
        </tr>
        ${report.slice(0, 20).map(p => `
          <tr style="border-bottom: 1px solid var(--border-color);">
            <td style="padding: 5px;">${p.name}</td>
            <td style="padding: 5px; text-align: center; color: #10b981;">${p.asBackup || '-'}</td>
            <td style="padding: 5px; text-align: center; color: #3b82f6;">${p.asLcAgent || '-'}</td>
            <td style="padding: 5px; text-align: center; font-weight: 700; color: ${p.meetingsMissed > 3 ? '#dc2626' : p.meetingsMissed > 1 ? '#f59e0b' : '#16a34a'};">
              ${p.meetingsMissed}
            </td>
          </tr>
        `).join('')}
      </table>
      <div style="margin-top: 8px; font-size: 9px; color: var(--text-secondary);">
        💡 Tip: Assign people with <span style="color: #16a34a;">fewer</span> missed meetings as LC Agents for fairness.
      </div>
    `;
  } catch (err) {
    console.error("Error loading fairness stats:", err);
    statsEl.innerHTML = '<div style="color: var(--text-secondary);">Error loading fairness data.</div>';
  }
}

async function saveRotation() {
  const date = $("rotationDate").value;
  const meetingType = $("rotationMeetingType").value;
  const meetingTimeEST = $("rotationTimeEST").value;
  const meetingTimePST = $("rotationTimePST").value;
  const captain = $("rotationCaptain").value;
  const backup1 = $("rotationBackup1").value;
  const backup2 = $("rotationBackup2").value;
  const notes = $("rotationNotes").value;
  
  if (!date) return toast("Please select a date", "error");
  if (!captain) return toast("Please select a Captain", "error");
  
  try {
    const res = await fetch('/meeting-rotation/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        date, 
        meetingType,
        meetingTimeEST,
        meetingTimePST,
        captain, 
        backup1, 
        backup2,
        lcAgents: _currentLcAgents,
        notes,
        allHandsPtoAgents: _currentPtoAgents,
        manager: window._myName || "Admin"
      })
    });
    const data = await res.json();
    
    if (data.ok) {
      let msg = "✅ Rotation saved!";
      if (meetingType === "allhands" && _currentPtoAgents.length > 0) {
        msg += ` +1h PTO credited to ${_currentPtoAgents.length} agent(s).`;
      }
      toast(msg, "success");
      loadRotationHistory();
      loadFairnessStats();
    } else {
      toast(data.error || "Failed to save", "error");
    }
  } catch (err) {
    toast("Error saving rotation", "error");
    console.error(err);
  }
}

// ============================================
// WEEKLY ASSIGNMENTS MODAL FUNCTIONS
// ============================================
async function openWeeklyAssignmentsModal() {
  const modal = $("weeklyAssignmentsModal");
  modal.style.display = "flex";
  
  // Populate agent dropdowns - use _peopleMeta or fetch from API
  let people = [];
  if (typeof _peopleMeta !== 'undefined' && Array.isArray(_peopleMeta) && _peopleMeta.length > 0) {
    people = _peopleMeta;
  } else if (window.__peopleCache && Array.isArray(window.__peopleCache) && window.__peopleCache.length > 0) {
    people = window.__peopleCache;
  } else {
    // Fetch from API as fallback
    try {
      const res = await fetch("/people");
      if (res.ok) {
        const data = await res.json();
        people = data.people || [];
        window.__peopleCache = people;
      }
    } catch (e) {
      console.error("Failed to fetch people for weekly assignments modal:", e);
    }
  }
  
  const agentOptions = '<option value="">-- Select --</option>' + 
    people.filter(p => p.active !== false).map(p => `<option value="${p.name}">${p.name}</option>`).join('');
  
  // LC Team Member Tips (new)
  $("weeklyLcTips1").innerHTML = agentOptions;
  $("weeklyLcTips2").innerHTML = agentOptions;
  // Regular Team Member Tips
  $("weeklyTips1").innerHTML = agentOptions;
  $("weeklyTips2").innerHTML = agentOptions;
  // Moments (now single select)
  $("weeklyMoments").innerHTML = agentOptions;
  $("weeklyWalkthroughs").innerHTML = agentOptions;
  $("weeklyTeamBuilding").innerHTML = agentOptions;
  $("weeklyVolunteer").innerHTML = agentOptions;
  $("weeklyCsatWorkshop").innerHTML = agentOptions;
  
  // Set default to this Monday
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  $("weeklyAssignmentDate").value = monday.toISOString().split('T')[0];
  
  loadWeeklyAssignments();
  loadWeeklyAssignmentHistory();
}

function closeWeeklyAssignmentsModal() {
  $("weeklyAssignmentsModal").style.display = "none";
}

async function loadWeeklyAssignments() {
  const weekOf = $("weeklyAssignmentDate").value;
  if (!weekOf) return;
  
  try {
    const res = await fetch(`/weekly-assignments/list?start=${weekOf}&end=${weekOf}`);
    const data = await res.json();
    
    if (data.assignments && data.assignments.length > 0) {
      const assignment = data.assignments[0];
      const lcTips = assignment.lcTeamMemberTips || [];
      const tips = assignment.teamMemberTips || [];
      const moments = assignment.momentsThatMadeSmile || [];
      
      // LC Team Member Tips (new field)
      $("weeklyLcTips1").value = lcTips[0] || "";
      $("weeklyLcTips2").value = lcTips[1] || "";
      // Regular Team Member Tips
      $("weeklyTips1").value = tips[0] || "";
      $("weeklyTips2").value = tips[1] || "";
      // Moments (now single person)
      $("weeklyMoments").value = moments[0] || "";
      $("weeklyWalkthroughs").value = assignment.ticketWalkthroughs || "";
      $("weeklyTeamBuilding").value = assignment.teamBuilding || "";
      $("weeklyVolunteer").value = assignment.teamBuildingVolunteer || "";
      $("weeklyCsatWorkshop").value = assignment.csatWorkshop || "";
      $("weeklyEvents").value = (assignment.events || []).join(", ");
    } else {
      // Clear fields for new week
      $("weeklyLcTips1").value = "";
      $("weeklyLcTips2").value = "";
      $("weeklyTips1").value = "";
      $("weeklyTips2").value = "";
      $("weeklyMoments").value = "";
      $("weeklyWalkthroughs").value = "";
      $("weeklyTeamBuilding").value = "";
      $("weeklyVolunteer").value = "";
      $("weeklyCsatWorkshop").value = "";
      $("weeklyEvents").value = "";
    }
  } catch (err) {
    console.error("Error loading weekly assignments:", err);
  }
}

async function loadWeeklyAssignmentHistory() {
  try {
    const res = await fetch('/weekly-assignments/list');
    const data = await res.json();
    
    const historyEl = $("weeklyAssignmentHistory");
    if (!data.assignments || data.assignments.length === 0) {
      historyEl.innerHTML = '<div style="color: var(--text-secondary);">No assignments saved yet.</div>';
      return;
    }
    
    historyEl.innerHTML = data.assignments.slice(0, 8).map(a => {
      const lcTips = (a.lcTeamMemberTips || []).join(', ') || '-';
      const tips = (a.teamMemberTips || []).join(', ') || '-';
      const moments = (a.momentsThatMadeSmile || []).join(', ') || '-';
      return `
        <div style="padding: 6px 0; border-bottom: 1px solid var(--border-color);">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 600; cursor: pointer;" onclick="loadWeeklyAssignmentByDate('${a.weekOf}')" title="Click to edit">${a.weekOf}</span>
            <button type="button" onclick="deleteWeeklyAssignment('${a.weekOf}')" style="background: none; border: none; color: #dc2626; cursor: pointer; font-size: 12px; padding: 2px;" title="Delete">🗑️</button>
          </div>
          <div style="color: var(--text-secondary); font-size: 10px;">LC Tips: ${lcTips} | Tips: ${tips} | Moments: ${moments}</div>
        </div>
      `;
    }).join('');
  } catch (err) {
    console.error("Error loading assignment history:", err);
  }
}

// Load a specific weekly assignment by date
function loadWeeklyAssignmentByDate(weekOf) {
  $("weeklyAssignmentDate").value = weekOf;
  loadWeeklyAssignmentForDate(weekOf);
}

// Load weekly assignment for a specific date
async function loadWeeklyAssignmentForDate(weekOf) {
  try {
    const res = await fetch(`/weekly-assignments/list?start=${weekOf}&end=${weekOf}`);
    const data = await res.json();
    
    if (data.assignments && data.assignments.length > 0) {
      const a = data.assignments[0];
      // LC Team Member Tips (new)
      $("weeklyLcTips1").value = (a.lcTeamMemberTips || [])[0] || "";
      $("weeklyLcTips2").value = (a.lcTeamMemberTips || [])[1] || "";
      // Regular Team Member Tips
      $("weeklyTips1").value = (a.teamMemberTips || [])[0] || "";
      $("weeklyTips2").value = (a.teamMemberTips || [])[1] || "";
      // Moments (single person now)
      $("weeklyMoments").value = (a.momentsThatMadeSmile || [])[0] || "";
      $("weeklyWalkthroughs").value = a.ticketWalkthroughs || "";
      $("weeklyCsatWorkshop").value = a.csatWorkshop || "";
      $("weeklyTeamBuilding").value = a.teamBuilding || "";
      $("weeklyVolunteer").value = a.teamBuildingVolunteer || "";
      $("weeklyEvents").value = (a.events || []).join(", ");
    }
  } catch (err) {
    console.error("Error loading weekly assignment:", err);
  }
}

// Delete a weekly assignment
async function deleteWeeklyAssignment(weekOf) {
  const result = await Swal.fire({
    title: 'Delete Weekly Assignment?',
    text: `Remove assignments for week of ${weekOf}?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Yes, Delete',
    confirmButtonColor: '#dc2626'
  });
  
  if (!result.isConfirmed) return;
  
  try {
    const res = await fetch('/weekly-assignments/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekOf })
    });
    const data = await res.json();
    
    if (data.ok) {
      toast("✅ Weekly assignment deleted", "success");
      loadWeeklyAssignmentHistory();
      // Clear form if viewing this date
      if ($("weeklyAssignmentDate").value === weekOf) {
        $("weeklyLcTips1").value = "";
        $("weeklyLcTips2").value = "";
        $("weeklyTips1").value = "";
        $("weeklyTips2").value = "";
        $("weeklyMoments").value = "";
        $("weeklyWalkthroughs").value = "";
        $("weeklyCsatWorkshop").value = "";
        $("weeklyTeamBuilding").value = "";
        $("weeklyVolunteer").value = "";
        $("weeklyEvents").value = "";
      }
    } else {
      toast(data.error || "Failed to delete", "error");
    }
  } catch (err) {
    toast("Error deleting assignment", "error");
    console.error(err);
  }
}

async function saveWeeklyAssignments() {
  const weekOf = $("weeklyAssignmentDate").value;
  
  if (!weekOf) return toast("Please select a week", "error");
  
  // LC Team Member Tips (new)
  const lcTeamMemberTips = [$("weeklyLcTips1").value, $("weeklyLcTips2").value].filter(Boolean);
  // Regular Team Member Tips
  const teamMemberTips = [$("weeklyTips1").value, $("weeklyTips2").value].filter(Boolean);
  // Moments (single person now)
  const momentsThatMadeSmile = [$("weeklyMoments").value].filter(Boolean);
  const ticketWalkthroughs = $("weeklyWalkthroughs").value;
  const teamBuilding = $("weeklyTeamBuilding").value;
  const teamBuildingVolunteer = $("weeklyVolunteer").value;
  const csatWorkshop = $("weeklyCsatWorkshop").value;
  const eventsStr = $("weeklyEvents").value;
  const events = eventsStr ? eventsStr.split(',').map(e => e.trim()).filter(Boolean) : [];
  
  try {
    const res = await fetch('/weekly-assignments/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        weekOf, 
        lcTeamMemberTips,
        teamMemberTips, 
        momentsThatMadeSmile, 
        ticketWalkthroughs,
        teamBuilding,
        teamBuildingVolunteer,
        csatWorkshop,
        events
      })
    });
    const data = await res.json();
    
    if (data.ok) {
      toast("✅ Weekly assignments saved!", "success");
      loadWeeklyAssignmentHistory();
    } else {
      toast(data.error || "Failed to save", "error");
    }
  } catch (err) {
    toast("Error saving assignments", "error");
    console.error(err);
  }
}

  // ============================================
  // [SECTION 11] TIME OFF & PTO
  // ============================================
  async function submitTimeOff() {
    const reason = $("agToReason") ? $("agToReason").value : "";
    if (!reason) return toast("Please enter a reason", "error");
    const dateStr = _editing ? _editing.dateISO : new Date().toISOString().split("T")[0];
    
    // NEW: Grab shift times from the global _editing variable
    const sStart = _editing ? _editing.startLabel : "";
    const sEnd = _editing ? _editing.endLabel : "";
    const teamName = _editing ? _editing.team : "";
    const radioSelected = document.querySelector('input[name="timeOffType"]:checked');
    const timeOffType = radioSelected ? radioSelected.value : "Make Up";
    
    // Handle multiple make-up dates
    let makeUpDate = getMakeUpDatesString(); // Use new multi-date function
    let makeUpDates = [..._selectedMakeUpDates];
    
    // Fallback to single input if no dates added via chips
    if (makeUpDates.length === 0) {
      const singleDate = $("agMakeUpDate") ? $("agMakeUpDate").value : "";
      if (singleDate) {
        makeUpDate = singleDate;
        makeUpDates = [singleDate];
      }
    }
    
    if (timeOffType === "Make Up" && makeUpDates.length === 0) {
      return toast("Please add at least one Make Up date", "error");
    } 
    
    // NEW: Grab duration from radio
    const durationSelected = document.querySelector('input[name="timeOffDuration"]:checked');
    const durationVal = durationSelected ? durationSelected.value : "shift";

    // ✅ VALIDATE PTO BALANCE
    if (timeOffType === "PTO") {
      const balance = _balanceData.get(window._myName) || { pto: 0, sick: 0 };
      const currentPto = parseFloat(balance.pto) || 0;

      // Calculate hours needed (rough estimate)
      let hoursNeeded = durationVal === "full_day" ? 8 : 4;

      if (currentPto < hoursNeeded) {
        const result = await Swal.fire({
          title: '⚠️ Insufficient PTO Balance',
          html: `
            <div style="text-align: left; font-size: 14px; line-height: 1.6;">
              <p><strong>Current PTO Balance:</strong> ${currentPto} hours</p>
              <p><strong>Estimated Needed:</strong> ${hoursNeeded} hours</p>
              <p style="color: #dc2626; font-weight: 600;">You do not have enough PTO for this request.</p>
              <p style="margin-top: 12px; padding: 12px; background: #fef3c7; border-left: 3px solid #f59e0b; border-radius: 4px;">
                💡 <strong>Consider using "Make Up" instead:</strong> Work at another time without using PTO hours.
              </p>
            </div>
          `,
          icon: 'warning',
          showCancelButton: false,
          confirmButtonText: 'OK',
          confirmButtonColor: '#dc2626'
        });
        return; // Block the request
      } else if (currentPto < hoursNeeded + 4) {
        // Warn if balance would be low after request
        const result = await Swal.fire({
          title: '⚠️ Low PTO Balance Warning',
          html: `
            <div style="text-align: left; font-size: 14px; line-height: 1.6;">
              <p><strong>Current PTO Balance:</strong> ${currentPto} hours</p>
              <p><strong>Estimated After Request:</strong> ~${Math.max(0, currentPto - hoursNeeded)} hours</p>
              <p style="color: #f59e0b; font-weight: 600;">Your PTO balance will be low after this request.</p>
              <p style="margin-top: 12px;">Do you want to continue?</p>
            </div>
          `,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'Yes, Continue',
          cancelButtonText: 'Cancel',
          confirmButtonColor: '#f59e0b'
        });
        if (!result.isConfirmed) return;
      }
    }

    const btn = event.currentTarget;
    const originalText = btn.innerText;
    btn.innerText = "Sending...";
    btn.disabled = true;
    try {
      const res = await fetch('./?action=timeoff/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person: window._myName,
          type: timeOffType,
          makeUpDate: makeUpDate, // Comma-separated for compatibility
          makeUpDates: makeUpDates, // Array of dates
          reason: reason,
          date: dateStr,
          shiftStart: sStart,
          shiftEnd: sEnd,
          team: teamName, // <--- Sending Team Name
          duration: durationVal,
          category: "pto"
        })
      });
    const data = await res.json();

    if (data.ok) {
      closeAgentModal(); // This calls the function to close the window
      resetMakeUpDates(); // Clear the selected dates

      // Show different messages for Make Up vs PTO
      if (timeOffType === "Make Up") {
        // Format dates nicely
        const formattedDates = makeUpDates.map(d => {
          const date = new Date(d + 'T12:00:00');
          return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        }).join('<br>• ');
        
        Swal.fire({
          title: 'Make-Up Request Sent!',
          html: `
            <div style="text-align: left; font-size: 14px; line-height: 1.6;">
              <p>Your manager has been notified.</p>
              <p style="margin-top: 12px; padding: 12px; background: #dbeafe; border-left: 3px solid #b37e78; border-radius: 4px;">
                📌 <strong>Remember to make up time on:</strong><br>• ${formattedDates}
              </p>
            </div>
          `,
          icon: 'success',
          confirmButtonColor: '#b37e78'
        });
      } else {
        Swal.fire({
          title: 'PTO Request Sent!',
          text: 'Your manager has been notified.',
          icon: 'success',
          confirmButtonColor: '#b37e78'
        });
      }
      $("agToReason").value = "";
    } else {
      throw new Error(data.error || "Server rejected request");
    }
  } catch (err) {
    console.error(err);
    toast(`Error: ${err.message}`, "error");
  } finally {
    btn.innerText = originalText;
    btn.disabled = false;
  }
}
function closeAgentModal() {
  const modal = document.getElementById('agentOverlay'); // Note: Your HTML ID is 'agentOverlay', not 'agentModal'
  if (modal) {
    modal.style.display = "none";
  } else {
    console.error("Agent modal not found!");
  }
}

// Open swap shift modal - shows list of agent's upcoming shifts to swap
async function openSwapShiftModal() {
  const myName = window._myName || '';
  if (!myName) {
    toast("Please log in to swap shifts", "error");
    return;
  }
  
  const allData = window._filteredData || window._data || [];
  const today = new Date().toISOString().split('T')[0];
  
  // Get my upcoming shifts
  const myShifts = allData
    .filter(s => s.person && s.person.toLowerCase().trim() === myName.toLowerCase().trim())
    .filter(s => s.date >= today)
    .sort((a, b) => {
      if (a.date !== b.date) return (a.date || '').localeCompare(b.date || '');
      return (a.start || '').localeCompare(b.start || '');
    })
    .slice(0, 10); // Show next 10 shifts
  
  if (myShifts.length === 0) {
    toast("No upcoming shifts found to swap", "info");
    return;
  }
  
  // Build shift selection list
  const shiftListHtml = myShifts.map((shift, idx) => {
    const d = new Date(shift.date + 'T12:00:00');
    const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return `
      <div class="swap-shift-option" onclick="selectShiftForSwap(${idx})" data-idx="${idx}" 
           style="padding: 14px 16px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 10px; margin-bottom: 8px; cursor: pointer; transition: all 0.15s ease;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 700; font-size: 14px; color: var(--text-primary);">${dateStr}</div>
            <div style="font-size: 13px; color: var(--text-secondary);">${shift.startLabel || shift.start} - ${shift.endLabel || shift.end}</div>
          </div>
          <div style="background: var(--accent-primary); color: white; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600;">
            ${shift.team || 'General'}
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // Store shifts for later reference
  window._swapShiftOptions = myShifts;
  
  const result = await Swal.fire({
    title: '🔄 Swap a Shift',
    html: `
      <div style="text-align: left; margin-bottom: 12px;">
        <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">Select a shift you want to swap with a teammate:</p>
        <div id="swapShiftList" style="max-height: 350px; overflow-y: auto;">
          ${shiftListHtml}
        </div>
      </div>
    `,
    showConfirmButton: false,
    showCancelButton: true,
    cancelButtonText: 'Close',
    width: 480,
    customClass: {
      popup: 'swal-dark-mode'
    }
  });
}

// Called when a shift is selected in the swap modal
function selectShiftForSwap(idx) {
  Swal.close();
  const shift = window._swapShiftOptions?.[idx];
  if (shift) {
    openAgentActionModal(shift);
    // Auto-show swap form after a small delay
    setTimeout(() => {
      showAgentForm('swap');
    }, 100);
  }
}

// Show open shifts panel
async function showOpenShiftsPanel() {
  try {
    const res = await fetch('/open-shifts');
    const data = await res.json();
    
    if (!data.ok || !data.openShifts || data.openShifts.length === 0) {
      toast("No open shifts available right now", "info");
      return;
    }
    
    const shiftsHtml = data.openShifts.map(shift => {
      const d = new Date(shift.date + 'T12:00:00');
      const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      const shiftId = `${shift.docId}|${shift.assignmentId}`;
      return `
        <div style="padding: 14px 16px; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 10px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div>
              <div style="font-weight: 700; font-size: 14px; color: var(--text-primary);">${dateStr}</div>
              <div style="font-size: 13px; color: var(--text-secondary);">${shift.startLabel || shift.start || '--'} - ${shift.endLabel || shift.end || '--'}</div>
            </div>
            <div style="background: var(--accent-primary); color: white; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600;">
              ${shift.team || 'General'}
            </div>
          </div>
          ${shift.openReason ? `<div style="font-size: 12px; color: var(--text-tertiary); margin-bottom: 10px; font-style: italic;">${shift.openReason}</div>` : ''}
          <button onclick="claimOpenShift('${shiftId}')" 
                  style="width: 100%; padding: 10px; background: linear-gradient(135deg, var(--modal-gradient-start) 0%, var(--modal-gradient-end) 100%); color: white; border: none; border-radius: 8px; font-size: 12px; font-weight: 600; cursor: pointer;">
            Claim This Shift
          </button>
        </div>
      `;
    }).join('');
    
    await Swal.fire({
      title: '📢 Open Shifts',
      html: `
        <div style="text-align: left;">
          <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">These shifts need coverage. Claim one to help your team!</p>
          <div style="max-height: 400px; overflow-y: auto;">
            ${shiftsHtml}
          </div>
        </div>
      `,
      showConfirmButton: false,
      showCancelButton: true,
      cancelButtonText: 'Close',
      width: 480,
      customClass: {
        popup: 'swal-dark-mode'
      }
    });
  } catch (err) {
    console.error("Error loading open shifts:", err);
    toast("Failed to load open shifts", "error");
  }
}

// Claim an open shift
async function claimOpenShift(shiftId) {
  const myName = window._myName || '';
  if (!myName) {
    toast("Please log in to claim shifts", "error");
    return;
  }
  
  const result = await Swal.fire({
    title: 'Claim This Shift?',
    text: 'Are you sure you want to volunteer for this shift?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Yes, Claim It',
    confirmButtonColor: '#b37e78'
  });
  
  if (!result.isConfirmed) return;
  
  // Parse the shiftId (format: docId|assignmentId)
  const [docId, assignmentId] = shiftId.split('|');
  
  try {
    const res = await fetch('/open-shifts/fill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        docId,
        assignmentId,
        agentName: myName,
        notifyAgent: false
      })
    });
    const data = await res.json();
    
    if (data.ok) {
      Swal.close();
      toast("✅ Shift claimed! It will appear in your schedule soon.", "success");
      // Refresh the open shifts display
      if (typeof updateAgentOpenShifts === 'function') updateAgentOpenShifts();
      // Refresh schedule if possible
      if (typeof loadSchedule === 'function') loadSchedule();
    } else {
      toast(data.error || "Failed to claim shift", "error");
    }
  } catch (err) {
    console.error("Error claiming shift:", err);
    toast("Failed to claim shift", "error");
  }
}


  async function submitSwap() {
    const targetPerson = $("agSwapPerson") ? $("agSwapPerson").value : "";
    const note = $("agSwapNote") ? $("agSwapNote").value : "";
    if (!targetPerson) return toast("Select a co-worker");
    if (!_editing) return toast("No shift selected");
    try {
      const res = await fetch('./?action=swap/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromPerson: window._myName,
          toPerson: targetPerson,
          shiftDate: _editing.dateISO || _editing.date,
          shiftStart: _editing.startLabel || _editing.start,
          shiftEnd: _editing.endLabel || _editing.end,
          team: _editing.team,
          docId: _editing.docId,
          assignmentId: _editing.assignmentId,
          note: note
        })
      });
      
      const data = await res.json();
      
      if (data.ok) {
        closeAgentModal();
        toast(`✅ Swap request sent to ${targetPerson}`, "success");
      } else {
        toast("Failed to send swap request: " + (data.error || "Unknown error"), "error");
      }
    } catch (err) {
      console.error("Swap request error:", err);
      toast("Failed to send swap request", "error");
    }
  }
  // --- 7. INTERACTIONS (Manager) ---
  function openReplaceModal(it) {
      _editing = it;
      $("mSub").textContent = `${it.dateLabel} • ${it.startLabel} • ${it.person}`;
      $("mNotes").value = it.notes || "";
      
      // Check for current "OFF" status
      const isOff = it.notes && it.notes.includes("[OFF]");
      const btn = $("actionBtn");
      if (isOff) { 
          // VISUAL: Green "Restore" state
          btn.innerHTML = "♻️ Restore Shift"; 
          btn.style.color = "#15803d"; 
          btn.style.borderColor = "#bbf7d0"; 
          btn.style.background = "#f0fdf4";
          // Change the function it calls
          btn.onclick = restoreShift; 
      } else { 
          // VISUAL: Red "Mark Off" state
          btn.innerHTML = "⛔ Mark Off"; 
          btn.style.color = "#ef4444"; 
          btn.style.borderColor = "#fecaca"; 
          btn.style.background = "#fef2f2";
          // Change the function it calls
          btn.onclick = markTimeOff; 
      }
      $("modalOverlay").style.display = "flex";
      fillSelect("mNewPerson", _people.filter(p => p !== it.person), false);
  }
  async function saveReplace() {
  if (! _editing) return;
  const newP = document.getElementById("mNewPerson").value;
  if (! newP) return toast("Select person");
  const notes = document.getElementById("mNotes").value;
  const notifyMode = document.getElementById("mNotify").value;
  const originalPerson = _editing.person;
  const originalNotes = _editing.notes || "";
  
  // ============================================
  // CHECK FOR DOUBLE BOOKING BEFORE REPLACING
  // ============================================
  try {
    const conflictRes = await fetch('./?action=schedule/check-conflict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        personName: newP,
        date: _editing.dateISO || _editing.date,
        startTime: _editing.start || _editing.startLabel,
        endTime: _editing.end || _editing.endLabel,
        excludeAssignmentId: _editing.assignmentId
      })
    });
    const conflictData = await conflictRes.json();
    
    if (conflictData.ok && conflictData.hasConflict && conflictData.conflicts.length > 0) {
      // Check if any conflicts are lunch-related
      const hasLunchConflict = conflictData.conflicts.some(c => c.isLunchConflict);
      
      // Show double booking warning with special lunch styling
      const conflictsList = conflictData.conflicts.map(c => {
        const icon = c.isLunchConflict ? '🍽️' : '⚠️';
        const style = c.isLunchConflict ? 'color:#dc2626; font-weight:700;' : '';
        return `<div style="${style}">${icon} ${c.team}: ${c.start}-${c.end}${c.isLunchConflict ? ' <b>(LUNCH!)</b>' : ''}</div>`;
      }).join('');
      
      const result = await Swal.fire({
        title: hasLunchConflict ? '🍽️ Lunch Conflict!' : '⚠️ Double Booking Detected',
        html: `
          <div style="text-align:left; padding:12px; background:${hasLunchConflict ? '#fef2f2' : '#fef3c7'}; border-radius:8px; border:1px solid ${hasLunchConflict ? '#fecaca' : '#fcd34d'};">
            <p style="margin:0 0 8px 0; font-weight:600;">${newP} is already scheduled:</p>
            ${conflictsList}
          </div>
          ${hasLunchConflict ? 
            '<p style="margin-top:12px; font-size:13px; color:#dc2626; font-weight:600;">⚠️ This would schedule during their lunch break!</p>' :
            '<p style="margin-top:12px; font-size:13px; color:#64748b;">Do you want to continue anyway?</p>'
          }
        `,
        icon: hasLunchConflict ? 'error' : 'warning',
        showCancelButton: true,
        confirmButtonColor: hasLunchConflict ? '#dc2626' : '#f59e0b',
        cancelButtonColor: '#64748b',
        confirmButtonText: hasLunchConflict ? 'Override Lunch' : 'Yes, Assign Anyway',
        cancelButtonText: 'Cancel'
      });
      
      if (!result.isConfirmed) {
        return; // User cancelled
      }
    }
  } catch (err) {
    console.warn("Conflict check failed, continuing:", err);
  }
  // Find the real local record
  const local = _allData.find(x =>
    String(x.assignmentId) === String(_editing.assignmentId) &&
    String(x.docId) === String(_editing.docId)
  ) || _editing;
  
  // ============================================
  // AUTO-ADD REPLACEMENT INFO TO NOTES
  // ============================================
  let enhancedNotes = notes;
  if (originalPerson && originalPerson !== newP && originalPerson !== "Unassigned") {
    // Check if notes already contains replacement info
    if (!notes.toLowerCase().includes("replaced") && !notes.toLowerCase().includes("covering")) {
      enhancedNotes = notes ? `${notes} [Replaced ${originalPerson}]` : `[Replaced ${originalPerson}]`;
    }
  }
  
  // Close modal + optimistic UI update
  document.getElementById("modalOverlay").style.display = "none";
  toast("Updating...");
  local.person = newP;
  local.notes = enhancedNotes;
  local.originalPerson = originalPerson; // Store for UI display
  renderView();
  const payload = {
    docId: _editing.docId,
    assignmentId: _editing.assignmentId,
    newPerson: newP,
    notes: enhancedNotes,
    notifyMode: notifyMode,
    originalPerson: originalPerson // Send to backend for tracking
  };
  
  try {
    const response = await fetch('./?action=assignment/replace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const res = await response.json();
    
    if (res.ok || res.status === "success") {
      // Clear cache if agent
      if (! window._isManager && window._myName) {
        clearScheduleCache();
      }
      // Log to audit
      logAuditEntry({
        action: "REPLACE",
        manager: window._myName || window._myEmail,
        target: newP,
        date: local.dateLabel,
        details: `Replaced ${originalPerson} with ${newP} (${local.startLabel})`
      });
      // Handle Notifications
      if (res?.updated?.notifyStatus === "Pending" || notifyMode === "defer") {
        playNotificationSound();
        
        // NOTE: Do NOT add to local _notifQueue because the backend already
        // tracks this notification with notifyStatus='Pending'. 
        // loadPendingNotifications() will fetch it from the backend.
        // Only add undo data separately if needed.
        
        // Store undo data separately for this shift
        const undoKey = `undo_${_editing.docId}_${_editing.assignmentId}`;
        localStorage.setItem(undoKey, JSON.stringify({
          docId: _editing.docId,
          assignmentId: _editing.assignmentId,
          originalPerson: originalPerson,
          originalNotes: originalNotes
        }));
        
        toast("Added to Pending Queue");
        
        // Refresh the notification panel to show backend-tracked notification
        const panel = document.getElementById("notifPanel");
        
        if (panel) {
          panel.style.display = "block";
          panel.classList.add("open");
          loadPendingNotifications(); // This loads from backend
        }
        updateNotifBadge();
      } else {
        playSendSound();
        toast("Saved & Sent");
      }
    } else {
      throw new Error(res.error || res.message || "Unknown error");
    }
  } catch (err) {
    // Rollback UI on failure
    local.person = originalPerson;
    local.notes = originalNotes;
    renderView();
    toast(`Replace failed: ${err.message || err}`);
    console.error("Replace failed:", err);
  }
}
  function checkUrlNotifs() {
    // Use standard URL API instead of google.script.url
    try {
      const hash = window.location.hash;
      if (hash && hash.includes("notif=")) {
        const rawMsg = hash.split("notif=")[1];
        const msg = decodeURIComponent(rawMsg);
        Swal.fire({
            title: 'Schedule Update',
            html: msg,
            icon: 'info',
            confirmButtonText: 'Got it',
            confirmButtonColor: '#1e293b'
        });
        try { history.replaceState(null, null, ' '); } catch(e) {}
      }
    } catch(e) {
      console.log("URL check error:", e);
    }
  }
  function isBackupShift(shift) {
  const notes = String(shift.notes || "").toLowerCase();
  const patterns = [
    "back up",
    "backup", 
    "coverage",
    "covering",
    "temp",
    "temporary",
    "replacing",
    "replaced",
    "fill in",
    "fill-in",
    "fillin"
  ];
  
  return patterns.some(p => notes.includes(p));
}
function isCaptainShift(shift) {
  const notes = String(shift.notes || "").toLowerCase();
  return notes.includes("captain") || notes.includes("lead") || notes.includes("supervisor");
}

function getShiftRolePriority(shift) {
  const notes = String(shift.notes || "").toLowerCase();
  const role = String(shift.role || "").toLowerCase();
  if (notes.includes("captain") || notes.includes("lead") || notes.includes("supervisor") ||
      role.includes("captain") || role.includes("lead") || role.includes("supervisor")) return 0;
  if (notes.includes("backup") || notes.includes("back up") || notes.includes("coverage") ||
      notes.includes("covering") || notes.includes("temp") || notes.includes("temporary") ||
      notes.includes("replacing") || notes.includes("replaced") || notes.includes("fill in") ||
      notes.includes("fill-in") || notes.includes("fillin") ||
      role.includes("backup") || role.includes("back up")) return 2;
  return 1;
}
  function handleSaveClick() {
     if(!_editing) return;
     const isOff = _editing.notes && _editing.notes.includes("[OFF]");
     if(isOff) restoreShift(); else markTimeOff();
  }
  function markTimeOff(force) {
  if(!_editing) {
    toast("No shift selected", "error");
    return;
  }
  
  // Capture _editing data before async operations
  const editData = { ..._editing };
  
  const doIt = async () => {
    // Validate required fields
    if (!editData.docId || !editData.assignmentId) {
      toast("Missing shift data - cannot mark off", "error");
      console.error("markTimeOff: Missing docId or assignmentId", editData);
      return;
    }
    
    // optimistic UI
    _timeOff.add(`${editData.person}|${editData.dateISO}`);
    
    // Update the actual _editing object if it still exists
    const localItem = _allData.find(x => x.assignmentId === editData.assignmentId);
    if (localItem) {
      localItem.notes = ((localItem.notes || "").replace(/\s*\[OFF\]\s*/g, " ").trim() + " [OFF]").trim();
    }
    
    renderView();
    closeModal();
    toast("Marking person OFF...");
    
    try {
      const response = await fetch('./?action=assignment/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId: editData.docId,
          assignmentId: editData.assignmentId,
          markOff: true
        })
      });
      
      const res = await response.json();
      
      if (res.ok || res.status === "success") {
        if (!window._isManager && window._myName) {
          clearScheduleCache();
        }
        logAuditEntry({
          action: "MARK OFF",
          manager: window._myName || window._myEmail,
          target: editData.person,
          date: editData.dateLabel,
          details: `Marked ${editData.person} as OFF (${editData.startLabel})`
        });
        if (res && res.requireConfirm && !force) {
          Swal.fire({
            title: "Staffing Alert",
            text: res.message,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Mark Off Anyway",
            confirmButtonColor: "#ef4444"
          }).then((r) => { if (r.isConfirmed) markTimeOff(true); });
          return;
        }
        toast("Success: Marked OFF");
      } else {
        throw new Error(res.error || res.message || "Unknown error");
      }
    } catch (err) {
      toast(`Failed: ${err.message || err}`);
      console.error("markTimeOff failed:", err);
      // rollback UI
      _timeOff.delete(`${editData.person}|${editData.dateISO}`);
      if (localItem) {
        localItem.notes = (localItem.notes || "").replace(/\s*\[OFF\]\s*/g, " ").trim();
      }
      renderView();
    }
  };
  if (force) return doIt();
  Swal.fire({
    title: "Mark OFF?",
    text: `Are you sure you want to mark ${editData.person} OFF for this shift?`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, Mark OFF",
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#cbd5e1"
  }).then((r) => { if (r.isConfirmed) doIt(); });
}
  function restoreShift() {
  if (!_editing) {
    toast("No shift selected", "error");
    return;
  }
  
  // Capture _editing data before async operations
  const editData = { ..._editing };
  
  const doIt = async () => {
    // Validate required fields
    if (!editData.docId || !editData.assignmentId) {
      toast("Missing shift data - cannot restore", "error");
      console.error("restoreShift: Missing docId or assignmentId", editData);
      return;
    }
    
    // optimistic UI
    _timeOff.delete(`${editData.person}|${editData.dateISO}`);
    
    // Update the actual item if it still exists
    const localItem = _allData.find(x => x.assignmentId === editData.assignmentId);
    if (localItem) {
      localItem.notes = (localItem.notes || "").replace(/\s*\[OFF\]\s*/g, " ").trim();
    }
    
    renderView();
    closeModal();
    toast("Restoring shift...");
    
    try {
      const response = await fetch('./?action=assignment/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId: editData.docId,
          assignmentId: editData.assignmentId,
          markOff: false
        })
      });
      
      const res = await response.json();
      
      if (res.ok || res.status === "success") {
        if (!window._isManager && window._myName) {
          clearScheduleCache();
        }
        logAuditEntry({
          action: "RESTORE",
          manager: window._myName || window._myEmail,
          target: editData.person,
          date: editData.dateLabel,
          details: `Restored ${editData.person}'s shift (${editData.startLabel})`
        });
        toast("Success: Shift Restored");
      } else {
        throw new Error(res.error || res.message || "Unknown error");
      }
    } catch (e) {
      toast(`Restore failed: ${e.message || e}`);
      console.error("restoreShift failed:", e);
    }
  };
  
  Swal.fire({
    title: "Restore Shift?",
    text: `Remove the OFF status and restore ${editData.person}'s shift?`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Yes, Restore",
    confirmButtonColor: "#15803d",
    cancelButtonColor: "#cbd5e1"
  }).then((r) => { if (r.isConfirmed) doIt(); });
}
// ============================================
// HOLIDAYS MANAGEMENT
// ============================================
let _holidays = new Map(); // date -> { name, theme, emoji }
// Fetch holidays from backend
async function loadHolidays() {
  try {
    const res = await fetch("/?action=holidays/list");
    const data = await res.json();
    
    if (data.ok && data.holidays) {
      _holidays.clear();
      data.holidays.forEach(h => {
        _holidays.set(h.date, {
          name: h.name,
          theme: h.theme || "default",
          emoji: h.emoji || "⭐"
        });
      });
    }
  } catch (err) {
    console.error("Failed to load holidays:", err);
  }
}
// Check if a date is a holiday
function getHoliday(dateStr) {
  return _holidays.get(dateStr) || null;
}
// Open holiday modal
function openHolidayModal() {
  const modal = $("holidayModal");
  if (!modal) return;

  // Show stacked above Admin Tools
  modal.style.display = "flex";
  modal.style.zIndex = "10060";

  renderHolidayList();
}
// Close holiday modal
function closeHolidayModal() {
  $("holidayModal").style.display = "none";
}
// Render holiday list in modal
function renderHolidayList() {
  const container = $("holidayList");
  
  if (_holidays.size === 0) {
    container.innerHTML = `<div style="text-align:center; color:#94a3b8; padding:20px;">No holidays scheduled</div>`;
    return;
  }
  
  // Sort by date
  const sorted = Array.from(_holidays.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  
  container.innerHTML = sorted.map(([date, h]) => {
    const displayDate = new Date(date + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day:  "numeric",
      year: "numeric"
    });
    
    return `
      <div class="holidayItem">
        <div class="holidayInfo">
          <span class="holidayEmoji">${h.emoji}</span>
          <div>
            <div class="holidayName">${h.name}</div>
            <div class="holidayDate">${displayDate}</div>
          </div>
        </div>
        <button class="deleteHolidayBtn" onclick="deleteHoliday('${date}')">🗑️ Delete</button>
      </div>
    `;
  }).join("");
}
// Add a new holiday
async function addHoliday() {
  const date = $("holidayDate").value;
  const name = $("holidayName").value.trim();
  const theme = $("holidayTheme").value;
  const emoji = $("holidayEmoji").value;
  
  if (!date || !name) {
    showToast("Please enter date and name", "error");
    return;
  }
  
  try {
    const res = await fetch("/?action=holidays/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, name, theme, emoji })
    });
    
    const data = await res.json();
    
    if (data.ok) {
      showToast("Holiday added!", "success");
      
      // Update local cache
      _holidays.set(date, { name, theme, emoji });
      
      // Clear form
      $("holidayDate").value = "";
      $("holidayName").value = "";
      
      // Refresh list and calendar
      renderHolidayList();
      renderView();
    } else {
      showToast(data.error || "Failed to add holiday", "error");
    }
  } catch (err) {
    showToast("Error adding holiday", "error");
    console.error(err);
  }
}
// Delete a holiday
async function deleteHoliday(date) {
  if (!confirm("Delete this holiday?")) return;
  
  try {
    const res = await fetch("/?action=holidays/delete", {
      method: "POST",
      headers: { "Content-Type":  "application/json" },
      body: JSON.stringify({ date })
    });
    
    const data = await res.json();
    
    if (data.ok) {
      showToast("Holiday deleted", "success");
      
      // Update local cache
      _holidays.delete(date);
      
      // Refresh list and calendar
      renderHolidayList();
      renderView();
    } else {
      showToast(data.error || "Failed to delete", "error");
    }
  } catch (err) {
    showToast("Error deleting holiday", "error");
    console.error(err);
  }
}
// Load 30 days of past schedule
async function loadPastSchedule() {
  if (_isLoadingMore) return;
  if (_scheduleLoadedPast >= 30) {
    toast("Past 30 days already loaded");
    return;
  }
  
  _isLoadingMore = true;
  const btn = document.getElementById("btnLoadPast");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Loading...";
  }
  toast("Loading past schedule...", "info");
  
  try {
    const res = await fetch('./?action=schedule/past', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        daysBack: 30,
        isManager: window._isManager,
        agentName: window._myName
      })
    });
    
    const data = await res.json();
    
    if (data.ok && data.results) {
      // Process and merge past data into _allData
      const pastShifts = [];
      data.results.forEach(day => {
        if (day.assignments) {
          day.assignments.forEach(a => {
            const docId = String(day.id || "");
            const teamName = (docId.includes("__") ? docId.split("__")[1] : "") || day.team || "General";
            const assignmentId = a.assignmentId ?? a.id ?? "";
            
            // Extract date from docId (format: "2025-01-01__TeamName")
            const dateFromId = docId.includes("__") ? docId.split("__")[0] : "";
            const dateValue = day.date || dateFromId || "";
            const dayKey = dayKeyPST(dateValue) || dateValue;
            
            // Check if this shift already exists
            const exists = _allData.some(x => 
              x.docId === docId && x.assignmentId === assignmentId
            );
            
            if (!exists && dayKey) {
              pastShifts.push({
                ...a,
                docId,
                assignmentId,
                date: dateValue,
                dateISO: dayKey,
                dateLabel: displayDayLabel(dayKey),
                team: teamName,
                startLabel: toAmPm(a.start) || a.start,
                endLabel: toAmPm(a.end) || a.end
              });
            }
          });
        }
      });
      
      // Merge with existing data
      _allData = [...pastShifts, ..._allData];
      
      // Sort by date
      _allData.sort((a, b) => (a.dateISO || "").localeCompare(b.dateISO || ""));
      
      _scheduleLoadedPast = 30;
      updateLoadedRangeLabel();
      
      // Re-apply filters and render
      applyLocalFilters();
      renderView();
      
      toast(`✅ Loaded ${pastShifts.length} past shifts`, "success");
    }
    
  } catch (err) {
    console.error("Error loading past schedule:", err);
    toast("Failed to load past schedule", "error");
  } finally {
    _isLoadingMore = false;
    if (btn) {
      btn.disabled = false;
      btn.textContent = "← Load 30 Days History";
    }
  }
}
// Update the label showing current loaded range
function updateLoadedRangeLabel() {
  const label = document.getElementById("loadedRangeLabel");
  if (!label) return;
  
  let text = "";
  if (_scheduleLoadedPast > 0) {
    text += `${_scheduleLoadedPast}d ago`;
  } else {
    text += "Today";
  }
  text += ` → ${_scheduleLoadedFuture}d ahead`;
  
  label.textContent = text;
  
  // Update button states
  const btnPast = document.getElementById("btnLoadPast");
  const btnFuture = document.getElementById("btnLoadFuture");
  
  if (btnPast) {
    if (_scheduleLoadedPast >= 30) {
      btnPast.style.display = "none";
    } else {
      btnPast.style.display = "";
      btnPast.textContent = "← Load History";
    }
  }
  if (btnFuture) {
    if (_scheduleLoadedFuture >= 60) {
      btnFuture.style.display = "none";
    } else {
      btnFuture.style.display = "";
      btnFuture.textContent = "Load Future →";
    }
  }
}
// Load extended future schedule (up to 60 days)
async function loadExtendedFuture() {
  if (_isLoadingMore) return;
  if (_scheduleLoadedFuture >= 60) {
    toast("60 days future already loaded");
    return;
  }
  
  _isLoadingMore = true;
  const btn = document.getElementById("btnLoadFuture");
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Generating...";
  }
  toast("Loading & generating future schedule...", "info");
  
  try {
    // Start from where we left off
    const today = new Date();
    const startFrom = new Date(today);
    startFrom.setDate(startFrom.getDate() + _scheduleLoadedFuture);
    const startISO = startFrom.toISOString().split("T")[0];
    
    const daysToLoad = 60 - _scheduleLoadedFuture;
    
    const res = await fetch('./?action=schedule/future', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        daysForward: daysToLoad,
        startFrom: startISO,
        isManager: window._isManager,
        agentName: window._myName
      })
    });
    
    const data = await res.json();
    
    if (data.ok && data.results) {
      // Process and merge future data into _allData
      const futureShifts = [];
      data.results.forEach(day => {
        if (day.assignments) {
          day.assignments.forEach(a => {
            const docId = String(day.id || "");
            const teamName = (docId.includes("__") ? docId.split("__")[1] : "") || day.team || "General";
            const assignmentId = a.assignmentId ?? a.id ?? "";
            
            // Extract date from docId (format: "2025-01-01__TeamName")
            const dateFromId = docId.includes("__") ? docId.split("__")[0] : "";
            const dateValue = day.date || dateFromId || "";
            const dayKey = dayKeyPST(dateValue) || dateValue;
            
            // Check if this shift already exists
            const exists = _allData.some(x => 
              x.docId === docId && x.assignmentId === assignmentId
            );
            
            if (!exists && dayKey) {
              futureShifts.push({
                ...a,
                docId,
                assignmentId,
                date: dateValue,
                dateISO: dayKey,
                dateLabel: displayDayLabel(dayKey),
                team: teamName,
                startLabel: toAmPm(a.start) || a.start,
                endLabel: toAmPm(a.end) || a.end
              });
            }
          });
        }
      });
      
      // Merge with existing data
      _allData = [..._allData, ...futureShifts];
      
      // Sort by date
      _allData.sort((a, b) => (a.dateISO || "").localeCompare(b.dateISO || ""));
      
      _scheduleLoadedFuture = 60;
      updateLoadedRangeLabel();
      
      // Re-apply filters and render
      applyLocalFilters();
      renderView();
      
      // Show detailed toast with generated count
      const generated = data.meta?.generatedDays || 0;
      if (generated > 0) {
        toast(`✅ Loaded ${futureShifts.length} shifts (${generated} new days generated)`, "success");
      } else {
        toast(`✅ Loaded ${futureShifts.length} future shifts`, "success");
      }
    }
    
  } catch (err) {
    console.error("Error loading future schedule:", err);
    toast("Failed to load future schedule", "error");
  } finally {
    _isLoadingMore = false;
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Load Future →";
    }
  }
}

// Agent-specific schedule loader (simplified - loads 30 days total)
async function agentLoadMoreSchedule() {
  if (_isLoadingMore) return;
  if (_agentScheduleDays >= 30) {
    toast("30 days already loaded");
    return;
  }
  
  _isLoadingMore = true;
  const btn = document.getElementById("btnAgentLoadMore");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = "⏳ Loading...";
  }
  
  toast("Loading more schedule...", "info");
  
  try {
    // Load from day 15 to day 30
    const today = new Date();
    const startFrom = new Date(today);
    startFrom.setDate(startFrom.getDate() + _agentScheduleDays);
    const startISO = startFrom.toISOString().split("T")[0];
    
    const daysToLoad = 30 - _agentScheduleDays;
    
    const res = await fetch('./?action=schedule/future', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        daysForward: daysToLoad,
        startFrom: startISO,
        isManager: false,
        agentName: window._myName
      })
    });
    
    const data = await res.json();
    
    if (data.ok && data.results) {
      const newShifts = [];
      data.results.forEach(day => {
        if (day.assignments) {
          day.assignments.forEach(a => {
            const docId = String(day.id || "");
            const teamName = (docId.includes("__") ? docId.split("__")[1] : "") || day.team || "General";
            const assignmentId = a.assignmentId ?? a.id ?? "";
            const dateFromId = docId.includes("__") ? docId.split("__")[0] : "";
            const dateValue = day.date || dateFromId || "";
            const dayKey = dayKeyPST(dateValue) || dateValue;
            
            const exists = _allData.some(x => 
              x.docId === docId && x.assignmentId === assignmentId
            );
            
            if (!exists && dayKey) {
              newShifts.push({
                ...a,
                docId,
                assignmentId,
                date: dateValue,
                dateISO: dayKey,
                dateLabel: displayDayLabel(dayKey),
                team: teamName,
                startLabel: toAmPm(a.start) || a.start,
                endLabel: toAmPm(a.end) || a.end
              });
            }
          });
        }
      });
      
      _allData = [..._allData, ...newShifts];
      _allData.sort((a, b) => (a.dateISO || "").localeCompare(b.dateISO || ""));
      
      _agentScheduleDays = 30;
      updateAgentRangeLabel();
      
      // Clear cache since we have new data
      clearScheduleCache();
      
      applyLocalFilters();
      renderView();
      
      toast(`✅ Loaded ${newShifts.length} more shifts`, "success");
    }
  } catch (err) {
    console.error("Error loading agent schedule:", err);
    toast("Failed to load schedule", "error");
  } finally {
    _isLoadingMore = false;
    if (btn) {
      btn.disabled = _agentScheduleDays >= 30;
      btn.innerHTML = _agentScheduleDays >= 30 ? "✅ 30 Days Loaded" : "📆 Load 30 Days";
      if (_agentScheduleDays >= 30) {
        btn.style.background = "#f0fdf4";
        btn.style.borderColor = "#86efac";
        btn.style.color = "#15803d";
      }
    }
  }
}
function updateAgentRangeLabel() {
  const label = document.getElementById("agentRangeLabel");
  if (label) {
    label.textContent = `Today → ${_agentScheduleDays} days`;
  }
}

function updateAgentScheduleBanner() {
  const banner = $("agentScheduleBanner");
  if (!banner) return;
  if (window._isManager || !window._myName) {
    banner.style.display = "none";
    return;
  }
  if (!_allData || _allData.length === 0) {
    banner.style.display = "none";
    return;
  }
  banner.style.display = "grid";

  const currentStatus = $("agentCurrentShiftStatus");
  const currentTime = $("agentCurrentShiftTime");
  const currentTeam = $("agentCurrentShiftTeam");
  const currentRole = $("agentCurrentShiftRole");
  const currentProgressWrap = $("agentCurrentShiftProgressWrap");
  const currentProgress = $("agentCurrentShiftProgress");
  const nextStatus = $("agentNextShiftStatus");
  const nextTime = $("agentNextShiftTime");
  const nextTeam = $("agentNextShiftTeam");
  const nextRole = $("agentNextShiftRole");
  const nextDate = $("agentNextShiftDate");

  const setStatus = (el, text, type) => {
    if (!el) return;
    el.textContent = text;
    el.className = `agent-schedule-pill${type ? ` ${type}` : ""}`;
  };

  const nowParts = pstParts(new Date());
  if (!nowParts) return;
  const todayKey = `${nowParts.year}-${nowParts.month}-${nowParts.day}`;
  const nowDec = parseTimeDecimal(`${nowParts.hour}:${nowParts.minute}`);

  const shifts = _allData
    .filter(s => s.person === window._myName && !String(s.notes || "").toUpperCase().includes("[OFF]"))
    .map(s => {
      const dayKey = s.dayKey || s.dateISO || dayKeyPST(s.date);
      const startDec = parseTimeDecimal(s.start);
      const endDec = parseTimeDecimal(s.end);
      return { ...s, dayKey, startDec, endDec };
    })
    .filter(s => s.dayKey && !isNaN(s.startDec) && !isNaN(s.endDec))
    .sort((a, b) => {
      if (a.dayKey !== b.dayKey) return a.dayKey.localeCompare(b.dayKey);
      return a.startDec - b.startDec;
    });

  if (shifts.length === 0) {
    setStatus(currentStatus, "Off", "off");
    if (currentTime) currentTime.textContent = "No active shift";
    if (currentTeam) currentTeam.textContent = "--";
    if (currentRole) currentRole.textContent = "";
    if (currentProgressWrap) currentProgressWrap.style.display = "none";

    setStatus(nextStatus, "None");
    if (nextTime) nextTime.textContent = "No upcoming shift";
    if (nextTeam) nextTeam.textContent = "--";
    if (nextRole) nextRole.textContent = "";
    if (nextDate) nextDate.textContent = "";
    return;
  }

  const currentShift = shifts.find(s =>
    s.dayKey === todayKey && s.startDec <= nowDec && s.endDec > nowDec
  );

  if (currentShift) {
    setStatus(currentStatus, "On shift", "active");
    if (currentTime) currentTime.textContent = `${toAmPm(currentShift.start)} - ${toAmPm(currentShift.end)}`;
    if (currentTeam) currentTeam.textContent = currentShift.team || "General";
    if (currentRole) currentRole.textContent = currentShift.role ? `• ${currentShift.role}` : "";
    if (currentProgressWrap) currentProgressWrap.style.display = "block";
    if (currentProgress) {
      const duration = Math.max(currentShift.endDec - currentShift.startDec, 0.01);
      const elapsed = Math.min(Math.max(nowDec - currentShift.startDec, 0), duration);
      const pct = Math.min(Math.max((elapsed / duration) * 100, 0), 100);
      currentProgress.style.width = `${pct.toFixed(0)}%`;
    }
  } else {
    setStatus(currentStatus, "Off", "off");
    if (currentTime) currentTime.textContent = "No active shift";
    if (currentTeam) currentTeam.textContent = "--";
    if (currentRole) currentRole.textContent = "";
    if (currentProgressWrap) currentProgressWrap.style.display = "none";
    if (currentProgress) currentProgress.style.width = "0%";
  }

  const upcomingShift = shifts.find(s =>
    s.dayKey > todayKey || (s.dayKey === todayKey && s.startDec > nowDec)
  );

  if (upcomingShift) {
    setStatus(nextStatus, "Upcoming");
    if (nextTime) nextTime.textContent = `${toAmPm(upcomingShift.start)} - ${toAmPm(upcomingShift.end)}`;
    if (nextTeam) nextTeam.textContent = upcomingShift.team || "General";
    if (nextRole) nextRole.textContent = upcomingShift.role ? `• ${upcomingShift.role}` : "";
    if (nextDate) {
      nextDate.textContent = upcomingShift.dayKey === todayKey ? "Today" : displayDayLabel(upcomingShift.dayKey);
    }
  } else {
    setStatus(nextStatus, "None");
    if (nextTime) nextTime.textContent = "No upcoming shift";
    if (nextTeam) nextTeam.textContent = "--";
    if (nextRole) nextRole.textContent = "";
    if (nextDate) nextDate.textContent = "";
  }
}
  async function runUndo() { 
    if (!_lastUndo) return;
    try {
      const res = await fetch('./?action=assignment/replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          docId: _lastUndo.docId,
          assignmentId: _lastUndo.id, 
          newPerson: _lastUndo.oldP, 
          notes: _lastUndo.notes || "",
          notifyMode: "defer"
        })
      });
      const data = await res.json();
      if (data.ok) {
        _lastUndo = null;
        loadSystemData();
        toast("✅ Undo successful", "success");
      } else {
        toast("Undo failed: " + (data.error || "Unknown error"), "error");
      }
    } catch (err) {
      console.error("Undo error:", err);
      toast("Undo failed", "error");
    }
  }
  function closeModal() {
    // Hide the Master Schedule Edit modal
    const editModal = document.getElementById("editShiftModal");
    if (editModal) editModal.style.display = "none";
    // Hide the Replace Coverage modal
    const replaceModal = document.getElementById("modalOverlay");
    if (replaceModal) replaceModal.style.display = "none";
    
    // Clear the editing reference
    _editing = null;
    
    // ✅ Re-enable auto-refresh
    setEditingMode(false);
  }
  // --- 8. PROFILES & METRICS ---
  function openProfile(name) {
     _activeProfileRequest = name;
     $("profileOverlay").style.display = "flex"; 
     $("profContent").style.display = "none"; 
     $("profLoader").style.display = "block";
     $("pName").innerText = name; 
     $("profLoader").innerHTML = '<div style="color:#64748b;">🔄 Loading Zendesk metrics...</div>';
     
     // Check cache first
     const cached = _zendeskMetricsByName.get(String(name));
     if(cached) { renderProfileCached(cached); }
     
     // Use fetch instead of google.script.run
     fetch('./?action=agent-profile', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ name: name })
     })
     .then(res => {
       if (!res.ok) throw new Error(`Server error: ${res.status}`);
       return res.json();
     })
     .then(data => {
       if(data.name !== _activeProfileRequest) return;
       if(data.error) {
         // Show graceful error with fallback info
         $("profLoader").innerHTML = `
           <div style="text-align:center; padding:20px;">
             <div style="font-size:40px; margin-bottom:10px;">👤</div>
             <div style="font-weight:700; color:#0f172a; font-size:16px; margin-bottom:5px;">${escapeHtml(name)}</div>
             <div style="color:#94a3b8; font-size:12px; margin-bottom:15px;">Zendesk data unavailable</div>
             <div style="background:#fef3c7; border:1px solid #fcd34d; padding:10px; border-radius:8px; font-size:11px; color:#92400e;">
               ${escapeHtml(data.error)}
             </div>
           </div>
         `;
         return;
       }
       renderProfileData(data);
     })
     .catch(err => {
       console.error("Profile fetch error:", err);
       $("profLoader").innerHTML = `
         <div style="text-align:center; padding:20px;">
           <div style="font-size:40px; margin-bottom:10px;">👤</div>
           <div style="font-weight:700; color:#0f172a; font-size:16px; margin-bottom:5px;">${escapeHtml(name)}</div>
           <div style="color:#94a3b8; font-size:12px; margin-bottom:15px;">Could not load profile</div>
           <div style="background:#fee2e2; border:1px solid #fecaca; padding:10px; border-radius:8px; font-size:11px; color:#dc2626;">
             ${escapeHtml(err.message || 'Connection error')}
           </div>
         </div>
       `;
     });
  }

// Load agent dashboard assignments (meeting rotation and weekly assignments)
async function loadAgentDashboardAssignments() {
  if (!window._myName) return;
  
  try {
    // Load both in parallel
    await Promise.all([
      loadAgentWeeklyAssignments(),
      loadAgentRotationInfo()
    ]);
    
    // Check if banner should be hidden (no assignments found)
    const banner = $("agentAssignmentsBanner");
    const meetingCard = $("agentMeetingRoleCard");
    const assignCard = $("agentWeeklyAssignCard");
    
    if (banner) {
      const hasMeetingRole = meetingCard && meetingCard.style.display !== "none";
      const hasAssignments = assignCard && assignCard.style.display !== "none";
      banner.style.display = (hasMeetingRole || hasAssignments) ? "block" : "none";
    }
  } catch (err) {
    console.error("Error loading dashboard assignments:", err);
  }
}

  // Switch day by offset (-1 or +1)
function changeDay(offset) {
    if (!_selectedDateISO) return;
    
    const current = new Date(_selectedDateISO + "T12:00:00");
    current.setDate(current.getDate() + offset);
    
    // Convert back to YYYY-MM-DD
    const newDateISO = current.toLocaleDateString("en-CA", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });
    
    // Update and render
    _selectedDateISO = newDateISO;
    renderScheduleView();
    
    // Scroll the tab into view
    setTimeout(() => {
        const activeTab = document.querySelector('.day-tab.active');
        if(activeTab) activeTab.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}
// Jump to specific date from picker
function handleDateJump(val) {
    if (!val) return;
    _selectedDateISO = val;
    renderScheduleView();
    toast(`Jumped to ${val}`);
}
  function renderProfileData(data) {
     $("profLoader").style.display = "none";
     if(data.error) { $("profLoader").style.display = "block"; $("profLoader").innerText = data.error; return; }
     $("profContent").style.display = "block";
     
     $("pName").innerText = data.name; 
     $("pEmail").innerText = data.email; 
     if($("pRole")) $("pRole").innerText = data.role || "--";
     
     const q = "type:ticket status<solved assignee:\"" + data.name + "\"";
     const url = "https://musely.zendesk.com/agent/search/1?query=" + encodeURIComponent(q);
     const el = $("pTickets"); el.innerHTML = "";
     const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.innerText = (data.openTickets ?? "--") + " 🔗";
     a.style.color = "#0284c7"; a.style.textDecoration = "none";
     el.appendChild(a);
     
     $("pAvatar").src = data.avatar || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";
     
     // Format last login with more detail
     if (data.lastLogin) {
       const loginDate = new Date(data.lastLogin);
       const now = new Date();
       const diffMs = now - loginDate;
       const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
       let loginText;
       if (diffDays === 0) {
         loginText = "Today at " + loginDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
       } else if (diffDays === 1) {
         loginText = "Yesterday";
       } else if (diffDays < 7) {
         loginText = diffDays + " days ago";
       } else {
         loginText = loginDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
       }
       $("pLogin").innerText = loginText;
     } else {
       $("pLogin").innerText = "Never";
     }
  }
  function renderProfileCached(c) {
     $("profContent").style.display = "block";
     $("pName").innerText = c.agentName; $("pEmail").innerText = c.email; 
     if($("pRole")) $("pRole").innerText = c.role || "--";
     
     $("pTickets").innerText = c.openTickets ?? "--";
     $("pLogin").innerText = "Cached";
     if(c.zendeskUserId) {
        const url = "https://musely.zendesk.com/agent/search/1?query=" + encodeURIComponent("assignee_id:"+c.zendeskUserId);
        const el = $("pTickets"); el.innerHTML = "";
        const a = document.createElement("a"); a.href = url; a.target = "_blank"; a.innerText = (c.openTickets ?? "--") + " 🔗";
        a.style.color = "#0284c7"; a.style.textDecoration = "none";
        el.appendChild(a);
     }
  }
  function renderMetricsList() {
     const host = $("metricsList"); host.innerHTML = "";
     const q = ($("metricsSearch").value || "").toLowerCase();
     _people.filter(p => !q || p.toLowerCase().includes(q)).forEach(p => {
         const row = mkDiv("metricsRow");
         const meta = _peopleMetaByName.get(p.toLowerCase());
         const email = meta?.email || "";
         row.innerHTML = `<div class="left"><div class="avatar">${p.substring(0,2)}</div><div class="name">${p}</div></div>`;
         row.onclick = () => openMetricsProfile(p, email);
         host.appendChild(row);
     });
  }
  function openMetricsProfile(name, email) {
    _activeMetricsRequest = name;
    _activeMetricsEmail = email || "";
    window._activeMetricsEmail = _activeMetricsEmail;
    
    const d = document.getElementById("metricsDrawer"); 
    d.classList.add("open");
    
    const loader = document.getElementById("mProfLoader");
    const content = document.getElementById("mProfContent");
    
    loader.style.display = "block";
    loader.innerHTML = `<div style="text-align:center; padding:20px;">
                          <div class="spinner-border" style="width:20px; height:20px; border:3px solid #cbd5e1; border-top:3px solid #b37e78; border-radius:50%; animation:spin 1s linear infinite; margin:0 auto 10px;"></div>
                          <div>Fetching data for <b>${name}</b>...</div>
                          <div style="font-size:10px; color:#94a3b8; margin-top:5px;">This may take a moment...</div>
                        </div>`;
    
    content.style.display = "none";
    
    // Use fetch instead of google.script.run
    fetch('./?action=agent-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name, email: email })
    })
    .then(res => res.json())
    .then(data => renderMetricsProfileData(data))
    .catch(err => {
      loader.innerHTML = `<div style="color:red;">System Error: ${err.message || err}</div>`;
    });
    
    setTimeout(() => {
        if (loader.style.display !== "none" && !loader.innerHTML.includes("Error") && !loader.innerHTML.includes("System Error")) {
             loader.innerHTML = `<div style="color:#f59e0b; background:#fffbeb; padding:10px; border-radius:8px; border:1px solid #fcd34d;">
                                  <strong>Taking longer than usual...</strong><br>
                                  The server is still processing. Please wait or try again.<br>
                                  <button class="btn ghost" style="margin-top:8px; font-size:11px;" onclick="openMetricsProfile('${name}', window._activeMetricsEmail || '')">Retry</button>
                                </div>`;
        }
    }, 30000);
  }
  function renderMetricsProfileData(data) {
    const loader = document.getElementById("mProfLoader");
    const content = document.getElementById("mProfContent");
    const ticketsListEl = document.getElementById("mTicketsList");
    const ticketsEmptyEl = document.getElementById("mTicketsEmpty");
    
    if (!data || data.error) {
        const errorMsg = data ? data.error : "Unknown error from server";
        loader.style.display = "block";
        loader.innerHTML = `<div style="color:#ef4444; background:#fef2f2; padding:10px; border-radius:8px; border:1px solid #fecaca;">
                              <strong>Error:</strong> ${errorMsg}
                            </div>`;
        content.style.display = "none";
        return;
    }
    loader.style.display = "none";
    content.style.display = "block";
    if(document.getElementById("mName")) document.getElementById("mName").innerText = data.name || "--";
    if(document.getElementById("mEmail")) document.getElementById("mEmail").innerText = data.email || "--";
    if(document.getElementById("mRole")) document.getElementById("mRole").innerText = data.role || "--";
    
    if(document.getElementById("mOpen")) document.getElementById("mOpen").innerText = data.openTickets ?? "--";
    
    // Render clickable ticket list for managers
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
        if (ticketsEmptyEl) ticketsEmptyEl.style.display = "none";
      } else {
        ticketsListEl.style.display = "none";
        if (ticketsEmptyEl) ticketsEmptyEl.style.display = "block";
      }
    }
    
    if(document.getElementById("mAvatar")) {
        document.getElementById("mAvatar").src = data.avatar || "https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y";
    }
    if(document.getElementById("mLogin")) {
        if (data.lastLogin) {
            const dateObj = new Date(data.lastLogin);
            const nice = dateObj.toLocaleDateString('en-US', { month:'short', day:'numeric' }) + ", " + dateObj.toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' });
            document.getElementById("mLogin").innerText = nice;
        } else {
            document.getElementById("mLogin").innerText = "Never";
        }
    }
  }
  
  // Browser-side helper: fetch people from the server (uses server-side getCachedMetadata)
async function fetchPeopleCached() {
  // optional: cache in memory so we don't refetch repeatedly
  if (window.__peopleCache && Array.isArray(window.__peopleCache)) return window.__peopleCache;

  const res = await fetch("/people");
  if (!res.ok) throw new Error("Failed to load people metadata");
  const data = await res.json();

  window.__peopleCache = data.people || [];
  return window.__peopleCache;
}
  
  // Force refresh - clears DATA cache only, preserves auth session
function forceRefresh() {
  console.log("🔄 Force refresh triggered");
  
  // ✅ CRITICAL FIX: Do NOT clear auth session on refresh!
  // Only clear schedule/metadata caches, keep user logged in
  
  if (typeof clearScheduleCache === 'function') {
    clearScheduleCache();
  } else {
    // Fallback: manually clear cache keys (but NOT auth!)
    localStorage.removeItem('musely_schedule_cache');
    localStorage.removeItem('musely_metadata_cache');
    try {
      // Clear any agent-specific cache
      const myName = window._myName || '';
      if (myName) {
        localStorage.removeItem(`musely_schedule_cache_${myName}`);
      }
    } catch(e) {}
  }
  
  // ✅ Refresh session timestamp on user activity
  if (window._myEmail && window._myName) {
    refreshSessionTimestamp();
  }
  
  // Show feedback
  toast("🔄 Refreshing data...", "info");
  
  // Reload data
  if (typeof load === 'function') {
    load(true); // true = force refresh
  } else if (typeof loadSystemData === 'function') {
    loadSystemData();
  } else {
    // Fallback: reload the page
    window.location.reload();
  }
}
// Make it globally accessible
window.forceRefresh = forceRefresh;
  function closeMetricsDrawer() { $("metricsDrawer").classList.remove("open"); }
  function closeProfile() { $("profileOverlay").style.display = "none"; }
  // --- 9. AUDIT & MASTER MODES ---
  function openAuditLog() {
  $("auditOverlay").style.display = "flex";
  $("auditList").innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#94a3b8;">Fetching logs from server...</td></tr>`;
  
  fetch("/?action=audit/logs")
    .then(res => res.json())
    .then(data => {
      if (data.ok && data.logs) {
        renderAuditLog(data.logs);
      } else {
        $("auditList").innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#ef4444;">Failed to load audit logs</td></tr>`;
      }
    })
    .catch(err => {
      console.error("Audit fetch error:", err);
      $("auditList").innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#ef4444;">Error: ${err.message}</td></tr>`;
    });
}
  function closeAuditModal() { $("auditOverlay").style.display = "none"; }
  
  // Clear audit history with confirmation
  async function clearAuditHistory() {
    const result = await Swal.fire({
      title: 'Clear Audit History',
      text: 'What would you like to clear?',
      icon: 'warning',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: 'Clear All',
      denyButtonText: 'Older than 30 days',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      denyButtonColor: '#f59e0b'
    });
    
    if (result.isDismissed) return;
    
    const mode = result.isConfirmed ? 'all' : 'older';
    const payload = { mode };
    if (mode === 'older') payload.olderThanDays = 30;
    
    try {
      const res = await fetch("/?action=audit/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (data.ok) {
        toast(`Cleared ${data.deleted} audit entries`, "success");
        // Refresh the audit list
        openAuditLog();
      } else {
        toast("Failed to clear: " + (data.error || "Unknown error"), "error");
      }
    } catch (err) {
      toast("Error clearing audit history: " + err.message, "error");
    }
  }
  
  function renderAuditLog(logs) {
  const list = $("auditList");
  list.innerHTML = "";
  
  if (!logs || logs.length === 0) {
    list.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:#94a3b8;">No history found.</td></tr>`;
    return;
  }
  
  logs.forEach(row => {
    const tr = document.createElement("tr");
    let badgeClass = "ab-blue";
    if (String(row.action || "").includes("OFF") || String(row.action || "").includes("DELETE")) {
      badgeClass = "ab-red";
    }
    
    let niceTime = row.timestamp;
    try {
      const d = new Date(row.timestamp);
      niceTime = d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {}
    
    tr.innerHTML = `
      <td>${niceTime}</td>
      <td style="font-weight:600;">${row.manager || row.user || "System"}</td>
      <td><span class="audit-badge ${badgeClass}">${row.action || "CHANGE"}</span></td>
      <td>${row.target || row.person || "—"}<br><span style="font-size:9px;color:#94a3b8;">${row.date || ""}</span></td>
      <td>${row.details || row.message || "—"}</td>
    `;
    list.appendChild(tr);
  });
}
  function toggleMasterMode() {
    _isMasterMode = !_isMasterMode;
    const btn = document.getElementById("btnMasterMode");
    const title = document.querySelector(".hTitle");
    const contextPill = document.getElementById("managerContextPill");
    // Toggle Views
    if (_isMasterMode) {
        // UI Updates - Clean glass style
        if(btn) { 
          btn.innerText = "← Exit Editor"; 
          btn.style.backgroundColor = "rgba(255,255,255,0.15)"; 
          btn.style.color = "rgba(255,255,255,0.9)"; 
          btn.style.border = "none";
        }
        if(title) title.innerText = "Master Template";
        if(contextPill) { 
          contextPill.style.display="flex"; 
          contextPill.innerText="✏️ Editing"; 
          contextPill.style.backgroundColor="rgba(255,255,255,0.15)"; 
          contextPill.style.color="rgba(255,255,255,0.9)";
          contextPill.style.border="none";
        }
        // HIDE Schedule, SHOW Master
        $("scheduleView").style.display = "none";
        $("metricsView").style.display = "none";
        $("masterView").style.display = "block"; 
        
        $("masterView").innerHTML = "<div style='padding:20px; text-align:center;'><div class='spinner-border text-primary'></div><br>Loading Master Template...</div>";
        
        // Fetch Data using fetch API
        fetch('./?action=base-schedule')
          .then(res => res.json())
          .then(data => {
  if (data.error) {
    $("masterView").innerHTML = `<div style="color:red;padding:20px;">Error loading template: ${data.error}</div>`;
    return;
  }

  // ✅ Initialize draft workflow
  _masterOriginalData = deepClone(data);
  _masterDraftData = deepClone(data);
  _masterRawData = _masterDraftData;
  _masterEditEnabled = false;

  renderMasterView(_masterRawData);
})
          .catch(err => {
            $("masterView").innerHTML = `<div style="color:red;padding:20px;">Error loading template: ${err.message || err}</div>`;
          });
    } else {
        exitMasterMode();
        // Return to default view
        setView('schedule');
    }
}
  function formatDate(iso) {
  return dayKeyPST(iso);
}
  // --- 10. UTILS ---
  function mkDiv(cls) { const d = document.createElement("div"); d.className = cls; return d; }
function groupShifts(data) {
  const m = new Map();
  if (!data) return m;
  data.forEach(d => {
    // Use dateISO (YYYY-MM-DD format) for grouping, NOT dateLabel
    const key = d.dateISO || d.dayKey || d.date || "";
    if (!key) return; // Skip if no valid date key
    if (!m.has(key)) m.set(key, []);
    m.get(key).push(d);
  });
  return m;
}
  
  // ✅ Format role names for display (Backup1 → "Backup 1", Backup2 → "Backup 2")
  function formatRoleDisplay(roleId) {
    if (!roleId) return roleId;
    // Handle "Backup1" → "Backup 1", "Backup2" → "Backup 2"
    return roleId
      .replace(/Backup(\d+)/i, 'Backup $1')
      .replace(/Captain(\d+)/i, 'Captain $1');
  }
  
  function fillSelect(id, list, bl=true, includeCustom=false) { 
    const s=$(id); 
    if(!s)return; 
    s.innerHTML=""; 
    if(bl)s.appendChild(new Option("- Select -","")); 
    // ✅ Special handling for role selects - show formatted display name
    const isRoleSelect = id === "mstRole" || id === "modalRole";
    list.forEach(x => {
      const displayName = isRoleSelect ? formatRoleDisplay(x) : x;
      s.appendChild(new Option(displayName, x));
    }); 
    if(includeCustom) s.appendChild(new Option("✏️ Custom...", "__custom__"));
  }
  
  function toggleCustomChannel(selectEl) {
    const wrapper = document.getElementById("customChannelWrapper");
    if (wrapper) {
      wrapper.style.display = selectEl.value === "__custom__" ? "block" : "none";
    }
  }
  
  function getSelectedChannel() {
    const select = document.getElementById("modalTeam");
    if (select && select.value === "__custom__") {
      return document.getElementById("modalCustomChannel")?.value?.trim() || "";
    }
    return select?.value || "";
  }
  
  function toggleTeamSelect(it, cardElement) {
    const id = String(it.assignmentId);
    if (_teamSelected.has(id)) {
      _teamSelected.delete(id);
      if (cardElement) cardElement.classList.remove("selected");
    } else {
      _teamSelected.add(id);
      if (cardElement) cardElement.classList.add("selected");
      _lastSelectedPerson = it.person; 
    }
    updateSelectionBar();
  }
  function updateSelectionBar() {
    const bar = document.getElementById("selectionBar");
    const countSpan = document.getElementById("sbCount");
    const similarBtn = document.getElementById("btnSelectSimilar");
    
    const count = _teamSelected.size;
    countSpan.innerText = count;
    
    if (count > 0) {
      bar.classList.add("visible");
      if (_lastSelectedPerson) {
        similarBtn.style.display = "inline-block";
        similarBtn.innerText = `Select All "${_lastSelectedPerson}"`;
      } else {
        similarBtn.style.display = "none";
      }
    } else {
      bar.classList.remove("visible");
    }
    if(document.getElementById("tpCount")) document.getElementById("tpCount").innerText = count;
  }
  function selectSimilarVisible() {
    if (!_lastSelectedPerson) return;
    _filteredData.forEach(item => {
      if (item.person === _lastSelectedPerson) {
        _teamSelected.add(String(item.assignmentId));
      }
    });
    document.querySelectorAll('.shift').forEach(card => {
      const nameDiv = card.querySelector('.sName');
      if (nameDiv && nameDiv.innerText === _lastSelectedPerson) {
        card.classList.add('selected');
      }
    });
    updateSelectionBar();
    toast(`Selected all shifts for ${_lastSelectedPerson}`);
  }
  async function batchMarkOff() {
  const ids = Array.from(_teamSelected);
  if (ids.length === 0) return toast("No shifts selected.");
  const result = await Swal.fire({
    title: `Mark ${ids.length} shifts as OFF?`,
    text: "This will highlight them red.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, Mark OFF",
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#cbd5e1"
  });
  if (!result.isConfirmed) return;
  
  toast(`Processing ${ids.length} cancellations...`);
  let successCount = 0;
  let errorCount = 0;
  
  for (const id of ids) {
    const item = _allData.find(x => String(x.assignmentId) === String(id));
    if (!item) {
      errorCount++;
      continue;
    }
    
    // Validate required fields
    if (!item.docId || !item.assignmentId) {
      console.warn("Batch OFF skipped - missing docId/assignmentId:", item);
      errorCount++;
      continue;
    }
    
    // optimistic UI
    _timeOff.add(`${item.person}|${item.dateISO}`);
    item.notes = ((item.notes || "").replace(/\s*\[OFF\]\s*/g, " ").trim() + " [OFF]").trim();
    
    // Use fetch instead of google.script.run
    try {
      await fetch('./?action=assignment/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docId: item.docId,
          assignmentId: item.assignmentId,
          markOff: true
        })
      });
      successCount++;
    } catch (e) {
      console.error("Batch OFF failed:", e, item);
      errorCount++;
    }
  }
  
  logAuditEntry({
    action: "BATCH OFF",
    manager: window._myName || window._myEmail,
    target: `${successCount} shifts`,
    date: "Multiple",
    details: `Marked ${successCount} shifts as OFF in batch operation`
  });
  
  clearTeamSelection();
  renderView();
  
  if (errorCount > 0) {
    toast(`Completed: ${successCount} success, ${errorCount} errors`, "warning");
  } else {
    toast(`Success: ${successCount} shifts marked OFF.`);
  }
}
  function clearTeamSelection() {
    _teamSelected.clear();
    _lastSelectedPerson = null;
    document.querySelectorAll('.shift.selected').forEach(el => el.classList.remove('selected'));
    updateSelectionBar();
  }
  
  async function applyBatch() {
    const newPerson = document.getElementById("tpPerson").value;
    const ids = Array.from(_teamSelected);
    if (!newPerson) return toast("Please select a person first.");
    if (ids.length === 0) return toast("No shifts selected.");
    const result = await Swal.fire({
        title: `Assign ${ids.length} shifts to ${newPerson}?`,
        text: "Choose how to notify the team.",
        icon: 'question',
        showCancelButton: true,
        showDenyButton: true,
        confirmButtonText: '⚡ Send Bot Now',
        denyButtonText: '⏳ Add to Pending',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#1e293b', 
        denyButtonColor: '#f59e0b',    
    });
    if (!result.isConfirmed && !result.isDenied) return; 
    const notifyMode = result.isConfirmed ? 'send' : 'defer';
    toast("Processing batch...");
    // Loop through every selected ID and update locally + server-side
    for (const id of ids) {
        const item = _allData.find(x => String(x.assignmentId) === String(id));
        if (item) {
            // Validate required fields
            if (!item.docId || !item.assignmentId) {
              console.warn("Batch skipped - missing docId/assignmentId:", item);
              continue;
            }
            
            const oldPerson = item.person;
            
            // 1. Update the local data immediately
            item.person = newPerson;
            
            // 2. For deferred notifications, store undo data separately
            // (DON'T add to _notifQueue - backend already tracks these)
            if (notifyMode === 'defer') {
                const undoKey = `undo_${item.docId}_${item.assignmentId}`;
                localStorage.setItem(undoKey, JSON.stringify({
                    docId: item.docId,
                    assignmentId: item.assignmentId,
                    originalPerson: oldPerson,
                    originalNotes: item.notes
                }));
            }
            
            // 3. Send the save request to the server using fetch
            fetch('./?action=assignment/replace', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                docId: item.docId,
                assignmentId: item.assignmentId,
                newPerson: newPerson,
                notes: item.notes || "Batch Update",
                notifyMode: notifyMode
              })
            })
            .then(res => res.json())
            .then(data => {
              if (data.ok) console.log(`Saved shift ${id}`);
            })
            .catch(err => console.error(`Failed to save shift ${id}:`, err));
        }
    }
    // Handle notifications
    if (notifyMode === 'defer') {
        playNotificationSound(); 
        // Refresh from backend (don't use local queue)
        setTimeout(() => {
          loadPendingNotifications();
          updateNotifBadge();
        }, 500); // Small delay to let backend process
        toast(`${ids.length} shifts added to Pending Queue`);
    } else {
        playSendSound(); 
        toast(`Success! ${ids.length} shifts updated.`);
    }
if (!window._isManager && window._myName) {
  clearScheduleCache();
}
    clearTeamSelection(); 
    renderView(); // Refresh the UI to show new names       
  }
  
  // Load time off count for badge
  function loadTimeOffCount() {
    fetch('./?action=timeoff/count')
      .then(r => r.json())
      .then(data => {
        // 1. Badge on Main Header Button
        c// 1. Badge on Notifications (btnNotif)
const notifCountEl = document.getElementById("notifCount");
if (notifCountEl) {
  if (data.count > 0) {
    notifCountEl.classList.remove("hidden");
  } else {
    notifCountEl.classList.add("hidden");
  }
}


        
        // 2. Badge on Modal Button
        const btnQueue = document.getElementById("btnReviewQueue");
        if(btnQueue) {
          if(data.count > 0) {
            btnQueue.innerHTML = `Queue <span style="background:white; color:#c2410c; padding:2px 6px; border-radius:10px; font-size:11px; font-weight:800; margin-left:4px;">${data.count}</span>`;
          } else {
            btnQueue.innerHTML = `Queue`; 
          }
        }
      })
      .catch(e => console.log("Silent error checking queue"));
  }
  
  // Admin & Context
  function promptMasterSelection(list) { $("masterContextOverlay").style.display="flex"; const s=$("masterManagerDropdown"); s.innerHTML=""; list.forEach(m=>s.appendChild(new Option(m.name,m.email))); }
  function confirmManagerSelection() { _selectedManagerEmail=$("masterManagerDropdown").value; $("masterContextOverlay").style.display="none"; load(true, _selectedManagerEmail); }
  // ============================================
  // [SECTION 16] ADMIN FUNCTIONS
  // ============================================
  function openAdminModal() { 
    // Show modal immediately
    $("adminOverlay").style.display="flex"; 
    // Load rules asynchronously (don't block UI)
    requestAnimationFrame(() => {
      loadRules();
      // Update time off count badge
      loadTimeOffCount();
    });
  }
  function closeAdminModal() { $("adminOverlay").style.display="none"; }
  
  // Cache for rules to avoid unnecessary fetches
  let _rulesLoaded = false;
  let _lastRulesLoad = 0;
  const RULES_CACHE_MS = 30000; // 30 second cache
  
  function loadRules(forceRefresh = false) {
    const now = Date.now();
    const list = $("ruleList");
    
    // Skip if recently loaded and not forcing refresh
    if (!forceRefresh && _rulesLoaded && (now - _lastRulesLoad) < RULES_CACHE_MS) {
      return;
    }
    
    list.innerHTML = '<div style="padding:10px; color:#94a3b8; text-align:center;"><span style="display:inline-block; animation:spin 1s linear infinite;">⏳</span> Loading...</div>';
  // ✅ Use fetch instead of google.script.run
  fetch('./?action=staffing/rules')
    .then(res => res.json())
    .then(rules => {
      list.innerHTML = "";
      if (!rules || rules.length === 0) {
        list.innerHTML = '<div style="padding:10px; color:#94a3b8; text-align:center;">No rules set yet.</div>';
        return;
      }
      rules.forEach(r => {
        // Format hours for display
        const formatHour = (h) => {
          if (h === 0 || h === 24) return '12am';
          if (h === 12) return '12pm';
          return h > 12 ? `${h-12}pm` : `${h}am`;
        };
        
        // Build time display
        let timeDisplay = 'All Hours';
        if (r.timeBlock && r.timeBlock !== 'all') {
          if (r.timeBlock === 'morning') timeDisplay = '6am-12pm';
          else if (r.timeBlock === 'afternoon') timeDisplay = '12pm-6pm';
          else if (r.timeBlock === 'evening') timeDisplay = '6pm-10pm';
          else if (r.timeBlock === 'custom' && r.startHour !== undefined) {
            timeDisplay = `${formatHour(r.startHour)}-${formatHour(r.endHour)}`;
          }
        } else if (r.startHour !== undefined && r.endHour !== undefined && (r.startHour !== 0 || r.endHour !== 24)) {
          timeDisplay = `${formatHour(r.startHour)}-${formatHour(r.endHour)}`;
        }
        
        // Format day display
        let dayDisplay = r.day;
        if (r.day === 'All') dayDisplay = 'Every Day';
        else if (r.day === 'Weekday') dayDisplay = 'Mon-Fri';
        else if (r.day === 'Weekend') dayDisplay = 'Sat-Sun';
        
        const row = document.createElement("div");
        row.className = "rule-item";
        row.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:12px; background:var(--card-bg, #fff); border:1px solid var(--border-color, #e2e8f0); border-radius:10px;";
        row.innerHTML = `
          <div style="display:flex; flex-direction:column; gap:4px;">
            <div style="font-weight:700; color:var(--text-primary, #1e3a8a); font-size:14px;">${r.team}</div>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              <span style="font-size:10px; background:#dbeafe; padding:2px 8px; border-radius:6px; color:#8f5f5a; font-weight:600;">${dayDisplay}</span>
              <span style="font-size:10px; background:#f0fdf4; padding:2px 8px; border-radius:6px; color:#15803d; font-weight:600;">⏰ ${timeDisplay}</span>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="font-weight:800; font-size:14px; color:var(--text-primary, #1e293b);">Min: ${r.min}</div>
            <button onclick="deleteRule('${r.id}')" style="color:#ef4444; background:none; border:none; cursor:pointer; font-size:16px;" title="Delete rule">🗑️</button>
          </div>
        `;
        list.appendChild(row);
      });
      
      // Update cache
      _rulesLoaded = true;
      _lastRulesLoad = Date.now();
    })
    .catch(err => {
      console.error(err);
      list.innerHTML = '<div style="color:red; padding:10px;">Error loading rules</div>';
    });
}
async function addRule() {
  const team = $("ruleTeam").value;
  const day = $("ruleDay").value;
  const min = $("ruleMin").value;
  const timeBlock = $("ruleTimeBlock")?.value || "all";
  
  if (!team || !min) return toast("Please select Team and Minimum count", "error");
  
  // Calculate hours based on time block
  let startHour = 0, endHour = 24;
  if (timeBlock === "morning") { startHour = 6; endHour = 12; }
  else if (timeBlock === "afternoon") { startHour = 12; endHour = 18; }
  else if (timeBlock === "evening") { startHour = 18; endHour = 22; }
  else if (timeBlock === "custom") {
    startHour = parseInt($("ruleStartHour")?.value) || 0;
    endHour = parseInt($("ruleEndHour")?.value) || 24;
  }
  
  $("ruleList").innerHTML = "Saving...";
  try {
    await fetch('./?action=staffing/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team, day, min, startHour, endHour, timeBlock })
    });
    
    toast("Rule Saved", "success");
    $("ruleMin").value = "";
    loadRules(true); // Force refresh after add
  } catch (err) {
    console.error(err);
    toast("Error saving rule", "error");
  }
}

async function addQuickRule(team, min, timeBlock) {
  let startHour = 0, endHour = 24;
  if (timeBlock === "morning") { startHour = 6; endHour = 12; }
  else if (timeBlock === "afternoon") { startHour = 12; endHour = 18; }
  
  try {
    await fetch('./?action=staffing/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team, day: "Weekday", min, startHour, endHour, timeBlock })
    });
    toast(`Added: ${team} min ${min}`, "success");
    loadRules();
  } catch (err) {
    toast("Error adding rule", "error");
  }
}

// Toggle custom hour inputs
document.addEventListener('DOMContentLoaded', () => {
  const timeBlockSelect = $("ruleTimeBlock");
  if (timeBlockSelect) {
    timeBlockSelect.addEventListener('change', (e) => {
      const isCustom = e.target.value === "custom";
      if ($("ruleStartHour")) $("ruleStartHour").style.display = isCustom ? "block" : "none";
      if ($("ruleEndHour")) $("ruleEndHour").style.display = isCustom ? "block" : "none";
    });
  }
});
async function deleteRule(id) {
  if (!confirm("Delete this rule?")) return;
  try {
    await fetch('./?action=staffing/rules/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idx: id })
    });
    toast("Rule Deleted", "success");
    loadRules(true); // Force refresh after delete
  } catch (err) {
    console.error(err);
    toast("Error deleting rule", "error");
  }
}
// Track active toasts to prevent duplicates
const _activeToasts = new Map();

function toast(msg, type = "info", options = {}) {
  const host = document.getElementById("toastHost");
  if (!host) {
    console.log("Toast:", msg);
    return;
  }
  
  // Prevent duplicate toasts with same message
  const toastKey = msg.replace(/[^a-zA-Z]/g, '').toLowerCase();
  if (_activeToasts.has(toastKey)) {
    return; // Don't show duplicate
  }
  
  // Limit max toasts on screen
  const existingToasts = host.querySelectorAll('.toast');
  if (existingToasts.length >= 3) {
    existingToasts[0].remove(); // Remove oldest
  }
  
  const t = document.createElement("div");
  t.className = "toast";
  t.dataset.toastKey = toastKey;
  
  // Color based on type
  if (type === "success") t.style.background = "#16a34a";
  else if (type === "error") t.style.background = "#dc2626";
  else if (type === "warning") t.style.background = "#d97706";
  
  t.innerHTML = `
    <span>${msg}</span>
    <button onclick="this.parentElement.remove()" style="background: rgba(255,255,255,0.2); border:none; color:#fff; padding:4px 8px; border-radius:4px; cursor:pointer;">✕</button>
  `;
  
  // Track this toast
  _activeToasts.set(toastKey, true);
  
  host.appendChild(t);
  
  const duration = options.duration || 3000;
  setTimeout(() => {
    t.remove();
    _activeToasts.delete(toastKey);
  }, duration);
}
// Make it globally available
window.toast = toast;

  // ============================================
  // [SECTION 17] FILTERS
  // ============================================
  function applyLocalFilters() { _filteredData = _allData.filter(x => (!_activeTeam || x.team===_activeTeam) && (!_selectedPeople.size || _selectedPeople.has(x.person))); window._allData = _allData; window._filteredData = _filteredData; renderView(); }
  function renderTeamChips() { const c=$("teamChips"); if(c) { c.innerHTML=""; _teams.forEach(t=>{ const d=mkDiv("chip"); d.innerText=t; d.onclick=()=>filterTeam(t); c.appendChild(d); }); } }
  function filterTeam(t) { _activeTeam=t; applyLocalFilters(); }
  function showActiveFilterIndicator(channelName) {
  // Remove existing indicator
  const existing = document.getElementById('activeFilterIndicator');
  if (existing) existing.remove();
  
  if (! channelName) return;
  
  const indicator = document.createElement('div');
  indicator.id = 'activeFilterIndicator';
  indicator.style.cssText = `
    position: fixed;
    top: 74px;
    left: 50%;
    transform:  translateX(-50%);
    background: linear-gradient(135deg, #b37e78 0%, #8f5f5a 100%);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size:  13px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 4px 12px rgba(15, 118, 110, 0.3);
    z-index: 500;
    animation: slideDown 0.3s ease;
  `;
  
  indicator.innerHTML = `
    <span>📺 Viewing: ${channelName}</span>
    <button onclick="resetAllFilters()" style="
      background: rgba(255,255,255,0.2);
      border: none;
      color: white;
      width: 20px;
      height: 20px;
      border-radius:  50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    ">✕</button>
  `;
  
  document.body.appendChild(indicator);
  
  // Also add class to calendar grid for CSS
  const calGrid = document.getElementById('calView');
  if (calGrid) calGrid.classList.add('channel-filtered');
}
  function initFilters() { fillSelect("teamDropdown", _teams); }
  function renderQuickRail() { 
    const list = $("qrList");
    list.innerHTML = ""; 
    const q = ($("qrSearch").value || "").toLowerCase();
    _people.filter(p => !q || p.toLowerCase().includes(q)).forEach(p => { 
        const d = mkDiv("qrItem"); 
        d.innerText = p; 
        d.draggable = true; 
        d.ondragstart = (e) => { 
           _dragPerson = p; 
           e.dataTransfer.effectAllowed = "copy";
           e.dataTransfer.setData("text/plain", p); // Required for Firefox
           d.style.opacity = "0.5";
        };
        d.ondragend = (e) => {
           d.style.opacity = "1";
           // Clear drag person after a short delay (allows drop to complete first)
           setTimeout(() => { _dragPerson = null; }, 100);
        };
        d.onclick = () => {
           _selectedPeople.clear();
           _selectedPeople.add(p);
           applyLocalFilters();
        };
        list.appendChild(d); 
    }); 
  }
  
  // Master Template Logic
  // ============================================
  // [SECTION 13] MASTER SCHEDULE
  // ============================================
  function renderMasterView(data) {
  if(!data || data.error) { 
    $("masterView").innerHTML = "<div style='color:red;padding:20px;'>Failed to load master template</div>"; 
    return; 
  }

  const list = document.getElementById("masterView");
  list.innerHTML = "";              // ✅ clear first
  ensureMasterControls(); 
    
    // Inject styles
    let style = document.getElementById("mstStyles");
if (!style) {
  style = document.createElement("style");
  style.id = "mstStyles";
  style.innerHTML = `
    .mst-person-row:hover { background-color: #f8fafc !important; transition: background 0.2s; }
    .mst-shift-chip:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .mst-day-cell:hover { background-color: rgba(0,0,0,0.02); }
    .add-btn { opacity: 0; transition: opacity 0.2s; }
    .mst-day-cell:hover .add-btn { opacity: 1; }
  `;
  list.appendChild(style);
}

    // 1.  Pivot Data
    const roster = {};
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    
    // First, initialize roster with ALL people from _people list
    // This ensures new agents appear even without shifts
    if (Array.isArray(_people)) {
      _people.forEach(personName => {
        if (personName && !roster[personName]) {
          roster[personName] = {};
        }
      });
    }
    
    // Then add shifts from the data
    days.forEach(day => {
        const dayItems = data[day] || [];
        dayItems.forEach(item => {
            const pName = item.person;
            if (!roster[pName]) roster[pName] = {};
            if (!roster[pName][day]) roster[pName][day] = [];
            roster[pName][day].push(item);
        });
    });
    list.style.display = "block"; 
    list.style.overflowX = "auto";
    list.style.fontFamily = "sans-serif"; 
    // 2. The Header
    const headerRow = mkDiv("mst-header-row");
    headerRow.style.display = "grid";
    headerRow.style.gridTemplateColumns = "180px repeat(7, 1fr)"; 
    headerRow.style.backgroundColor = "#1e293b"; 
    headerRow.style.color = "#ffffff";
    headerRow.style.fontWeight = "bold";
    headerRow.style.borderBottom = "2px solid #ddd";
    headerRow.style.position = "sticky";
    headerRow.style.top = "52px";   // adjust if your bar is taller/shorter
    headerRow.style.zIndex = "10";
    let headerHtml = `<div style="padding:12px; border-right:1px solid #4a6278;">Employee</div>`;
    days.forEach((d, i) => { 
        const borderStyle = i < 6 ? "border-right:1px solid #4a6278;" : ""; 
        headerHtml += `<div style="padding:12px; text-align:center; ${borderStyle}">${d}</div>`; 
    });
    headerRow.innerHTML = headerHtml;
    list.appendChild(headerRow);
    // 3. The Body
    const sortedPersons = Object.keys(roster).sort();
    
    // ✅ Helper function to calculate weekly hours for a person
    function calculateWeeklyHours(personRoster) {
      let totalHours = 0;
      const shouldSkipTeam = (teamName) => {
        const team = String(teamName || "").toLowerCase();
        return team.includes("lunch") || team.includes("break") || team.includes("1:1");
      };

      days.forEach(day => {
        const shifts = personRoster[day] || [];
        const intervals = [];

        shifts.forEach(shift => {
          if (!shift.start || !shift.end) return;
          if (shouldSkipTeam(shift.team)) return;

          const startH = parseTimeDecimal(shift.start);
          const endH = parseTimeDecimal(shift.end);
          if (!isNaN(startH) && !isNaN(endH) && endH > startH) {
            intervals.push([startH, endH]);
          }
        });

        if (!intervals.length) return;

        intervals.sort((a, b) => a[0] - b[0]);
        let [currentStart, currentEnd] = intervals[0];
        let dayHours = 0;

        for (let i = 1; i < intervals.length; i++) {
          const [start, end] = intervals[i];
          if (start <= currentEnd) {
            currentEnd = Math.max(currentEnd, end);
          } else {
            dayHours += (currentEnd - currentStart);
            currentStart = start;
            currentEnd = end;
          }
        }

        dayHours += (currentEnd - currentStart);
        totalHours += dayHours;
      });

      return totalHours;
    }
    
    sortedPersons.forEach((person, index) => {
        const row = mkDiv("mst-person-row");
        const bg = index % 2 === 0 ? "#ffffff" : "#f8f9fa"; 
        row.style.backgroundColor = bg;
        row.style.display = "grid";
        row.style.gridTemplateColumns = "180px repeat(7, 1fr)";
        row.style.borderBottom = "1px solid #e0e0e0";
        row.style.alignItems = "stretch"; 
        
        // ✅ Calculate weekly hours for this person
        const weeklyHours = calculateWeeklyHours(roster[person]);
        const hoursDisplay = weeklyHours > 0 ? `<span style="font-size:10px; color:#64748b; font-weight:500; display:block; margin-top:2px;">${weeklyHours.toFixed(1)}h/week</span>` : '';
        
        // Name Column with weekly hours
        let html = `
            <div class="mst-person-info" style="
                padding:12px; font-weight:600; color:#333; 
                border-right:2px solid #e0e0e0; display:flex; flex-direction:column; justify-content:center;">
                <span>${person}</span>
                ${hoursDisplay}
            </div>`;
        // Day Columns
        days.forEach((day, i) => {
            const shifts = roster[person][day] || [];
            // ✅ Sort shifts by role priority (Captain → Agent → Backup), then by start time
            shifts.sort((a, b) => {
              const pa = getShiftRolePriority(a);
              const pb = getShiftRolePriority(b);
              if (pa !== pb) return pa - pb;
              const timeA = parseTimeDecimal(a.start);
              const timeB = parseTimeDecimal(b.start);
              return timeA - timeB;
            });
            const borderStyle = i < 6 ?  "border-right:1px solid #eee;" : "";
            html += `<div class="mst-day-cell" 
                        onclick="handleCellClick('${person}', '${day}')"
                        style="padding:8px; display:flex; flex-direction:column; gap:4px; align-items:center; justify-content:flex-start; cursor:pointer; position:relative; ${borderStyle}">`;
            
            if (shifts.length === 0) {
                html += `<span class="add-btn" style="color:#ccc; font-size:20px; font-weight:bold;">+</span>`;
            } else {
                shifts.forEach(shift => {
                    const rawStart = shift.start; 
                    const rawEnd = shift.end;
                    const displayStart = toAmPm(rawStart);
                    const displayEnd = toAmPm(rawEnd);
                    
                    // ✅ Get channel config for color coding
                    const channelName = shift.team || "Other";
                    const config = getChannelConfig(channelName) || { abbrev:"—", color:"#f8fafc", border:"#e2e8f0", text:"#475569" };
                    const abbrev = config.abbrev || "—";
                    
                    // ✅ Format role display (Backup1 → "B1", Captain → "Capt")
                    const rawRole = shift.role || "";
                    let roleDisplay = "";
                    if (rawRole && rawRole !== "Agent") {
                      // Shorten role names for chip display
                      if (rawRole.match(/Backup\s*1/i)) roleDisplay = "B1";
                      else if (rawRole.match(/Backup\s*2/i)) roleDisplay = "B2";
                      else if (rawRole.match(/Backup/i)) roleDisplay = "BU";
                      else if (rawRole.match(/Captain/i)) roleDisplay = "Capt";
                      else roleDisplay = rawRole.substring(0, 4);
                    }
                    
                    // ✅ Use openMasterModal for master mode editing
                    html += `<div class="mst-shift-chip" 
                                onclick="event.stopPropagation(); openMasterModal('${person}', '${day}', '${rawStart}', '${rawEnd}', '${shift.team || ''}', '${rawRole}')"
                                style="
                                font-size:10px; padding:4px 8px; 
                                background:${config.color}; 
                                color:${config.text}; 
                                border:  1px solid ${config.border};
                                border-radius: 8px; 
                                font-weight:600;
                                white-space:nowrap; 
                                cursor:pointer;
                                transition:  all 0.2s;
                                display:flex;
                                flex-direction:column;
                                align-items:center;
                                gap:2px;
                                min-width:70px;
                                box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                                <span style="font-weight:700;">${abbrev}${roleDisplay ? ' <span style="font-size:8px; opacity:0.7;">(' + roleDisplay + ')</span>' : ''}</span>
                                <span style="font-size:9px; opacity:0.8;">${displayStart}-${displayEnd}</span>
                             </div>`;
                });
            }
            html += `</div>`;
        });
        row.innerHTML = html;
        list.appendChild(row);
    });
}
// Triggered when clicking an existing blue chip
function handleShiftEdit(person, day, start, end, team, docId, assignmentId, role) {
  openMasterModal(person, day, start, end, team, role);
}
function handleCellClick(person, day) {
  openMasterModal(person, day);
}
  function toggleMasterPerson(key, dayName) {
    if (_masterSelected.has(key)) {
        _masterSelected.delete(key);
    } else {
        _masterSelected.add(key);
    }
    renderMasterView(_masterRawData);
    updateMasterSelectionBar(); 
  }
  function openMasterModal(p,d,s,e,t,r) { 
    // ✅ Mark as editing to prevent auto-refresh disruption
    setEditingMode(true);
    
    // ✅ Check if editing is enabled in master mode
    if (_isMasterMode && !_masterEditEnabled) {
      toast("Click Edit to start making draft changes.", "info");
      setEditingMode(false);
      return;
    }
    
    const isAdding = !s || !e;
    const docEl = document.getElementById("modalDocId");
    const asgEl = document.getElementById("modalAssignmentId");
    if (docEl) docEl.value = "";
    if (asgEl) asgEl.value = "";
    
    // Populate the inputs
    document.getElementById("modalEmployee").value = p;
    document.getElementById("modalDay").value = d;
    
    const startInput = document.getElementById("modalStart");
    const endInput = document.getElementById("modalEnd");
    
    if (isAdding) {
      startInput.value = "08:00";
      endInput.value = "17:00";
      document.getElementById("modalOrigStart").value = "NEW";
      document.getElementById("modalOrigEnd").value = "NEW";
      document.getElementById("modalOrigTeam").value = "NEW";
      document.getElementById("modalOrigRole").value = "NEW";
    } else {
      startInput.value = formatTimeHHMM(s) || "";
      endInput.value = formatTimeHHMM(e) || "";
      document.getElementById("modalOrigStart").value = s || "";
      document.getElementById("modalOrigEnd").value = e || "";
      document.getElementById("modalOrigTeam").value = t || "";
      document.getElementById("modalOrigRole").value = r || "";
    }
    
    // Populate Channel + Role dropdowns
    fillSelect("modalTeam", _teams, isAdding, true);
    fillSelect("modalRole", _roles, true);
    
    const teamSelect = document.getElementById("modalTeam");
    const customWrapper = document.getElementById("customChannelWrapper");
    const customInput = document.getElementById("modalCustomChannel");
    
    if (!isAdding && t) {
      const teamInList = _teams.includes(t);
      if (teamInList) {
        teamSelect.value = t;
        if (customWrapper) customWrapper.style.display = "none";
        if (customInput) customInput.value = "";
      } else {
        teamSelect.value = "__custom__";
        if (customWrapper) customWrapper.style.display = "block";
        if (customInput) customInput.value = t;
      }
    } else {
      if (teamSelect) teamSelect.value = "";
      if (customWrapper) customWrapper.style.display = "none";
      if (customInput) customInput.value = "";
    }
    
    const roleSelect = document.getElementById("modalRole");
    if (roleSelect) {
      if (r && !_roles.includes(r)) {
        roleSelect.appendChild(new Option(formatRoleDisplay(r), r));
      }
      roleSelect.value = r || "";
    }
    
    const deleteBtn = document.getElementById("modalDeleteBtn");
    if (deleteBtn) {
      deleteBtn.style.visibility = isAdding ? "hidden" : "visible";
      deleteBtn.style.pointerEvents = isAdding ? "none" : "auto";
    }
    
    // Update modal title
    const modalTitle = document.querySelector("#editShiftModal h3");
    if (modalTitle) modalTitle.innerText = isAdding ? "Add New Shift" : "Edit Shift";
    
    // Show the modal
    document.getElementById("editShiftModal").style.display = "flex";
  }
  
  function updateMasterSelectionBar() {
    const count = _masterSelected.size;
    const bar = document.getElementById("selectionBar");
    const countSpan = document.getElementById("sbCount");
    
    if (count > 0) {
        bar.classList.add("visible");
        countSpan.innerText = count;
    } else {
        bar.classList.remove("visible");
    }
  }
// ============================================
// NOTIFICATION SYSTEM
// ============================================
let pendingNotifications = [];
// Toggle notification panel open/closed
// ============================================
// [SECTION 12] NOTIFICATIONS
// ============================================
function toggleNotifPanel(forceClose) {
  const panel = $("notifPanel");
  if (!panel) {
    console.error("notifPanel element not found!");
    return;
  }
  
  // If forceClose is true, just close it
  if (forceClose === true) {
  panel.style.display = "none";
  panel.classList.remove("open");
  return;
}
  
  // Toggle visibility
  const isCurrentlyOpen = panel.style.display === "block" || panel.classList.contains("open");
  
  if (isCurrentlyOpen) {
    panel.style.display = "none";
    panel.classList.remove("open");
  } else {
    panel.style.display = "block";
    panel.classList.add("open");
    loadPendingNotifications();
  }
}
// Load pending notifications from backend
async function loadPendingNotifications() {
  const listEl = $("notifList");
  
  if (!listEl) return;
  
  listEl.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:20px;">Loading... </div>';
  
  try {
    // Fetch shift change notifications
    const shiftRes = await fetch("./?action=notifications/pending");
    const shiftData = await shiftRes.json();
    
    if (!shiftData.ok) throw new Error(shiftData.error || "Failed to load shift notifications");
    
    // Mark shift notifications with their type
    const shiftNotifications = (shiftData.notifications || []).map(n => ({
      ...n,
      notificationType: 'shift_change'
    }));
    
    // If manager, also fetch manager notifications (time-off requests)
    let managerNotifications = [];
    if (window._isManager) {
      try {
        const mgrRes = await fetch("./?action=manager/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ managerName: window._myName })
        });
        const mgrData = await mgrRes.json();
        
        if (mgrData.ok) {
          // Include time-off requests that haven't been resolved yet
          managerNotifications = (mgrData.notifications || [])
            .filter(n => !n.resolvedAt && n.status !== "approved" && n.status !== "denied")
            .map(n => ({
              ...n,
              notificationType: 'timeoff_request'
            }));
        }
      } catch (mgrErr) {
        console.warn("Failed to fetch manager notifications:", mgrErr);
      }
    }
    
    // Combine both types of notifications
    pendingNotifications = [...managerNotifications, ...shiftNotifications];
    
    renderNotifications();
    updateNotifBadge();
    
  } catch (err) {
    console.error("Load notifications error:", err);
    listEl.innerHTML = `<div style="text-align: center; color:#ef4444; padding:20px;">Error:  ${err.message}</div>`;
  }
}
// Render notifications in the panel
function renderNotifications() {
  const listEl = $("notifList");
  
  if (!listEl) return;
  
  // Only show backend notifications (we no longer use local queue for deferred)
  const allNotifications = pendingNotifications.map((n, idx) => {
    // Check if we have undo data stored for this notification
    const undoKey = `undo_${n.docId}_${n.assignmentId}`;
    let undoData = null;
    try {
      const stored = localStorage.getItem(undoKey);
      if (stored) undoData = JSON.parse(stored);
    } catch (e) {}
    
    return { ...n, source: 'backend', idx, undoData };
  });
  
  if (allNotifications.length === 0) {
    listEl.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:20px;">No pending notifications 🎉</div>';
    return;
  }
  
  let html = "";
  
  allNotifications.forEach((n, displayIdx) => {
    const originalIdx = n.idx;
    
    // Check if this is a time-off request notification
    if (n.notificationType === 'timeoff_request') {
      // Render time-off request notification with approve/deny buttons
      const agentName = n.agentName || 'Unknown';
      const requestDate = n.date || '';
      const timeOffType = n.timeOffType || 'PTO';
      const reason = n.reason || '';
      const message = n.message || '';
      const requestId = n.requestId || '';
      const notifId = n.id || '';
      const createdAt = n.createdAt ? new Date(n.createdAt).toLocaleString() : '';
      
      html += `
        <div class="notif-item timeoff-request" data-idx="${displayIdx}" style="
          background: linear-gradient(135deg, #fef3c7 0%, #fef9c3 100%);
          border: 1px solid #fcd34d;
          border-radius: 10px;
          padding: 12px;
          margin-bottom: 10px;
        ">
          <div style="display: flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
            <div>
              <div style="font-weight:700; color:#92400e; font-size: 14px;">🏖️ Time Off Request</div>
              <div style="font-size:12px; color:#b45309; font-weight:600; margin-top:2px;">${escapeHtml(agentName)}</div>
            </div>
            <span style="background:#fbbf24; color:#78350f; font-size:10px; font-weight:700; padding:2px 8px; border-radius:10px;">
              ${escapeHtml(timeOffType)}
            </span>
          </div>
          
          <div style="font-size: 12px; color:#78350f; margin-bottom:8px;">
            📅 ${escapeHtml(requestDate)}
          </div>
          
          ${message ? `<div style="font-size:11px; color:#92400e; margin-bottom:8px; padding:8px; background:rgba(0,0,0,0.05); border-radius:6px;">${escapeHtml(message)}</div>` : ''}
          
          ${reason ? `<div style="font-size:11px; color:#78350f; font-style:italic; margin-bottom:10px;">Reason: "${escapeHtml(reason)}"</div>` : ''}
          
          ${createdAt ? `<div style="font-size:10px; color:#a16207; margin-bottom:10px;">Submitted: ${createdAt}</div>` : ''}
          
          <div style="display: flex; gap:6px; flex-wrap:wrap;">
            <button onclick="approveTimeOff('${escapeHtml(requestId)}', '${escapeHtml(notifId)}')" style="
              flex:1; min-width:80px; background:#16a34a; color:#fff; border: none; padding:8px 10px; 
              border-radius:6px; font-size: 11px; font-weight:600; cursor:pointer;
            ">✓ Approve</button>
            
            <button onclick="denyTimeOff('${escapeHtml(requestId)}', '${escapeHtml(notifId)}')" style="
              flex:1; min-width:80px; background:#dc2626; color:#fff; border:none; padding:8px 10px; 
              border-radius:6px; font-size:11px; font-weight:600; cursor:pointer;
            ">✕ Deny</button>
          </div>
        </div>
      `;
    } else {
      // Render shift change notification (original logic)
      const hasUndo = n.undoData && n.undoData.originalPerson;
      const hasError = n.notifyError || n.error;

      // Determine what info to show
      const personName = n.person || 'Unknown';
      const dateStr = n.date || n.dateLabel || '';
      const teamStr = n.team || '';
      const startStr = n.start || n.startLabel || '';
      const endStr = n.end || n.endLabel || '';
      const notesStr = n.notes || n.message || '';
      
      // Get channel styling
      const channelDisplay = getChannelDisplayName(teamStr);
      const channelConfig = getChannelConfig(teamStr);

      html += `
        <div class="notif-item" data-idx="${displayIdx}" style="
          background: ${hasError ? '#fef2f2' : '#f8fafc'};
          border: 1px solid ${hasError ? '#fca5a5' : '#e2e8f0'};
          border-radius: 10px;
          padding: 12px;
          margin-bottom:  10px;
        ">
          <div style="display: flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
            <div>
              <div style="font-weight:700; color:#0f172a; font-size: 14px;">${escapeHtml(personName)}</div>
              <div style="font-size:11px; color:#64748b;">
                ${escapeHtml(dateStr)}
                ${teamStr ? `<span style="background: ${channelConfig.color}; color: ${channelConfig.text}; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:600; margin-left:4px;">${escapeHtml(channelDisplay)}</span>` : ''}
              </div>
            </div>
            <span style="background:${hasError ? '#fee2e2' : '#dbeafe'}; color: ${hasError ? '#dc2626' : '#1e40af'}; font-size:10px; font-weight:700; padding:2px 8px; border-radius:10px;">
              ${hasError ? 'FAILED' : 'PENDING'}
            </span>
          </div>
          
          ${startStr ?  `
          <div style="font-size: 12px; color:#334155; margin-bottom:8px;">
            🕐 ${escapeHtml(startStr)}${endStr ? ' – ' + escapeHtml(endStr) : ''}
          </div>
          ` : ''}
          
          ${notesStr ? `<div style="font-size:11px; color:#64748b; font-style:italic; margin-bottom:10px; padding:8px; background:rgba(0,0,0,0.03); border-radius:6px;">"${escapeHtml(notesStr)}"</div>` : ''}
          
          ${hasError ? `
          <div style="font-size:11px; color:#dc2626; background:#fee2e2; padding:8px; border-radius:6px; margin-bottom:10px; font-weight:500;">
            ⚠️ Error: ${escapeHtml(hasError)}
          </div>
          ` : ''}
          
          <div style="display: flex; gap:6px; flex-wrap:wrap;">
            ${hasError ? `
            <button onclick="sendSingleNotification(${originalIdx})" style="
              flex:1; min-width:80px; background:#f59e0b; color:#fff; border: none; padding:8px 10px; 
              border-radius:6px; font-size: 11px; font-weight:600; cursor:pointer;
            ">🔄 Retry</button>
            ` : `
            <button onclick="sendSingleNotification(${originalIdx})" style="
              flex:1; min-width:80px; background:#b37e78; color:#fff; border: none; padding:8px 10px; 
              border-radius:6px; font-size: 11px; font-weight:600; cursor:pointer;
            ">📤 Send</button>
            `}
            
            ${hasUndo ? `
            <button onclick="undoBackendNotification(${originalIdx})" style="
              flex:1; min-width:70px; background:#f59e0b; color:#fff; border:none; padding:8px 10px; 
              border-radius:6px; font-size:11px; font-weight:600; cursor:pointer;
            ">↩️ Undo</button>
            ` : ''}
            
            <button onclick="dismissNotification(${originalIdx})" style="
              flex:1; min-width:60px; background:#fff; color:#64748b; border:1px solid #e2e8f0; padding:8px 10px; 
              border-radius:6px; font-size:11px; font-weight:600; cursor:pointer;
            ">✕</button>
          </div>
        </div>
      `;
    }
  });
  
  listEl.innerHTML = html;
}
// Update the red badge count
function updateNotifBadge() {
  const badge = $("notifCount");
  if (!badge) return;
  
  // Count only backend pending notifications
  const totalCount = pendingNotifications?.length || 0;
  
  if (totalCount > 0) {
    badge.textContent = totalCount > 99 ? "99+" : totalCount;
    badge.classList.remove("hidden");
  } else {
    badge.textContent = "0";
    badge.classList.add("hidden");
  }
}

// Approve time off request
async function approveTimeOff(requestId, notifId) {
  if (!requestId) {
    toast("❌ Error: Missing request ID", "error");
    return;
  }
  
  try {
    const res = await fetch("./?action=timeoff/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: requestId,
        notifId: notifId,
        managerName: window._myName || "Manager"
      })
    });
    
    const data = await res.json();
    
    if (data.ok) {
      toast("✅ Time off request approved!", "success");
      // Remove from pendingNotifications and re-render
      pendingNotifications = pendingNotifications.filter(n => 
        !(n.notificationType === 'timeoff_request' && n.id === notifId)
      );
      renderNotifications();
      updateNotifBadge();
    } else {
      toast(`❌ Error: ${data.error || "Failed to approve"}`, "error");
    }
    
  } catch (err) {
    console.error("Approve time off error:", err);
    toast(`❌ Error: ${err.message}`, "error");
  }
}

// Deny time off request
async function denyTimeOff(requestId, notifId) {
  if (!requestId) {
    toast("❌ Error: Missing request ID", "error");
    return;
  }
  
  // Ask for denial reason
  const { value: reason, isConfirmed } = await Swal.fire({
    title: 'Deny Time Off Request',
    input: 'text',
    inputLabel: 'Reason for denial (optional)',
    inputPlaceholder: 'Enter reason...',
    showCancelButton: true,
    confirmButtonText: 'Deny Request',
    confirmButtonColor: '#dc2626',
    cancelButtonText: 'Cancel'
  });
  
  if (!isConfirmed) return;
  
  try {
    const res = await fetch("./?action=timeoff/deny", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: requestId,
        notifId: notifId,
        managerName: window._myName || "Manager",
        reason: reason || ""
      })
    });
    
    const data = await res.json();
    
    if (data.ok) {
      toast("Time off request denied", "info");
      // Remove from pendingNotifications and re-render
      pendingNotifications = pendingNotifications.filter(n => 
        !(n.notificationType === 'timeoff_request' && n.id === notifId)
      );
      renderNotifications();
      updateNotifBadge();
    } else {
      toast(`❌ Error: ${data.error || "Failed to deny"}`, "error");
    }
    
  } catch (err) {
    console.error("Deny time off error:", err);
    toast(`❌ Error: ${err.message}`, "error");
  }
}

// Send a single notification
async function sendSingleNotification(idx) {
  const n = pendingNotifications[idx];
  if (!n) return;
  
  try {
    const res = await fetch("./?action=notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notifications: [{ docId: n.docId, assignmentId: n.assignmentId }]
      })
    });
    
    const data = await res.json();
    
    if (data.ok && data.sent > 0) {
      toast(`✅ Notification sent to ${n.person}!`, "success");
      pendingNotifications.splice(idx, 1);
      renderNotifications();
      updateNotifBadge();
    } else {
      const errMsg = data.results?.[0]?.error || "Failed to send";
      toast(`❌ Failed:  ${errMsg}`, "error");
    }
    
  } catch (err) {
    console.error("Send notification error:", err);
    toast(`❌ Error: ${err.message}`, "error");
  }
}
// Dismiss a notification (don't send, just clear it)
async function dismissNotification(idx) {
  const n = pendingNotifications[idx];
  if (!n) return;
  
  try {
    const res = await fetch("./?action=notifications/dismiss", {
      method: "POST",
      headers:  { "Content-Type": "application/json" },
      body:  JSON.stringify({
        docId: n.docId,
        assignmentId: n.assignmentId
      })
    });
    
    const data = await res.json();
    
    if (data.ok) {
      toast(`Notification dismissed`, "info");
      pendingNotifications.splice(idx, 1);
      renderNotifications();
      updateNotifBadge();
    } else {
      toast(`❌ Failed to dismiss`, "error");
    }
    
  } catch (err) {
    console.error("Dismiss error:", err);
    toast(`❌ Error: ${err.message}`, "error");
  }
}
// Send ALL pending notifications
async function sendAllPending() {
  if (pendingNotifications.length === 0) {
    toast("No pending notifications to send", "info");
    return;
  }
  
  const confirmed = await Swal.fire({
    title: "Send All Notifications?",
    text: `This will send ${pendingNotifications.length} notification(s) via Google Chat. `,
    icon: "question",
    showCancelButton:  true,
    confirmButtonText:  "Yes, Send All",
    cancelButtonText: "Cancel"
  });
  
  if (!confirmed.isConfirmed) return;
  
  try {
    const payload = pendingNotifications.map(n => ({
      docId: n.docId,
      assignmentId: n.assignmentId
    }));
    
    const res = await fetch("./?action=notifications/send", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifications: payload })
    });
    
    const data = await res.json();
    
    if (data.ok) {
      toast(`✅ Sent ${data.sent} of ${data.total} notifications`, "success");
      await loadPendingNotifications(); // Refresh the list
    } else {
      toast(`❌ Error sending notifications`, "error");
    }
    
  } catch (err) {
    console.error("Send all error:", err);
    toast(`❌ Error: ${err.message}`, "error");
  }
}

// ============================================
// OPEN SHIFTS MANAGEMENT
// ============================================

let _currentOpenShifts = [];
let _currentFillShiftData = null;

// Open the Open Shifts modal
async function openOpenShiftsModal() {
  const modal = document.getElementById("openShiftsModal");
  if (!modal) return;
  modal.style.display = "flex";
  await loadOpenShifts();
}

// Close the Open Shifts modal
function closeOpenShiftsModal() {
  const modal = document.getElementById("openShiftsModal");
  if (modal) modal.style.display = "none";
}

// Load open shifts from backend
async function loadOpenShifts() {
  const listEl = document.getElementById("openShiftsList");
  if (!listEl) return;
  
  listEl.innerHTML = '<div style="text-align:center; color:var(--text-secondary); padding:20px;">Loading open shifts...</div>';
  
  try {
    const res = await fetch("./?action=open-shifts");
    const data = await res.json();
    
    if (!data.ok) throw new Error(data.error || "Failed to load");
    
    _currentOpenShifts = data.openShifts || [];
    
    if (_currentOpenShifts.length === 0) {
      listEl.innerHTML = '<div style="text-align:center; color:var(--text-secondary); padding:40px;">🎉 No open shifts - all shifts are covered!</div>';
      return;
    }
    
    let html = '';
    _currentOpenShifts.forEach((shift, idx) => {
      const dateStr = shift.date || '';
      const dateDisplay = dateStr ? new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Unknown Date';
      
      html += `
        <div class="open-shift-card">
          <div class="open-shift-header">
            <div class="open-shift-date">${escapeHtml(dateDisplay)}</div>
            <span class="open-shift-team">${escapeHtml(shift.team || 'Team')}</span>
          </div>
          <div class="open-shift-time">🕐 ${escapeHtml(shift.startLabel || shift.start || '')} - ${escapeHtml(shift.endLabel || shift.end || '')}</div>
          ${shift.openReason ? `<div class="open-shift-reason">${escapeHtml(shift.openReason)}</div>` : ''}
          ${shift.originalPerson ? `<div style="font-size:11px; color:var(--text-tertiary); margin-bottom:10px;">Originally: ${escapeHtml(shift.originalPerson)}</div>` : ''}
          <button class="open-shift-btn" onclick="openFillShiftModal(${idx})">👤 Assign Agent</button>
        </div>
      `;
    });
    
    listEl.innerHTML = html;
    
  } catch (err) {
    console.error("Load open shifts error:", err);
    listEl.innerHTML = `<div style="text-align:center; color:#ef4444; padding:20px;">Error: ${err.message}</div>`;
  }
}

// Open the Fill Shift modal
function openFillShiftModal(idx) {
  const shift = _currentOpenShifts[idx];
  if (!shift) return;
  
  _currentFillShiftData = shift;
  
  const modal = document.getElementById("fillShiftModal");
  const infoEl = document.getElementById("fillShiftInfo");
  const agentSelect = document.getElementById("fillShiftAgent");
  
  if (!modal || !infoEl || !agentSelect) return;
  
  // Populate shift info
  const dateStr = shift.date || '';
  const dateDisplay = dateStr ? new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : 'Unknown Date';
  
  infoEl.innerHTML = `
    <div style="font-weight:700; font-size:14px; color:var(--text-primary); margin-bottom:6px;">📅 ${escapeHtml(dateDisplay)}</div>
    <div style="font-size:12px; color:var(--text-secondary);">
      <span style="background:var(--accent-primary); color:white; padding:2px 8px; border-radius:4px; font-weight:600; font-size:11px;">${escapeHtml(shift.team || 'Team')}</span>
      &nbsp;🕐 ${escapeHtml(shift.startLabel || shift.start || '')} - ${escapeHtml(shift.endLabel || shift.end || '')}
    </div>
    ${shift.openReason ? `<div style="font-size:11px; color:var(--text-tertiary); margin-top:8px; font-style:italic;">${escapeHtml(shift.openReason)}</div>` : ''}
  `;
  
  // Populate agent dropdown
  agentSelect.innerHTML = '<option value="">-- Select an agent --</option>';
  
  if (window._peopleList && window._peopleList.length > 0) {
    window._peopleList.forEach(p => {
      const name = p.name || p.id || '';
      if (name && name.toLowerCase() !== 'open') {
        agentSelect.innerHTML += `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
      }
    });
  } else {
    // Fallback: try to get from global state
    const peopleFromState = window._people || [];
    peopleFromState.forEach(p => {
      const name = p.name || p.id || '';
      if (name && name.toLowerCase() !== 'open') {
        agentSelect.innerHTML += `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
      }
    });
  }
  
  modal.style.display = "flex";
}

// Close the Fill Shift modal
function closeFillShiftModal() {
  const modal = document.getElementById("fillShiftModal");
  if (modal) modal.style.display = "none";
  _currentFillShiftData = null;
}

// Submit fill shift
async function submitFillShift() {
  if (!_currentFillShiftData) {
    toast("No shift selected", "error");
    return;
  }
  
  const agentSelect = document.getElementById("fillShiftAgent");
  const notifyCheckbox = document.getElementById("fillShiftNotify");
  
  const agentName = agentSelect?.value;
  const notifyAgent = notifyCheckbox?.checked ?? true;
  
  if (!agentName) {
    toast("Please select an agent", "error");
    return;
  }
  
  try {
    const res = await fetch("./?action=open-shifts/fill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        docId: _currentFillShiftData.docId,
        assignmentId: _currentFillShiftData.assignmentId,
        agentName: agentName,
        notifyAgent: notifyAgent
      })
    });
    
    const data = await res.json();
    
    if (data.ok) {
      toast(`✅ Shift assigned to ${agentName}!`, "success");
      closeFillShiftModal();
      await loadOpenShifts(); // Refresh the list
      
      // Also refresh the main schedule view
      if (typeof forceRefresh === 'function') {
        forceRefresh();
      }
    } else {
      toast(`❌ Error: ${data.error || "Failed to assign"}`, "error");
    }
    
  } catch (err) {
    console.error("Fill shift error:", err);
    toast(`❌ Error: ${err.message}`, "error");
  }
}

// Update coverage dashboard to show open shifts
async function updateCoverageOpenShifts() {
  if (!window._isManager) return;
  
  try {
    const res = await fetch("./?action=open-shifts");
    const data = await res.json();
    
    if (!data.ok) return;
    
    const openShifts = data.openShifts || [];
    const todayOpenShifts = openShifts.filter(s => {
      const today = new Date().toISOString().split('T')[0];
      return s.date === today;
    });
    
    // Find or create the open shifts section in coverage panel
    const covContent = document.getElementById("covContent");
    if (!covContent) return;
    
    // Remove existing open shifts section if any
    const existingSection = covContent.querySelector('.cov-open-shifts-section');
    if (existingSection) existingSection.remove();
    
    if (todayOpenShifts.length === 0) return;
    
    // Create new section
    const section = document.createElement('div');
    section.className = 'cov-open-shifts-section';
    
    let html = `
      <div class="cov-open-shifts-header">
        <div class="cov-open-shifts-title">
          ⚠️ Open Shifts Today
          <span class="cov-open-shifts-badge">${todayOpenShifts.length}</span>
        </div>
        <button onclick="openOpenShiftsModal()" style="font-size:11px; padding:4px 10px; background:var(--accent-primary); color:white; border:none; border-radius:6px; cursor:pointer;">View All</button>
      </div>
    `;
    
    todayOpenShifts.slice(0, 3).forEach((shift, idx) => {
      html += `
        <div class="cov-open-shift-item">
          <div class="cov-open-shift-info">
            <div class="cov-open-shift-team">${escapeHtml(shift.team || 'Team')}</div>
            <div class="cov-open-shift-time">${escapeHtml(shift.startLabel || shift.start || '')} - ${escapeHtml(shift.endLabel || shift.end || '')}</div>
          </div>
          <button class="cov-open-shift-fill-btn" onclick="openFillShiftModal(${idx}); _currentOpenShifts = ${JSON.stringify(todayOpenShifts).replace(/"/g, '&quot;')};">Fill</button>
        </div>
      `;
    });
    
    if (todayOpenShifts.length > 3) {
      html += `<div style="text-align:center; margin-top:8px;"><a href="#" onclick="openOpenShiftsModal(); return false;" style="font-size:11px; color:var(--accent-primary);">View ${todayOpenShifts.length - 3} more open shifts →</a></div>`;
    }
    
    section.innerHTML = html;
    covContent.appendChild(section);
    
  } catch (err) {
    console.error("Update coverage open shifts error:", err);
  }
}

// ============================================
// END OPEN SHIFTS MANAGEMENT
// ============================================

// Undo a backend notification using localStorage undo data
async function undoBackendNotification(idx) {
  const notif = pendingNotifications[idx];
  if (!notif) {
    toast("Notification not found", "error");
    return;
  }
  
  // Get undo data from localStorage
  const undoKey = `undo_${notif.docId}_${notif.assignmentId}`;
  let undoData = null;
  try {
    const stored = localStorage.getItem(undoKey);
    if (stored) undoData = JSON.parse(stored);
  } catch (e) {}
  
  if (!undoData || !undoData.originalPerson) {
    toast("Cannot undo - no undo data available", "error");
    return;
  }
  
  const result = await Swal.fire({
    title: '↩️ Undo This Change?',
    html: `
      <div style="text-align:left; padding:10px; background:#fef3c7; border-radius:8px; border:1px solid #fcd34d;">
        <p style="margin:0 0 10px 0; color:#92400e;">This will revert the schedule change:</p>
        <div style="font-size:13px; color:#78350f;">
          <strong>Restore:</strong> ${escapeHtml(undoData.originalPerson)}<br>
          <strong>Shift:</strong> ${escapeHtml(notif.date || 'Unknown date')}
        </div>
      </div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#f59e0b',
    cancelButtonColor: '#64748b',
    confirmButtonText: '↩️ Yes, Undo',
    cancelButtonText: 'Cancel'
  });
  
  if (!result.isConfirmed) return;
  
  toast("Reverting change...");
  
  try {
    const response = await fetch('./?action=assignment/replace', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        docId: undoData.docId,
        assignmentId: undoData.assignmentId,
        newPerson: undoData.originalPerson,
        notes: undoData.originalNotes || '',
        notifyMode: "silent"
      })
    });
    
    const res = await response.json();
    
    if (res.ok || res.status === "success") {
      // Update local data
      const local = _allData.find(x => x.assignmentId === undoData.assignmentId);
      if(local) { 
        local.person = undoData.originalPerson; 
        local.notes = undoData.originalNotes || ''; 
      }
      
      // Remove undo data from localStorage
      localStorage.removeItem(undoKey);
      
      // Refresh UI
      renderView();
      loadPendingNotifications();
      
      Swal.fire({
        title: '✅ Reverted!',
        text: 'The schedule change has been undone.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } else {
      throw new Error(res.error || res.message || "Unknown error");
    }
  } catch (err) {
    toast(`Undo failed: ${err.message || err}`, "error");
  }
}

  function toggleDrawer() {
    const drawer = document.getElementById("rightDrawer");
    const notifPanel = document.getElementById("notifPanel");
    if (notifPanel && notifPanel.style.display === "block") {
        notifPanel.style.display = "none";
    }
    if (drawer) {
        drawer.classList.toggle("open");
    }
  }
  function setMode(mode) {
    _mode = mode; 
    document.getElementById("btnModeQuick").className = mode === "quick" ? "segBtn active" : "segBtn";
    document.getElementById("btnModeTeam").className = mode === "team" ? "segBtn active" : "segBtn";
    const quickDiv = document.getElementById("drawerQuick");
    const teamDiv = document.getElementById("drawerTeam");
    if (mode === "quick") {
      quickDiv.classList.remove("hidden");
      teamDiv.classList.add("hidden");
    } else {
      quickDiv.classList.add("hidden");
      teamDiv.classList.remove("hidden");
    }
  }
  // Clear all notifications (dismiss all)
async function clearNotifications() {
  if (pendingNotifications.length === 0) {
    toast("No notifications to clear", "info");
    return;
  }
  
  const confirmed = await Swal.fire({
    title: "Clear All Notifications?",
    text: "This will dismiss all pending notifications without sending them.",
    icon: "warning",
    showCancelButton:  true,
    confirmButtonText:  "Yes, Clear All",
    confirmButtonColor: "#ef4444",
    cancelButtonText: "Cancel"
  });
  
  if (!confirmed.isConfirmed) return;
  
  // Dismiss each one
  for (const n of pendingNotifications) {
    try {
      await fetch("./?action=notifications/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docId: n.docId, assignmentId: n.assignmentId })
      });
    } catch (e) {
      console.error("Clear error:", e);
    }
  }
  
  pendingNotifications = [];
  renderNotifications();
  updateNotifBadge();
  toast("All notifications cleared", "info");
}
  // Master helper stubs
  
  

  function ensureMasterControls() {
  const host = document.getElementById("masterView");
  if (!host) return;

  let bar = document.getElementById("mstControlsBar");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "mstControlsBar";
    bar.style.display = "flex";
    bar.style.gap = "8px";
    bar.style.alignItems = "center";
    bar.style.padding = "10px 12px";
    bar.style.borderBottom = "1px solid #e2e8f0";
    bar.style.background = "#ffffff";
    bar.style.position = "sticky";
    bar.style.top = "0";
    bar.style.zIndex = "20";
    host.prepend(bar);
  }

  const status = _masterEditEnabled
    ? `<span style="font-weight:800; color:#c2410c;">EDITING DRAFT</span>`
    : `<span style="font-weight:800; color:#475569;">VIEW ONLY</span>`;

  bar.innerHTML = `
    <div style="margin-right:8px;">${status}</div>

    <button id="btnMasterEdit"
      onclick="masterStartEdit()"
      style="padding:8px 10px; border-radius:8px; border:1px solid #cbd5e1; background:#fff; cursor:pointer; font-weight:700;">
      ✏️ Edit
    </button>

    <button id="btnMasterPreview"
      onclick="masterPreviewChanges()"
      style="padding:8px 10px; border-radius:8px; border:1px solid #cbd5e1; background:#fff; cursor:pointer; font-weight:700;">
      👀 Preview
    </button>

    <button id="btnMasterCancel"
      onclick="masterCancelDraft()"
      style="padding:8px 10px; border-radius:8px; border:1px solid #cbd5e1; background:#fff; cursor:pointer; font-weight:700;">
      ↩️ Cancel
    </button>

    <div style="margin-left:auto; display:flex; gap:8px;">
      <button id="btnMasterManageAgents"
        onclick="openManageAgentsModal()"
        style="padding:8px 10px; border-radius:8px; border:1px solid #cbd5e1; background:#fff; cursor:pointer; font-weight:700;">
        👥 Add / Remove Agents
      </button>
    </div>
  `;

  // button states
  const bEdit = document.getElementById("btnMasterEdit");
  const bPrev = document.getElementById("btnMasterPreview");
  const bCan = document.getElementById("btnMasterCancel");
  if (bEdit) bEdit.disabled = _masterEditEnabled;
  if (bPrev) bPrev.disabled = !_masterEditEnabled;
  if (bCan) bCan.disabled = !_masterEditEnabled;
  [bEdit,bPrev,bCan].forEach(b => {
    if (!b) return;
    b.style.opacity = b.disabled ? "0.5" : "1";
    b.style.cursor = b.disabled ? "not-allowed" : "pointer";
  });
}

function masterStartEdit() {
  // Acquire master schedule lock before editing
  acquireEditLock('master', 'template').then(result => {
    if (!result.acquired) {
      // Show who has the lock
      Swal.fire({
        icon: 'warning',
        title: 'Master Schedule Locked',
        html: `<p>The master schedule is currently being edited by <strong>${escapeHtml(result.lock?.lockedByName || 'another manager')}</strong>.</p>
               <p>Please wait until they finish or try again later.</p>
               <p style="font-size:12px;color:#64748b;">Lock expires in ${formatLockExpiry(result.lock?.expiresAt)}</p>`,
        confirmButtonText: 'OK',
        confirmButtonColor: '#b37e78'
      });
      return;
    }
    
    // Successfully acquired lock - start editing
    if (!_masterOriginalData) _masterOriginalData = deepClone(_masterRawData || {});
    if (!_masterDraftData) _masterDraftData = deepClone(_masterRawData || {});
    _masterEditEnabled = true;
    _masterRawData = _masterDraftData;
    setEditingMode(true);
    renderMasterView(_masterRawData);
  });
}

async function masterCancelDraft() {
  // Release the lock
  await releaseEditLock('master', 'template');
  
  _masterDraftData = deepClone(_masterOriginalData || {});
  _masterRawData = _masterDraftData;
  _masterEditEnabled = false;
  setEditingMode(false);
  renderMasterView(_masterRawData);
  toast("Draft cancelled. No changes were applied.", "info");
}

function diffMaster(orig, draft) {
  const days = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const key = (x) => `${x.person}|${x.start}|${x.end}|${x.team || ""}|${x.role || ""}`;

  const out = [];
  days.forEach(day => {
    const o = Array.isArray(orig?.[day]) ? orig[day] : [];
    const d = Array.isArray(draft?.[day]) ? draft[day] : [];

    const oMap = new Map();
    o.forEach(x => oMap.set(key(x), (oMap.get(key(x)) || 0) + 1));

    const dMap = new Map();
    d.forEach(x => dMap.set(key(x), (dMap.get(key(x)) || 0) + 1));

    const adds = [];
    const removes = [];

    for (const [k, cnt] of dMap.entries()) {
      const prev = oMap.get(k) || 0;
      if (cnt > prev) adds.push({ k, n: cnt - prev });
    }
    for (const [k, cnt] of oMap.entries()) {
      const now = dMap.get(k) || 0;
      if (cnt > now) removes.push({ k, n: cnt - now });
    }

    if (adds.length || removes.length) out.push({ day, adds, removes });
  });

  return out;
}

async function masterApplyDraft() {
  try {
    Swal.fire({
      title: "Applying template...",
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading()
    });

    const res = await fetch("./?action=base-schedule/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ days: _masterDraftData || {} })
    });

    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Failed to apply template");

    // ✅ commit: original = draft, then reset draft to a fresh clone
    _masterOriginalData = deepClone(_masterDraftData);
    _masterDraftData = deepClone(_masterOriginalData);
    _masterRawData = _masterDraftData;
    _masterEditEnabled = false;
    
    // Release the master schedule lock
    await releaseEditLock('master', 'template');
    setEditingMode(false);

    renderMasterView(_masterRawData);

    // Offer to propagate changes to live schedule
    const propagate = await Swal.fire({
      icon: "success",
      title: "Template Saved!",
      html: `
        <div style="text-align:left; padding:10px;">
          <p style="margin-bottom:15px;">Master Schedule template has been updated.</p>
          <div style="background:#fef3c7; border:1px solid #fcd34d; border-radius:8px; padding:12px;">
            <p style="margin:0; font-size:13px; color:#92400e;">
              <strong>⚠️ Note:</strong> Changes only affect <strong>future</strong> schedules when generated.
            </p>
            <p style="margin:8px 0 0 0; font-size:12px; color:#a16207;">
              Want to apply these changes to existing future schedules?
            </p>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: "#b37e78",
      cancelButtonColor: "#64748b",
      confirmButtonText: "🔄 Regenerate Now",
      cancelButtonText: "Done"
    });
    
    if (propagate.isConfirmed) {
      // Call regenerate with 14 days by default
      regenerateAllSchedule();
    }
  } catch (e) {
    console.error(e);
    Swal.fire({
      icon: "error",
      title: "Apply failed",
      text: e.message,
      confirmButtonColor: "#ef4444"
    });
  }
}

function masterPreviewChanges() {
  // ✅ ensure baseline/draft exist BEFORE diff
  if (!_masterOriginalData) _masterOriginalData = deepClone(_masterRawData || {});
  if (!_masterDraftData) _masterDraftData = deepClone(_masterRawData || {});

  const diff = diffMaster(_masterOriginalData, _masterDraftData);

  if (!diff.length) {
    Swal.fire({
      icon: "info",
      title: "No changes",
      text: "Your draft matches the current template.",
      confirmButtonColor: "#b37e78"
    });
    return;
  }

  // Build modern preview HTML
  let totalAdds = 0, totalRemoves = 0;
  diff.forEach(block => {
    totalAdds += block.adds.length;
    totalRemoves += block.removes.length;
  });

  let html = `
    <div style="text-align:left;">
      <!-- Summary Stats -->
      <div style="display:flex; gap:12px; margin-bottom:16px;">
        <div style="flex:1; background:linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); padding:12px 16px; border-radius:12px; border:1px solid #86efac;">
          <div style="font-size:24px; font-weight:800; color:#166534;">${totalAdds}</div>
          <div style="font-size:11px; font-weight:600; color:#15803d; text-transform:uppercase;">Changes Added</div>
        </div>
        <div style="flex:1; background:linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); padding:12px 16px; border-radius:12px; border:1px solid #fca5a5;">
          <div style="font-size:24px; font-weight:800; color:#991b1b;">${totalRemoves}</div>
          <div style="font-size:11px; font-weight:600; color:#dc2626; text-transform:uppercase;">Changes Removed</div>
        </div>
      </div>
      
      <!-- Changes List -->
      <div style="max-height:300px; overflow:auto; border:1px solid var(--border-color, #e2e8f0); border-radius:12px;">`;
  
  diff.forEach((block, idx) => {
    const borderTop = idx > 0 ? "border-top:1px solid #e2e8f0;" : "";
    html += `
      <div style="padding:14px; ${borderTop} background:var(--card-bg, #fff);">
        <div style="font-weight:800; font-size:14px; color:var(--text-primary, #1e293b); margin-bottom:10px; display:flex; align-items:center; gap:8px;">
          <span style="background:#b37e78; color:white; padding:2px 8px; border-radius:6px; font-size:11px;">${block.day}</span>
          <span style="color:#64748b; font-size:12px; font-weight:500;">${block.adds.length + block.removes.length} change${block.adds.length + block.removes.length !== 1 ? 's' : ''}</span>
        </div>`;

    if (block.adds.length) {
      html += `<div style="margin-bottom:8px;">`;
      block.adds.forEach(a => {
        const parts = a.k.split('|');
        const name = parts[0] || '';
        const time = parts[1] && parts[2] ? `${formatTimeDisplay(parts[1])} - ${formatTimeDisplay(parts[2])}` : '';
        const channel = parts[3] || '';
        html += `
          <div style="display:flex; align-items:center; gap:8px; padding:8px 10px; background:#f0fdf4; border-radius:8px; margin-bottom:4px; border-left:3px solid #22c55e;">
            <span style="color:#22c55e; font-size:14px;">➕</span>
            <div style="flex:1;">
              <span style="font-weight:600; color:#166534;">${name}</span>
              ${time ? `<span style="color:#15803d; font-size:12px; margin-left:8px;">${time}</span>` : ''}
              ${channel ? `<span style="background:#bbf7d0; color:#166534; padding:1px 6px; border-radius:4px; font-size:10px; margin-left:6px;">${channel}</span>` : ''}
            </div>
          </div>`;
      });
      html += `</div>`;
    }
    
    if (block.removes.length) {
      html += `<div>`;
      block.removes.forEach(r => {
        const parts = r.k.split('|');
        const name = parts[0] || '';
        const time = parts[1] && parts[2] ? `${formatTimeDisplay(parts[1])} - ${formatTimeDisplay(parts[2])}` : '';
        const channel = parts[3] || '';
        html += `
          <div style="display:flex; align-items:center; gap:8px; padding:8px 10px; background:#fef2f2; border-radius:8px; margin-bottom:4px; border-left:3px solid #ef4444;">
            <span style="color:#ef4444; font-size:14px;">➖</span>
            <div style="flex:1;">
              <span style="font-weight:600; color:#991b1b; text-decoration:line-through;">${name}</span>
              ${time ? `<span style="color:#dc2626; font-size:12px; margin-left:8px;">${time}</span>` : ''}
              ${channel ? `<span style="background:#fecaca; color:#991b1b; padding:1px 6px; border-radius:4px; font-size:10px; margin-left:6px;">${channel}</span>` : ''}
            </div>
          </div>`;
      });
      html += `</div>`;
    }

    html += `</div>`;
  });
  
  html += `</div></div>`;

  Swal.fire({
    title: "📋 Review Changes",
    html,
    width: 500,
    showCancelButton: true,
    confirmButtonText: "✓ Apply Changes",
    cancelButtonText: "← Keep Editing",
    confirmButtonColor: "#16a34a",
    cancelButtonColor: "#64748b"
  }).then((r) => {
    if (r.isConfirmed) masterApplyDraft();
  });
}

// Helper to format time for preview
function formatTimeDisplay(time) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${String(m || 0).padStart(2, '0')} ${ampm}`;
}

function closeMasterModal() {
  $("masterOverlay").style.display = "none";
}

// ============================================
// SAVE MASTER SCHEDULE EDIT
// ============================================
async function saveMasterEdit() {
  const person = $("mstPerson").value;
  const day = $("mstDay").value;
  const newStart = $("mstStart").value.trim();
  const newEnd = $("mstEnd").value.trim();
  const newTeam = $("mstTeam").value;
  const newRole = $("mstRole").value;
  const syncToLive = $("mstSync").checked;
  
  // Validation
  if (!person || !day) {
    toast("Missing person or day information", "error");
    return;
  }
  
  if (!newStart || !newEnd) {
    toast("Please enter both start and end times", "error");
    return;
  }
  
  // Parse times to validate
  const startDec = parseTimeDecimal(newStart);
  const endDec = parseTimeDecimal(newEnd);
  
  if (startDec >= endDec) {
    toast("End time must be after start time", "error");
    return;
  }
  
  // Find the original shift data from master template
  const originalShift = _masterRawData?.find(item => 
    item.person === person && 
    item.day === day
  );
  
  const oldStart = originalShift?.start || "";
  const oldEnd = originalShift?.end || "";
  
  // Determine action (EDIT if original exists, ADD if new)
  const action = originalShift ? "EDIT" : "ADD";
  
  // Convert times to HH:MM format
  const formattedNewStart = formatTimeHHMM(newStart);
  const formattedNewEnd = formatTimeHHMM(newEnd);
  const formattedOldStart = formatTimeHHMM(oldStart);
  const formattedOldEnd = formatTimeHHMM(oldEnd);
  
  try {
    // Show loading state
    toast("Saving changes...", "info");
    
    // 1. Update the master template (base_schedule)
    const masterRes = await fetch('/update-master-schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        person,
        day,
        oldStart: formattedOldStart,
        oldEnd: formattedOldEnd,
        newStart: formattedNewStart,
        newEnd: formattedNewEnd,
        newTeam,
        newRole
      })
    });
    
    const masterData = await masterRes.json();
    
    if (masterData.status !== "success") {
      throw new Error(masterData.message || "Failed to update master template");
    }
    
    // 2. If sync checkbox is checked, trigger regeneration for affected future dates
    if (syncToLive) {
      toast("Syncing to live schedule...", "info");
      
      // Trigger a regeneration for the next 14 days
      // This will apply the updated master template to future schedules
      try {
        const genRes = await fetch('./?action=admin/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            days: 14,
            teamKey: newTeam || "ALL",
            startDate: new Date(Date.now() + 86400000).toISOString().split('T')[0] // Tomorrow
          })
        });
        const genData = await genRes.json();
        
        if (genData.ok) {
          toast(`✅ Master template updated & synced to future schedule`, "success");
        } else {
          toast(`⚠️ Master updated but sync may be incomplete: ${genData.error || 'Unknown error'}`, "warning");
        }
      } catch (syncErr) {
        console.warn("Sync to live failed:", syncErr);
        toast(`⚠️ Master updated but live sync failed`, "warning");
      }
    } else {
      toast("✅ Master template updated", "success");
    }
    
    // Close modal and refresh view
    closeMasterModal();
    
    // Refresh master view if currently viewing it
    if (typeof loadMasterTemplateData === 'function') {
      loadMasterTemplateData();
    }
    
    // Also refresh main schedule data
    if (typeof loadSystemData === 'function') {
      setTimeout(() => loadSystemData(), 500);
    }
    
  } catch (err) {
    console.error("Save Master Edit Error:", err);
    toast("❌ " + (err.message || "Failed to save changes"), "error");
  }
}

// Helper to convert time to HH:MM format (handles AM/PM)
function formatTimeHHMM(t) {
  if (!t) return "";
  const s = String(t).trim();
  
  // Handle AM/PM format (e.g., "8:00 AM", "2:30 PM")
  const ampmMatch = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = ampmMatch[2];
    const ampm = ampmMatch[3]?.toUpperCase();
    
    if (ampm === "PM" && h < 12) h += 12;
    if (ampm === "AM" && h === 12) h = 0;
    
    return `${String(h).padStart(2, '0')}:${m}`;
  }
  
  // Handle HH:MM or HH:MM:SS format
  const match = s.match(/^(\d{1,2}):(\d{2})(:\d{2})?$/);
  if (match) {
    return `${String(match[1]).padStart(2, '0')}:${match[2]}`;
  }
  
  return s;
}

  // ============================================
// AGENT NOTIFICATIONS SYSTEM
// ============================================
let _agentNotifications = [];
let _agentNotifUnreadCount = 0;
let _lastAgentNotifFetch = 0;
const AGENT_NOTIF_MIN_INTERVAL = 60000; // Minimum 1 minute between fetches

// ============================================
