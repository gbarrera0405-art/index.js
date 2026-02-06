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
        <p>Export <strong>${shifts.length} shift(s)</strong> to your Google Calendar?</p>
        <p style="font-size: 12px; color: #64748b; margin-top: 8px;">Each shift will open in a new tab for you to add.</p>
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Export All',
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
  let exported = 0;
  
  sorted.forEach((shift, idx) => {
    setTimeout(() => {
      const title = encodeURIComponent(`${shift.team || 'Work'} Shift`);
      const date = (shift.date || new Date().toISOString().split('T')[0]).replace(/-/g, '');
      
      // Parse shift times
      let startHour = 9, endHour = 17;
      if (shift.start) startHour = Math.floor(parseFloat(shift.start));
      if (shift.end) endHour = Math.floor(parseFloat(shift.end));
      
      const startDT = `${date}T${String(startHour).padStart(2, '0')}0000`;
      const endDT = `${date}T${String(endHour).padStart(2, '0')}0000`;
      const details = encodeURIComponent(shift.notes || 'Scheduled shift');
      
      const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDT}/${endDT}&details=${details}&ctz=America/Los_Angeles`;
      
      window.open(gcalUrl, '_blank');
      exported++;
      
      if (exported === sorted.length) {
        toast(`✅ Opened ${exported} shift(s) for calendar export`, 'success');
      }
    }, idx * 600); // Stagger to avoid popup blocker
  });
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
                 console.error("Bridge Error (System Data):", e);
                 const fallback = ["Adam", "Baylie", "Brandi", "Elizabeth", "Gisenia", "Kelsey"];
                 if(this._success) this._success({ people: fallback, teams: [], timeOff: [] });
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

    // Refresh metadata to get the new agent in _people list
    await loadSystemData();
    
    // If we're in Master Schedule view, refresh it
    const masterView = document.getElementById("masterView");
    if (masterView && masterView.style.display !== "none") {
      renderMasterView(_masterRawData || {});
    }
    
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
    
    let tableHtml = `
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
    
    agents.sort((a, b) => (a.name || a.docId).localeCompare(b.name || b.docId)).forEach(agent => {
      const isActive = agent.active !== false;
      const role = agent.role || 'agent';
      const roleColor = role === 'admin' ? '#7c3aed' : '#64748b';
      const statusColor = isActive ? '#16a34a' : '#ef4444';
      
      tableHtml += `
        <tr style="border-bottom:1px solid var(--border-color, #e2e8f0);">
          <td style="padding:10px; font-weight:600; color:var(--text-primary, #0f172a);">${agent.name || agent.docId}</td>
          <td style="padding:10px; color:var(--text-secondary, #64748b); font-size:12px;">${agent.email || '-'}</td>
          <td style="padding:10px; text-align:center;">
            <span style="background:${roleColor}20; color:${roleColor}; padding:2px 8px; border-radius:10px; font-size:11px; font-weight:600; text-transform:uppercase;">${role}</span>
          </td>
          <td style="padding:10px; text-align:center;">
            <span style="color:${statusColor}; font-size:11px; font-weight:600;">${isActive ? '● Active' : '○ Inactive'}</span>
          </td>
          <td style="padding:10px; text-align:center;">
            <button onclick="editAgentModal('${agent.docId}')" style="background:#b37e78; color:white; border:none; padding:4px 10px; border-radius:6px; font-size:11px; cursor:pointer; font-weight:600;">Edit</button>
          </td>
        </tr>
      `;
    });
    
    tableHtml += `</tbody></table></div>`;
    
    Swal.fire({
      title: "👥 Manage Agents",
      html: tableHtml,
      width: 700,
      showConfirmButton: false,
      showCloseButton: true,
      footer: '<button onclick="Swal.close(); openAddAgentModal();" style="background:#16a34a; color:white; border:none; padding:10px 20px; border-radius:8px; font-weight:600; cursor:pointer;">+ Add New Agent</button>'
    });
  } catch (e) {
    console.error(e);
    Swal.fire({ icon:"error", title:"Load failed", text:e.message, confirmButtonColor:"#ef4444" });
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
    
    await loadSystemData();
    
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
        .sort((a, b) => parseTimeDecimal(a.start) - parseTimeDecimal(b.start));

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
  const roleDisplay = it.role 
    ? `<span style="font-size:9px; background:#e0e7ff; color:#4c51bf; padding:2px 6px; border-radius:4px; font-weight:700; margin-left: 4px;">${it.role}</span>` 
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
            // ✅ Sort shifts by start time
            shifts.sort((a, b) => {
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
        👥 Manage Agents
      </button>
      <button id="btnMasterAddAgent"
        onclick="openAddAgentModal()"
        style="padding:8px 10px; border-radius:8px; border:1px solid #D8636B; background:#D8636B; color:black; cursor:pointer; font-weight:700;">
        ➕ Add Agent
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
  
  // 3. Render Sections
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
    // Sort shifts
    teamShifts.sort((a, b) => (a.start || "").localeCompare(b.start || ""));
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
    
    teamShifts.forEach(shift => {
  const notesStr = String(shift.notes || "");
  const isOff = notesStr.toLowerCase().includes("[off]");
  const isOpen = String(shift.person || "").trim().toUpperCase() === "OPEN"
             || notesStr.toUpperCase().includes("[OPEN]");

  const displayName = isOpen ? "Open" : (shift.person || "");
  const displayRole = isOpen ? "Open Shift" : (shift.role || "");

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

  // Initialize CSAT follow-ups if absent
  if (!data.csatFollowups) {
    data.csatFollowups = [];
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
        <div class="empty-state-text">Add follow-up entries when agents receive low satisfaction ratings (1–3 stars).</div>
      </div>`;
    return;
  }

  let html = '';
  if (filtered.length === 0) {
    html = `<div style="text-align:center; padding:24px; color:var(--text-secondary); font-size:13px;">No follow-ups match this filter.</div>`;
  }

  filtered.forEach((fu, i) => {
    const originalIndex = followups.indexOf(fu);
    const ratingStars = '⭐'.repeat(parseInt(fu.rating) || 1);
    const dateStr = fu.dateReceived ? new Date(fu.dateReceived + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    const methodIcons = { email: '📧', chat: '💬', phone: '📞' };

    html += `
      <div class="csat-followup-card ${fu.followUpCompleted ? 'completed' : 'pending'}" onclick="openCsatFollowupEditor(${originalIndex})">
        <div class="csat-followup-rating">${ratingStars}</div>
        <div class="csat-followup-body">
          <div class="csat-followup-title">Ticket ${formatTicketLink(fu.ticketNumber)} · ${escapeHtml(fu.channel || '—')}</div>
          <div class="csat-followup-subtitle">
            ${dateStr ? `<span>📅 ${dateStr}</span>` : ''}
            ${fu.issueSummary ? `<span>${escapeHtml(fu.issueSummary.substring(0, 60))}${fu.issueSummary.length > 60 ? '...' : ''}</span>` : ''}
          </div>
        </div>
        <div class="csat-followup-actions">
          ${fu.followUpCompleted
            ? `<span class="status-pill completed">${methodIcons[fu.followUpMethod] || '✅'} Completed</span>`
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
  const deleteBtn = document.getElementById('csatEditorDeleteBtn');

  if (index !== null && _currentGoalsData?.csatFollowups?.[index]) {
    const fu = _currentGoalsData.csatFollowups[index];
    document.getElementById('csatEditorId').value = fu.id || '';
    document.getElementById('csatEditorDate').value = fu.dateReceived || '';
    document.getElementById('csatEditorTicket').value = fu.ticketNumber || '';
    document.getElementById('csatEditorChannel').value = fu.channel || '';
    document.getElementById('csatEditorRating').value = fu.rating || '';
    document.getElementById('csatEditorSummary').value = fu.issueSummary || '';
    document.getElementById('csatEditorMethod').value = fu.followUpMethod || '';
    document.getElementById('csatEditorCompleted').checked = !!fu.followUpCompleted;
    document.getElementById('csatEditorCompletedAt').value = fu.followUpCompletedAt || '';
    document.getElementById('csatEditorCompletedAt').style.display = fu.followUpCompleted ? 'block' : 'none';
    document.getElementById('csatEditorNotes').value = fu.notes || '';
    deleteBtn.style.display = 'inline-flex';
  } else {
    document.getElementById('csatEditorId').value = '';
    document.getElementById('csatEditorDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('csatEditorTicket').value = '';
    document.getElementById('csatEditorChannel').value = '';
    document.getElementById('csatEditorRating').value = '';
    document.getElementById('csatEditorSummary').value = '';
    document.getElementById('csatEditorMethod').value = '';
    document.getElementById('csatEditorCompleted').checked = false;
    document.getElementById('csatEditorCompletedAt').value = '';
    document.getElementById('csatEditorCompletedAt').style.display = 'none';
    document.getElementById('csatEditorNotes').value = '';
    deleteBtn.style.display = 'none';
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
    rating: document.getElementById('csatEditorRating').value || '',
    issueSummary: document.getElementById('csatEditorSummary').value || '',
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
      html += `<div class="agent-goals-section"><div class="agent-goals-section-title">⚠️ Low CSAT Follow-ups ${pending.length > 0 ? `<span style="color:#ef4444; font-size:12px; font-weight:600; margin-left:8px;">(${pending.length} pending)</span>` : ''}</div>`;
      csatFollowups.forEach(fu => {
        const ratingStars = '⭐'.repeat(parseInt(fu.rating) || 1);
        const num = (fu.ticketNumber || '').toString().replace(/[^0-9]/g, '');
        html += `<div class="agent-goal-item" style="border-left: 3px solid ${fu.followUpCompleted ? '#22c55e' : '#ef4444'};">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span>${ratingStars}</span>
              <strong>${num ? `<a href="${ZENDESK_BASE_URL}${num}" target="_blank" class="ticket-link">Ticket #${num}</a>` : 'Ticket ' + escapeHtml(fu.ticketNumber || '—')}</strong>
              <span style="font-size:11px; color:var(--text-tertiary);">· ${escapeHtml(fu.channel || '')}</span>
            </div>
            <span class="status-pill ${fu.followUpCompleted ? 'complete' : 'pending'}">${fu.followUpCompleted ? '✅ Resolved' : '⏳ Pending'}</span>
          </div>
          ${fu.issueSummary ? `<div style="font-size:12px; color:var(--text-secondary); margin-bottom:4px;">${escapeHtml(fu.issueSummary)}</div>` : ''}
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
    
    container.innerHTML = sorted.map(csat => {
      const isPending = !csat.followUpCompleted;
      const ticketDate = csat.ticketDate ? new Date(csat.ticketDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '--';
      const rating = csat.rating || csat.csatScore || 'Bad';
      
      return `
        <div style="
          padding: 14px;
          background: ${isPending ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' : 'var(--bg-tertiary)'};
          border: 1px solid ${isPending ? '#fca5a5' : 'var(--border-color)'};
          border-radius: 10px;
          margin-bottom: 10px;
        ">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                <span style="font-size: 16px;">${isPending ? '⚠️' : '✅'}</span>
                <span style="font-weight: 700; font-size: 13px; color: ${isPending ? '#dc2626' : 'var(--text-primary)'};">
                  Ticket #${csat.ticketId || 'Unknown'}
                </span>
                <span style="
                  padding: 2px 8px;
                  border-radius: 4px;
                  font-size: 11px;
                  font-weight: 600;
                  background: ${isPending ? '#fecaca' : '#dcfce7'};
                  color: ${isPending ? '#991b1b' : '#166534'};
                ">${isPending ? 'PENDING' : 'COMPLETED'}</span>
              </div>
              <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 4px;">
                📅 ${ticketDate} • Rating: <span style="color: #dc2626; font-weight: 600;">${rating}</span>
              </div>
              ${csat.reason ? `<div style="font-size: 12px; color: var(--text-tertiary); margin-top: 4px;">💬 ${escapeHtml(csat.reason)}</div>` : ''}
              ${csat.followUpNotes ? `<div style="font-size: 12px; color: var(--text-secondary); margin-top: 6px; padding: 8px; background: var(--bg-secondary); border-radius: 6px;">📝 ${escapeHtml(csat.followUpNotes)}</div>` : ''}
            </div>
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
