export async function telegram<T>(
  token: string,
  method: string,
  body: unknown,
): Promise<T> {
  const res = await fetch(
    "https://api.telegram.org/bot" + token + "/" + method,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(40000),
    },
  );
  const data = (await res.json()) as { ok: boolean; result: T };
  if (!res.ok || !data.ok) throw new Error("Telegram API request failed");
  return data.result;
}
export async function assertTestBot(token: string, expected: string) {
  const bot = await telegram<{ username: string }>(token, "getMe", {});
  if (
    bot.username.toLowerCase() === "hi_prof_bot" ||
    bot.username.toLowerCase() !== expected.toLowerCase()
  )
    throw new Error(
      "Разрешён только отдельно созданный тестовый бот из TEST_BOT_USERNAME.",
    );
}
