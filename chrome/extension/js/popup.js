// popup.js

document.addEventListener('DOMContentLoaded', () => {
  // When popup opens, request vulnerabilities data from the active tab's content script.
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0) {
      return; // No active tab (shouldn't happen in normal scenario).
    }
    chrome.tabs.sendMessage(tabs[0].id, { action: "getVulns" }, (response) => {
      if (chrome.runtime.lastError) {
        // Content script not available (e.g., this page is not scanned or is an unsupported URL).
        document.getElementById('vulnerabilities').innerText = "Cannot retrieve scan results for this page.";
      } else {
        // We got a response from content.js – now display it.
        show(response);
      }
    });
  });
});

// Define the show() function to render the results in the popup.
function show(data) {
  const container = document.getElementById('vulnerabilities');
  if (!data || data.length === 0) {
    container.textContent = "✅ No vulnerable libraries detected on this page.";
    container.className = "safe";
  } else {
    container.innerHTML = ""; // clear placeholder
    data.forEach(vuln => {
      const p = document.createElement('p');
      p.className = "vuln";
      p.textContent = `⚠️ ${vuln.library} ${vuln.version} – ${vuln.severity || "vulnerable"} (${vuln.info})`;
      // Assuming 'vuln' object has properties: library name, version, perhaps severity and some info or CVE.
      container.appendChild(p);
    });
  }
}
// Add a click handler to the "Close" button to close the popup.
// document.getElementById('close').addEventListener('click', () => {
//   window.close(); // Closes the popup.
// });