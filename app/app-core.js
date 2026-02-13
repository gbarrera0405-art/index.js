// ╔══════════════════════════════════════════════════════════════════╗
// ║                    SCHEDULING MANAGER APP                        ║
// ║                  INDEX OF SECTIONS (Ctrl+F)                      ║
// ╠══════════════════════════════════════════════════════════════════╣
// ║  [SECTION 1]  CONFIGURATION (CHANNEL_CONFIG, CHANNEL_ABBREV)     ║
// ║  [SECTION 2]  AUTHENTICATION (handleSignIn, saveAuthSession)     ║
// ║  [SECTION 3]  DARK MODE (initDarkMode, toggleDarkMode)           ║
// ║  [SECTION 4]  UTILITIES (pstISODate, formatTime, escapeHtml)     ║
// ║  [SECTION 5]  CACHE (getCachedData, setCachedData)               ║
// ║  [SECTION 6]  EDIT LOCKS (acquireLock, renewLock, releaseLock)    ║
// ║  [SECTION 7]  INIT & LOAD (window.onload, load, loadSystemData)  ║
// ║  [SECTION 8]  RENDERING (renderView, renderScheduleView)         ║
// ║  [SECTION 9]  COVERAGE (renderCoverageDashboard, loadRules)      ║
// ║  [SECTION 10] SHIFTS (deleteShift, saveShift, markTimeOff)       ║
// ║  [SECTION 11] TIME OFF (submitTimeOff, openFutureTimeOffModal)   ║
// ║  [SECTION 12] NOTIFICATIONS (toggleNotifPanel, sendAllPending)   ║
// ║  [SECTION 13] MASTER SCHEDULE (renderMasterView, masterApply)    ║
// ║  [SECTION 14] METRICS (renderMetricsView, fetchAgentStats)       ║
// ║  [SECTION 15] AGENT MODE (loadAgentNotifications, respondSwap)   ║
// ║  [SECTION 16] ADMIN (openAdminModal, wipeFutureSchedule)         ║
// ║  [SECTION 17] FILTERS (applyLocalFilters, filterTeam)            ║
// ╚══════════════════════════════════════════════════════════════════╝
const CHANNEL_CONFIG = {
  // hours: [StartHour, EndHour] in 24h format (e.g., 8am-4pm is [8, 16])
  // minStaff: Default minimum staff, statusInterval: Hours between status updates
  "Live Chat":       { abbrev: "LC",    color: "#b3a6d5", border: "#9688c2", text: "#351d77", hours: [8, 16], minStaff: 3, statusInterval: 2 },
  "LiveChat":        { abbrev: "LC",    color: "#b3a6d5", border: "#9688c2", text: "#351d77", hours: [8, 16], minStaff: 3, statusInterval: 2 },
  
  "Phone":           { abbrev: "Phone", color: "#a1c3c8", border: "#7ea9b0", text: "#135062", hours: [6, 20], minStaff: 2, statusInterval: 2 },
  "Phone Support":   { abbrev: "Phone", color: "#a1c3c8", border: "#7ea9b0", text: "#135062", hours: [6, 20], minStaff: 2, statusInterval: 2 },
  "PhoneSupport":    { abbrev: "Phone", color: "#a1c3c8", border: "#7ea9b0", text: "#135062", hours: [6, 20], minStaff: 2, statusInterval: 2 },
  "Socials":         { abbrev: "SS",    color: "#f8ca9b", border: "#e5b078", text: "#b35f16", hours: [8, 17], minStaff: 1, statusInterval: 3 },
  "Disputes":        { abbrev: "Dis",   color: "#d0b0ad", border: "#b89490", text: "#4c1130", hours: [8, 17], minStaff: 1, statusInterval: 2 },
  "MD Support":      { abbrev: "MD",    color: "#a3c1f3", border: "#7ba3e8", text: "#2655cb", hours: [8, 17], minStaff: 1, statusInterval: 3 },
  "MDSupport":       { abbrev: "MD",    color: "#a3c1f3", border: "#7ba3e8", text: "#2655cb", hours: [8, 17], minStaff: 1, statusInterval: 3 },
  "Defcon":          { abbrev: "DEF",   color: "#fca5a5", border: "#f87171", text: "#991b1b", hours: [8, 17], minStaff: 1, statusInterval: 2 },
  
  // Default others to 8-5 if unsure
  "Floater":         { abbrev: "Float", color: "#fee498", border: "#ecd07a", text: "#7f692a", hours: [8, 17], minStaff: 1, statusInterval: 2 },
  "Email/Floater":   { abbrev: "Float", color: "#fee498", border: "#ecd07a", text: "#7f692a", hours: [8, 17], minStaff: 1, statusInterval: 2 },
  "Lunch":           { abbrev: "🍽️",   color: "#dcfce7", border: "#86efac", text: "#166534", hours: [0, 24], minStaff: 0, statusInterval: 0, isBreak: true },
  "Projects":        { abbrev: "Proj",  color: "#e9d0db", border: "#d4b0c0", text: "#8c1b47", hours: [8, 17], minStaff: 1, statusInterval: 3 },
  "1:1 Meeting":     { abbrev: "1:1",   color: "#adbaf1", border: "#8e9de0", text: "#20175c", hours: [8, 17], minStaff: 0, statusInterval: 0, isBreak: true },
  "1:1 Meetings":    { abbrev: "1:1",   color: "#adbaf1", border: "#8e9de0", text: "#20175c", hours: [8, 17], minStaff: 0, statusInterval: 0, isBreak: true },
  // Generic Meeting (not 1:1 specific)
  "Meeting":         { abbrev: "MTG",   color: "#c4b5fd", border: "#a78bfa", text: "#4c1d95", hours: [8, 17], minStaff: 0, statusInterval: 0, isBreak: true },
  "Meetings":        { abbrev: "MTG",   color: "#c4b5fd", border: "#a78bfa", text: "#4c1d95", hours: [8, 17], minStaff: 0, statusInterval: 0, isBreak: true },
  // Custom/Other channel (teal color)
  "Custom":          { abbrev: "CUST",  color: "#99f6e4", border: "#5eead4", text: "#8f5f5a", hours: [8, 17], minStaff: 0, statusInterval: 0 },
  "Other":           { abbrev: "Other", color: "#e2e8f0", border: "#cbd5e1", text: "#475569", hours: [8, 17], minStaff: 0, statusInterval: 0 }
};
const CHANNEL_ABBREV = {
  "Live Chat": "LC",
  "LiveChat": "LC",
  "Phone": "Phone",
  "Phone Support": "Phone",
  "PhoneSupport": "Phone",
  "Socials": "SS",
  "MD Support": "MD",
  "MDSupport": "MD",
  "Disputes": "Dis",
  "Floater": "Float",
  "EmailFloater": "Float",
  "Email/Floater": "Float",
  "Lunch": "Lunch",
  "Projects": "Proj",
  "ReportingProjects": "Proj",
  "1: 1 Meetings": "1:1",
  "1:1s Meetings": "1:1",
  "11Meetings": "1:1",
  "Meeting": "MTG",
  "Meetings": "MTG",
  "Custom": "CUST",
  "Other": "Other"
};
  const $ = (id) => document.getElementById(id);
  // ============================================
  // [SECTION 2] AUTHENTICATION
  // ============================================
  async function handleSignIn(response) {
  console.log("Sign-in response received");
  
  try {
    const res = await fetch('/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: response.credential })
    });
    
    const data = await res.json();
    
    if (data.error) {
      console.error("Auth error:", data.error);
      toast("Access Denied: " + data.error, "error");
      return;
    }
    
    // Set global identity
    window._myEmail = data.userEmail;
    window._myName = data.matchedPerson;
    window._isManager = data.isManager;
    window._currentUser = data.matchedPerson;
    
    console.log(`Signed in as: ${window._myName}, Manager: ${window._isManager}`);
    
    // ✅ Save auth session to cache
    saveAuthSession(data.userEmail, data.matchedPerson, data.isManager);
    
    // ✅ Remove auth-pending to reveal the app
    document.body.classList.remove("auth-pending");
    
    // Show fresh login indicator
    showSessionIndicator(false);
    
    // Hide the login button after successful sign-in
    const loginContainer = document.getElementById("authLoginContainer");
    if (loginContainer) loginContainer.style.display = "none";
    
    // Now load the dashboard
    load();
    
  } catch (err) {
    console.error("Sign-in failed:", err);
    toast("Sign-in failed", "error");
  }
}
// Expose to global scope IMMEDIATELY
window.handleSignIn = handleSignIn;
  // ============================================
// CLIENT-SIDE CACHE CONFIGURATION
// ============================================
const CACHE_CONFIG = {
  SCHEDULE_KEY: 'musely_schedule_cache',
  METADATA_KEY: 'musely_metadata_cache',
  TTL: 10 * 60 * 1000,  // 10 minutes in milliseconds (increased from 5)
  VERSION: '1.1'       // Increment to invalidate old caches
};

// ============================================
// SESSION PERSISTENCE (Enhanced - 8 hour auth cache)
// ============================================
// Note: Session data is stored in localStorage without encryption.
// This is acceptable because:
// 1. Server still validates all requests with preview key
// 2. Session TTL is 8 hours but refreshes on activity
// 3. No passwords or tokens are stored
// 4. Only caches display name, email, and role flag
// For higher security requirements, consider using httpOnly cookies
const SESSION_CONFIG = {
  KEY: 'musely_auth_session',
  BACKUP_KEY: 'musely_auth_session_backup', // Backup in sessionStorage
  TTL: 8 * 60 * 60 * 1000, // 8 hours in milliseconds
  WARNING_THRESHOLD: 30 * 60 * 1000, // Warn 30 min before expiry
  VERSION: '1.1' // Incremented for new format
};

// Session activity tracker
let _lastActivityTime = Date.now();
let _sessionWarningShown = false;

function saveAuthSession(email, name, isManager) {
  const sessionData = {
    email,
    name,
    isManager,
    timestamp: Date.now(),
    lastActivity: Date.now(),
    version: SESSION_CONFIG.VERSION,
    cached: true
  };
  try {
    // Save to localStorage (persists across browser sessions)
    localStorage.setItem(SESSION_CONFIG.KEY, JSON.stringify(sessionData));
    // Also save to sessionStorage as backup (survives refresh, cleared on tab close)
    sessionStorage.setItem(SESSION_CONFIG.BACKUP_KEY, JSON.stringify(sessionData));
    console.log('✅ Auth session saved to cache');
  } catch (err) {
    console.warn('Failed to save auth session:', err);
  }
}

// ✅ NEW: Refresh session timestamp on user activity
function refreshSessionTimestamp() {
  try {
    const raw = localStorage.getItem(SESSION_CONFIG.KEY);
    if (!raw) return;
    
    const data = JSON.parse(raw);
    data.lastActivity = Date.now();
    
    localStorage.setItem(SESSION_CONFIG.KEY, JSON.stringify(data));
    sessionStorage.setItem(SESSION_CONFIG.BACKUP_KEY, JSON.stringify(data));
    
    _lastActivityTime = Date.now();
    _sessionWarningShown = false; // Reset warning flag on activity
    
    console.log('🔄 Session timestamp refreshed');
  } catch (err) {
    console.warn('Failed to refresh session timestamp:', err);
  }
}

function loadAuthSession() {
  try {
    // Try localStorage first
    let raw = localStorage.getItem(SESSION_CONFIG.KEY);
    
    // If localStorage is empty, try sessionStorage backup
    if (!raw) {
      raw = sessionStorage.getItem(SESSION_CONFIG.BACKUP_KEY);
      if (raw) {
        console.log('📦 Restoring session from backup');
        localStorage.setItem(SESSION_CONFIG.KEY, raw);
      }
    }
    
    if (!raw) return null;

    const data = JSON.parse(raw);
    
    // Check version - graceful migration
    if (data.version !== SESSION_CONFIG.VERSION) {
      // Try to migrate old session format
      if (data.email && data.name && data.version === '1.0') {
        console.log('🔄 Migrating session to new version');
        data.version = SESSION_CONFIG.VERSION;
        data.lastActivity = data.timestamp;
        localStorage.setItem(SESSION_CONFIG.KEY, JSON.stringify(data));
      } else {
        console.log('Session cache version mismatch, clearing...');
        clearAuthSession();
        return null;
      }
    }

    // Check TTL based on last activity (not original login time)
    const activityAge = Date.now() - (data.lastActivity || data.timestamp);
    if (activityAge > SESSION_CONFIG.TTL) {
      console.log('Session cache expired due to inactivity, clearing...');
      showSessionExpiredNotification();
      clearAuthSession();
      return null;
    }
    
    // Check if session is about to expire (within warning threshold)
    const timeRemaining = SESSION_CONFIG.TTL - activityAge;
    if (timeRemaining < SESSION_CONFIG.WARNING_THRESHOLD && !_sessionWarningShown) {
      showSessionExpiryWarning(timeRemaining);
    }

    console.log(`✅ Loaded cached session (activity age: ${Math.floor(activityAge / 1000)}s, ${Math.floor(timeRemaining / 60000)}min remaining)`);
    return data;
  } catch (err) {
    console.warn('Failed to load auth session:', err);
    clearAuthSession();
    return null;
  }
}

function clearAuthSession() {
  try {
    localStorage.removeItem(SESSION_CONFIG.KEY);
    sessionStorage.removeItem(SESSION_CONFIG.BACKUP_KEY);
    console.log('🗑️ Auth session cleared');
  } catch (err) {
    console.warn('Failed to clear auth session:', err);
  }
}

