import { beforeEach, afterEach, describe, it, expect } from "vitest";
import request from "supertest";
import { createHmac, randomUUID } from "node:crypto";
import { SqliteRepository } from "../server/db";
import { createApp } from "../server/app";
import { authenticate } from "../server/auth";
import { emptyDraft, type Draft } from "../src/model";
import { existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
const token = "synthetic-test-token-not-a-real-bot";
const validDraft = (): Draft => ({
  ...emptyDraft(),
  category: "B",
  experience: "zero",
  transmission: "auto",
  schedulePreferences: { days: ["weekdays"], times: ["evening"] },
  desiredStart: "soon",
  interestedPrograms: ["b-standard-at"],
  applicant: {
    name: "Тестовый ученик",
    method: "telegram",
    contact: "",
    contactTime: "",
  },
});
function signed(id: number, date = Math.floor(Date.now() / 1000)) {
  const params = new URLSearchParams({
    auth_date: String(date),
    user: JSON.stringify({
      id,
      first_name: "Тест",
      username: "synthetic_user",
    }),
    query_id: randomUUID(),
  });
  const check = [...params]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => k + "=" + v)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  params.set("hash", createHmac("sha256", secret).update(check).digest("hex"));
  return "tma " + params.toString();
}
let repo: SqliteRepository, app: ReturnType<typeof createApp>;
beforeEach(() => {
  repo = new SqliteRepository(":memory:");
  app = createApp({
    token,
    admins: new Set([999]),
    origins: ["https://example.test"],
    repository: repo,
  });
});
afterEach(() => repo.close());
const create = () =>
  request(app)
    .post("/api/applications")
    .set("Authorization", signed(100))
    .send({ draft: validDraft() });
