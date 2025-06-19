// content.js

// Immediately scan the page for vulnerable libraries once this script loads.
(function scanPage() {
  // 1. Detect libraries on the page.
  // This likely involves using Retire.js’s vulnerability repository and lookup functions.
  // For example, you might search all script tags and identify library names/versions.
  const results = Retire.scanDocument(window.document);
  // ^ Placeholder: assume Retire.js provides a function to scan the DOM or a global list of libs.
  // In reality, you might have embedded retire.js logic that checks window globals or script URLs.

  // 2. Communicate the findings to the background script.
  if (results.vulnerabilities && results.vulnerabilities.length > 0) {
    chrome.runtime.sendMessage({ vulnFound: true, details: results.vulnerabilities });
    // We send a message indicating vulnerabilities were found, along with details.
  } else {
    chrome.runtime.sendMessage({ noVuln: true });
    // Alternatively, you might choose not to send a message if nothing is found.
    // This is optional; background can assume no news is good news, especially if we handle icon reset via webNavigation.
  }
})();

// 3. Listen for requests from the popup to get detailed results.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "getVulns") {
    // Respond with the stored results of our scan.
    sendResponse(results ? results.vulnerabilities : []);
    // Make sure 'results' (or whatever variable stores findings) is in scope here. You may need to define it in a higher scope.
  }
  // Return true if we needed to do async work (not in this case since our response is ready).
});