// ✅ NEW: Handle explicit user logout
function handleLogout() {
  // Clear auth session
  clearAuthSession();
  
  // Clear schedule caches
  if (typeof clearScheduleCache === 'function') {
    clearScheduleCache();
  }
  
  // Clear global identity
  window._myEmail = null;
  window._myName = null;
  window._isManager = null;
  window._currentUser = null;
  
  // Show logout confirmation
  toast("✅ Signed out successfully", "success");
  
  // Close profile modal if open
  const profileOverlay = document.getElementById('profileOverlay');
  if (profileOverlay) profileOverlay.style.display = 'none';
  
  // Show login screen
  document.body.classList.add("auth-pending");
  const loginContainer = document.getElementById("authLoginContainer");
  if (loginContainer) loginContainer.style.display = "flex";
  
  // Reload page after a brief delay
  setTimeout(() => {
    window.location.reload();
  }, 500);
}
window.handleLogout = handleLogout;

// ✅ NEW: Show warning before session expires
function showSessionExpiryWarning(timeRemaining) {
  _sessionWarningShown = true;
  const minutes = Math.ceil(timeRemaining / 60000);
  
  const warning = document.createElement('div');
  warning.id = 'sessionWarning';
  warning.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    padding: 12px 20px;
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: white;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    z-index: 9999;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
    display: flex;
    align-items: center;
    gap: 12px;
    animation: slideIn 0.3s ease-out;
  `;
  warning.innerHTML = `
    <span>⏰ Session expires in ${minutes} minutes</span>
    <button onclick="refreshSessionTimestamp(); this.parentElement.remove(); toast('Session extended!', 'success');" 
      style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); 
             color: white; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600;">
      Extend
    </button>
  `;
  
  // Remove any existing warning
  const existing = document.getElementById('sessionWarning');
  if (existing) existing.remove();
  
  document.body.appendChild(warning);
}

// ✅ NEW: Show notification when session expires
function showSessionExpiredNotification() {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    padding: 24px 32px;
    background: white;
    border-radius: 16px;
    font-size: 14px;
    z-index: 10000;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    text-align: center;
    max-width: 400px;
  `;
  notification.innerHTML = `
    <div style="font-size: 48px; margin-bottom: 16px;">🔐</div>
    <div style="font-size: 18px; font-weight: 700; margin-bottom: 8px; color: #1a1a1a;">Session Expired</div>
    <div style="color: #666; margin-bottom: 20px;">Your session has expired due to inactivity. Please sign in again to continue.</div>
    <button onclick="this.parentElement.remove(); location.reload();" 
      style="background: linear-gradient(135deg, #b37e78 0%, #8f5f5a 100%); 
             color: white; border: none; padding: 12px 24px; border-radius: 10px; 
             cursor: pointer; font-weight: 700; font-size: 14px;">
      Sign In Again
    </button>
  `;
  document.body.appendChild(notification);
}

function showSessionIndicator(isCached) {
  const authOverlay = document.getElementById('authOverlay');
  if (!authOverlay) return;
  
  const indicator = document.createElement('div');
  indicator.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 20px;
    padding: 8px 16px;
    background: ${isCached ? 'rgba(34, 197, 94, 0.9)' : 'rgba(59, 130, 246, 0.9)'};
    color: white;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    animation: slideUp 0.3s ease-out;
  `;
  indicator.textContent = isCached ? '🔒 Session restored' : '🔑 Logged in';
  
  document.body.appendChild(indicator);
  
  // Auto-hide after 1.5 seconds
  setTimeout(() => {
    indicator.style.transition = 'opacity 0.3s, transform 0.3s';
    indicator.style.opacity = '0';
    indicator.style.transform = 'translateY(20px)';
    setTimeout(() => indicator.remove(), 300);
  }, 1500);
}

// ============================================
// DARK MODE TOGGLE
// ============================================
const DARK_MODE_KEY = 'musely_dark_mode';

// ============================================
// [SECTION 3] DARK MODE
// ============================================
function initDarkMode() {
  // Check for saved preference or use prefers-color-scheme
  const savedMode = localStorage.getItem(DARK_MODE_KEY);
  
  // Safely check for prefers-color-scheme support
  const prefersDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)').matches : false;
  
  const shouldUseDarkMode = savedMode === 'true' || (savedMode === null && prefersDark);
  
  if (shouldUseDarkMode) {
    document.body.classList.add('dark-mode');
    updateDarkModeIcon(true);
  }
}

function toggleDarkMode() {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem(DARK_MODE_KEY, isDark.toString());
  updateDarkModeIcon(isDark);
  // Toast removed - too frequent and distracting
}

function updateDarkModeIcon(isDark) {
  const icon = document.getElementById('darkModeIcon');
  if (!icon) return;
  
  if (isDark) {
    // Moon icon for dark mode
    icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="currentColor"/>';
  } else {
    // Sun icon for light mode
    icon.innerHTML = '<path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" stroke="currentColor" stroke-width="2" fill="none"/>';
  }
}

// Initialize dark mode on page load
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDarkMode);
  } else {
    initDarkMode();
  }
}

// ============================================
// [SECTION 3.5] USER PREFERENCES & FEATURES
// ============================================
const USER_PREFS_KEY = 'musely_user_prefs';

function getUserPrefs() {
  try {
    const saved = localStorage.getItem(USER_PREFS_KEY);
    return saved ? JSON.parse(saved) : { shiftView: 'grid', timezone: 'PST' };
  } catch (e) {
    return { shiftView: 'grid', timezone: 'PST' };
  }
}

function saveUserPrefs(prefs) {
  try {
    localStorage.setItem(USER_PREFS_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.error('Failed to save preferences:', e);
  }
}

// Initialize user preferences
function initUserPrefs() {
  const prefs = getUserPrefs();
  
  // Apply view preference
  if (prefs.shiftView === 'list') {
    document.querySelectorAll('.shifts-grid').forEach(g => g.classList.add('view-list'));
    updateViewToggleIcon(true);
  }
  
  // Apply timezone preference to both selectors
  const tz = prefs.timezone || 'PST';
  
  // Update header radio buttons
  const tzRadio = document.querySelector(`input[name="timezone"][value="${tz}"]`);
  if (tzRadio) tzRadio.checked = true;
  
  // Update compact bar select dropdown
  const tzSelect = document.getElementById('compactTzSelect');
  if (tzSelect) tzSelect.value = tz;
}

// View Toggle (Grid vs List)
function toggleShiftView() {
  const prefs = getUserPrefs();
  const isList = prefs.shiftView === 'list';
  prefs.shiftView = isList ? 'grid' : 'list';
  saveUserPrefs(prefs);
  
  document.querySelectorAll('.shifts-grid').forEach(g => {
    g.classList.toggle('view-list', !isList);
  });
  
  updateViewToggleIcon(!isList);
  toast(!isList ? '📋 List view enabled' : '📊 Grid view enabled', 'info');
}

function updateViewToggleIcon(isList) {
  const icon = document.getElementById('viewToggleIcon');
  if (!icon) return;
  
  if (isList) {
    // List icon
    icon.innerHTML = '<path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z" fill="currentColor"/>';
  } else {
    // Grid icon
    icon.innerHTML = '<path d="M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z" fill="currentColor"/>';
  }
}

// Timezone Functions
function toggleTimezoneDropdown() {
  const dropdown = document.getElementById('timezoneDropdown');
  if (dropdown) {
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  }
}

function setUserTimezone(tz) {
  const prefs = getUserPrefs();
  prefs.timezone = tz;
  saveUserPrefs(prefs);
  
  // Close the radio button dropdown if it's open (only in manager mode)
  const dropdown = document.getElementById('timezoneDropdown');
  if (dropdown && dropdown.style.display !== 'none') {
    dropdown.style.display = 'none';
  }
  
  toast(`Timezone: ${tz}`, 'info');
  
  // CRITICAL: Regenerate all time labels with new timezone
  const regenerateLabels = (arr) => {
    if (!Array.isArray(arr)) return;
    arr.forEach(item => {
      if (item.start) item.startLabel = toAmPm(item.start);
      if (item.end) item.endLabel = toAmPm(item.end);
    });
  };
  
  // Use window-scoped variables for cross-scope access
  if (window._allData) regenerateLabels(window._allData);
  if (window._filteredData) regenerateLabels(window._filteredData);
  
  // Sync both timezone selectors
  // Update compact bar select dropdown
  const tzSelect = document.getElementById('compactTzSelect');
  if (tzSelect) tzSelect.value = tz;
  
  // Update header radio buttons
  const tzRadio = document.querySelector(`input[name="timezone"][value="${tz}"]`);
  if (tzRadio) tzRadio.checked = true;
  
  // Force re-render the schedule view
  if (typeof renderView === 'function') {
    renderView();
  }
  
  // Update compact bar display if in agent mode
  if (typeof updateCompactBar === 'function') {
    updateCompactBar();
  }
}

// Convert PST time to user's timezone
function convertTimeToUserTz(pstHour) {
  const prefs = getUserPrefs();
  if (prefs.timezone === 'PST') return pstHour;
  
  // Timezone offsets from PST (positive = ahead)
  const offsets = { 'PST': 0, 'MST': 1, 'CST': 2, 'EST': 3 };
  const offset = offsets[prefs.timezone] || 0;
  return pstHour + offset;
}

// Format time with both user TZ and PST reference
function formatTimeWithTz(pstHour) {
  const prefs = getUserPrefs();
  const userHour = convertTimeToUserTz(pstHour);
  
  // Format as 12-hour time
  const formatHour = (h) => {
    const hr = h % 24;
    const suffix = hr >= 12 ? 'PM' : 'AM';
    const displayHr = hr % 12 || 12;
    return `${displayHr}:00 ${suffix}`;
  };
  
  if (prefs.timezone === 'PST') {
    return formatHour(pstHour);
  }
  return `${formatHour(userHour)} (${formatHour(pstHour)} PST)`;
}

// Close timezone dropdown when clicking outside
document.addEventListener('click', function(e) {
  const dropdown = document.getElementById('timezoneDropdown');
  const btn = document.getElementById('btnTimezone');
  if (dropdown && btn && !dropdown.contains(e.target) && !btn.contains(e.target)) {
    dropdown.style.display = 'none';
  }
});

// Google Calendar Export
function exportToGoogleCalendar() {
  const myName = window._myName || "";
  if (!myName) {
    toast("Please sign in to export your schedule", "error");
    return;
  }
  
  // Get current week's shifts for this agent
  const shifts = (_filteredData || []).filter(s => 
    s.person && s.person.toLowerCase().trim() === myName.toLowerCase().trim()
  );
  
  if (shifts.length === 0) {
    toast("No shifts found to export", "info");
    return;
  }
  
  Swal.fire({
    title: '📅 Export to Google Calendar',
    html: `
      <div style="text-align: left; font-size: 14px; line-height: 1.6;">
        <p>Download .ics file with <strong>${shifts.length} shift(s)</strong>?</p>
        <p style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">You can import this file into Google Calendar, Outlook, or Apple Calendar.</p>
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Download',
    cancelButtonText: 'Cancel',
    confirmButtonColor: '#4285f4'
  }).then(result => {
    if (result.isConfirmed) {
      exportShiftsToGCal(shifts);
    }
  });
}

