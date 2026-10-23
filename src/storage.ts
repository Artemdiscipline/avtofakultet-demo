import { z } from "zod";
import {
  applicationSchema,
  applyAction,
  createApplication,
  type Actor,
  type Action,
  type Application,
  type Draft,
} from "./model";
export interface Repository {
  list(): Promise<Application[]>;
  create(d: Draft): Promise<Application>;
  act(
    id: string,
    version: number,
    action: Action,
    role: Actor["role"],
  ): Promise<Application>;
}
export const STORAGE_KEY = "af.applications.v1";
export class BrowserRepository implements Repository {
  constructor(private storage?: Pick<Storage, "getItem" | "setItem">) {}
  private read() {
    const raw = (this.storage ?? localStorage).getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = z.array(applicationSchema).safeParse(JSON.parse(raw));
    if (!parsed.success)
      throw new Error(
        "Не удалось прочитать заявки. Сохранённые данные не изменены.",
      );
    return parsed.data;
  }
  private write(apps: Application[]) {
    (this.storage ?? localStorage).setItem(STORAGE_KEY, JSON.stringify(apps));
  }
  private async lock<T>(task: () => T): Promise<T> {
    if (typeof window !== "undefined" && navigator.locks)
      return navigator.locks.request("af-applications", async () => task());
    return task();
  }
  async list() {
    try {
      return this.read();
    } catch (e) {
      throw storageError(e);
    }
  }
  async create(d: Draft) {
    return this.lock(() => {
      try {
        const apps = this.read(),
          existing = apps.find((a) => a.idempotencyKey === d.idempotencyKey);
        if (existing) return existing;
        const a = createApplication(
          d,
          "АФ-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
        );
        this.write([a, ...apps]);
        return a;
      } catch (e) {
        throw storageError(e);
      }
    });
  }
  async act(id: string, version: number, action: Action, role: Actor["role"]) {
    return this.lock(() => {
      try {
        const apps = this.read(),
          i = apps.findIndex((a) => a.id === id);
        if (i < 0) throw new Error("Заявка не найдена.");
        if (apps[i].version !== version)
          throw new Error(
            "Заявка изменилась в другой вкладке. Обновите список и повторите действие.",
          );
        const next = applyAction(apps[i], action, role);
        apps[i] = next;
        this.write(apps);
        return next;
      } catch (e) {
        throw storageError(e);
      }
    });
  }
}
function storageError(e: unknown) {
  if (e instanceof DOMException)
    return new Error(
      "Браузер не разрешил сохранение. Разрешите хранилище и нажмите «Повторить». Ваши ответы остались на экране.",
    );
  return e instanceof Error
    ? e
    : new Error("Не удалось сохранить данные. Повторите попытку.");
}
export const LIVE = import.meta.env.VITE_STORAGE_MODE === "server";
export type TelegramWebApp = {
  initData: string;
  ready: () => void;
  expand: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  onEvent: (event: string, fn: () => void) => void;
  offEvent: (event: string, fn: () => void) => void;
  safeAreaInset?: { top: number; bottom: number };
  contentSafeAreaInset?: { top: number; bottom: number };
};
declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}
export async function api<T>(path: string, body?: unknown): Promise<T> {
  const initData = window.Telegram?.WebApp.initData;
  if (!initData)
    throw new Error(
      "Откройте приложение из отдельного Telegram-бота проекта. Для обновления авторизации закройте и откройте Mini App.",
    );
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(
      (import.meta.env.VITE_API_URL || "") + "/api" + path,
      {
        method: body ? "POST" : "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "tma " + initData,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      },
    );
    const data = await res.json();
    if (!res.ok)
      throw new Error(data.error || "Сервер временно недоступен. Повторите.");
    return data;
  } catch (e) {
    if (
      e instanceof TypeError ||
      (e instanceof DOMException && e.name === "AbortError")
    )
      throw new Error("Нет ответа сервера. Проверьте соединение и повторите.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
export class ServerRepository implements Repository {
  private pending = new Map<string, string>();
  list() {
    return api<Application[]>("/applications");
  }
  create(d: Draft) {
    return api<Application>("/applications", { draft: d });
  }
  async act(id: string, version: number, action: Action, _role: Actor["role"]) {
    const key = JSON.stringify([id, version, action]);
    const operationId = this.pending.get(key) || crypto.randomUUID();
    this.pending.set(key, operationId);
    const result = await api<Application>(
      "/applications/" + encodeURIComponent(id) + "/actions",
      { version, action, operationId },
    );
    this.pending.delete(key);
    return result;
  }
}