describe("Telegram и права доступа API", () => {
  it("SQLite сохраняет заявку и сообщение после повторного открытия файла", () => {
    const path = join(
      process.cwd(),
      "tests",
      ".runtime-" + randomUUID() + ".sqlite",
    );
    let disk: SqliteRepository | undefined;
    try {
      disk = new SqliteRepository(path);
      const student = { id: 100, role: "student" as const, firstName: "Тест" };
      const a = disk.create(validDraft(), student);
      disk.act(
        a.id,
        1,
        { type: "question", text: "Тестовый вопрос" },
        { id: 999, role: "admin", firstName: "Тест" },
        randomUUID(),
      );
      disk.close();
      disk = undefined;
      disk = new SqliteRepository(path);
      expect(disk.get(a.id, student).messages[0].text).toBe("Тестовый вопрос");
      expect(disk.get(a.id, student).version).toBe(2);
    } finally {
      disk?.close();
      for (const suffix of ["", "-wal", "-shm"])
        if (existsSync(path + suffix)) unlinkSync(path + suffix);
    }
  });
  it("подтверждает HMAC и серверную роль", () => {
    expect(authenticate(signed(999).slice(4), token, new Set([999])).role).toBe(
      "admin",
    );
  });
  it("запрос без подписи отклоняется", async () => {
    expect((await request(app).get("/api/applications")).status).toBe(401);
  });
  it("изменённый Telegram ID отклоняется", async () => {
    const header = signed(100).replace("%3A100", "%3A999");
    expect(
      (await request(app).get("/api/me").set("Authorization", header)).status,
    ).toBe(401);
  });
  it("истёкшая и будущая подписи отклоняются", () => {
    expect(() =>
      authenticate(signed(100, 1).slice(4), token, new Set()),
    ).toThrow("истекла");
    expect(() =>
      authenticate(
        signed(100, Math.floor(Date.now() / 1000) + 120).slice(4),
        token,
        new Set(),
      ),
    ).toThrow("истекла");
  });
  it("дубли auth_date отклоняются", () => {
    expect(() =>
      authenticate(signed(100).slice(4) + "&auth_date=1", token, new Set()),
    ).toThrow("авторизация");
  });
  it("сервер устанавливает Telegram ID и цену из каталога", async () => {
    const d = validDraft();
    d.applicant.telegramId = 999;
    const res = await request(app)
      .post("/api/applications")
      .set("Authorization", signed(100))
      .send({
        draft: { ...d, programSnapshots: [{ price: 1 }], status: "closed" },
      });
    expect(res.status).toBe(201);
    expect(res.body.applicant.telegramId).toBe(100);
    expect(res.body.programSnapshots[0].price).toBe(66000);
    expect(res.body.status).toBe("new");
  });
  it("другой ученик не видит заявку по списку или ID", async () => {
    const { body } = await create();
    const other = signed(200);
    expect(
      (await request(app).get("/api/applications").set("Authorization", other))
        .body,
    ).toEqual([]);
    expect(
      (
        await request(app)
          .get("/api/applications/" + encodeURIComponent(body.id))
          .set("Authorization", other)
      ).status,
    ).toBe(404);
  });
  it("ученик не может предложить курс и изменить роль из клиента", async () => {
    const { body } = await create();
    const res = await request(app)
      .post("/api/applications/" + encodeURIComponent(body.id) + "/actions")
      .set("Authorization", signed(100))
      .send({
        role: "admin",
        version: 1,
        operationId: randomUUID(),
        action: { type: "propose", programId: "b-standard-at", text: "Fake" },
      });
    expect(res.status).toBe(403);
  });
  it("администратор видит заявку, но не отвечает за ученика", async () => {
    const { body } = await create();
    expect(
      (
        await request(app)
          .get("/api/applications")
          .set("Authorization", signed(999))
      ).body,
    ).toHaveLength(1);
    const res = await request(app)
      .post("/api/applications/" + encodeURIComponent(body.id) + "/actions")
      .set("Authorization", signed(999))
      .send({
        version: 1,
        operationId: randomUUID(),
        action: { type: "message", text: "Подделка ответа" },
      });
    expect(res.status).toBe(403);
  });
  it("запрещённый Origin отклоняется", async () => {
    expect(
      (
        await request(app)
          .get("/api/me")
          .set("Authorization", signed(100))
          .set("Origin", "https://evil.test")
      ).status,
    ).toBe(403);
  });
  it("некорректные поля валидируются на сервере", async () => {
    const d = validDraft();
    d.category = "A";
    expect(
      (
        await request(app)
          .post("/api/applications")
          .set("Authorization", signed(100))
          .send({ draft: d })
      ).status,
    ).toBe(400);
  });
  it("повтор с одним ключом создаёт одну заявку и одно уведомление", async () => {
    const d = validDraft();
    for (let i = 0; i < 2; i++)
      expect(
        (
          await request(app)
            .post("/api/applications")
            .set("Authorization", signed(100))
            .send({ draft: d })
        ).status,
      ).toBe(201);
    expect(repo.list({ id: 100, role: "student", firstName: "" })).toHaveLength(
      1,
    );
    expect(repo.db.prepare("SELECT id FROM outbox").all()).toHaveLength(1);
  });
  it("idempotency key изолирован по владельцу", async () => {
    const d = validDraft();
    for (const id of [100, 200])
      await request(app)
        .post("/api/applications")
        .set("Authorization", signed(id))
        .send({ draft: d });
    expect(repo.list({ id: 999, role: "admin", firstName: "" })).toHaveLength(
      2,
    );
  });
  it("конкурентная версия: второй сотрудник получает 409", async () => {
    const { body } = await create();
    const path =
      "/api/applications/" + encodeURIComponent(body.id) + "/actions";
    const a = () => ({
      version: 1,
      operationId: randomUUID(),
      action: { type: "question", text: "Вопрос" },
    });
    expect(
      (
        await request(app)
          .post(path)
          .set("Authorization", signed(999))
          .send(a())
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .post(path)
          .set("Authorization", signed(999))
          .send(a())
      ).status,
    ).toBe(409);
  });
  it("повтор операции не дублирует сообщение", async () => {
    const { body } = await create();
    const path =
        "/api/applications/" + encodeURIComponent(body.id) + "/actions",
      data = {
        version: 1,
        operationId: randomUUID(),
        action: { type: "question", text: "Вопрос" },
      };
    await request(app).post(path).set("Authorization", signed(999)).send(data);
    const res = await request(app)
      .post(path)
      .set("Authorization", signed(999))
      .send(data);
    expect(res.status).toBe(200);
    expect(res.body.messages).toHaveLength(1);
  });
  it("чужое изменение и неизвестная программа отклоняются", async () => {
    const { body } = await create(),
      path = "/api/applications/" + encodeURIComponent(body.id) + "/actions";
    const data = {
      version: 1,
      operationId: randomUUID(),
      action: { type: "message", text: "Fake" },
    };
    expect(
      (
        await request(app)
          .post(path)
          .set("Authorization", signed(200))
          .send(data)
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .post(path)
          .set("Authorization", signed(999))
          .send({
            ...data,
            action: { type: "propose", programId: "missing", text: "Вариант" },
          })
      ).status,
    ).toBe(400);
  });
});