function exportShiftsToGCal(shifts) {
  const sorted = [...shifts].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  
  // Build iCalendar string
  let icsContent = 'BEGIN:VCALENDAR\r\n';
  icsContent += 'VERSION:2.0\r\n';
  icsContent += 'PRODID:-//Musely Scheduler//EN\r\n';
  icsContent += 'CALSCALE:GREGORIAN\r\n';
  icsContent += 'METHOD:PUBLISH\r\n';
  
  sorted.forEach(shift => {
    const date = (shift.date || new Date().toISOString().split('T')[0]).replace(/-/g, '');
    
    // Parse shift times
    let startHour = 9, endHour = 17;
    if (shift.start) startHour = Math.floor(parseFloat(shift.start));
    if (shift.end) endHour = Math.floor(parseFloat(shift.end));
    
    const startDT = `${date}T${String(startHour).padStart(2, '0')}0000`;
    const endDT = `${date}T${String(endHour).padStart(2, '0')}0000`;
    const summary = `${shift.team || 'Work'} Shift`;
    const description = shift.notes || 'Scheduled shift';
    
    icsContent += 'BEGIN:VEVENT\r\n';
    icsContent += `DTSTART;TZID=America/Los_Angeles:${startDT}\r\n`;
    icsContent += `DTEND;TZID=America/Los_Angeles:${endDT}\r\n`;
    icsContent += `SUMMARY:${summary}\r\n`;
    icsContent += `DESCRIPTION:${description}\r\n`;
    icsContent += `UID:${Date.now()}-${Math.random().toString(36).substr(2, 9)}@musely-scheduler\r\n`;
    icsContent += `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z\r\n`;
    icsContent += 'END:VEVENT\r\n';
  });
  
  icsContent += 'END:VCALENDAR\r\n';
  
  // Create blob and download
  const blob = new Blob([icsContent], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'my-schedule.ics';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  toast(`✅ Downloaded ${sorted.length} shift(s) to calendar file`, 'success');
}

// ============================================
// MULTIPLE MAKE-UP DATES
// ============================================
let _selectedMakeUpDates = [];

function addMakeUpDate() {
  const dateInput = document.getElementById("agMakeUpDate");
  const date = dateInput ? dateInput.value : "";
  
  if (!date) {
    toast("Please select a date first", "error");
    return;
  }
  
  if (_selectedMakeUpDates.includes(date)) {
    toast("This date is already added", "error");
    return;
  }
  
  _selectedMakeUpDates.push(date);
  dateInput.value = ""; // Clear for next
  renderMakeUpDatesList();
  toast(`Added: ${new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`, 'success');
}

function removeMakeUpDate(date) {
  _selectedMakeUpDates = _selectedMakeUpDates.filter(d => d !== date);
  renderMakeUpDatesList();
}

function renderMakeUpDatesList() {
  const container = document.getElementById("makeUpDatesList");
  if (!container) return;
  
  if (_selectedMakeUpDates.length === 0) {
    container.innerHTML = '';
    return;
  }
  
  container.innerHTML = _selectedMakeUpDates.map(date => {
    const d = new Date(date + 'T12:00:00');
    const formatted = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    return `
      <span style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%); color: #1e40af; border-radius: 20px; font-size: 12px; font-weight: 500; border: 1px solid #93c5fd;">
        📅 ${formatted}
        <button type="button" onclick="removeMakeUpDate('${date}')" style="background: none; border: none; color: #1e40af; cursor: pointer; font-size: 16px; line-height: 1; padding: 0; font-weight: bold;">×</button>
      </span>
    `;
  }).join('');
}

function resetMakeUpDates() {
  _selectedMakeUpDates = [];
  renderMakeUpDatesList();
}

function getMakeUpDatesString() {
  if (_selectedMakeUpDates.length === 0) {
    const single = document.getElementById("agMakeUpDate");
    return single ? single.value : "";
  }
  return _selectedMakeUpDates.join(', ');
}

// Initialize preferences on page load
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUserPrefs);
  } else {
    setTimeout(initUserPrefs, 100);
  }
}
  
  const PST_TZ = "America/Los_Angeles";
  const pad2 = (n) => String(n).padStart(2, "0");
  const TZ = "America/Los_Angeles";
  
  // ============================================
  // GLOBAL ERROR HANDLERS
  // ============================================
  window.addEventListener('unhandledrejection', function(event) {
    console.error('Unhandled promise rejection:', event.reason);
    // Don't show toast for minor errors
    if (event.reason && event.reason.message && !event.reason.message.includes('Failed to fetch')) {
      // Only log, don't interrupt user
    }
  });
  
  window.onerror = function(msg, url, line, col, error) {
    console.error('Global error:', msg, 'at', url, 'line:', line);
    return false; // Let the default handler run
  };
  
  // Helper to get today's date in YYYY-MM-DD format (PST timezone)
  // ============================================
  // [SECTION 4] UTILITIES
  // ============================================
  function pstISODate(d = new Date()) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  }
  function pstISODateOffset(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return pstISODate(d);
  }
  
  // Utility to prevent double-click on buttons during async operations
  function withLoadingButton(buttonElement, asyncFn) {
    if (!buttonElement || buttonElement.disabled) return;
    const originalText = buttonElement.textContent;
    const originalHtml = buttonElement.innerHTML;
    buttonElement.disabled = true;
    buttonElement.style.opacity = '0.7';
    buttonElement.style.pointerEvents = 'none';
    buttonElement.innerHTML = '⏳ ' + originalText;
    
    return asyncFn().finally(() => {
      buttonElement.disabled = false;
      buttonElement.style.opacity = '';
      buttonElement.style.pointerEvents = '';
      buttonElement.innerHTML = originalHtml;
    });
  }
  
  // --- CLOUD RUN BRIDGE START ---
  // This object "fakes" the Google Apps Script environment so your UI works in Cloud Run.
  
  // --- CLOUD RUN BRIDGE START ---
  // --- CLOUD RUN BRIDGE START ---
  const google = {
    script: {
      // We return a proxy to handle 'run' so we can create a fresh chain for every request
      run: {
        withSuccessHandler: function(success) {
          // Create a NEW object for this specific request chain
          const chain = {
            _success: success,
            _fail: null,
            
            withFailureHandler: function(failure) {
              this._fail = failure;
              return this;
            },
            // --- 1. AUTO-GEN ---
            checkAndAutoGenerate: function() {
               console.log("Bridge: Auto-gen check.");
               setTimeout(() => { if(this._success) this._success({ generated: false }); }, 10);
            },
            // --- 3. MASTER SCHEDULE ---
            uiGetBaseData: async function() {
                try {
                    const res = await fetch('./?action=base-schedule');
                    if(!res.ok) throw new Error("Failed to load master");
                    const json = await res.json();
                    if(this._success) this._success(json);
                } catch(err) { 
                    if(this._fail) this._fail(err); 
                }
            },
            // --- 4. CONFIGURATION ---
            uiGetConfig: function() {
               setTimeout(() => {
                 if(this._success) this._success({
                   isManager: true, role: 'MASTER', automationEnabled: true,
                   allManagers: [{name: "Admin", email: "admin@musely.com"}],
                   currentUser: "Admin", matchedPerson: "Admin"
                 });
               }, 50);
            },
            uiReplaceAssignment: async function(payload) {
  try {
    console.log("uiReplaceAssignment payload:", payload);
    if (!payload?.docId || !payload?.assignmentId || !payload?.newPerson) {
      throw new Error("Missing docId, assignmentId, or newPerson (client)");
    }
    const res = await fetch("./?action=assignment/replace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const text = await res.text();
    let json = {};
    try { json = JSON.parse(text); } catch {}
    if (!res.ok) {
      throw new Error(json.error || json.message || text || `HTTP ${res.status}`);
    }
    if (this._success) this._success(json);
  } catch (e) {
    if (this._fail) this._fail(String(e.message || e));
  }
},
            // --- 5. SYSTEM DATA (TEAMS & PEOPLE) ---
            uiGetManagerData: async function() {
               console.log("Bridge: Fetching People & Teams...");
               try {
                 const ts = Date.now();
                 // 1. Teams
                 const tReq = await fetch(`./?action=teams&_t=${ts}`);
                 const tRes = await tReq.json();
                 const teams = (tRes.teams || []).map(t => t.id);
                 // 2. People
                 const pReq = await fetch(`./?action=people&_t=${ts}`);
                 const pRes = await pReq.json();
                 const peopleList = (pRes.people || []).map(p => p.name || p.id);
                 console.log(`Bridge: Loaded ${peopleList.length} people.`);
                 if(this._success) this._success({ people: peopleList, teams: teams, timeOff: [] });
               } catch(e) {
                 console.error("Failed to load people/teams:", e);
                 if(this._success) this._success({ people: [], teams: [], timeOff: [] });
                 toast("Could not load team data. Please refresh the page.", "error");
               }
            },
            // --- 6. ZENDESK ---
            uiGetZendeskMetricsSnapshot: function() {
               setTimeout(() => { if(this._success) this._success([]); }, 50);
            },
            // --- 8. OTHER WRITE OPERATIONS ---
            uiSetTimeOff: async function(docId, assignmentId, enforce) {
  try {
    const res = await fetch(`./?action=assignment/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        docId,
        assignmentId,
        patch: { notes: "[OFF]" },
        enforce: !!enforce
      })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || json.message || "Update failed");
    if (this._success) this._success(json);
  } catch (e) {
    if (this._fail) this._fail(e.message || String(e));
  }
},
uiRestoreAssignment: async function(docId, assignmentId) {
  try {
    const res = await fetch(`./?action=assignment/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        docId,
        assignmentId,
        patch: { notes: "" }
      })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || json.message || "Restore failed");
    if (this._success) this._success(json);
  } catch (e) {
    if (this._fail) this._fail(e.message || String(e));
  }
},
uiGetAuditLogs: async function() {
  try {
    const res = await fetch("./?action=audit/logs");
    const json = await res.json().catch(() => ([]));
    if (this._success) this._success(json);
  } catch (e) {
    if (this._success) this._success([]); // fail soft
  }
},
uiGetStaffingRules: async function() {
  try {
    const res = await fetch("./?action=staffing/rules");
    const json = await res.json().catch(() => ([]));
    if (this._success) this._success(json);
  } catch (e) {
    if (this._success) this._success([]);
  }
},
uiSaveStaffingRule: async function(rule) {
  try {
    const res = await fetch("./?action=staffing/rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rule || {})
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Save failed");
    if (this._success) this._success(json);
  } catch (e) {
    if (this._fail) this._fail(e.message || String(e));
  }
},
uiDeleteStaffingRule: async function(idx) {
  try {
    const res = await fetch("./?action=staffing/rules/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idx })
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Delete failed");
    if (this._success) this._success(json);
  } catch (e) {
    if (this._fail) this._fail(e.message || String(e));
  }
},
runGenerate: async function() {
  try {
    const res = await fetch("./?action=generate", { method: "POST" });
    const json = await res.json().catch(() => ({}));
    if (this._success) this._success(json);
  } catch (e) { if (this._fail) this._fail(e.message || String(e)); }
},
            handleMasterScheduleEdit: async function(payload) {
                console.log("Bridge: Master Edit Request", payload);
                try {
                    const res = await fetch('./?action=update-master-schedule', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(payload)
                    });
                    
                    if (!res.ok) throw new Error("Network request failed");
                    
                    const json = await res.json();
                    if (json.status === "error") throw new Error(json.message);
                    
                    if(this._success) this._success(json);
                } catch(err) {
                    console.error("Bridge Error:", err);
                    if(this._fail) this._fail(err.message);
                }
            }, // <--- COMMA HERE IS IMPORTANT
            // --- 10. ZENDESK PROFILE ---
            getZendeskProfile: async function(name) {
                console.log("Bridge: Fetching Zendesk Profile for", name);
                try {
                    const res = await fetch('./?action=agent-profile', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ name: name })
                    });
                    if (!res.ok) throw new Error("Network request failed");
                    const json = await res.json();
                    
                    if(this._success) this._success(json);
                } catch(err) {
                    console.error("Profile Fetch Error:", err);
                    if(this._fail) this._fail(err.message);
                }
            }
          }; 
          return chain;
        }
      },
      
      // Group B: URL handling
      url: {
          getLocation: function(cb) { cb({ hash: window.location.hash || "" }); }
      }
    }
  };
  // --- CLOUD RUN BRIDGE END ---
  
  function fatal_(title, detail) {
    console.error("FATAL:", title, detail);
    if ($("skeletonView")) $("skeletonView").style.display = "none";
    if ($("loader")) $("loader").classList.add("hidden");
    const host = $("listView") || document.body;
    host.innerHTML = `<div style="padding:20px; color:red; font-weight:bold;">${title}<br><span style="font-weight:normal; font-size:12px; color:#333;">${detail}</span></div>`;
  }
  // --- 2. GLOBAL VARIABLES ---
  // Expose key data arrays globally for timezone conversion and other cross-scope access
  window._allData = window._allData || [];
  window._filteredData = window._filteredData || [];
  let _allData = window._allData, _filteredData = window._filteredData;
  
  // Sync function to keep window and local vars in sync
  function syncDataArrays() {
    window._allData = _allData;
    window._filteredData = _filteredData;
  }
  
  let _people=[], _teams=[], _roles=[], _timeOff=new Set();
  let _view="schedule", _mode="quick", _activeTeam="", _selectedPeople=new Set(), _teamSelected=new Set();
  let _editing=null, _dragPerson=null, _drawerOpen=false, _lastUndo=null, _notifQueue=[];
  let _zendeskMetricsList = [], _zendeskMetricsByName = new Map(), _zendeskSnapshotLoaded = false;
  let _selectedManagerEmail = "", _currentManagerName = "";
  let _isMasterMode = false;
  let _activeProfileRequest = "";
  let _activeMetricsRequest = "";
  let _activeMetricsEmail = "";
  let _peopleMeta = [];
  let _peopleMetaByName = new Map();
