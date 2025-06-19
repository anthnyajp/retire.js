let extension = null;
window.addEventListener("message", function orig(evt) {
  if (evt.data.repoFuncs) {
    console.log("SANDBOX: I received a message", evt);
    extension = evt.source;
    let iframe = document.createElement("iframe");
    iframe.retireEvent = evt;
    iframe.src = "inner-sandbox.html";
    iframe.setAttribute("data-url", evt.data.url);
    document.body.appendChild(iframe);
    console.log("outer", evt.data);
    setTimeout(function () {
      iframe.contentWindow.postMessage(evt.data, "*");
    }, 200);
    setTimeout(function () {
      iframe.remove();
    }, 10000);
  } else if (evt.data.version) {
    extension.postMessage(evt.data, "*");
  }
});
