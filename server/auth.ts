import { createHmac, timingSafeEqual } from "node:crypto";
import type { Actor } from "../src/model";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function authenticate(
  raw: string,
  botToken: string,
  admins: Set<number>,
  now = Math.floor(Date.now() / 1000),
): Actor {
  if (!raw || raw.length > 16000)
    throw new HttpError(401, "Откройте приложение заново из Telegram.");
  const params = new URLSearchParams(raw);
  if (new Set(params.keys()).size !== [...params.keys()].length)
    throw new HttpError(401, "Некорректная авторизация.");
  const hash = params.get("hash") || "";
  params.delete("hash");
  if (!/^[a-f0-9]{64}$/i.test(hash))
    throw new HttpError(401, "Некорректная авторизация.");
  const check = [...params]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => k + "=" + v)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const digest = createHmac("sha256", secret).update(check).digest();
  if (!timingSafeEqual(Buffer.from(hash, "hex"), digest))
    throw new HttpError(401, "Подпись Telegram не подтверждена.");
  const date = Number(params.get("auth_date"));
  if (!Number.isInteger(date) || now - date > 3600 || date > now + 30)
    throw new HttpError(
      401,
      "Авторизация истекла. Закройте и снова откройте приложение из бота.",
    );
  let user;
  try {
    user = JSON.parse(params.get("user") || "null");
  } catch {
    throw new HttpError(401, "Не удалось проверить пользователя.");
  }
  if (
    !user ||
    !Number.isSafeInteger(user.id) ||
    user.id <= 0 ||
    typeof user.first_name !== "string"
  )
    throw new HttpError(401, "Не удалось проверить пользователя.");
  return {
    id: user.id,
    role: admins.has(user.id) ? "admin" : "student",
    firstName: user.first_name.slice(0, 80),
    username: typeof user.username === "string" ? user.username : undefined,
  };
}