// Schedule date range tracking
  let _scheduleLoadedPast = 0;      // How many past days are loaded
  let _scheduleLoadedFuture = 14;   // How many future days are loaded
  let _isLoadingMore = false;       // Prevent duplicate loads
  let _agentScheduleDays = 14;      // Track agent's loaded days (separate from manager controls)
  
  // NEW: To track the logged in user's Real Name (not just email)
  let _myName = ""; 
  let _masterSelected=new Set(), _masterRawData=[]; // Moved here for safety
  let _lastSelectedPerson = null;
  // --- 3. HELPERS (FORMATTING) ---
  function formatCsatDisplay(val) {
    if (val === null || val === undefined || val === "" || val === "--") return "--";
    if (String(val).includes("%")) return val;
    const n = Number(val);
    if (isNaN(n)) return "--";
    if (n <= 1 && n !== 0) return Math.round(n * 100) + "%";
    return Math.round(n) + "%";
  }
  function getTeamClass(t) { 
    const l = (t || "").toLowerCase().replace(/[\s\/]+/g, ''); 
    
    if (l.includes("social")) return "t-socials";
    if (l.includes("phone")) return "t-phone";
    if (l.includes("livechat") || l === "lc") return "t-livechat";
    if (l.includes("md") || l.includes("medical")) return "t-mdsupport";
    if (l.includes("dispute") || l === "dis") return "t-disputes";
    if (l.includes("float") || l.includes("email")) return "t-floater";
    if (l.includes("project") || l === "proj") return "t-projects";
    if (l.includes("lunch")) return "t-lunch";
    if (l.includes("1:1") || (l.includes("11") && l.includes("meeting"))) return "t-11meeting";
    
    return "t-other"; 
}
function getChannelDisplayName(dbName) {
    const map = {
        "livechat": "Live Chat",
        "phonesupport": "Phone",
        "mdsupport":  "MD Support",
        "emailfloater": "Floater",
        "reportingprojects": "Projects",
        "11meeting": "1:1 Meetings",
        "1:1meeting": "1:1 Meetings",
        "socials": "Socials",
        "disputes": "Disputes",
        "lunch": "Lunch",
        "meeting": "Meeting",
        "meetings": "Meetings",
        "custom": "Custom",
        "other": "Other"
    };
    const key = String(dbName || "").toLowerCase().replace(/[\s\/]+/g, '');
    return map[key] || dbName;
}
function getChannelConfig(teamName) {
  if (!teamName) return { abbrev: "—", color: "#f8fafc", border: "#e2e8f0", text: "#475569" };
  
  const teamStr = String(teamName).trim();
  
  // Try exact match first
  if (CHANNEL_CONFIG[teamStr]) return CHANNEL_CONFIG[teamStr];
  
  // Try normalized match (remove spaces, lowercase)
  const normalized = teamStr.toLowerCase().replace(/[\s_\-\/]/g, '');
  for (const [key, val] of Object.entries(CHANNEL_CONFIG)) {
    const keyNorm = key.toLowerCase().replace(/[\s_\-\/]/g, '');
    if (keyNorm === normalized) return val;
  }
  
  // Partial matching for common patterns
  if (normalized.includes('livechat') || normalized.includes('chat')) {
    return CHANNEL_CONFIG["LiveChat"];
  }
  if (normalized.includes('phone')) {
    return CHANNEL_CONFIG["Phone"];
  }
  if (normalized.includes('dispute')) {
    return CHANNEL_CONFIG["Disputes"];
  }
  if (normalized.includes('social')) {
    return CHANNEL_CONFIG["Socials"];
  }
  if (normalized.includes('floater') || normalized.includes('email')) {
    return CHANNEL_CONFIG["Floater"];
  }
  if (normalized.includes('md') || normalized.includes('medical')) {
    return CHANNEL_CONFIG["MD Support"];
  }
  if (normalized.includes('lunch')) {
    return CHANNEL_CONFIG["Lunch"];
  }
  if (normalized.includes('project')) {
    return CHANNEL_CONFIG["Projects"];
  }
  if (normalized.includes('1:1')) {
    return CHANNEL_CONFIG["1:1 Meeting"];
  }
  
  // Ultimate fallback - use first 3-4 chars
  return { 
    abbrev: teamStr.substring(0, 4).toUpperCase(), 
    color: "#f8fafc", 
    border: "#e2e8f0", 
    text: "#475569" 
  };
}
function getChannelAbbrev(channelName) {
    const config = getChannelConfig(channelName);
    return config.abbrev;
}
  function _formatTime(val) { 
    if(!val) return ""; 
    if (val instanceof Date) { return val.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}); } 
    return val; 
  }
  // Cache helper functions
// ============================================
// [SECTION 5] CACHE MANAGEMENT
// ============================================
function getCachedData(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    
    const cached = JSON.parse(raw);
    const now = Date.now();
    
    // Check if cache is still valid
    if (cached.version !== CACHE_CONFIG.VERSION) {
      console.log(`🗑️ Cache version mismatch for ${key}`);
      localStorage.removeItem(key);
      return null;
    }
    
    if (now - cached.timestamp > CACHE_CONFIG.TTL) {
      console.log(`⏰ Cache expired for ${key}`);
      localStorage.removeItem(key);
      return null;
    }
    
    console.log(`✅ Cache HIT for ${key} (${Math.round((CACHE_CONFIG.TTL - (now - cached.timestamp)) / 1000)}s remaining)`);
    return cached.data;
  } catch (e) {
    console.error('Cache read error:', e);
    return null;
  }
}

function setCachedData(key, data) {
  try {
    // ✅ Trim payload to only needed fields for agents
    let trimmedData = data;
    if (!window._isManager && key === CACHE_CONFIG.SCHEDULE_KEY && Array.isArray(data)) {
      // For agents, only keep essential fields to reduce cache size
      trimmedData = data.map(item => ({
        // Core schedule fields
        docId: item.docId,
        dateISO: item.dateISO,
        dateLabel: item.dateLabel,
        dayKey: item.dayKey,
        team: item.team,
        person: item.person,
        start: item.start,
        end: item.end,
        startLabel: item.startLabel,
        endLabel: item.endLabel,
        role: item.role,
        notes: item.notes,
        assignmentId: item.assignmentId,
        notifyStatus: item.notifyStatus,
        // Omit large fields like full assignments array, metadata, etc.
      }));
      // Only log size difference in development
      if (window.location.hostname === 'localhost') {
        console.log(`📦 Trimmed cache payload from ${JSON.stringify(data).length} to ${JSON.stringify(trimmedData).length} bytes`);
      }
    }

    const cacheEntry = {
      version: CACHE_CONFIG.VERSION,
      timestamp: Date.now(),
      data: trimmedData
    };
    localStorage.setItem(key, JSON.stringify(cacheEntry));
    console.log(`💾 Cache SET for ${key}`);
  } catch (e) {
    console.error('Cache write error:', e);
    // If localStorage is full, clear old caches
    if (e.name === 'QuotaExceededError') {
      localStorage.removeItem(CACHE_CONFIG.SCHEDULE_KEY);
      localStorage.removeItem(CACHE_CONFIG.METADATA_KEY);
    }
  }
}
function clearScheduleCache() {
  localStorage.removeItem(CACHE_CONFIG.SCHEDULE_KEY);
  localStorage.removeItem(CACHE_CONFIG.METADATA_KEY);
  console.log('🧹 Schedule cache cleared');
}
// ============================================
// [SECTION 6] EDIT LOCK SYSTEM
// Replaces presence tracking with edit locking
// ============================================

// Global edit mode flags
window.__editModeActive = false;
window.__pendingRefresh = false;

// Lock session ID - unique per browser tab (uses crypto for security)
function getLockSessionId() {
  let sessionId = sessionStorage.getItem('scheduler_lock_session_id');
  if (!sessionId) {
    // Use crypto.randomUUID if available, fallback to crypto.getRandomValues
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      sessionId = 'sess_' + crypto.randomUUID();
    } else if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const arr = new Uint8Array(16);
      crypto.getRandomValues(arr);
      sessionId = 'sess_' + Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      // Fallback for very old browsers
      sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
    }
    sessionStorage.setItem('scheduler_lock_session_id', sessionId);
  }
  return sessionId;
}

// Current active locks and renewal timers
let _activeLocks = new Map();
let _currentShiftLock = null;
let _currentMasterLock = null;

async function acquireEditLock(resourceType, resourceId) {
  const lockSessionId = getLockSessionId();
  try {
    const response = await fetch('./?action=locks/acquire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resourceType,
        resourceId,
        lockedByEmail: window._myEmail || '',
        lockedByName: window._myName || '',
        lockSessionId
      })
    });
    const data = await response.json();
    if (data.ok && data.acquired) {
      console.log(`[Lock] ✅ Acquired ${resourceType} lock for ${resourceId}`);
      const resourceKey = `${resourceType}_${resourceId}`;
      const renewalTimer = setInterval(() => {
        renewEditLock(resourceType, resourceId);
      }, 60 * 1000);
      _activeLocks.set(resourceKey, { renewalTimer, lockData: data.lock });
      if (resourceType === 'shift') _currentShiftLock = { resourceType, resourceId, lockData: data.lock };
      else if (resourceType === 'master') _currentMasterLock = { resourceType, resourceId, lockData: data.lock };
      return { acquired: true, lock: data.lock };
    } else {
      console.log(`[Lock] ⚠️ Failed to acquire ${resourceType} lock - held by ${data.lock?.lockedByName}`);
      return { acquired: false, lock: data.lock };
    }
  } catch (err) {
    console.error('[Lock] Error acquiring lock:', err);
    return { acquired: false, error: err.message };
  }
}

async function renewEditLock(resourceType, resourceId) {
  const lockSessionId = getLockSessionId();
  try {
    const response = await fetch('./?action=locks/renew', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resourceType, resourceId, lockSessionId })
    });
    const data = await response.json();
    if (data.ok && data.renewed) {
      console.log(`[Lock] 🔄 Renewed ${resourceType} lock for ${resourceId}`);
    } else {
      console.warn(`[Lock] ⚠️ Failed to renew lock: ${data.reason}`);
      const resourceKey = `${resourceType}_${resourceId}`;
      const lockInfo = _activeLocks.get(resourceKey);
      if (lockInfo) {
        clearInterval(lockInfo.renewalTimer);
        _activeLocks.delete(resourceKey);
      }
    }
    return data;
  } catch (err) {
    console.error('[Lock] Error renewing lock:', err);
    return { renewed: false, error: err.message };
  }
}

async function releaseEditLock(resourceType, resourceId) {
  const lockSessionId = getLockSessionId();
  const resourceKey = `${resourceType}_${resourceId}`;
  const lockInfo = _activeLocks.get(resourceKey);
  if (lockInfo) {
    clearInterval(lockInfo.renewalTimer);
    _activeLocks.delete(resourceKey);
  }
  if (resourceType === 'shift') _currentShiftLock = null;
  else if (resourceType === 'master') _currentMasterLock = null;
  try {
    const response = await fetch('./?action=locks/release', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resourceType, resourceId, lockSessionId })
    });
    const data = await response.json();
    console.log(`[Lock] 🔓 Released ${resourceType} lock for ${resourceId}`);
    return data;
  } catch (err) {
    console.error('[Lock] Error releasing lock:', err);
    return { released: false, error: err.message };
  }
}

async function checkLockStatus(resourceType, resourceId) {
  try {
    const response = await fetch(`./?action=locks/status&resourceType=${encodeURIComponent(resourceType)}&resourceId=${encodeURIComponent(resourceId)}`);
    return await response.json();
  } catch (err) {
    console.error('[Lock] Error checking lock status:', err);
    return { locked: false, error: err.message };
  }
}

function formatLockExpiry(expiresAt) {
  const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  return `${Math.floor(remaining / 60)}:${(remaining % 60).toString().padStart(2, '0')}`;
}

function showLockBanner(container, lockData) {
  const existing = container.querySelector('.edit-lock-banner');
  if (existing) existing.remove();
  const banner = document.createElement('div');
  banner.className = 'edit-lock-banner';
  banner.innerHTML = `<span class="lock-icon">🔒</span><span>Locked by <strong>${escapeHtml(lockData.lockedByName || 'another user')}</strong></span><span class="lock-expires">expires in ${formatLockExpiry(lockData.expiresAt)}</span>`;
  container.insertBefore(banner, container.firstChild);
  const expiresEl = banner.querySelector('.lock-expires');
  const updateInterval = setInterval(() => {
    expiresEl.textContent = `expires in ${formatLockExpiry(lockData.expiresAt)}`;
    if (new Date(lockData.expiresAt).getTime() <= Date.now()) {
      clearInterval(updateInterval);
      banner.remove();
    }
  }, 1000);
  return banner;
}

function showPendingUpdatesBanner() {
  let banner = document.getElementById('pendingUpdatesBanner');
  if (banner) return;
  banner = document.createElement('div');
  banner.id = 'pendingUpdatesBanner';
  banner.className = 'pending-updates-banner';
  banner.innerHTML = `<span>📥 Updates pending — refresh when finished editing</span><button onclick="handlePendingRefresh()">Refresh Now</button><button onclick="dismissPendingBanner()" style="background:transparent; color:inherit; border:1px solid currentColor;">Later</button>`;
  document.body.appendChild(banner);
}

function handlePendingRefresh() {
  window.__pendingRefresh = false;
  const banner = document.getElementById('pendingUpdatesBanner');
  if (banner) banner.remove();
  if (typeof softRefreshNotifications === 'function') softRefreshNotifications();
  toast('Notifications refreshed', 'success');
}

function dismissPendingBanner() {
  const banner = document.getElementById('pendingUpdatesBanner');
  if (banner) banner.remove();
}

function releaseAllLocks() {
  _activeLocks.forEach((lockInfo, resourceKey) => {
    clearInterval(lockInfo.renewalTimer);
    const [resourceType, ...resourceIdParts] = resourceKey.split('_');
    const data = JSON.stringify({
      resourceType,
      resourceId: resourceIdParts.join('_'),
      lockSessionId: getLockSessionId()
    });
    // sendBeacon requires Blob for JSON content
    const blob = new Blob([data], { type: 'application/json' });
    navigator.sendBeacon('./?action=locks/release', blob);
  });
  _activeLocks.clear();
}

