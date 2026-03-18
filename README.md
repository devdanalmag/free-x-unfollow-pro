# 🟠 X Unfollow Pro — Free Chrome Extension

<p align="center">
  <img src="icons/icon128.png" alt="X Unfollow Pro" width="128" height="128">
</p>

<p align="center">
  <strong>Search, filter, and unfollow X (Twitter) accounts with surgical precision.</strong><br>
  All features free. No subscriptions. No limits.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Chrome-Extension-orange?logo=google-chrome&logoColor=white" alt="Chrome Extension">
  <img src="https://img.shields.io/badge/Manifest-V3-blue" alt="Manifest V3">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT License">
  <img src="https://img.shields.io/badge/Price-Free-brightgreen" alt="Free">
</p>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔄 **Unlimited Unfollows** | No weekly limits — unfollow as many accounts as you want |
| ⚡ **Bulk Unfollow** | Unfollow all filtered accounts with a single click |
| 🔍 **Smart Search** | Search by name, username, or bio |
| 📊 **Follower Count Filter** | Filter accounts by follower count |
| 💤 **Inactive Detection** | Find accounts that haven't posted in 30+ days |
| 👥 **Non-Followers Filter** | Identify accounts that don't follow you back |
| 🛡️ **Whitelist Protection** | Protect important connections from bulk unfollow |
| 📋 **Unfollow History** | Track all unfollowed accounts with timestamps |
| 🎨 **Dark Theme UI** | Beautiful dark interface that matches X's design |

## 📸 Screenshots

### Floating Button on X.com
When you visit x.com, an orange **"Open X Unfollow Pro"** button appears in the bottom-right corner.

### Side Panel
Click the button to open a slide-in panel with search, filters, and unfollow controls.

### Popup
Click the extension icon in Chrome toolbar to see your stats at a glance.

## 🚀 Installation

### From Source (Developer Mode)

1. **Download** or clone this repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/free-x-unfollow-pro.git
   ```

2. Open **Chrome** and navigate to:
   ```
   chrome://extensions
   ```

3. Enable **Developer Mode** (toggle in the top-right corner)

4. Click **"Load unpacked"**

5. Select the `free-x-unfollow-pro` folder

6. ✅ Done! The extension is now installed and a welcome page will open.

## 📖 How to Use

### Step 1: Pin the Extension
Click the **puzzle piece icon** (🧩) in your Chrome toolbar and pin X Unfollow Pro for easy access.

### Step 2: Open the Panel
Navigate to **[x.com](https://x.com)** and click the orange **"Open X Unfollow Pro"** button in the bottom-right corner.

### Step 3: Go to Following Page
In the panel, click **"Go to Following Page"** or navigate to `x.com/following`. The extension will automatically scan your following list.

### Step 4: Search & Filter
- **Search** by name, username, or bio keywords
- **Filter** by inactive accounts (30d+), low followers, or non-followers
- **Whitelist** accounts you want to protect (shield icon)

### Step 5: Unfollow
- Click **"Unfollow"** on individual accounts
- Click **"Bulk Unfollow All"** to unfollow all filtered accounts at once

## 🏗️ Project Structure

```
free-x-unfollow-pro/
├── manifest.json      # Chrome Extension Manifest V3
├── background.js      # Service worker (install handler, state management)
├── content.js         # Main injection script (floating button + side panel)
├── content.css        # Styles for injected UI on x.com
├── popup.html         # Toolbar popup UI
├── popup.css          # Popup styles
├── popup.js           # Popup logic
├── welcome.html       # Post-install welcome page
├── welcome.css        # Welcome page styles
├── welcome.js         # Welcome page animations
├── icons/
│   ├── icon16.png     # 16×16 toolbar icon
│   ├── icon48.png     # 48×48 extension icon
│   └── icon128.png    # 128×128 store icon
└── README.md          # This file
```

## 🔒 Privacy & Security

- **No data collection** — all data stays in your browser via `chrome.storage.local`
- **No external servers** — the extension runs entirely client-side
- **No API keys** — works by interacting with X's DOM directly
- **No accounts / login** — just install and use
- **Open source** — inspect every line of code yourself

## 🛠️ Technical Details

- **Manifest Version**: V3 (latest Chrome standard)
- **Permissions**: `storage`, `activeTab`
- **Host Permissions**: `x.com`, `twitter.com`
- **Content Script**: Injects at `document_idle` on x.com/twitter.com
- **SPA Aware**: Detects navigation changes without full page reloads
- **Infinite Scroll**: Automatically detects and scans new accounts as you scroll

## 📄 License

MIT License — free to use, modify, and distribute.

---

<p align="center">
  Made with ❤️ for the 𝕏 community
</p>
