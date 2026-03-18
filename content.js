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
    accounts: [],
    filteredAccounts: [],
    searchQuery: '',
    filterInactive: false,
    filterLowFollowers: false,
    filterNonFollowers: false,
    isOpen: false,
    isLoading: false
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
    // Overlay
    const overlay = document.createElement('div');
    overlay.id = 'xup-panel-overlay';
    overlay.addEventListener('click', togglePanel);
    document.body.appendChild(overlay);

    // Panel
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
          <button class="xup-filter-btn" id="xup-filter-inactive">
            Inactive 30d+
          </button>
          <button class="xup-filter-btn" id="xup-filter-followers">
            Low Followers
          </button>
          <button class="xup-filter-btn" id="xup-filter-nonfollowers">
            Non-followers
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
    document.getElementById('xup-filter-inactive').addEventListener('click', () => toggleFilter('inactive'));
    document.getElementById('xup-filter-followers').addEventListener('click', () => toggleFilter('followers'));
    document.getElementById('xup-filter-nonfollowers').addEventListener('click', () => toggleFilter('nonfollowers'));
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
        scanAccounts();
      }
    } else {
      panel.classList.remove('xup-open');
      overlay.classList.remove('xup-visible');
      btn.style.display = 'flex';
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

  // ===== Scan accounts from the DOM =====
  function scanAccounts() {
    const listEl = document.getElementById('xup-account-list');
    listEl.innerHTML = `
      <div class="xup-loading">
        <div class="xup-spinner"></div>
        <span class="xup-loading-text">Scanning your following list...</span>
      </div>
    `;

    state.isLoading = true;

    // Wait for accounts to load in the DOM
    setTimeout(() => {
      const accounts = extractAccountsFromDOM();
      state.accounts = accounts;
      state.filteredAccounts = [...accounts];
      state.isLoading = false;
      renderAccounts();
    }, 2000);
  }

  // ===== Extract accounts from X's DOM =====
  function extractAccountsFromDOM() {
    const accounts = [];
    // X uses [data-testid="cellInnerDiv"] for user cells in the following list
    const cells = document.querySelectorAll('[data-testid="cellInnerDiv"]');

    cells.forEach((cell, index) => {
      try {
        const linkEl = cell.querySelector('a[role="link"][href^="/"]');
        if (!linkEl) return;

        const username = linkEl.getAttribute('href')?.replace('/', '') || '';
        if (!username || username.includes('/')) return;

        const nameEl = cell.querySelector('[dir="ltr"] > span');
        const name = nameEl ? nameEl.textContent : username;

        const avatarEl = cell.querySelector('img[src*="profile_images"]');
        const avatar = avatarEl ? avatarEl.src : '';

        // Try to get bio text
        const bioElements = cell.querySelectorAll('[dir="auto"]');
        let bio = '';
        bioElements.forEach(el => {
          const text = el.textContent;
          if (text && text !== name && text !== `@${username}` && text.length > 10) {
            bio = text;
          }
        });

        accounts.push({
          id: index,
          username,
          name,
          avatar,
          bio,
          domElement: cell,
          isUnfollowed: false,
          isWhitelisted: state.whitelist.includes(username)
        });
      } catch (e) {
        // Skip malformed cells
      }
    });

    return accounts;
  }

  // ===== Render account list =====
  function renderAccounts() {
    const listEl = document.getElementById('xup-account-list');
    const countEl = document.getElementById('xup-shown-count');
    const bulkBtn = document.getElementById('xup-bulk-unfollow');

    if (state.filteredAccounts.length === 0 && !state.isLoading) {
      if (!isFollowingPage()) {
        listEl.innerHTML = `
          <div class="xup-empty">
            <div class="xup-empty-icon">📋</div>
            <div class="xup-empty-text">Navigate to your Following page to scan accounts</div>
            <button class="xup-navigate-btn" onclick="window.location.href='/following'">Go to Following Page →</button>
          </div>
        `;
      } else {
        listEl.innerHTML = `
          <div class="xup-empty">
            <div class="xup-empty-icon">🔍</div>
            <div class="xup-empty-text">No accounts match your filters. Try adjusting your search.</div>
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

    listEl.innerHTML = state.filteredAccounts.map(account => `
      <div class="xup-account-item" data-username="${account.username}">
        <img class="xup-account-avatar" src="${account.avatar || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2250%22 fill=%22%23333%22/><text x=%2250%22 y=%2255%22 text-anchor=%22middle%22 fill=%22%23888%22 font-size=%2240%22>${account.name.charAt(0)}</text></svg>'}" alt="${account.name}">
        <div class="xup-account-info">
          <div class="xup-account-name">${escapeHtml(account.name)}</div>
          <div class="xup-account-handle">@${escapeHtml(account.username)}</div>
          ${account.bio ? `<div class="xup-account-bio">${escapeHtml(account.bio.substring(0, 80))}</div>` : ''}
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
    `).join('');

    // Attach event listeners
    listEl.querySelectorAll('.xup-unfollow-btn').forEach(btn => {
      btn.addEventListener('click', () => handleUnfollow(btn.dataset.username));
    });

    listEl.querySelectorAll('.xup-whitelist-btn').forEach(btn => {
      btn.addEventListener('click', () => handleWhitelist(btn.dataset.username));
    });
  }

  // ===== Handle search =====
  function handleSearch(e) {
    state.searchQuery = e.target.value.toLowerCase();
    applyFilters();
  }

  // ===== Toggle filter =====
  function toggleFilter(type) {
    if (type === 'inactive') {
      state.filterInactive = !state.filterInactive;
      document.getElementById('xup-filter-inactive').classList.toggle('xup-active');
    } else if (type === 'followers') {
      state.filterLowFollowers = !state.filterLowFollowers;
      document.getElementById('xup-filter-followers').classList.toggle('xup-active');
    } else if (type === 'nonfollowers') {
      state.filterNonFollowers = !state.filterNonFollowers;
      document.getElementById('xup-filter-nonfollowers').classList.toggle('xup-active');
    }
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
      return true;
    });
    renderAccounts();
  }

  // ===== Handle unfollow =====
  async function handleUnfollow(username) {
    const account = state.accounts.find(a => a.username === username);
    if (!account || account.isUnfollowed || account.isWhitelisted) return;

    // Try to click the actual unfollow button in X's DOM
    try {
      if (account.domElement) {
        const followingBtn = account.domElement.querySelector('[data-testid$="-unfollow"]') ||
                            findFollowingButton(account.domElement);
        
        if (followingBtn) {
          followingBtn.click();
          // Wait for confirmation dialog
          await new Promise(r => setTimeout(r, 500));
          const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
          if (confirmBtn) {
            confirmBtn.click();
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
    const buttons = cell.querySelectorAll('button, [role="button"]');
    for (const btn of buttons) {
      const text = btn.textContent?.toLowerCase() || '';
      const label = btn.getAttribute('aria-label')?.toLowerCase() || '';
      if (text.includes('following') || label.includes('following') || label.includes('unfollow')) {
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
    bulkBtn.textContent = 'Unfollowing...';

    for (const account of toUnfollow) {
      await handleUnfollow(account.username);
      await new Promise(r => setTimeout(r, 1500)); // Rate limit safety
    }

    bulkBtn.textContent = 'Done!';
    setTimeout(() => {
      bulkBtn.textContent = 'Bulk Unfollow All';
      bulkBtn.disabled = false;
    }, 2000);
  }

  // ===== Escape HTML =====
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ===== Watch for page changes (SPA navigation) =====
  let lastUrl = location.href;
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      if (state.isOpen && isFollowingPage()) {
        setTimeout(() => scanAccounts(), 2000);
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // ===== Auto-rescan when scrolling loads more accounts =====
  let rescanTimeout = null;
  function setupScrollRescan() {
    const listEl = document.querySelector('[data-testid="primaryColumn"]');
    if (!listEl) return;

    const scrollObserver = new MutationObserver(() => {
      if (!state.isOpen || !isFollowingPage()) return;
      clearTimeout(rescanTimeout);
      rescanTimeout = setTimeout(() => {
        const newAccounts = extractAccountsFromDOM();
        if (newAccounts.length > state.accounts.length) {
          const existingUsernames = new Set(state.accounts.map(a => a.username));
          newAccounts.forEach(a => {
            if (!existingUsernames.has(a.username)) {
              state.accounts.push(a);
            }
          });
          applyFilters();
        }
      }, 500);
    });

    scrollObserver.observe(listEl, { childList: true, subtree: true });
  }

  // ===== Initialize =====
  function init() {
    createFloatingButton();
    createPanel();
    setupScrollRescan();
  }

  if (document.body) {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
