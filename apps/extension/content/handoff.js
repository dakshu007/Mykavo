/**
 * Runs only on https://mykavo.app/connect/chrome/done. Reads the one-time
 * connect code MyKavo rendered for this extension, hands it to the
 * background worker (which holds the PKCE verifier and does the exchange),
 * and tells the page how it went. Reads nothing else on the page.
 */
(() => {
  const el = document.getElementById("mykavo-extension-handoff");
  const code = el?.dataset.code;
  const state = el?.dataset.state;
  if (!code || !state) return;

  const report = (ok) => {
    document.documentElement.dataset.mykavoExtension = ok ? "linked" : "failed";
    window.postMessage({ source: "mykavo-extension", type: "handoff-result", ok }, window.location.origin);
  };

  try {
    chrome.runtime.sendMessage({ type: "handoff", code, state }, (response) => {
      if (chrome.runtime.lastError) return report(false);
      report(Boolean(response && response.ok));
    });
  } catch {
    report(false);
  }
})();