window.addEventListener('beforeunload', releaseAllLocks);

  // Helper to format relative time for notifications and other UI elements
  function getTimeAgo(timestamp) {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diff = Math.floor((now - then) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 120) return '1 min ago';
    if (diff < 300) return `${Math.floor(diff / 60)} mins ago`;
    return 'Active';
  }
  
  // ============================================
  // SSE REAL-TIME STREAM
  // Replaces polling with push-based updates
  // Falls back to polling if SSE fails
  // ============================================
  let _sseConnection = null;
  let _sseReconnectAttempts = 0;
  let _sseMaxReconnectAttempts = 5;
  let _sseFallbackMode = false;
  let _sseReconnectTimer = null;
  
  function startRealtimeStream() {
    // ✅ CRITICAL: Only managers should use SSE
    // Agents use polling to prevent excessive Firestore reads
    // Cloud Functions timeout after 60s, causing reconnects that read ALL docs
    if (!window._isManager) {
      console.log("[SSE] Skipping for non-manager - using polling instead");
      return;
    }
    
    // Don't start if already connected or in fallback mode
    if (_sseConnection && _sseConnection.readyState !== EventSource.CLOSED) {
      console.log("[SSE] Already connected");
      return;
    }
    
    // Require auth info
    if (!window._myName && !window._myEmail) {
      console.log("[SSE] Waiting for auth...");
      setTimeout(startRealtimeStream, 2000);
      return;
    }
    
    // Build SSE URL with user info
    const params = new URLSearchParams({
      email: window._myEmail || "",
      name: window._myName || "",
      isManager: window._isManager ? "true" : "false"
    });
    
    const sseUrl = `/events?${params.toString()}`;
    console.log(`[SSE] Connecting to ${sseUrl}`);
    
    try {
      _sseConnection = new EventSource(sseUrl);
      
      // Connected event
      _sseConnection.addEventListener("connected", (e) => {
        try {
          const data = JSON.parse(e.data);
          console.log("[SSE] ✅ Connected:", data);
          _sseReconnectAttempts = 0;
          _sseFallbackMode = false;
          
          // Stop polling timers since SSE is working
          stopPollingTimers();
        } catch (err) {
          console.warn("[SSE] Connected event parse error:", err);
        }
      });
      
      // Ping event (keep-alive)
      _sseConnection.addEventListener("ping", (e) => {
        // Just acknowledge - no action needed
      });
      
      // Agent notification event - NON-DESTRUCTIVE
      _sseConnection.addEventListener("notification", (e) => {
        try {
          const data = JSON.parse(e.data);
          console.log("[SSE] 🔔 Agent notification:", data);
          
          // Update notification badge only - DO NOT trigger refresh
          updateNotificationBadge(data.unreadCount);
          
          // Update cached notifications
          if (data.latestItems) {
            window._agentNotifications = data.latestItems;
          }
          
          // Show visual indicator if new notifications
          if (data.unreadCount > 0) {
            pulseNotificationBell();
            
            // If editing, show pending banner instead of refreshing
            if (window.__editModeActive) {
              window.__pendingRefresh = true;
              showPendingUpdatesBanner();
            }
          }
        } catch (err) {
          console.warn("[SSE] Notification parse error:", err);
        }
      });
      
      // Manager notification event - NON-DESTRUCTIVE
      _sseConnection.addEventListener("manager_notification", (e) => {
        try {
          const data = JSON.parse(e.data);
          console.log("[SSE] 📋 Manager notification:", data);
          
          // Update manager notification badge only
          const badge = document.getElementById("notifCount");
          if (badge) {
            badge.textContent = data.pendingCount || "";
            badge.style.display = data.pendingCount > 0 ? "flex" : "none";
          }
          
          // Show pulse if new pending items
          if (data.pendingCount > 0) {
            pulseNotificationBell();
            
            // If editing, show pending banner instead of refreshing
            if (window.__editModeActive) {
              window.__pendingRefresh = true;
              showPendingUpdatesBanner();
            }
          }
        } catch (err) {
          console.warn("[SSE] Manager notification parse error:", err);
        }
      });
      
      // Time-off count event
      _sseConnection.addEventListener("timeoff_count", (e) => {
        try {
          const data = JSON.parse(e.data);
          console.log("[SSE] 📝 Time-off count:", data.count);
          
          // Update time-off badge on notification bell
          updateTimeOffBadge(data.count);
        } catch (err) {
          console.warn("[SSE] Timeoff count parse error:", err);
        }
      });
      
      // Banner/alert event
      _sseConnection.addEventListener("banner", (e) => {
        try {
          const data = JSON.parse(e.data);
          console.log("[SSE] 🚨 Banner:", data);
          
          // Show banner if important
          if (data.message && data.severity !== "info") {
            toast(data.message, data.severity || "warning");
          }
        } catch (err) {
          console.warn("[SSE] Banner parse error:", err);
        }
      });
      
      // Error handling
      _sseConnection.onerror = (e) => {
        console.warn("[SSE] ❌ Connection error");
        _sseConnection.close();
        
        _sseReconnectAttempts++;
        
        if (_sseReconnectAttempts <= _sseMaxReconnectAttempts) {
          // Exponential backoff: 2s, 4s, 8s, 16s, 32s
          const delay = Math.min(2000 * Math.pow(2, _sseReconnectAttempts - 1), 60000);
          console.log(`[SSE] Reconnecting in ${delay/1000}s (attempt ${_sseReconnectAttempts}/${_sseMaxReconnectAttempts})`);
          
          _sseReconnectTimer = setTimeout(startRealtimeStream, delay);
        } else {
          console.warn("[SSE] Max reconnect attempts reached, falling back to polling");
          _sseFallbackMode = true;
          startFallbackPolling();
        }
      };
      
    } catch (err) {
      console.error("[SSE] Failed to create EventSource:", err);
      _sseFallbackMode = true;
      startFallbackPolling();
    }
  }
  
  function stopRealtimeStream() {
    if (_sseConnection) {
      _sseConnection.close();
      _sseConnection = null;
    }
    if (_sseReconnectTimer) {
      clearTimeout(_sseReconnectTimer);
      _sseReconnectTimer = null;
    }
  }
  
  function stopPollingTimers() {
    if (_notificationPollTimer) {
      clearInterval(_notificationPollTimer);
      _notificationPollTimer = null;
    }
    console.log("[SSE] Polling timers stopped (SSE active)");
  }
  
  function startFallbackPolling() {
    // CRITICAL: Only managers should use fallback polling
    // Agents have their own polling via startAgentNotificationPolling
    if (!window._isManager) {
      console.log("[SSE] Fallback polling skipped for non-manager");
      return;
    }
    
    console.log("[SSE] Starting fallback polling mode (60s interval)");
    
    // Less frequent polling as fallback - managers only
    _notificationPollTimer = setInterval(() => {
      if (window._isManager) {
        softRefreshNotifications();
      }
    }, 60000);
  }
  
  function updateNotificationBadge(count) {
    const badge = document.getElementById("notifCount");
    if (badge) {
      badge.textContent = count || "";
      badge.style.display = count > 0 ? "flex" : "none";
    }
  }
  
  function updateTimeOffBadge(count) {
    const badge = document.getElementById("notifCount");
    if (badge && window._isManager) {
      const current = parseInt(badge.textContent) || 0;
      const newTotal = current + count;
      badge.textContent = newTotal || "";
      badge.style.display = newTotal > 0 ? "flex" : "none";
    }
  }
  
  function pulseNotificationBell() {
    const notifBtn = document.getElementById("btnNotif");
    if (notifBtn) {
      notifBtn.style.animation = "pulse-bell 0.5s ease 3";
      notifBtn.style.boxShadow = "0 0 12px rgba(239, 68, 68, 0.6)";
      setTimeout(() => {
        notifBtn.style.animation = "";
        notifBtn.style.boxShadow = "";
      }, 2000);
    }
  }
  
  // ---- Start realtime notifications stream (ONLY after auth is known) ----
let _notificationPollTimer = null;
let _isEditingSchedule = false; // Flag to prevent refresh during edits

// Start realtime notifications for managers (keeps old function name for compatibility)
function startManagerPresenceTracking() {
  if (!window._isManager) return;
  if (!window._myName || !window._myEmail) return;

  // Start SSE for real-time notifications (no presence heartbeats)
  startRealtimeStream();
}

// ✅ Start notification polling for agents - NO SSE (causes excessive Firestore reads)
function startAgentNotificationPolling() {
  if (window._isManager) return;
  if (!window._myName) return;
  
  console.log("[Agent] Starting notification polling (5-minute interval)");
  
  // DO NOT use SSE - it causes excessive reads from Cloud Function timeouts
  // Use simple polling instead with conservative interval
  
  if (!_notificationPollTimer) {
    _notificationPollTimer = setInterval(() => {
      loadAgentNotifications();
    }, 300000); // 5 minutes - conservative to prevent read spikes
  }
}

