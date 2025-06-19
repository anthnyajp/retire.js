
window.addEventListener(
  "load",
  () => {
    sendMessage("enabled?", null, (response) => {
      document.querySelector("input[type=checkbox]#enabled").checked =
        response?.enabled || false;
    });
    sendMessage("deepScanEnabled?", null, (response) => {
      document.querySelector("input[type=checkbox]#deepEnabled").checked =
        response?.enabled || false;
    });

    document.querySelector("input[type=checkbox]#enabled").addEventListener(
      "click",
      function () {
        chrome.action.setIcon({
          path: this.checked ? "icons/icon48.png" : "icons/icon_bw48.png",
        });
        sendMessage("enable", this.checked, null);
      },
      false
    );
    document.querySelector("input[type=checkbox]#deepEnabled").addEventListener(
      "click",
      function () {
        sendMessage("deepScanEnable", this.checked, null);
      },
      false
    );

    document.querySelector("input[type=checkbox]#unknown").addEventListener(
      "click",
      () => {
        const r = document.getElementById("results");
        if (r.className.includes("hideunknown")) {
          r.className = r.className.replace("hideunknown", "");
        } else {
          r.className += " hideunknown";
        }
      },
      false
    );

    queryForResults();
    setInterval(queryForResults, 5000);
  },
  false
);

function queryForResults() {
  chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
    chrome.tabs.sendMessage(
      tabs[0].id,
      { getDetected: 1 },
      function (response) {
        if (chrome.runtime.lastError) {
          console.warn("No response from content script:", chrome.runtime.lastError.message);
          return;
        }
        if (!response) {
          console.warn("Empty response from content script.");
          return;
        }
        show(response);
      }
    );
  });
}

function sendMessage(message, data, callback) {
  chrome.runtime.sendMessage(
    { to: "background", message: message, data: data },
    (response) => {
      if (chrome.runtime.lastError) {
        console.warn("Runtime error in message:", chrome.runtime.lastError.message);
        return;
      }
      callback && callback(response);
    }
  );
}
function showResult(result, details) {
  const results = document.getElementById("results");
  const resultDiv = document.createElement("div");
  resultDiv.className = "result";
  resultDiv.innerHTML = `<h3>${result.component} (${result.version})</h3>
    <p>Detected in: ${details.url}</p>
    <p>Vulnerable: ${result.vulnerable ? "Yes" : "No"}</p>`;
  results.appendChild(resultDiv);
}