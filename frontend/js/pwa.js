(() => {
  const installButton = document.querySelector("#installApp");
  let deferredInstallPrompt = null;

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => undefined));
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (installButton) installButton.hidden = false;
  });

  installButton?.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
      window.alert(isIOS ? "To install on iPhone or iPad, tap Share and choose Add to Home Screen." : "Use your browser menu to install WebClient Hunter AI as an app.");
      return;
    }
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installButton.hidden = true;
  });

  window.addEventListener("appinstalled", () => {
    if (installButton) installButton.hidden = true;
  });
})();
