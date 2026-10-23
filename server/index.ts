import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createApp } from "./app";
import { SqliteRepository } from "./db";
import { assertTestBot, telegram } from "./telegram";
import { configuration } from "./config";
const cfg = configuration();
await assertTestBot(cfg.token, cfg.botName);
const path = resolve(process.env.DATABASE_PATH || "data/applications.sqlite");
mkdirSync(dirname(path), { recursive: true });
const repository = new SqliteRepository(path);
const app = createApp({
  token: cfg.token,
  admins: cfg.admins,
  origins: (
    process.env.ALLOWED_ORIGINS || new URL(cfg.miniAppUrl).origin
  ).split(","),
  repository,
});
let sending = false;
const outbox = setInterval(async () => {
  if (sending) return;
  sending = true;
  try {
    const rows = repository.db
      .prepare(
        "SELECT * FROM outbox WHERE sent_at IS NULL AND next_at<=? LIMIT 10",
      )
      .all(Date.now());
    for (const row of rows) {
      try {
        await telegram(cfg.token, "sendMessage", {
          chat_id: cfg.notify,
          text:
            "Тестовый проект Автофакультет: новая заявка " +
            row.application_id +
            ". Откройте Mini App для просмотра.",
          reply_markup: {
            inline_keyboard: [
              [{ text: "Открыть заявки", web_app: { url: cfg.miniAppUrl } }],
            ],
          },
        });
        repository.db
          .prepare("UPDATE outbox SET sent_at=? WHERE id=?")
          .run(new Date().toISOString(), row.id);
      } catch {
        repository.db
          .prepare("UPDATE outbox SET attempts=attempts+1,next_at=? WHERE id=?")
          .run(
            Date.now() +
              Math.min(3600000, 30000 * 2 ** Math.min(Number(row.attempts), 7)),
            row.id,
          );
      }
    }
  } finally {
    sending = false;
  }
}, 5000);
const server = app.listen(Number(process.env.PORT || 3001), "127.0.0.1", () =>
  console.log(
    "API ready on configured local port. Put it behind an HTTPS reverse proxy.",
  ),
);
process.on("SIGINT", () => {
  clearInterval(outbox);
  server.close(() => {
    repository.close();
    process.exit(0);
  });
});
