(function() {
      try {
        var raw = localStorage.getItem('musely_auth_session');
        if (raw) {
          var data = JSON.parse(raw);
          var age = Date.now() - (data.lastActivity || data.timestamp || 0);
          var TTL = 8 * 60 * 60 * 1000; // 8 hours
          if (data.email && data.name && age < TTL) {
            // Valid session exists - set flag for CSS to use
            document.documentElement.setAttribute('data-authenticated', 'true');
            window._hasValidSession = true;
          }
        }
      } catch(e) { console.warn('Early session check failed:', e); }
    })();
  

// Apply auth-pending class only if no valid session was found in early check
(function() {
  function applyAuthPending() {
    if (!window._hasValidSession && document.body) {
      document.body.classList.add('auth-pending');
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAuthPending);
  } else {
    applyAuthPending();
  }
})();
