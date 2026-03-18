// X Unfollow Pro - Popup Script (Free Edition)

document.addEventListener('DOMContentLoaded', () => {
  const unfollowCount = document.getElementById('unfollowCount');

  // Load current state
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (data) => {
    if (!data) return;
    const count = data.unfollowCount || 0;
    unfollowCount.textContent = count;
  });
});
