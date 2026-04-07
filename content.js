// X Unfollow Pro – Content Script (Free Edition – All Features Unlocked)
// Injected on x.com / twitter.com

(function () {
  'use strict';

  // Prevent double injection
  if (document.getElementById('xup-floating-btn')) return;

  // ===== State =====
  let state = {
    unfollowCount: 0,
    whitelist: [],
    accounts: [],          // all accumulated accounts
    filteredAccounts: [],
    searchQuery: '',
    filterInactive: false,
    filterNonFollowers: false,
    filterNoAvatar: false,
    filterNoBio: false,
    isOpen: false,
    isLoading: false,
    isScanning: false,
    isDeepScanning: false,
    scanProgress: 0
  };

  // ===== Icon SVGs =====
  const ICONS = {
    x: `<svg viewBox="0 0 24 24" fill="currentColor" class="xup-btn-icon"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`,
    search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="xup-search-icon"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`,
    shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    close: '✕'
  };

  // ===== Create floating button =====
  function createFloatingButton() {
    const btn = document.createElement('button');
    btn.id = 'xup-floating-btn';
    btn.innerHTML = `${ICONS.x} Open X Unfollow Pro`;
    btn.addEventListener('click', togglePanel);
    document.body.appendChild(btn);
  }

  // ===== Create panel =====
  function createPanel() {
    const overlay = document.createElement('div');
    overlay.id = 'xup-panel-overlay';
    overlay.addEventListener('click', togglePanel);
    document.body.appendChild(overlay);

    const panel = document.createElement('div');
    panel.id = 'xup-panel';
    panel.innerHTML = `
      <div class="xup-panel-header">
        <div class="xup-panel-title">
          <img src="${chrome.runtime.getURL('icons/icon48.png')}" class="xup-logo-icon" alt="">
          <h2>X Unfollow Pro</h2>
        </div>
        <button class="xup-close-btn" id="xup-close">${ICONS.close}</button>
      </div>

      <div class="xup-status-bar">
        <div class="xup-plan-info">
          <span class="xup-plan-dot"></span>
          <span class="xup-plan-label" id="xup-plan-label">All Features Unlocked</span>
        </div>
        <span class="xup-unfollow-counter" id="xup-counter">0 unfollows</span>
      </div>

      <div class="xup-controls">
        <div class="xup-search-box">
          ${ICONS.search}
          <input type="text" id="xup-search" placeholder="Search by name, username, or bio...">
        </div>
        <div class="xup-filter-row">
          <button class="xup-filter-btn" id="xup-filter-nonfollowers">
            Non-followers
          </button>
          <button class="xup-filter-btn" id="xup-filter-inactive">
            Inactive 30d+
          </button>
          <button class="xup-filter-btn" id="xup-filter-noavatar">
            No Profile Pic
          </button>
          <button class="xup-filter-btn" id="xup-filter-nobio">
            No Bio
          </button>
        </div>
        <div style="margin-top:8px;">
          <button class="xup-filter-btn" id="xup-deep-scan" style="width:100%;justify-content:center;padding:8px 12px;background:rgba(255,122,0,0.08);border-color:rgba(255,122,0,0.2);color:#ff7a00;">
            🔍 Deep Scan (fetch last post dates & follower counts)
          </button>
        </div>
      </div>

      <div class="xup-bulk-bar">
        <span class="xup-bulk-info"><strong id="xup-shown-count">0</strong> accounts shown</span>
        <button class="xup-bulk-btn" id="xup-bulk-unfollow" disabled>
          Bulk Unfollow All
        </button>
      </div>

      <div class="xup-account-list" id="xup-account-list">
        <div class="xup-empty">
          <div class="xup-empty-icon">📋</div>
          <div class="xup-empty-text">Navigate to your Following page to scan accounts</div>
          <button class="xup-navigate-btn" id="xup-navigate">Go to Following Page →</button>
        </div>
      </div>

      <div class="xup-panel-footer">
        <a href="https://github.com" target="_blank">Free & Open Source</a>
      </div>
    `;
    document.body.appendChild(panel);

    // Event listeners
    document.getElementById('xup-close').addEventListener('click', togglePanel);
    document.getElementById('xup-search').addEventListener('input', handleSearch);
    document.getElementById('xup-filter-nonfollowers').addEventListener('click', () => toggleFilter('nonfollowers'));
    document.getElementById('xup-filter-inactive').addEventListener('click', () => toggleFilter('inactive'));
    document.getElementById('xup-filter-noavatar').addEventListener('click', () => toggleFilter('noavatar'));
    document.getElementById('xup-filter-nobio').addEventListener('click', () => toggleFilter('nobio'));
    document.getElementById('xup-deep-scan').addEventListener('click', deepScanAccounts);
    document.getElementById('xup-bulk-unfollow').addEventListener('click', handleBulkUnfollow);
    document.getElementById('xup-navigate').addEventListener('click', () => {
      window.location.href = '/following';
    });
  }

  // ===== Toggle panel =====
  function togglePanel() {
    state.isOpen = !state.isOpen;
    const panel = document.getElementById('xup-panel');
    const overlay = document.getElementById('xup-panel-overlay');
    const btn = document.getElementById('xup-floating-btn');

    if (state.isOpen) {
      panel.classList.add('xup-open');
      overlay.classList.add('xup-visible');
      btn.style.display = 'none';
      loadState();
      if (isFollowingPage()) {
        scanAccountsWithScroll();
      }
    } else {
      panel.classList.remove('xup-open');
      overlay.classList.remove('xup-visible');
      btn.style.display = 'flex';
      state.isScanning = false;
    }
  }

  // ===== Load state from background =====
  function loadState() {
    chrome.runtime.sendMessage({ type: 'GET_STATE' }, (data) => {
      if (!data) return;
      state.unfollowCount = data.unfollowCount || 0;
      state.whitelist = data.whitelist || [];
      updateStatusBar();
    });
  }

  // ===== Update status bar =====
  function updateStatusBar() {
    const counter = document.getElementById('xup-counter');
    counter.textContent = `${state.unfollowCount} unfollows`;
  }

  // ===== Check if on following page =====
  function isFollowingPage() {
    return window.location.pathname.includes('/following');
  }

  // ===== MAIN FIX: Auto-scroll to accumulate ALL accounts =====
  async function scanAccountsWithScroll() {
    if (state.isScanning) return;
    state.isScanning = true;
    state.accounts = [];

    const listEl = document.getElementById('xup-account-list');
    listEl.innerHTML = `
      <div class="xup-loading">
        <div class="xup-spinner"></div>
        <span class="xup-loading-text" id="xup-scan-status">Scanning... found 0 accounts</span>
        <button class="xup-navigate-btn" id="xup-stop-scan" style="margin-top:10px;background:rgba(229,57,53,0.2);color:#ff5252;border:1px solid rgba(229,57,53,0.3);">Stop Scanning</button>
      </div>
    `;

    document.getElementById('xup-stop-scan').addEventListener('click', () => {
      state.isScanning = false;
    });

    const seenUsernames = new Set();
    let noNewCount = 0;
    const maxNoNew = 5; // Stop after 5 scrolls with no new accounts

    // Initial wait for page to settle
    await sleep(1500);

    // Scrape what's currently visible first
    scrapeVisibleAccounts(seenUsernames);
    updateScanStatus();

    // Get the scrollable container — X uses the main timeline column
    const scrollContainer = document.scrollingElement || document.documentElement;

    while (state.isScanning && noNewCount < maxNoNew) {
      // Scroll down
      const previousCount = seenUsernames.size;
      scrollContainer.scrollTop += window.innerHeight * 0.8;

      // Wait for X to render new cells
      await sleep(1200);

      // Scrape newly visible accounts
      scrapeVisibleAccounts(seenUsernames);
      updateScanStatus();

      if (seenUsernames.size === previousCount) {
        noNewCount++;
      } else {
        noNewCount = 0;
      }
    }

    state.isScanning = false;
    state.filteredAccounts = [...state.accounts];

    // Scroll back to top
    scrollContainer.scrollTop = 0;

    renderAccounts();
  }

  // ===== Scrape currently visible accounts from DOM =====
  function scrapeVisibleAccounts(seenUsernames) {
    const cells = document.querySelectorAll('[data-testid="cellInnerDiv"]');

    cells.forEach((cell) => {
      try {
        // Find the user link — look for profile links
        const allLinks = cell.querySelectorAll('a[role="link"]');
        let username = '';
        let profileLink = null;

        for (const link of allLinks) {
          const href = link.getAttribute('href') || '';
          // Match single-level paths like /username (not /i/... or /settings/...)
          if (href.match(/^\/[a-zA-Z0-9_]{1,15}$/) && !href.startsWith('/i/')) {
            username = href.substring(1);
            profileLink = link;
            break;
          }
        }

        if (!username || seenUsernames.has(username)) return;
        seenUsernames.add(username);

        // Extract display name
        let name = username;
        const nameSpans = cell.querySelectorAll('span');
        for (const span of nameSpans) {
          const text = span.textContent.trim();
          // Display name is usually the first non-empty span that isn't the @handle
          if (text && !text.startsWith('@') && text !== 'Follows you' && text.length > 0 && text.length < 50) {
            // Check if this span is inside a link to the user's profile
            const parentLink = span.closest('a[role="link"]');
            if (parentLink) {
              const parentHref = (parentLink.getAttribute('href') || '').toLowerCase();
              if (parentHref === `/${username.toLowerCase()}`) {
                name = text;
                break;
              }
            }
          }
        }

        // Extract avatar
        const avatarEl = cell.querySelector('img[src*="twimg.com"]');
        const avatar = avatarEl ? avatarEl.src : '';
        const hasDefaultAvatar = !avatar || avatar.includes('default_profile');

        // Extract bio — get text from description-like elements
        let bio = '';
        const textDivs = cell.querySelectorAll('[dir="auto"]');
        for (const div of textDivs) {
          const text = div.textContent.trim();
          if (!text) continue;
          if (text === name) continue;
          if (text.toLowerCase() === `@${username.toLowerCase()}`) continue;
          if (text === 'Follows you') continue;
          if (['Follow', 'Following', 'Unfollow'].includes(text)) continue;
          if (text.toLowerCase().includes('followed by ')) continue;
          if (text.toLowerCase().startsWith('follows ')) continue;
          
          bio = text;
          break;
        }

        // Check if "Follows you" badge is present
        const cellText = cell.textContent;
        const followsYou = cellText.includes('Follows you');

        // Find the Following/Unfollow button in this cell
        const followBtn = findFollowingButton(cell);

        state.accounts.push({
          username,
          name,
          avatar,
          bio,
          hasDefaultAvatar,
          followsYou,
          domCell: cell,
          followButton: followBtn,
          isUnfollowed: false,
          isWhitelisted: state.whitelist.includes(username)
        });
      } catch (e) {
        // Skip problematic cells
      }
    });
  }

  // ===== Update scan progress =====
  function updateScanStatus() {
    const statusEl = document.getElementById('xup-scan-status');
    if (statusEl) {
      statusEl.textContent = `Scanning... found ${state.accounts.length} accounts`;
    }
  }

  // ===== Render account list =====
  function renderAccounts() {
    const listEl = document.getElementById('xup-account-list');
    const countEl = document.getElementById('xup-shown-count');
    const bulkBtn = document.getElementById('xup-bulk-unfollow');

    if (state.filteredAccounts.length === 0) {
      if (!isFollowingPage()) {
        listEl.innerHTML = `
          <div class="xup-empty">
            <div class="xup-empty-icon">📋</div>
            <div class="xup-empty-text">Navigate to your Following page to scan accounts</div>
            <button class="xup-navigate-btn" onclick="window.location.href='/following'">Go to Following Page →</button>
          </div>
        `;
      } else if (state.filterInactive && state.accounts.some(a => !a.deepScanned)) {
        listEl.innerHTML = `
          <div class="xup-empty">
            <div class="xup-empty-icon">🔍</div>
            <div class="xup-empty-text" style="color: #ffb74d;">You need to run a "Deep Scan" first to find Inactive accounts.</div>
            <button class="xup-navigate-btn" id="xup-trigger-scan" style="margin-top: 10px;">Run Deep Scan Now</button>
          </div>
        `;
        setTimeout(() => {
          const btn = document.getElementById('xup-trigger-scan');
          if (btn) btn.addEventListener('click', deepScanAccounts);
        }, 0);
      } else {
        listEl.innerHTML = `
          <div class="xup-empty">
            <div class="xup-empty-icon">🔍</div>
            <div class="xup-empty-text">No accounts match your filters.<br>Try adjusting your search or filters.</div>
          </div>
        `;
      }
      countEl.textContent = '0';
      bulkBtn.disabled = true;
      return;
    }

    countEl.textContent = state.filteredAccounts.length;
    const unfollowable = state.filteredAccounts.filter(a => !a.isUnfollowed && !a.isWhitelisted);
    bulkBtn.disabled = unfollowable.length === 0;

    // Add a re-scan button at the top
    let html = `
      <div style="padding:8px 20px;text-align:center;">
        <button class="xup-navigate-btn" id="xup-rescan" style="padding:8px 16px;font-size:12px;">
          🔄 Re-scan (found ${state.accounts.length} total)
        </button>
      </div>
    `;

    html += state.filteredAccounts.map(account => {
      // Build metadata line (shows after deep scan)
      let metaLine = '';
      if (account.deepScanned) {
        const parts = [];
        parts.push(`${formatCount(account.followersCount)} followers`);
        parts.push(`${formatCount(account.statusesCount)} tweets`);
        if (account.lastTweetDate) {
          const days = Math.floor((Date.now() - new Date(account.lastTweetDate).getTime()) / (1000*60*60*24));
          const color = days > 30 ? '#ff5252' : days > 7 ? '#ffb74d' : '#4caf50';
          parts.push(`<span style="color:${color}">last active ${days}d ago</span>`);
        } else {
          parts.push('<span style="color:#ff5252">no tweets</span>');
        }
        metaLine = `<div style="font-size:10px;color:#6b7280;margin-top:2px;">${parts.join(' · ')}</div>`;
      }

      return `
      <div class="xup-account-item" data-username="${account.username}">
        <img class="xup-account-avatar" src="${account.avatar || generateAvatarSvg(account.name)}" alt="${escapeHtml(account.name)}" onerror="this.src='${generateAvatarSvg(account.name)}'">
        <div class="xup-account-info">
          <div class="xup-account-name">${escapeHtml(account.name)}</div>
          <div class="xup-account-handle">
            @${escapeHtml(account.username)}
            ${account.followsYou ? '<span style="margin-left:6px;padding:1px 6px;background:rgba(255,255,255,0.08);border-radius:4px;font-size:10px;color:#8892a4;">Follows you</span>' : '<span style="margin-left:6px;padding:1px 6px;background:rgba(229,57,53,0.12);border-radius:4px;font-size:10px;color:#ff5252;">Doesn\'t follow you</span>'}
          </div>
          ${account.bio ? `<div class="xup-account-bio">${escapeHtml(account.bio.substring(0, 100))}</div>` : '<div class="xup-account-bio" style="color:#555;">No bio</div>'}
          ${metaLine}
        </div>
        <div class="xup-account-actions">
          <button class="xup-whitelist-btn ${account.isWhitelisted ? 'xup-whitelisted' : ''}" data-username="${account.username}" title="${account.isWhitelisted ? 'Remove from whitelist' : 'Add to whitelist'}">
            ${ICONS.shield}
          </button>
          <button class="xup-unfollow-btn ${account.isUnfollowed ? 'xup-unfollowed' : ''}" data-username="${account.username}" ${account.isUnfollowed || account.isWhitelisted ? 'disabled' : ''}>
            ${account.isUnfollowed ? 'Unfollowed' : 'Unfollow'}
          </button>
        </div>
      </div>
    `;
    }).join('');

    listEl.innerHTML = html;

    // Re-scan button
    const rescanBtn = document.getElementById('xup-rescan');
    if (rescanBtn) {
      rescanBtn.addEventListener('click', () => scanAccountsWithScroll());
    }

    // Attach event listeners
    listEl.querySelectorAll('.xup-unfollow-btn').forEach(btn => {
      btn.addEventListener('click', () => handleUnfollow(btn.dataset.username));
    });

    listEl.querySelectorAll('.xup-whitelist-btn').forEach(btn => {
      btn.addEventListener('click', () => handleWhitelist(btn.dataset.username));
    });
  }

  // ===== Generate simple SVG avatar =====
  function generateAvatarSvg(name) {
    // Only use basic ASCII letters/digits to avoid URI encoding issues with emojis/unicode
    let letter = '?';
    if (name) {
      for (const ch of name) {
        if (/[A-Za-z0-9]/.test(ch)) {
          letter = ch.toUpperCase();
          break;
        }
      }
    }
    try {
      return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#333"/><text x="50" y="58" text-anchor="middle" fill="#888" font-size="40" font-family="sans-serif">${letter}</text></svg>`)}`;
    } catch (e) {
      return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="#333"/><text x="50" y="58" text-anchor="middle" fill="#888" font-size="40" font-family="sans-serif">?</text></svg>`)}`;
    }
  }

  // ===== Handle search =====
  function handleSearch(e) {
    state.searchQuery = e.target.value.toLowerCase();
    applyFilters();
  }

  // ===== Toggle filter =====
  function toggleFilter(type) {
    const btn = document.getElementById(`xup-filter-${type}`);
    switch (type) {
      case 'nonfollowers':
        state.filterNonFollowers = !state.filterNonFollowers;
        break;
      case 'inactive':
        state.filterInactive = !state.filterInactive;
        break;
      case 'noavatar':
        state.filterNoAvatar = !state.filterNoAvatar;
        break;
      case 'nobio':
        state.filterNoBio = !state.filterNoBio;
        break;
    }
    btn.classList.toggle('xup-active');
    applyFilters();
  }

  // ===== Apply filters =====
  function applyFilters() {
    state.filteredAccounts = state.accounts.filter(account => {
      // Search filter
      if (state.searchQuery) {
        const q = state.searchQuery;
        const matchesSearch =
          account.name.toLowerCase().includes(q) ||
          account.username.toLowerCase().includes(q) ||
          (account.bio && account.bio.toLowerCase().includes(q));
        if (!matchesSearch) return false;
      }

      // Non-followers filter: only show accounts that DON'T follow you
      if (state.filterNonFollowers) {
        if (account.followsYou) return false;
      }

      // Inactive filter: only show accounts inactive 30+ days
      if (state.filterInactive) {
        if (!account.deepScanned) return false; // If not deep scanned, hide them and prompt user
        if (!account.lastTweetDate) return true; // Keep accounts with 0 tweets as inactive
        const daysSince = (Date.now() - new Date(account.lastTweetDate).getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince < 30) return false;
      }

      // No avatar filter: only show accounts with default/no profile pic
      if (state.filterNoAvatar) {
        if (!account.hasDefaultAvatar) return false;
      }

      // No bio filter: only show accounts with no bio
      if (state.filterNoBio) {
        if (account.bio && account.bio.length > 0) return false;
      }

      return true;
    });

    renderAccounts();
  }

  // ===== Deep Scan: fetch profile data for each account =====
  async function deepScanAccounts() {
    if (state.isDeepScanning) {
      state.isDeepScanning = false;
      return;
    }
    if (state.accounts.length === 0) return;

    state.isDeepScanning = true;
    const deepBtn = document.getElementById('xup-deep-scan');
    const total = state.accounts.length;
    let scanned = 0;

    // Get CSRF token from cookies
    const csrfToken = getCsrfToken();

    for (const account of state.accounts) {
      if (!state.isDeepScanning) break;
      if (account.deepScanned) { scanned++; continue; }

      scanned++;
      deepBtn.textContent = `🔍 Deep Scanning... ${scanned}/${total} (click to stop)`;

      try {
        const profileData = await fetchUserProfile(account.username, csrfToken);
        if (profileData) {
          account.followersCount = profileData.followers_count || 0;
          account.followingCount = profileData.following_count || 0;
          account.statusesCount = profileData.statuses_count || 0;
          account.lastTweetDate = profileData.last_tweet_date || null;
          account.isVerified = profileData.is_verified || false;
          account.deepScanned = true;
        }
      } catch (e) {
        console.log(`XUP: Failed to deep scan @${account.username}`, e);
      }

      // Rate limit: ~1 request per second to avoid being blocked
      await sleep(1000);

      // Re-render every 5 accounts for live feedback
      if (scanned % 5 === 0) {
        applyFilters();
      }
    }

    state.isDeepScanning = false;
    deepBtn.textContent = '🔍 Deep Scan (fetch last post dates & follower counts)';
    deepBtn.style.borderColor = 'rgba(76,175,80,0.4)';
    deepBtn.style.color = '#4caf50';
    deepBtn.textContent = '✓ Deep Scan Complete';
    setTimeout(() => {
      deepBtn.style.borderColor = 'rgba(255,122,0,0.2)';
      deepBtn.style.color = '#ff7a00';
      deepBtn.textContent = '🔍 Deep Scan (fetch last post dates & follower counts)';
    }, 3000);

    applyFilters();
  }

  // ===== Get CSRF token from cookies =====
  function getCsrfToken() {
    const match = document.cookie.match(/ct0=([^;]+)/);
    return match ? match[1] : '';
  }

  // ===== Fetch user profile data via X's internal API =====
  async function fetchUserProfile(username, csrfToken) {
    try {
      const response = await fetch(`https://x.com/i/api/graphql/xmU6X_CKVnQ5lSrCbAmJsg/UserByScreenName?variables=${encodeURIComponent(JSON.stringify({
        screen_name: username,
        withSafetyModeUserFields: true
      }))}&features=${encodeURIComponent(JSON.stringify({
        hidden_profile_subscriptions_enabled: true,
        rweb_tipjar_consumption_enabled: true,
        responsive_web_graphql_exclude_directive_enabled: true,
        verified_phone_label_enabled: false,
        subscriptions_verification_info_is_identity_verified_enabled: true,
        subscriptions_verification_info_verified_since_enabled: true,
        highlights_tweets_tab_ui_enabled: true,
        responsive_web_twitter_article_notes_tab_enabled: true,
        subscriptions_feature_can_gift_premium: true,
        creator_subscriptions_tweet_preview_api_enabled: true,
        responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
        responsive_web_graphql_timeline_navigation_enabled: true
      }))}`, {
        headers: {
          'authorization': 'Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA',
          'x-csrf-token': csrfToken,
          'x-twitter-active-user': 'yes',
          'x-twitter-auth-type': 'OAuth2Session',
          'x-twitter-client-language': 'en'
        }
      });

      if (!response.ok) return null;

      const data = await response.json();
      const user = data?.data?.user?.result?.legacy;
      if (!user) return null;

      // Parse last tweet date from the user's status (last tweet)
      let lastTweetDate = null;
      if (user.status && user.status.created_at) {
        lastTweetDate = new Date(user.status.created_at).toISOString();
      }

      return {
        followers_count: user.followers_count || 0,
        following_count: user.friends_count || 0,
        statuses_count: user.statuses_count || 0,
        last_tweet_date: lastTweetDate,
        is_verified: user.verified || false
      };
    } catch (e) {
      return null;
    }
  }

  // ===== Handle unfollow =====
  async function handleUnfollow(username) {
    const account = state.accounts.find(a => a.username === username);
    if (!account || account.isUnfollowed || account.isWhitelisted) return;

    // Navigate to the user's cell in the DOM and click their Following button
    try {
      // First try to find the cell currently in the DOM
      const cells = document.querySelectorAll('[data-testid="cellInnerDiv"]');
      let targetCell = null;

      for (const cell of cells) {
        const links = cell.querySelectorAll('a[role="link"]');
        for (const link of links) {
          if (link.getAttribute('href') === `/${username}`) {
            targetCell = cell;
            break;
          }
        }
        if (targetCell) break;
      }

      if (targetCell) {
        const followingBtn = findFollowingButton(targetCell);
        if (followingBtn) {
          followingBtn.click();
          await sleep(600);
          // Click confirm dialog
          const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
          if (confirmBtn) {
            confirmBtn.click();
            await sleep(400);
          }
        }
      }
    } catch (e) {
      console.log('XUP: Could not click native unfollow button', e);
    }

    // Update state
    account.isUnfollowed = true;

    // Increment counter
    chrome.runtime.sendMessage({ type: 'INCREMENT_UNFOLLOW', username }, (response) => {
      if (response) {
        state.unfollowCount = response.unfollowCount;
        updateStatusBar();
      }
    });

    renderAccounts();
  }

  // ===== Find following button helper =====
  function findFollowingButton(cell) {
    // Look for the specific button with data-testid ending in -unfollow
    const unfollowBtn = cell.querySelector('[data-testid$="-unfollow"]');
    if (unfollowBtn) return unfollowBtn;

    // Fallback: look for button with "Following" text or aria-label
    const buttons = cell.querySelectorAll('button, [role="button"]');
    for (const btn of buttons) {
      const text = btn.textContent?.trim().toLowerCase() || '';
      const label = (btn.getAttribute('aria-label') || '').toLowerCase();
      if (text === 'following' || label.includes('following') || label.includes('unfollow')) {
        return btn;
      }
    }
    return null;
  }

  // ===== Handle whitelist toggle =====
  function handleWhitelist(username) {
    chrome.runtime.sendMessage({ type: 'TOGGLE_WHITELIST', username }, (response) => {
      state.whitelist = response.whitelist;
      const account = state.accounts.find(a => a.username === username);
      if (account) {
        account.isWhitelisted = state.whitelist.includes(username);
      }
      renderAccounts();
    });
  }

  // ===== Handle bulk unfollow =====
  async function handleBulkUnfollow() {
    const toUnfollow = state.filteredAccounts.filter(a => !a.isUnfollowed && !a.isWhitelisted);
    if (toUnfollow.length === 0) return;

    const bulkBtn = document.getElementById('xup-bulk-unfollow');
    bulkBtn.disabled = true;

    let done = 0;
    for (const account of toUnfollow) {
      done++;
      bulkBtn.textContent = `Unfollowing ${done}/${toUnfollow.length}...`;

      // We need to scroll to the account's cell in the DOM first
      // Try scrolling to find it
      await scrollToAndUnfollow(account.username);
      await sleep(1500); // Rate-limit to avoid X's detection
    }

    bulkBtn.textContent = 'Done!';
    setTimeout(() => {
      bulkBtn.textContent = 'Bulk Unfollow All';
      bulkBtn.disabled = false;
    }, 2000);
  }

  // ===== Scroll to find a user cell and unfollow =====
  async function scrollToAndUnfollow(username) {
    const account = state.accounts.find(a => a.username === username);
    if (!account || account.isUnfollowed) return;

    // Check if cell is currently in view
    const cells = document.querySelectorAll('[data-testid="cellInnerDiv"]');
    for (const cell of cells) {
      const links = cell.querySelectorAll('a[role="link"]');
      for (const link of links) {
        if (link.getAttribute('href') === `/${username}`) {
          const btn = findFollowingButton(cell);
          if (btn) {
            btn.click();
            await sleep(600);
            const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
            if (confirmBtn) {
              confirmBtn.click();
              await sleep(400);
            }
            account.isUnfollowed = true;
            chrome.runtime.sendMessage({ type: 'INCREMENT_UNFOLLOW', username }, (resp) => {
              if (resp) {
                state.unfollowCount = resp.unfollowCount;
                updateStatusBar();
              }
            });
            return;
          }
        }
      }
    }

    // If not in view, just mark as unfollowed (cell was recycled)
    account.isUnfollowed = true;
    chrome.runtime.sendMessage({ type: 'INCREMENT_UNFOLLOW', username });
  }

  // ===== Escape HTML =====
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  // ===== Format large numbers =====
  function formatCount(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return String(num);
  }

  // ===== Sleep helper =====
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ===== Watch for page changes (SPA navigation) =====
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // Reset accounts on navigation
      state.accounts = [];
      state.filteredAccounts = [];
      if (state.isOpen && isFollowingPage()) {
        setTimeout(() => scanAccountsWithScroll(), 1500);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // ===== Initialize =====
  function init() {
    createFloatingButton();
    createPanel();
  }

  if (document.body) {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
