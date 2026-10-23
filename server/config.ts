export function configuration() {
  const token = process.env.BOT_TOKEN || "",
    botName = process.env.TEST_BOT_USERNAME || "",
    miniAppUrl = process.env.MINI_APP_URL || "";
  const admins = new Set(
    (process.env.ADMIN_TELEGRAM_IDS || "")
      .split(",")
      .filter(Boolean)
      .map(Number),
  );
  const notify = Number(process.env.TEST_ADMIN_CHAT_ID);
  if (!token || !botName || botName.toLowerCase() === "hi_prof_bot")
    throw new Error("Укажите отдельные BOT_TOKEN и TEST_BOT_USERNAME проекта.");
  if (
    !admins.size ||
    [...admins].some((id) => !Number.isSafeInteger(id) || id <= 0)
  )
    throw new Error("ADMIN_TELEGRAM_IDS: нужны положительные Telegram ID.");
  if (!Number.isSafeInteger(notify) || !admins.has(notify))
    throw new Error(
      "TEST_ADMIN_CHAT_ID должен принадлежать одному из тестовых администраторов.",
    );
  if (!miniAppUrl.startsWith("https://"))
    throw new Error(
      "MINI_APP_URL должен быть HTTPS-адресом подключённой сборки.",
    );
  return { token, botName, admins, notify, miniAppUrl };
}
