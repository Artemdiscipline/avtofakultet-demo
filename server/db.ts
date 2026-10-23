import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import {
  createApplication,
  applyAction,
  type Draft,
  type Action,
  type Actor,
  type Application,
} from "../src/model";
import { HttpError } from "./auth";
export class SqliteRepository {
  db: DatabaseSync;
  constructor(path: string) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
   CREATE TABLE IF NOT EXISTS applications (id TEXT PRIMARY KEY,owner_id INTEGER NOT NULL,idem TEXT NOT NULL,version INTEGER NOT NULL,body TEXT NOT NULL,UNIQUE(owner_id,idem));
   CREATE TABLE IF NOT EXISTS operations (id TEXT PRIMARY KEY,application_id TEXT NOT NULL,result TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS outbox (id TEXT PRIMARY KEY,application_id TEXT NOT NULL,attempts INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL DEFAULT 0,sent_at TEXT);
  `);
  }
  list(actor: Actor): Application[] {
    const rows =
      actor.role === "admin"
        ? this.db
            .prepare("SELECT body FROM applications ORDER BY rowid DESC")
            .all()
        : this.db
            .prepare(
              "SELECT body FROM applications WHERE owner_id=? ORDER BY rowid DESC",
            )
            .all(actor.id);
    return rows.map((r) => JSON.parse(r.body as string));
  }
  get(id: string, actor: Actor): Application {
    const row = this.db
      .prepare("SELECT owner_id,body FROM applications WHERE id=?")
      .get(id);
    if (!row || (actor.role !== "admin" && row.owner_id !== actor.id))
      throw new HttpError(404, "Заявка не найдена.");
    return JSON.parse(row.body as string);
  }
  create(d: Draft, actor: Actor): Application {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const existing = this.db
        .prepare("SELECT body FROM applications WHERE owner_id=? AND idem=?")
        .get(actor.id, d.idempotencyKey);
      if (existing) {
        this.db.exec("COMMIT");
        return JSON.parse(existing.body as string);
      }
      const canonical = structuredClone(d);
      canonical.applicant.telegramId = actor.id;
      if (canonical.applicant.method === "telegram")
        canonical.applicant.contact = actor.username
          ? "@" + actor.username
          : "Через Telegram-бота проекта";
      const app = createApplication(
        canonical,
        "АФ-" + randomUUID().slice(0, 8).toUpperCase(),
      );
      this.db
        .prepare("INSERT INTO applications VALUES (?,?,?,?,?)")
        .run(
          app.id,
          actor.id,
          d.idempotencyKey,
          app.version,
          JSON.stringify(app),
        );
      this.db
        .prepare("INSERT INTO outbox(id,application_id) VALUES (?,?)")
        .run(randomUUID(), app.id);
      this.db.exec("COMMIT");
      return app;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  act(
    id: string,
    version: number,
    action: Action,
    actor: Actor,
    operationId: string,
  ): Application {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const current = this.get(id, actor);
      const row = this.db
        .prepare("SELECT owner_id FROM applications WHERE id=?")
        .get(id)!;
      if (
        ["message", "interest"].includes(action.type) &&
        row.owner_id !== actor.id
      )
        throw new HttpError(403, "Нельзя отвечать за другого ученика.");
      if (
        ["question", "propose", "contacted", "close"].includes(action.type) &&
        actor.role !== "admin"
      )
        throw new HttpError(403, "Требуются права администратора.");
      const done = this.db
        .prepare(
          "SELECT result FROM operations WHERE id=? AND application_id=?",
        )
        .get(operationId, id);
      if (done) {
        this.db.exec("COMMIT");
        return JSON.parse(done.result as string);
      }
      if (current.version !== version)
        throw new HttpError(
          409,
          "Заявка уже изменилась. Обновите список и повторите действие.",
        );
      const next = applyAction(current, action, actor.role);
      this.db
        .prepare(
          "UPDATE applications SET version=?,body=? WHERE id=? AND version=?",
        )
        .run(next.version, JSON.stringify(next), id, version);
      this.db
        .prepare("INSERT INTO operations VALUES (?,?,?)")
        .run(operationId, id, JSON.stringify(next));
      this.db.exec("COMMIT");
      return next;
    } catch (e) {
      this.db.exec("ROLLBACK");
      throw e;
    }
  }
  close() {
    this.db.close();
  }
}
