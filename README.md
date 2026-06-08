# LinkedIn Network Tracker

A Chrome extension to track LinkedIn connections and outreach — auto-captures profile data and saves to Google Sheets.

## Features

- Auto-captures Name, Headline, Company, and LinkedIn URL when you open the popup
- Detects connection status automatically (Not Connected / Connection Sent / Connected)
- Checks Google Sheets first — loads existing entry if found, scrapes page if not
- Saves and updates entries in Google Sheets via a Google Apps Script Web App
- Color-coded Status column, dropdown validation, and configurable column widths

## Setup

### 1. Google Apps Script

1. Go to [script.google.com](https://script.google.com) and create a new project
2. Paste the contents of `Code.gs`
3. Update `SPREADSHEET_ID` with your Google Sheet ID
4. Deploy as a **Web App** — set access to **Anyone**
5. Copy the deployment URL

### 2. Extension Config

Copy `config.example.js` to `config.js` and paste your Apps Script URL:

```js
const CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec",
};
```

> `config.js` is gitignored — your deployment URL stays local.

### 3. Load the Extension

1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select this folder

## Usage

Navigate to any LinkedIn profile and click the extension icon. The popup will auto-fill the profile fields. Review, adjust the status/referral if needed, and hit **Save to Google Sheets**.

## File Structure

```
├── manifest.json
├── config.js
├── popup.html / popup.js / styles.css
├── Code.gs                  # Google Apps Script backend
├── content/
│   ├── extractProfileDetails.js
│   └── detectStatus.js
└── icons/
```
