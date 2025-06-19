// service_worker.js (background)

// 1. Listen for messages from content scripts about vulnerabilities.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.vulnFound) {
    // A vulnerable library was detected on the page.
    // **Use chrome.action (MV3) instead of chrome.browserAction to update icon UI.**
    chrome.action.setIcon({ path: "icons/icon_warning.png", tabId: sender.tab.id });
    chrome.action.setBadgeText({ text: "!", tabId: sender.tab.id });
    chrome.action.setBadgeBackgroundColor({ color: "#FF0000", tabId: sender.tab.id });
    // The icon is changed to a warning icon (icon_warning.png) and a red "!" badge to alert the user.
  } else if (message.noVuln) {
    // No vulnerabilities found (if content script explicitly notifies this).
    // Reset the icon to normal in case it was previously marked.
    chrome.action.setIcon({ path: "icons/icon48.png", tabId: sender.tab.id });
    chrome.action.setBadgeText({ text: "", tabId: sender.tab.id });
  }
  // Note: We do not need to call sendResponse for one-way notifications.
});

// 2. (Optional) Reset icon on navigation, to clear old indicators when user navigates away.
chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.transitionType === "reload" || details.transitionType === "link" || details.transitionType === "typed") {
    // When a new page is loaded in a tab, remove any badge/icon override from the previous page.
    chrome.action.setIcon({ path: "icons/icon48.png", tabId: details.tabId });
    chrome.action.setBadgeText({ text: "", tabId: details.tabId });
  }
});

// 3. (Optional) WebRequest handling (if needed).
// If you intend to use webRequest to log or analyze script loads:
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (details.resourceType === "script") {
      // Example: Log script URLs or trigger additional analysis
      console.debug("Script loaded:", details.url);
      // You might send this URL to the sandbox for version detection if not already handled.
    }
  },
  { urls: ["<all_urls>"] }
  // Note: We don't use "blocking" here, just observing. We haven't requested "webRequestBlocking", so we cannot block anyway.
);
// If webRequest is not actually needed (content script + sandbox handle all scanning), consider removing this altogether along with the permission.
// 4. (Optional) Handle extension installation or updates.