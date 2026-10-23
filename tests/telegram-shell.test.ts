import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import {
  hasTelegramLaunchParams,
  initializeTelegramShell,
} from "../src/telegram-shell";

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => values.get(key) || null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
});
afterEach(() => vi.unstubAllGlobals());
describe("Запуск внутри Telegram", () => {
  it("повторное открытие страницы в том же WebView снова вызывает ready без сброса шага", async () => {
    const ready = vi.fn(),
      expand = vi.fn(),
      replaceState = vi.fn();
    vi.stubGlobal("location", { hash: "#/wizard/5" });
    vi.stubGlobal("history", { replaceState });
    vi.stubGlobal("sessionStorage", { getItem: () => "1" });
    vi.stubGlobal("window", {
      Telegram: { WebApp: { initData: "synthetic", ready, expand } },
    });
    await initializeTelegramShell();
    expect(ready).toHaveBeenCalledOnce();
    expect(expand).toHaveBeenCalledOnce();
    expect(replaceState).not.toHaveBeenCalled();
  });
  it("отличает параметры Telegram от маршрута анкеты", () => {
    expect(
      hasTelegramLaunchParams(
        "#tgWebAppData=user%3Dtest&tgWebAppPlatform=tdesktop&tgWebAppVersion=9.0",
      ),
    ).toBe(true);
    expect(hasTelegramLaunchParams("#/wizard/5")).toBe(false);
    expect(hasTelegramLaunchParams("")).toBe(false);
  });
  it("SDK читает стартовый фрагмент до удаления, затем анкета получает чистый URL", async () => {
    const hash = "#tgWebAppData=synthetic&tgWebAppPlatform=tdesktop";
    const order: string[] = [];
    const replaceState = vi.fn(() => order.push("route"));
    const ready = vi.fn(() => order.push("ready"));
    const expand = vi.fn(() => order.push("expand"));
    vi.stubGlobal("location", {
      hash,
      pathname: "/avtofakultet-demo/",
      search: "?tgWebAppStartParam=demo",
    });
    vi.stubGlobal("history", { replaceState });
    vi.stubGlobal("window", {
      Telegram: { WebApp: { initData: "synthetic", ready, expand } },
    });
    await initializeTelegramShell();
    expect(order).toEqual(["ready", "expand", "route"]);
    expect(replaceState).toHaveBeenCalledWith(
      null,
      "",
      "/avtofakultet-demo/?tgWebAppStartParam=demo",
    );
  });
  it("обычный браузер не загружает Telegram SDK и сохраняет внутренний маршрут", async () => {
    const replaceState = vi.fn();
    vi.stubGlobal("location", { hash: "#/wizard/5" });
    vi.stubGlobal("history", { replaceState });
    vi.stubGlobal("window", {});
    await initializeTelegramShell();
    expect(replaceState).not.toHaveBeenCalled();
  });
});
