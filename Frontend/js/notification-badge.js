(function () {
  try {
    if (!window.__checkRejectedLoaderAdded) {
      window.__checkRejectedLoaderAdded = true;
      (function () {
        var s = document.createElement('script');
        s.src = '/Frontend/js/check-rejected.js';
        s.async = false;
        s.defer = false;
        s.onload = function () { console.debug('check-rejected.js loaded'); };
        document.head.appendChild(s);
      })();
    }
  } catch (e) { console.debug('checkRejected loader error', e); }

  // Notification badge helper: update navbar badge and per-tab badges (general / for-you)
  async function getJsonSafe(res) {
    try { return await res.json(); } catch (e) { return null; }
  }

  function getToken() { return localStorage.getItem('token') || sessionStorage.getItem('token') || null; }

  async function fetchCurrentUser(token) {
    if (!token) return null;
    try {
      const res = await fetch('http://localhost:5000/api/users/me', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return null;
      const data = await getJsonSafe(res);
      return data && (data.user || data.userData || data) || null;
    } catch (err) { console.error('fetchCurrentUser error', err); return null; }
  }

  function extractAnnouncementsFromResponse(data) {
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data.announcements)) return data.announcements;
    if (Array.isArray(data.data)) return data.data;
    for (const k of ['items','results']) if (Array.isArray(data[k])) return data[k];
    return [];
  }

  function isViewedByUser(announcement, userId) {
    if (!announcement) return false;
    const viewedBy = announcement.viewedBy || [];
    if (!Array.isArray(viewedBy)) return false;
    return viewedBy.map(String).includes(String(userId));
  }

  function countUnread(list, userId, now) {
    let count = 0;
    (list||[]).forEach(a => {
      const isActive = (a.isActive === undefined) ? true : Boolean(a.isActive);
      if (!isActive) return;
      if (a.expiresAt) { const exp = Date.parse(a.expiresAt); if (!isNaN(exp) && exp < now) return; }
      if (!userId) count++; else if (!isViewedByUser(a, userId)) count++;
    });
    return count;
  }

  function setBadgeElement(el, value, opts={}){
    if (!el) return;
    if (!value || value === 0) { el.style.display = 'none'; el.textContent = ''; return; }
    el.textContent = value > 99 ? '99+' : String(value);
    if (opts.display) el.style.display = opts.display; else el.style.display = 'inline-block';
  }

  async function updateBadgeOnce(){
    const token = getToken();
    const navbarBadges = Array.from(document.querySelectorAll('.notif-badge'));
    const tabBadges = Array.from(document.querySelectorAll('.tab-notif-badge'));
    if (navbarBadges.length === 0 && tabBadges.length === 0) return;
    if (!token) { navbarBadges.forEach(el=>setBadgeElement(el,0)); tabBadges.forEach(el=>setBadgeElement(el,0)); return; }
    // Prefer counting unread announcements from the rendered DOM (table rows or cards).
    // Allocate counts to the active tab category so reading an item in "Overdue/Expired"
    // decreases the expired count (not the general count).
    let domGeneral = 0, domPersonal = 0, domExpired = 0;
    try {
      const activeTabBtn = document.querySelector('.tab-btn.active');
      const activeTab = activeTabBtn ? activeTabBtn.dataset.tab : null; // 'general', 'foryou', 'expired'

      // Table rows and cards that are currently visible on the page will reflect the active tab.
      const tableUnread = document.querySelectorAll('.announcement-table tbody tr.announcement-notread');
      const cardUnread = document.querySelectorAll('.announcement-cards .announcement-card.announcement-notread');
      const visibleUnreadCount = (tableUnread ? tableUnread.length : 0) + (cardUnread ? cardUnread.length : 0);

      if (activeTab === 'foryou' || activeTab === 'personal') {
        domPersonal = visibleUnreadCount;
      } else if (activeTab === 'expired' || activeTab === 'overdue') {
        domExpired = visibleUnreadCount;
      } else {
        // default to general
        domGeneral = visibleUnreadCount;
      }
    } catch (e) {
      console.warn('DOM-based badge count failed', e);
    }

    // If we found any DOM-based announcements, use them. Otherwise, fall back to fetching.
    if (domGeneral > 0 || domPersonal > 0 || domExpired > 0) {
      // Bell/navbar badge should only count General + Personal (for-you), not Expired/Overdue
      const navbarTotal = domGeneral + domPersonal;
      navbarBadges.forEach(el => setBadgeElement(el, navbarTotal, { display: 'flex' }));
      ['badge-general','notif-general'].forEach(id => setBadgeElement(document.getElementById(id), domGeneral, { display: 'inline-block' }));
      ['badge-foryou','notif-foryou'].forEach(id => setBadgeElement(document.getElementById(id), domPersonal, { display: 'inline-block' }));
      // If there are any tab badge elements that indicate expired/overdue, try common ids
      ['badge-expired','notif-expired','badge-overdue','notif-overdue'].forEach(id => setBadgeElement(document.getElementById(id), domExpired, { display: 'inline-block' }));

      // fallback for other tab-badges based on data-tab
      tabBadges.forEach(el => {
        if (!el.id || !['badge-general','notif-general','badge-foryou','notif-foryou','badge-expired','notif-expired','badge-overdue','notif-overdue'].includes(el.id)){
          const parent = el.closest('[data-tab]');
          const tabName = parent ? parent.getAttribute('data-tab') : null;
          if (tabName === 'general') setBadgeElement(el, domGeneral, { display: 'inline-block' });
          else if (tabName === 'foryou' || tabName === 'personal') setBadgeElement(el, domPersonal, { display: 'inline-block' });
          else if (tabName === 'expired' || tabName === 'overdue') setBadgeElement(el, domExpired, { display: 'inline-block' });
          else setBadgeElement(el, (domGeneral+domPersonal+domExpired), { display: 'inline-block' });
        }
      });
      return;
    }

    // No DOM announcements found: fallback to previous network-based computation
    const user = await fetchCurrentUser(token);
    const userId = user && (user._id || user.id) ? (user._id || user.id) : null;
    let generalList=[], personalList=[];
    try {
      const [gRes,pRes] = await Promise.all([
        fetch('http://localhost:5000/api/announcements', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('http://localhost:5000/api/announcements/myannouncements', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const gData = await getJsonSafe(gRes); const pData = await getJsonSafe(pRes);
      generalList = extractAnnouncementsFromResponse(gData).filter(a => (a.recipient == null || a.recipient === undefined));
      personalList = extractAnnouncementsFromResponse(pData);
    } catch (err) { console.warn('Failed to fetch announcements for badge', err); }

    const now = Date.now();
    const unreadGeneral = countUnread(generalList, userId, now);
    const unreadPersonal = countUnread(personalList, userId, now);
    const totalUnread = unreadGeneral + unreadPersonal;

    navbarBadges.forEach(el => setBadgeElement(el, totalUnread, { display: 'flex' }));

    // update specific tab ids if present
    ['badge-general','notif-general'].forEach(id => setBadgeElement(document.getElementById(id), unreadGeneral, { display: 'inline-block' }));
    ['badge-foryou','notif-foryou'].forEach(id => setBadgeElement(document.getElementById(id), unreadPersonal, { display: 'inline-block' }));

    // fallback: update any remaining .tab-notif-badge elements
    tabBadges.forEach(el => {
      if (!el.id || !['badge-general','notif-general','badge-foryou','notif-foryou'].includes(el.id)){
        const parent = el.closest('[data-tab]');
        const tabName = parent ? parent.getAttribute('data-tab') : null;
        if (tabName === 'general') setBadgeElement(el, unreadGeneral, { display: 'inline-block' });
        else if (tabName === 'foryou' || tabName === 'personal') setBadgeElement(el, unreadPersonal, { display: 'inline-block' });
        else setBadgeElement(el, totalUnread, { display: 'inline-block' });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => { updateBadgeOnce(); setInterval(updateBadgeOnce, 60*1000); window.addEventListener('focus', updateBadgeOnce); });
  window.updateNotificationBadge = updateBadgeOnce;

})();