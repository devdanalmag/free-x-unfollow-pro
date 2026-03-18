// X Unfollow Pro - Background Service Worker

// Open welcome page on install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
    // Initialize storage defaults
    chrome.storage.local.set({
      unfollowCount: 0,
      whitelist: [],
      unfollowHistory: []
    });
  }
});

// Message hub between popup and content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'GET_STATE':
      chrome.storage.local.get(['unfollowCount', 'whitelist', 'unfollowHistory'], (data) => {
        sendResponse(data);
      });
      return true;

    case 'INCREMENT_UNFOLLOW':
      chrome.storage.local.get(['unfollowCount', 'unfollowHistory'], (data) => {
        const newCount = (data.unfollowCount || 0) + 1;
        const history = data.unfollowHistory || [];
        history.push({ username: message.username, date: new Date().toISOString() });
        chrome.storage.local.set({ unfollowCount: newCount, unfollowHistory: history }, () => {
          sendResponse({ unfollowCount: newCount });
        });
      });
      return true;

    case 'TOGGLE_WHITELIST':
      chrome.storage.local.get(['whitelist'], (data) => {
        let whitelist = data.whitelist || [];
        const index = whitelist.indexOf(message.username);
        if (index > -1) {
          whitelist.splice(index, 1);
        } else {
          whitelist.push(message.username);
        }
        chrome.storage.local.set({ whitelist }, () => {
          sendResponse({ whitelist });
        });
      });
      return true;
  }
});
