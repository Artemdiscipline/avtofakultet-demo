import { configuration } from "./config";
import { assertTestBot, telegram } from "./telegram";
const cfg = configuration();
await assertTestBot(cfg.token, cfg.botName);
let offset = 0,
  running = true;
process.on("SIGINT", () => {
  running = false;
});
console.log("Separate test bot started. No connection to the school bot.");
while (running) {
  try {
    const updates = await telegram<
      {
        update_id: number;
        message?: { text?: string; chat: { id: number; type: string } };
      }[]
    >(cfg.token, "getUpdates", {
      offset,
      timeout: 25,
      allowed_updates: ["message"],
    });
    for (const u of updates) {
      offset = u.update_id + 1;
      if (
        u.message?.chat.type === "private" &&
        /^\/start(?:@\w+)?(?:\s|$)/.test(u.message.text || "")
      ) {
        await telegram(cfg.token, "sendMessage", {
          chat_id: u.message.chat.id,
          text: "Это отдельный тестовый сервис первого обращения «Автофакультет». Ответьте на вопросы и обсудите программу с тестовым администратором. Сервис не подключён к действующему боту или учебной платформе школы.",
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: "Подобрать обучение",
                  web_app: { url: cfg.miniAppUrl },
                },
              ],
            ],
          },
        });
      }
    }
  } catch {
    console.error("Bot connection unavailable; retrying.");
    await new Promise((r) => setTimeout(r, 5000));
  }
}