// ✅ Soft refresh - only updates notification data, not the whole UI
async function softRefreshNotifications() {
  if (_isEditingSchedule) {
    console.log("[Notifications] Skipping refresh - user is editing");
    return;
  }
  
  try {
    // For managers: check for new pending notifications
    if (window._isManager) {
      const res = await fetch('/?action=pendingNotifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      
      if (data.ok) {
        const newCount = (data.managerNotifications?.length || 0) + (data.shiftNotifications?.length || 0);
        const currentCount = pendingNotifications?.length || 0;
        
        // Only show indicator if count increased
        if (newCount > currentCount) {
          showNewNotificationIndicator(newCount - currentCount);
        }
      }
    }
  } catch (err) {
    console.warn("[Notifications] Soft refresh failed:", err);
  }
}

// ✅ Show a non-intrusive indicator when new notifications arrive
function showNewNotificationIndicator(count) {
  const notifBtn = $("btnNotif");
  if (notifBtn) {
    // Add pulsing glow effect
    notifBtn.style.animation = "pulse-bell 0.5s ease 3";
    notifBtn.style.boxShadow = "0 0 12px rgba(239, 68, 68, 0.6)";
    setTimeout(() => {
      notifBtn.style.animation = "";
      notifBtn.style.boxShadow = "";
    }, 2000);
  }
  
  // Update badge count
  const badge = $("notifCount");
  if (badge) {
    const currentVal = parseInt(badge.textContent) || 0;
    badge.textContent = currentVal + count;
    badge.classList.remove("hidden");
  }
  
  // Play alert sound for managers
  if (window._isManager && typeof playManagerAlertSound === 'function') {
    playManagerAlertSound();
  }
  
  // Show toast notification
  toast(`🔔 ${count} new notification${count > 1 ? 's' : ''} - click bell to view`, "info");
}

// ✅ Mark editing mode on/off to prevent disruption
function setEditingMode(isEditing) {
  _isEditingSchedule = isEditing;
  window.__editModeActive = isEditing;
  
  if (isEditing) {
    console.log("[Edit Mode] Enabled - auto-refresh paused");
  } else {
    console.log("[Edit Mode] Disabled - auto-refresh resumed");
    
    // Check for pending refresh when editing ends
    if (window.__pendingRefresh) {
      showPendingUpdatesBanner();
    }
  }
}

  // --- 4. LOAD SEQUENCE ---
  // ============================================
  // [SECTION 7] INITIALIZATION & DATA LOADING
  // ============================================
  window.onload = function() {
    // ✅ Check for cached session before requiring login
    // Note: Early check in <head> already hides auth overlay if valid session exists
    const cachedSession = loadAuthSession();
    if (cachedSession || window._hasValidSession) {
      // Use cached session or validate the early check
      const session = cachedSession || loadAuthSession(); // Double-check
      if (session) {
        console.log('🔓 Restoring cached session:', session.name);
        
        // Set global identity from cache
        window._myEmail = session.email;
        window._myName = session.name;
        window._isManager = session.isManager;
        window._currentUser = session.name;
        
        // Ensure auth-pending is removed (may already be hidden by early check)
        document.body.classList.remove("auth-pending");
        
        // Hide auth overlay explicitly
        const authOverlay = document.getElementById("authOverlay");
        if (authOverlay) authOverlay.style.display = "none";
        
        // Hide login container
        const loginContainer = document.getElementById("authLoginContainer");
        if (loginContainer) loginContainer.style.display = "none";
        
        // ✅ Refresh session timestamp on page load
        refreshSessionTimestamp();
      }
    } else {
      // No valid session - ensure login screen is shown
      document.body.classList.add("auth-pending");
      const authOverlay = document.getElementById("authOverlay");
      if (authOverlay) authOverlay.style.display = "flex";
    }
    
    // ✅ Set up session activity tracking (refresh on user interactions)
    setupSessionActivityTracking();
    
    // ✅ Set up periodic session validation (every 5 minutes)
    setInterval(() => {
      if (window._myEmail) {
        const session = loadAuthSession();
        if (!session) {
          // Session expired, show login
          document.body.classList.add("auth-pending");
          const loginContainer = document.getElementById("authLoginContainer");
          if (loginContainer) loginContainer.style.display = "flex";
        }
      }
    }, 5 * 60 * 1000);
    
    try { load(); } catch (e) { fatal_("Boot Crash", e.message); }
  };
  
  // ✅ NEW: Track user activity to keep session alive
  function setupSessionActivityTracking() {
    const activityEvents = ['click', 'keypress', 'scroll', 'touchstart'];
    let lastRefresh = Date.now();
    const REFRESH_INTERVAL = 5 * 60 * 1000; // Refresh at most every 5 minutes
    
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastRefresh > REFRESH_INTERVAL) {
        if (window._myEmail && typeof refreshSessionTimestamp === 'function') {
          refreshSessionTimestamp();
          lastRefresh = now;
        }
      }
    };
    
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });
  }
  function load(force, targetEmail) {
  // ✅ Show/hide login button based on auth state
  const loginContainer = document.getElementById("authLoginContainer");
  if (loginContainer) {
    loginContainer.style.display = (window._myName && window._myEmail) ? "none" : "flex";
  }
  
  // 1. Gatekeeper: Stop if no identity is present yet
  if (!window._myName && !window._myEmail) {
    console.log("No identity found. Skipping data load until sign-in.");
    return; 
  }
  // 2. Show loading state
  const loadingPlaceholder = $("loadingPlaceholder");
  if (loadingPlaceholder) loadingPlaceholder.style.display = "flex";
  if ($("dayTabs")) $("dayTabs").innerHTML = "";
  if ($("viewDayTitle")) $("viewDayTitle").textContent = "";
  if ($("viewDayStats")) $("viewDayStats").textContent = "";
  
  setView('schedule');
  if ($("calViewWrapper")) $("calViewWrapper").style.display = "none";
  if (targetEmail) _selectedManagerEmail = targetEmail;
  const isManager = window._isManager;
  const myName = window._myName;
  // 3. UI Adjustments based on Role
  if (isManager) {
    // === MANAGER VIEW ===
    document.body.classList.remove("agent-mode");
    document.body.classList.add("manager-mode");
    
    if (typeof startManagerPresenceTracking === "function") startManagerPresenceTracking(); 
    
    // Show manager-only elements
    if ($("btnAdmin")) $("btnAdmin").style.display = "flex";
    if ($("btnMasterMode")) $("btnMasterMode").style.display = "";
    if ($("drawerToggle")) $("drawerToggle").style.display = "";
    if ($("btnAgentToggle")) $("btnAgentToggle").style.display = "none";
    
    // ✅ MANAGER: Ensure Metrics and Goals buttons are VISIBLE
    if ($("btnMetrics")) $("btnMetrics").style.display = ""; 
    if ($("btnGoals")) $("btnGoals").style.display = "";
    
    // Update header title
    const headerTitle = document.querySelector(".hTitle");
    if (headerTitle) headerTitle.textContent = "Scheduling Manager";
    
  } else {
    // === AGENT VIEW ===
    document.body.classList.add("agent-mode");
    document.body.classList.remove("manager-mode");
    
    // NOTE: Agents use polling for notifications, NOT SSE
    // SSE causes excessive Firestore reads due to Cloud Function timeouts
    
    // Hide manager-only elements
    if ($("btnAdmin")) $("btnAdmin").style.display = "none";
    if ($("btnMasterMode")) $("btnMasterMode").style.display = "none";
    if ($("drawerToggle")) $("drawerToggle").style.display = "none";
    if ($("btnAgentToggle")) $("btnAgentToggle").style.display = "none";
    
    // ✅ AGENT: FORCE HIDE METRICS BUTTON and Goals button (uses compact bar button instead)
    if ($("btnMetrics")) $("btnMetrics").style.display = "none";
    if ($("btnGoals")) $("btnGoals").style.display = "none";
    
    // Update header title
    const headerTitle = document.querySelector(".hTitle");
    if (headerTitle) headerTitle.textContent = "My Schedule";
    
    // Filter to only show agent's own shifts
    if (myName) {
      _selectedPeople.clear(); 
      _selectedPeople.add(myName);
    }
  }
  // 4. Trigger fetch
  loadSystemData();
  checkUrlNotifs();
  
  // ✅ 5. Trigger Balance Load (so pill/modal works immediately)
  loadBalances();
  
  // ✅ 6. Load agent notifications and show agent UI (for non-managers)
  if (!isManager) {
    if ($("btnAgentNotif")) $("btnAgentNotif").style.display = "flex";
    if ($("agentQuickActions")) $("agentQuickActions").style.display = "flex";
    loadAgentNotifications();
    loadPendingSwaps();
    // ✅ Start polling for new notifications every 60 seconds
    startAgentNotificationPolling();
  } else {
    if ($("btnAgentNotif")) $("btnAgentNotif").style.display = "none";
    if ($("agentQuickActions")) $("agentQuickActions").style.display = "none";
    
    // ✅ Manager: Check for pending notifications on load and play alert sound
    setTimeout(async () => {
      try {
        // Check for pending time-off requests
        const countRes = await fetch('./?action=timeoff/count');
        const countData = await countRes.json();
        const toCount = (countData.ok && countData.count) ? countData.count : 0;
        
        // Also check shift notifications
        const notifRes = await fetch('/?action=pendingNotifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        const notifData = await notifRes.json();
        const shiftCount = notifData.ok ? (notifData.shiftNotifications?.length || 0) : 0;
        const mgrCount = notifData.ok ? (notifData.managerNotifications?.length || 0) : 0;
        
        const totalCount = toCount + shiftCount + mgrCount;
        
        // Update badge
        const badge = $("notifCount");
        if (badge) {
          if (totalCount > 0) {
            badge.textContent = totalCount > 99 ? "99+" : totalCount;
            badge.classList.remove("hidden");
          } else {
            badge.classList.add("hidden");
          }
        }
        
        // Play alert sound if there are pending time-off or manager notifications
        if ((toCount > 0 || mgrCount > 0) && typeof playManagerAlertSound === 'function') {
          // Small delay so the page is visually settled
          setTimeout(() => {
            playManagerAlertSound();
            // Also pulse the bell
            const bellBtn = $("btnNotif");
            if (bellBtn) {
              bellBtn.style.animation = "pulse-bell 0.5s ease 3";
              bellBtn.style.boxShadow = "0 0 12px rgba(239, 68, 68, 0.6)";
              setTimeout(() => {
                bellBtn.style.animation = "";
                bellBtn.style.boxShadow = "";
              }, 2000);
            }
          }, 500);
        }
      } catch (err) {
        console.warn("[Init] Failed to check initial notifications:", err);
      }
    }, 2000); // Wait 2s after load for data to settle
  }
}
  // If value is a pure YYYY-MM-DD (date-only), do NOT convert timezones.
function dayKeyPST(value) {
  if (!value) return "";
  // 1) If backend already sends YYYY-MM-DD, keep it as-is
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  // 2) If it's a Date (or parseable), decide if it’s "date-only" at UTC midnight
  const d = (value instanceof Date) ? value : new Date(value);
  if (isNaN(d)) return "";
  // If it looks like a date-only stored at 00:00:00Z, keep its UTC day
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) {
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  }
  // Otherwise it's a real timestamp -> format by PST
  return formatDatePST(d); // uses Intl + America/Los_Angeles
}
function displayDayLabel(dayKey) {
  if (!dayKey) return "";
  // Defensive: if it's already a label, just return it
  if (typeof dayKey !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) return String(dayKey);
  const [y, m, d] = dayKey.split("-").map(Number);
  const anchor = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)); // noon UTC anchor
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PST_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(anchor); // -> "Tue, Dec 30"
}
function pstParts(d) {
  const dt = (d instanceof Date) ? d : new Date(d);
  if (isNaN(dt)) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: PST_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(dt);
  const out = {};
  for (const p of parts) if (p.type !== "literal") out[p.type] = p.value;
  return out;
}
// YYYY-MM-DD in Pacific Time (best for keys/grouping)
function formatDatePST(d) {
  const p = pstParts(d);
  if (!p) return "";
  return `${p.year}-${p.month}-${p.day}`;
}
// HH:MM in Pacific Time (useful for display)
function formatTimePST(d) {
  const p = pstParts(d);
  if (!p) return "";
  return `${p.hour}:${p.minute}`;
}
// If anything calls these from inline handlers, ensure global:
window.formatDatePST = formatDatePST;
window.formatTimePST = formatTimePST;
  async function loadSystemData() {
  console.log("Loading system data...");
  
  // ✅ Refresh session timestamp on data load (user is active)
  if (typeof refreshSessionTimestamp === 'function') {
    refreshSessionTimestamp();
  }
  
  const isManager = window._isManager;
  const myName = window._myName;
  
  // ============================================
  // SMART AUTO-GENERATION (Only once per day, managers only)
  // ============================================
  // Only managers need to trigger generation, and only once per day
  if (isManager) {
    const today = pstISODate();
    const lastGenKey = 'lastAutoGenDate';
    const lastGenDate = localStorage.getItem(lastGenKey);
    
    if (lastGenDate !== today) {
      try {
        console.log("🔄 Auto-generating 14-day schedule horizon...");
        const genRes = await fetch('./?action=admin/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            days: 14,
            teamKey: "ALL"
          })
        });
        const genData = await genRes.json();
        if (genData.ok) {
          console.log("✅ 14-day horizon generated");
          localStorage.setItem(lastGenKey, today);
        }
      } catch (e) {
        console.warn("Auto-generate failed; continuing:", e);
      }
    } else {
      console.log("⏭️ Skipping auto-generate (already ran today)");
    }
  }
  
  // ============================================
  // AGENT CACHING LOGIC
  // ============================================
  if (!isManager && myName) {
    const cacheKey = `${CACHE_CONFIG.SCHEDULE_KEY}_${myName}`;
    const cachedSchedule = getCachedData(cacheKey);
    
    if (cachedSchedule) {
      console.log("📦 Loading schedule from cache for agent:", myName);
      
      // Use cached data
      _people = cachedSchedule.people || [];
      _teams = cachedSchedule.teams || [];
      _allData = cachedSchedule.allData || [];
      
      // Regenerate time labels with current timezone preference
      _allData.forEach(item => {
        if (item.start) item.startLabel = toAmPm(item.start);
        if (item.end) item.endLabel = toAmPm(item.end);
      });
      
      // Update UI with cached data
      renderTeamChips();
      fillSelect("tpPerson", _people);
      fillSelect("mNewPerson", _people);
      renderQuickRail();
      initFilters();
      
      // Update cache indicator
      updateCacheIndicator(true);
      await loadGlobalRules();
      await loadHolidays();
      
      applyLocalFilters();
      if ($("loadingPlaceholder")) $("loadingPlaceholder").style.display = "none";
      if (_allData.length > 0) renderView();
      
      return; // Skip network fetch
    }
  }
  
  // ============================================
  // FRESH FETCH (Manager or cache miss)
  // ============================================
  try {
    updateCacheIndicator(false);
    
    // 1. Fetch Metadata
    const metaRes = await fetch('/getmetadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isManager: isManager, action: 'getMetadata' })
    });
    const meta = await metaRes.json();
    _peopleMeta = Array.isArray(meta.people) ? meta.people : [];
    _peopleMetaByName = new Map();
    _peopleMeta.forEach(p => {
      const display = String(p.name || p.id || "").trim();
      if (display) _peopleMetaByName.set(display.toLowerCase(), p);
    });
    _people = _peopleMeta.map(p => p.name || p.id).filter(Boolean);
    _teams = (meta.teams || []).map(t => t.id || t.name).filter(Boolean);
    if (!_teams.includes("Lunch")) _teams.push("Lunch");
      if (!_teams.includes("1:1 Meeting")) _teams.push("1:1 Meeting");
    
    // ✅ Fetch roles from Firestore
    try {
      const rolesRes = await fetch('./?action=roles');
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        if (rolesData.roles && rolesData.roles.length > 0) {
          _roles = rolesData.roles.map(r => r.id || r.name).filter(Boolean);
        } else {
          _roles = ["Agent", "Backup 1", "Backup 2", "Captain"]; // Fallback defaults
        }
      } else {
        _roles = ["Agent", "Backup 1", "Backup 2", "Captain"];
      }
    } catch (e) {
      console.warn("Failed to fetch roles, using defaults:", e);
      _roles = ["Agent", "Backup 1", "Backup 2", "Captain"];
    }
    
    _zendeskMetricsList = meta.zendeskMetrics || [];
    _zendeskMetricsByName = new Map();
    _zendeskMetricsList.forEach(r => { 
      if(r && r.agentName) _zendeskMetricsByName.set(String(r.agentName), r); 
    });
    
    _timeOff.clear(); 
    (meta.timeOff || []).forEach(t => _timeOff.add(`${t.person}|${t.dateISO}`));
    renderTeamChips(); 
    fillSelect("tpPerson", _people); 
    fillSelect("mNewPerson", _people); 
    renderQuickRail(); 
    initFilters();
    // 2. Fetch Schedule
    const payload = {
      daysForward: 14,
      targetEmail: _selectedManagerEmail,
      isManager: isManager,
      agentName: myName  // Backend uses this to filter for agents
    };
    const today = pstISODate();
    const shiftRes = await fetch(`/initdashboard?start=${today}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, action: "initdashboard" })
    });
    
    const shifts = await shiftRes.json();
    if (shifts && shifts.schedule && shifts.schedule.results) {
      _allData = [];
      shifts.schedule.results.forEach(day => {
        if (day.assignments) {
          day.assignments.forEach(a => {
            const docId = String(day.id || "");
            const teamName = (docId.includes("__") ? docId.split("__")[1] : "") || day.team || "General";
            const assignmentId = a.assignmentId ?? a.id ?? a.assignment_id ?? a.assignmentID ?? "";
            const dayKey = dayKeyPST(day.date);
            _allData.push({
              ...a,
              docId,
              assignmentId,
              date: day.date,
              dateISO: dayKey,
              dayKey,
              dateLabel: dayKey,
              team: teamName,
              startLabel: toAmPm(a.start),
              endLabel: toAmPm(a.end),
            });
          });
        }
      });
    }
    // ============================================
    // CACHE THE DATA FOR AGENTS
    // ============================================
    if (!isManager && myName) {
      const cacheKey = `${CACHE_CONFIG.SCHEDULE_KEY}_${myName}`;
      setCachedData(cacheKey, {
        people: _people,
        teams: _teams,
        allData: _allData
      });
    }

    // Check for pending requests on load (managers only)
    if (isManager) {
      loadTimeOffCount();
    }
    
    // 3. Finalize View
    await loadGlobalRules();
    await loadHolidays();
    _scheduleLoadedPast = 0;
  _scheduleLoadedFuture = 14;
  _agentScheduleDays = 14; // Reset agent days tracking
  updateLoadedRangeLabel();
  updateAgentRangeLabel();  
    applyLocalFilters();
    if ($("loadingPlaceholder")) $("loadingPlaceholder").style.display = "none";
    if (_allData.length > 0) renderView();
  } catch (e) {
    console.error("System Data Load Failed:", e);
    if ($("loadingPlaceholder")) $("loadingPlaceholder").style.display = "none";
    fatal_("Data Load Failed", e);
  }
}
let _staffingRules = []; // Global variable to store rules
async function loadGlobalRules() {
  try {
    const res = await fetch('./?action=staffing/rules');
    if (res.ok) _staffingRules = await res.json();
  } catch (e) { console.error("Rules load error", e); }
}
function updateCacheIndicator(fromCache) {
  // Remove any existing indicator
  const existingIndicator = document.getElementById('cacheIndicator');
  if (existingIndicator) existingIndicator.remove();
  
  // For non-managers, show a subtle notification that auto-hides
  if (fromCache && !window._isManager) {
    // Show a brief toast instead of persistent indicator
    const indicator = document.createElement('div');
    indicator.id = 'cacheIndicator';
    indicator.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      padding: 10px 16px;
      background: rgba(251, 191, 36, 0.95);
      color: #92400e;
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
      z-index: 9999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      animation: slideUp 0.3s ease-out;
    `;
    indicator.innerHTML = '📦 Cached data <span style="opacity:0.7; font-weight:400;">• Click to refresh</span>';
    indicator.title = 'Showing cached data. Click to reload latest schedule.';
    
    indicator.onclick = function() {
      this.style.opacity = '0.5';
      this.style.pointerEvents = 'none';
      clearScheduleCache();
      load();
      toast('♻️ Refreshing data...', 'info');
    };
    
    indicator.onmouseenter = function() {
      this.style.transform = 'scale(1.02)';
    };
    indicator.onmouseleave = function() {
      this.style.transform = 'scale(1)';
    };
    
    document.body.appendChild(indicator);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      if (indicator && indicator.parentNode) {
        indicator.style.transition = 'opacity 0.3s, transform 0.3s';
        indicator.style.opacity = '0';
        indicator.style.transform = 'translateY(20px)';
        setTimeout(() => indicator.remove(), 300);
      }
    }, 5000);
  }
}
  // ============================================
  // [SECTION 8] SCHEDULE RENDERING
  // ============================================
  function renderView() {
  // If we are in metrics view, show that
  if (_view === "metrics") {
    $("scheduleView").style.display = "none";
    $("metricsView").style.display = "block";
    renderMetricsList();
    return; // Stop here
  }
  // Otherwise, default to the new SCHEDULE view
  $("scheduleView").style.display = "flex";
  $("metricsView").style.display = "none";
  
  // Render the new Single Day view
  renderScheduleView();
  
  // Update agent schedule banner (agents only)
  if (!window._isManager) {
    updateAgentScheduleBanner();
    // Load assignments for dashboard banner
    loadAgentDashboardAssignments();
  }
  
  // Update the coverage banner (Managers only)
  if (window._isManager) {
    renderCoverageCard();
  }
}
  async function wipeFutureSchedule() {
  const result = await Swal.fire({
    title: '⚠️ Wipe Schedule Data',
    html: `
      <div style="text-align:left; padding:10px;">
        <p style="color:#ef4444; font-weight:600; margin-bottom:16px;">Select what to delete:</p>
        
        <label style="display:flex; align-items:center; gap:10px; padding:12px; background:#fef2f2; border:1px solid #fecaca; border-radius:8px; margin-bottom:10px; cursor:pointer;">
          <input type="radio" name="wipeScope" value="future" checked style="width:18px; height:18px;">
          <div>
            <div style="font-weight:600; color:#dc2626;">Future Only</div>
            <div style="font-size:12px; color:#64748b;">Delete from today onwards</div>
          </div>
        </label>
        
        <label style="display:flex; align-items:center; gap:10px; padding:12px; background:#fff7ed; border:1px solid #fed7aa; border-radius:8px; margin-bottom:10px; cursor:pointer;">
          <input type="radio" name="wipeScope" value="all" style="width:18px; height:18px;">
          <div>
            <div style="font-weight:600; color:#c2410c;">Everything</div>
            <div style="font-size:12px; color:#64748b;">Delete ALL schedule data (past + future)</div>
          </div>
        </label>
        
        <div style="font-size:12px; color:#94a3b8; margin-top:12px;">
          ⚠️ This action cannot be undone. Use "Regenerate" after to create new schedules.
        </div>
      </div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    confirmButtonText: '🗑️ Delete Selected',
    cancelButtonText: 'Cancel',
    preConfirm: () => {
      const scope = document.querySelector('input[name="wipeScope"]:checked')?.value || 'future';
      return { scope };
    }
  });
  
  if (!result.isConfirmed) return;
  
  const wipePast = result.value.scope === 'all';
  
  // Show loading
  Swal.fire({
    title: 'Wiping Schedule...',
    html: wipePast ? 'Deleting ALL schedule data...' : 'Deleting future schedule days...',
    allowOutsideClick: false,
    showConfirmButton: false,
    didOpen: () => Swal.showLoading()
  });
  
  try {
    const res = await fetch('./?action=admin/wipe-future', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true, includePast: wipePast })
    });
    
    const data = await res.json();
    
    if (data.ok) {
      Swal.fire({
        icon: 'success',
        title: 'Schedule Wiped!',
        html: `<div>Deleted <strong>${data.deleted}</strong> schedule days.</div>
               <div style="margin-top:10px; font-size:13px; color:#64748b;">
                 Use "Regenerate" to create the new schedule.
               </div>`,
        confirmButtonColor: '#16a34a'
      });
      
      // Clear local data and refresh
      _allData = [];
      loadSystemData();
    } else {
      throw new Error(data.error || 'Wipe failed');
    }
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Wipe Failed',
      text: err.message,
      confirmButtonColor: '#ef4444'
    });
  }
}

// Master Schedule (Template) Draft Editing
let _masterOriginalData = null; // snapshot from server
let _masterDraftData = null;    // editable working copy
let _masterEditEnabled = false; // must click Edit first

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj || {}));
}

function renderQuickStats() {
  // Only show for managers
  if (!window._isManager) return;
  
  const todayISO = pstISODate();
  const todayShifts = _allData.filter(s => s.dateISO === todayISO || dayKeyPST(s.date) === todayISO);
  
  // Count by channel
  const channelCounts = {};
  let offCount = 0;
  
  todayShifts.forEach(s => {
    const channel = s.team || 'Other';
    channelCounts[channel] = (channelCounts[channel] || 0) + 1;
    
    const notes = String(s.notes || '').toLowerCase();
    if (notes.includes('[off]')) offCount++;
  });
  
  // Remove existing stats bar
  const existing = document.getElementById('quickStatsBar');
  if (existing) existing.remove();
  
  // Create stats bar
  const bar = document.createElement('div');
  bar.id = 'quickStatsBar';
  bar.style.cssText = `
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 12px 20px;
    margin:  0 20px 16px 20px;
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
  `;
  
  let statsHtml = `
    <div style="font-weight:800; color:#0f172a; font-size: 14px;">
      📊 Today's Coverage
    </div>
    <div style="height:20px; width:1px; background:#e2e8f0;"></div>
    <div style="display:flex; gap:12px; flex-wrap:wrap;">
  `;
  
  // Add channel counts
  Object.entries(channelCounts).sort((a, b) => b[1] - a[1]).slice(0, 6).forEach(([channel, count]) => {
    const config = CHANNEL_CONFIG[channel] || { abbrev: channel.substring(0, 2), color: '#f1f5f9', text: '#475569' };
    statsHtml += `
      <div style="
        background: ${config.color};
        color: ${config.text};
        padding: 4px 10px;
        border-radius:  6px;
        font-size:  12px;
        font-weight: 700;
      ">
        ${config.abbrev}:  ${count}
      </div>
    `;
  });
  
  // Add off count if any
  if (offCount > 0) {
    statsHtml += `
      <div style="
        background: #fef2f2;
        color: #dc2626;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 12px;
        font-weight:  700;
      ">
        ⛔ ${offCount} OFF
      </div>
    `;
  }
  
  statsHtml += `
    </div>
    <div style="margin-left:auto; font-size:11px; color:#94a3b8;">
      ${todayShifts.length} total shifts
    </div>
  `;
  
  bar.innerHTML = statsHtml;
  
  // Insert at top of content area
  const content = document.querySelector('.content');
  if (content) {
    content.insertBefore(bar, content.firstChild);
  }
}

// Lightweight people-only refresh (avoids full loadSystemData / schedule reads)
async function refreshPeopleOnly() {
  try {
    const metaRes = await fetch('/getmetadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isManager: window._isManager, action: 'getMetadata' })
    });
    const meta = await metaRes.json();
    _peopleMeta = Array.isArray(meta.people) ? meta.people : [];
    _peopleMetaByName = new Map();
    _peopleMeta.forEach(p => {
      const display = String(p.name || p.id || "").trim();
      if (display) _peopleMetaByName.set(display.toLowerCase(), p);
    });
    _people = _peopleMeta.map(p => p.name || p.id).filter(Boolean);
    
    // Update dropdowns
    renderTeamChips();
    fillSelect("tpPerson", _people);
    fillSelect("mNewPerson", _people);
    renderQuickRail();
    
    // Refresh master view if visible (uses _people for roster)
    const masterView = document.getElementById("masterView");
    if (masterView && masterView.style.display !== "none" && _masterRawData) {
      renderMasterView(_masterRawData);
    }
  } catch (e) {
    console.warn("refreshPeopleOnly failed:", e);
  }
}

async function openAddAgentModal() {
  const { value: formValues } = await Swal.fire({
    title: "Add New Agent",
    html: `
      <div style="text-align:left;">
        <label style="display:block; font-size:11px; font-weight:600; color:var(--text-secondary, #64748b); margin-bottom:4px; text-transform:uppercase;">Full Name *</label>
        <input id="aaName" class="swal2-input" placeholder="e.g., John Smith" style="margin:0 0 12px 0;">
        
        <label style="display:block; font-size:11px; font-weight:600; color:var(--text-secondary, #64748b); margin-bottom:4px; text-transform:uppercase;">Email *</label>
        <input id="aaEmail" class="swal2-input" placeholder="john@company.com" style="margin:0 0 12px 0;">
        
        <label style="display:block; font-size:11px; font-weight:600; color:var(--text-secondary, #64748b); margin-bottom:4px; text-transform:uppercase;">Role</label>
        <select id="aaRole" class="swal2-select" style="margin:0 0 12px 0; width:100%; padding:10px; border:1px solid var(--border-color, #e2e8f0); border-radius:8px;">
          <option value="agent">Agent (Standard Access)</option>
          <option value="admin">Admin (Full Access)</option>
        </select>
        
        <label style="display:block; font-size:11px; font-weight:600; color:var(--text-secondary, #64748b); margin-bottom:4px; text-transform:uppercase;">Chat User ID (optional)</label>
        <input id="aaChat" class="swal2-input" placeholder="For Google Chat notifications" style="margin:0;">
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "Add Agent",
    confirmButtonColor: "#16a34a",
    preConfirm: () => {
      const name = document.getElementById("aaName").value.trim();
      const email = document.getElementById("aaEmail").value.trim();
      const role = document.getElementById("aaRole").value;
      const chatUserId = document.getElementById("aaChat").value.trim();
      if (!name || !email) {
        Swal.showValidationMessage("Name and email are required.");
        return;
      }
      if (!email.includes("@")) {
        Swal.showValidationMessage("Please enter a valid email address.");
        return;
      }
      return { name, email, role, chatUserId };
    }
  });

  if (!formValues) return;

  try {
    Swal.fire({ title: "Adding agent...", allowOutsideClick:false, showConfirmButton:false, didOpen: () => Swal.showLoading() });

    const res = await fetch("./?action=people/add", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify(formValues)
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Failed to add agent");

    // Lightweight refresh — only update people list, NOT the entire schedule
    await refreshPeopleOnly();
    
    Swal.fire({ 
      icon:"success", 
      title:"Agent Added!", 
      html:`<div style="text-align:left;">
        <p><strong>${formValues.name}</strong> has been added to the system.</p>
        <p style="font-size:12px; color:#64748b; margin-top:8px;">Document ID: <code>${data.docId}</code></p>
        <p style="font-size:12px; color:#64748b;">Role: ${formValues.role}</p>
        <p style="font-size:12px; color:#16a34a; margin-top:8px;">✓ Agent will appear in Master Schedule</p>
      </div>`,
      confirmButtonColor:"#16a34a" 
    });
  } catch (e) {
    console.error(e);
    Swal.fire({ icon:"error", title:"Add failed", text:e.message, confirmButtonColor:"#ef4444" });
  }
}

// Open Agent Management Modal
async function openManageAgentsModal() {
  Swal.fire({ title: "Loading agents...", allowOutsideClick:false, showConfirmButton:false, didOpen: () => Swal.showLoading() });
  
  try {
    const res = await fetch("./?action=people/list");
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Failed to load agents");
    
    const agents = data.people || [];
    const activeAgents = agents.filter(a => a.active !== false);
    const inactiveAgents = agents.filter(a => a.active === false);
    
    let tableHtml = `
      <div style="display:flex; gap:10px; margin-bottom:12px; font-size:12px; color:var(--text-secondary, #64748b);">
        <span style="background:#dcfce7; color:#166534; padding:3px 10px; border-radius:10px; font-weight:600;">${activeAgents.length} Active</span>
        ${inactiveAgents.length > 0 ? `<span style="background:#fee2e2; color:#991b1b; padding:3px 10px; border-radius:10px; font-weight:600;">${inactiveAgents.length} Inactive</span>` : ''}
      </div>
      <div style="max-height:400px; overflow-y:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:13px;">
          <thead>
            <tr style="background:var(--bg-tertiary, #f8fafc); position:sticky; top:0;">
              <th style="padding:10px; text-align:left; border-bottom:2px solid var(--border-color, #e2e8f0);">Name</th>
              <th style="padding:10px; text-align:left; border-bottom:2px solid var(--border-color, #e2e8f0);">Email</th>
              <th style="padding:10px; text-align:center; border-bottom:2px solid var(--border-color, #e2e8f0);">Role</th>
              <th style="padding:10px; text-align:center; border-bottom:2px solid var(--border-color, #e2e8f0);">Status</th>
              <th style="padding:10px; text-align:center; border-bottom:2px solid var(--border-color, #e2e8f0);">Actions</th>
            </tr>
          </thead>
          <tbody>
    `;
    
    agents.sort((a, b) => {
      // Active agents first, then inactive
      if ((a.active !== false) !== (b.active !== false)) return a.active === false ? 1 : -1;
      return (a.name || a.docId).localeCompare(b.name || b.docId);
    }).forEach(agent => {
      const isActive = agent.active !== false;
      const role = agent.role || 'agent';
      const roleColor = role === 'admin' ? '#7c3aed' : '#64748b';
      const statusColor = isActive ? '#16a34a' : '#ef4444';
      const rowBg = isActive ? '' : 'background:var(--bg-tertiary, #f8f8f8); opacity:0.7;';
      
      tableHtml += `
        <tr style="border-bottom:1px solid var(--border-color, #e2e8f0); ${rowBg}">
          <td style="padding:10px; font-weight:600; color:var(--text-primary, #0f172a);">${agent.name || agent.docId}</td>
          <td style="padding:10px; color:var(--text-secondary, #64748b); font-size:12px;">${agent.email || '-'}</td>
          <td style="padding:10px; text-align:center;">
            <span style="background:${roleColor}20; color:${roleColor}; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:600; text-transform:uppercase;">${role}</span>
          </td>
          <td style="padding:10px; text-align:center;">
            <span style="color:${statusColor}; font-size:11px; font-weight:600;">${isActive ? '● Active' : '○ Inactive'}</span>
          </td>
          <td style="padding:10px; text-align:center; white-space:nowrap;">
            <button onclick="editAgentModal('${agent.docId}')" 
              style="background:#b37e78; color:white; border:none; padding:4px 10px; border-radius:6px; font-size:11px; cursor:pointer; font-weight:600; margin-right:4px;">Edit</button>
            <button onclick="removeAgentConfirm('${agent.docId}', '${(agent.name || agent.docId).replace(/'/g, "\\'")}')" 
              style="background:${isActive ? '#ef4444' : '#16a34a'}; color:white; border:none; padding:4px 10px; border-radius:6px; font-size:11px; cursor:pointer; font-weight:600;">
              ${isActive ? 'Remove' : 'Restore'}
            </button>
          </td>
        </tr>
      `;
    });
    
    tableHtml += `</tbody></table></div>`;
    
    Swal.fire({
      title: "👥 Manage Agents",
      html: tableHtml,
      width: 750,
      showConfirmButton: false,
      showCloseButton: true,
      footer: '<button onclick="Swal.close(); openAddAgentModal();" style="background:#16a34a; color:white; border:none; padding:10px 20px; border-radius:8px; font-weight:600; cursor:pointer;">+ Add New Agent</button>'
    });
  } catch (e) {
    console.error(e);
    Swal.fire({ icon:"error", title:"Load failed", text:e.message, confirmButtonColor:"#ef4444" });
  }
}

// Remove/Deactivate Agent Confirmation
async function removeAgentConfirm(docId, agentName) {
  // Check if agent is currently active
  const agent = (_peopleMeta || []).find(p => (p.docId || p.id) === docId);
  const isCurrentlyActive = agent ? agent.active !== false : true;
  
  if (!isCurrentlyActive) {
    // Restore flow — reactivate the agent
    const confirm = await Swal.fire({
      title: 'Restore Agent?',
      html: `<p>Reactivate <strong>${agentName}</strong>?</p>
             <p style="font-size:12px; color:#64748b; margin-top:8px;">They will appear in the Master Schedule again.</p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Restore',
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#64748b'
    });
    if (!confirm.isConfirmed) { openManageAgentsModal(); return; }
    
    try {
      Swal.fire({ title: "Restoring...", allowOutsideClick:false, showConfirmButton:false, didOpen: () => Swal.showLoading() });
      const res = await fetch("./?action=people/update", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ docId, active: true })
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Restore failed");
      
      await refreshPeopleOnly();
      Swal.fire({ icon:"success", title:"Agent Restored!", text:`${agentName} is now active.`, confirmButtonColor:"#16a34a", didClose: () => openManageAgentsModal() });
    } catch (e) {
      Swal.fire({ icon:"error", title:"Error", text:e.message, confirmButtonColor:"#ef4444" });
    }
    return;
  }
  
  // Deactivate flow
  const result = await Swal.fire({
    title: 'Remove Agent?',
    html: `
      <div style="text-align:left;">
        <p>This will deactivate <strong>${agentName}</strong>.</p>
        
        <div style="margin:16px 0; padding:12px; background:#fef3c7; border:1px solid #fcd34d; border-radius:8px;">
          <strong style="color:#92400e;">What happens:</strong>
          <ul style="margin:8px 0 0; padding-left:20px; font-size:12px; color:#92400e;">
            <li>Agent removed from the active roster</li>
            <li>Won't appear in Master Schedule</li>
            <li>Existing scheduled shifts remain (can be reassigned)</li>
            <li>Can be restored later from this panel</li>
          </ul>
        </div>
        
        <label style="display:flex; align-items:center; gap:8px; margin-top:12px; cursor:pointer;">
          <input type="checkbox" id="rmAlsoCleanShifts" style="width:16px; height:16px;">
          <span style="font-size:12px; color:var(--text-secondary, #64748b);">Also remove from all future scheduled shifts</span>
        </label>
      </div>
    `,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Remove Agent',
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#64748b',
    cancelButtonText: 'Cancel'
  });
  
  if (!result.isConfirmed) { openManageAgentsModal(); return; }
  
  const cleanShifts = document.getElementById("rmAlsoCleanShifts")?.checked || false;
  
  try {
    Swal.fire({ title: "Removing agent...", allowOutsideClick:false, showConfirmButton:false, didOpen: () => Swal.showLoading() });
    
    // 1. Deactivate the agent
    const res = await fetch("./?action=people/update", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ docId, active: false })
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || "Failed to remove agent");
    
    // 2. Optionally clean future shifts
    let cleanedCount = 0;
    if (cleanShifts) {
      try {
        const cleanRes = await fetch("./?action=admin/remove-agent-shifts", {
          method: "POST",
          headers: { "Content-Type":"application/json" },
          body: JSON.stringify({ agentName, fromDate: pstISODate() })
        });
        const cleanData = await cleanRes.json();
        cleanedCount = cleanData.removed || 0;
      } catch (cleanErr) {
        console.warn("Shift cleanup failed:", cleanErr);
      }
    }
    
    // 3. Lightweight refresh — update local people list only
    await refreshPeopleOnly();
    
    // 4. Also remove from local _allData if cleaning shifts
    if (cleanShifts) {
      const todayKey = pstISODate();
      _allData = _allData.filter(s => {
        if (s.person !== agentName) return true;
        const sDate = s.dateISO || s.dayKey || "";
        return sDate < todayKey; // Keep past shifts
      });
      applyLocalFilters();
      if (typeof renderView === 'function') renderView();
    }
    
    Swal.fire({
      icon: "success",
      title: "Agent Removed",
      html: `<div style="text-align:left;">
        <p><strong>${agentName}</strong> has been deactivated.</p>
        ${cleanedCount > 0 ? `<p style="font-size:12px; color:#64748b; margin-top:8px;">${cleanedCount} future shift(s) cleared.</p>` : ''}
        <p style="font-size:12px; color:#64748b; margin-top:8px;">You can restore them anytime from Manage Agents.</p>
      </div>`,
      confirmButtonColor: "#b37e78",
      didClose: () => openManageAgentsModal()
    });
  } catch (e) {
    console.error(e);
    Swal.fire({ icon:"error", title:"Error", text:e.message, confirmButtonColor:"#ef4444" });
  }
}

// Edit a specific agent
async function editAgentModal(docId) {
  Swal.fire({ title: "Loading...", allowOutsideClick:false, showConfirmButton:false, didOpen: () => Swal.showLoading() });
  
  try {
    const res = await fetch("./?action=people/list");
    const data = await res.json();
    if (!data.ok) throw new Error("Failed to load agent data");
    
    const agent = data.people.find(p => p.docId === docId);
    if (!agent) throw new Error("Agent not found");
    
    const { value: formValues } = await Swal.fire({
      title: `Edit Agent: ${agent.name || docId}`,
      html: `
        <div style="text-align:left;">
          <label style="display:block; font-size:11px; font-weight:600; color:var(--text-secondary, #64748b); margin-bottom:4px; text-transform:uppercase;">Full Name</label>
          <input id="eaName" class="swal2-input" value="${agent.name || ''}" style="margin:0 0 12px 0;">
          
          <label style="display:block; font-size:11px; font-weight:600; color:var(--text-secondary, #64748b); margin-bottom:4px; text-transform:uppercase;">Email</label>
          <input id="eaEmail" class="swal2-input" value="${agent.email || ''}" style="margin:0 0 12px 0;">
          
          <label style="display:block; font-size:11px; font-weight:600; color:var(--text-secondary, #64748b); margin-bottom:4px; text-transform:uppercase;">Role</label>
          <select id="eaRole" class="swal2-select" style="margin:0 0 12px 0; width:100%; padding:10px; border:1px solid var(--border-color, #e2e8f0); border-radius:8px;">
            <option value="agent" ${agent.role !== 'admin' ? 'selected' : ''}>Agent (Standard Access)</option>
            <option value="admin" ${agent.role === 'admin' ? 'selected' : ''}>Admin (Full Access)</option>
          </select>
          
          <label style="display:block; font-size:11px; font-weight:600; color:var(--text-secondary, #64748b); margin-bottom:4px; text-transform:uppercase;">Chat User ID</label>
          <input id="eaChat" class="swal2-input" value="${agent.chatUserId || ''}" style="margin:0 0 12px 0;">
          
          <label style="display:block; font-size:11px; font-weight:600; color:var(--text-secondary, #64748b); margin-bottom:4px; text-transform:uppercase;">Status</label>
          <select id="eaActive" class="swal2-select" style="margin:0; width:100%; padding:10px; border:1px solid var(--border-color, #e2e8f0); border-radius:8px;">
            <option value="true" ${agent.active !== false ? 'selected' : ''}>Active</option>
            <option value="false" ${agent.active === false ? 'selected' : ''}>Inactive</option>
          </select>
          
          <div style="margin-top:12px; padding:8px; background:#f8fafc; border-radius:6px; font-size:11px; color:#64748b;">
            Document ID: <code>${docId}</code>
          </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Save Changes",
      confirmButtonColor: "#b37e78",
      preConfirm: () => {
        return {
          docId: docId,
          name: document.getElementById("eaName").value.trim(),
          email: document.getElementById("eaEmail").value.trim(),
          role: document.getElementById("eaRole").value,
          chatUserId: document.getElementById("eaChat").value.trim(),
          active: document.getElementById("eaActive").value === 'true'
        };
      }
    });
    
    if (!formValues) {
      openManageAgentsModal(); // Go back to list
      return;
    }
    
    Swal.fire({ title: "Saving...", allowOutsideClick:false, showConfirmButton:false, didOpen: () => Swal.showLoading() });
    
    const updateRes = await fetch("./?action=people/update", {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify(formValues)
    });
    const updateData = await updateRes.json();
    if (!updateData.ok) throw new Error(updateData.error || "Update failed");
    
    await refreshPeopleOnly();
    
    Swal.fire({ 
      icon:"success", 
      title:"Agent Updated!", 
      confirmButtonColor:"#16a34a",
      didClose: () => openManageAgentsModal()
    });
  } catch (e) {
    console.error(e);
    Swal.fire({ icon:"error", title:"Error", text:e.message, confirmButtonColor:"#ef4444" });
  }
}

function calculateCoverageForToday() {
  // Get today's date in PST
  const todayISO = pstISODate();
  
  // Filter shifts for today only
  const todayShifts = _filteredData.filter(s => {
    const shiftDate = s.dateISO || dayKeyPST(s.date);
    return shiftDate === todayISO;
  });
  
  // Count shifts per channel
  const channelCounts = new Map();
  todayShifts.forEach(s => {
    const channel = s.team || "Other";
    const notes = String(s.notes || "").toLowerCase();
    const isOff = notes.includes("[off]");
    
    if (!isOff) {
      channelCounts.set(channel, (channelCounts.get(channel) || 0) + 1);
    }
  });
  
  // Compare against staffing rules
  const coverage = [];
  
  // Get day of week for rule matching
  const today = new Date();
  const dayOfWeek = today.toLocaleDateString("en-US", { 
    weekday: 'short', 
    timeZone: PST_TZ 
  }); // "Mon", "Tue", etc.
  
  _staffingRules.forEach(rule => {
    // Check if rule applies to today
    if (rule.day !== "All" && rule.day !== dayOfWeek) return;
    
    const channel = rule.team;
    const min = parseInt(rule.min) || 0;
    const current = channelCounts.get(channel) || 0;
    const config = CHANNEL_CONFIG[channel] || {};
    const abbrev = config.abbrev || channel.substring(0, 3).toUpperCase();
    
    let status = "good";
    if (current < min) {
      status = current < (min * 0.5) ? "critical" : "warning";
    }
    
    coverage.push({
      channel,
      abbrev,
      current,
      min,
      status,
      diff: current - min
    });
  });
  
  return coverage;
}
function renderCoverageCard() {
  renderCoverageDashboard();
}

// Modern Coverage Dashboard Renderer - Redesigned
// ============================================
