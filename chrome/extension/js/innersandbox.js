const realwin = window;
const realdoc = document;
console.log("inner sandbox loaded");

window.addEventListener("message", function (evt) {
  if (!evt.data || !evt.data.script) return;

  const repoFuncs = evt.data.repoFuncs || {};
  console.log("I'm trying!!");

  // Disable alert, prompt, confirm
  ["alert", "prompt", "confirm"].forEach(function (n) {
    try {
      Object.defineProperty(window, n, {
        get: function () {
          return function () { };
        },
        set: function () { },
        enumerable: true,
        configurable: false, // avoid making it reconfigurable
      });
    } catch (e) {
      console.warn(`Failed to override ${n}:`, e);
    }
  });

  // Set base href if provided
  if (evt.data.url) {
    try {
      let base = document.querySelector("base");
      if (!base) {
        base = document.createElement("base");
        document.head.appendChild(base);
      }
      base.setAttribute(
        "href",
        new URL(evt.data.url).origin + "/"
      );
    } catch (e) {
      console.warn("Failed to set base href:", e);
    }
  }

  // Run the script safely in the sandbox
  try {
    const sandboxedFn = new Function("top", evt.data.script);
    console.log("SANDBOX invoking", evt.data.url);
    sandboxedFn(window);
  } catch (e) {
    console.warn("SANDBOX ERROR", e);
  }

  // Evaluate repo functions and post back
  processRepoFunctions(repoFuncs, evt);

  // Final done message
  if (evt.source && typeof evt.source.postMessage === "function") {
    evt.source.postMessage({ done: "true" }, evt.origin || "*");
  }
});

// Helper to evaluate detection functions
function processRepoFunctions(repoFuncs, evt) {
  Object.entries(repoFuncs).forEach(([component, funcs]) => {
    funcs.forEach(function (func) {
      try {
        const result = eval(func); // Must run in sandboxed iframe
        console.log("SANDBOX eval", component, result);
        if (evt.source && typeof evt.source.postMessage === "function") {
          evt.source.postMessage(
            {
              component: component,
              version: result,
              original: evt.data,
            },
            evt.origin || "*"
          );
        }
      } catch (e) {
        console.warn(`Eval failed for ${component}:`, e);
      }
    });
  });
}
