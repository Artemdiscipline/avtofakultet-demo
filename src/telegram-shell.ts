import type { TelegramWebApp } from "./storage";

/** Launch hints only affect presentation. Authentication remains on the server. */
export function hasTelegramLaunchParams(hash: string): boolean {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return params.has("tgWebAppData") || params.has("tgWebAppPlatform");
}

let sdkPromise: Promise<void> | undefined;
const TELEGRAM_SESSION_KEY = "af.telegram-shell.v1";
function isTelegramSession(): boolean {
  try {
    return sessionStorage.getItem(TELEGRAM_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}
export function loadTelegramSdk(): Promise<void> {
  if (window.Telegram?.WebApp) return Promise.resolve();
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const timer = setTimeout(() => fail(), 12000);
    const fail = () => {
      clearTimeout(timer);
      script.remove();
      sdkPromise = undefined;
      reject(
        new Error(
          "Не удалось загрузить Telegram. Проверьте соединение и откройте приложение заново.",
        ),
      );
    };
    script.src = "https://telegram.org/js/telegram-web-app.js";
    script.onload = () => {
      clearTimeout(timer);
      if (!window.Telegram?.WebApp) return fail();
      resolve();
    };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return sdkPromise;
}

export async function initializeTelegramShell(): Promise<void> {
  const launchHash = location.hash;
  const launchedInTelegram = hasTelegramLaunchParams(launchHash);
  if (
    !launchedInTelegram &&
    !isTelegramSession() &&
    import.meta.env.VITE_STORAGE_MODE !== "server"
  )
    return;

  // The SDK must read Telegram's initial fragment before React's hash router runs.
  await loadTelegramSdk();
  const app: TelegramWebApp = window.Telegram!.WebApp;
  app.ready();
  app.expand();
  app.setHeaderColor?.("#f5f6f8");
  app.setBackgroundColor?.("#f5f6f8");
  if (launchedInTelegram) {
    // Keep SDK initialization on WebView reloads, without treating this hint as identity.
    try {
      sessionStorage.setItem(TELEGRAM_SESSION_KEY, "1");
    } catch {
      /* Storage may be disabled. */
    }
    history.replaceState(null, "", location.pathname + location.search);
  }
}
