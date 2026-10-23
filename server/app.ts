import express from "express";
import { z } from "zod";
import { authenticate, HttpError } from "./auth";
import { draftSchema, actionSchema } from "../src/model";
import { SqliteRepository } from "./db";
export function createApp(config: {
  token: string;
  admins: Set<number>;
  origins: string[];
  repository: SqliteRepository;
}) {
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Vary", "Origin");
    const origin = req.headers.origin;
    if (origin && !config.origins.includes(origin))
      return res
        .status(403)
        .json({ error: "Этот адрес приложения не разрешён." });
    if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });
  const rates = new Map<string, { count: number; start: number }>();
  app.use((req, res, next) => {
    const key = req.ip || "",
      now = Date.now(),
      old = rates.get(key);
    if (!old || now - old.start > 60000)
      rates.set(key, { count: 1, start: now });
    else if (++old.count > 120)
      return res
        .status(429)
        .json({ error: "Слишком много запросов. Повторите через минуту." });
    if (rates.size > 10000)
      for (const [id, v] of rates) if (now - v.start > 60000) rates.delete(id);
    next();
  });
  app.use(express.json({ limit: "32kb" }));
  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api", (req, res, next) => {
    try {
      const header = req.headers.authorization || "";
      if (!header.startsWith("tma "))
        throw new HttpError(401, "Откройте приложение из Telegram.");
      res.locals.actor = authenticate(
        header.slice(4),
        config.token,
        config.admins,
      );
      next();
    } catch (e) {
      next(e);
    }
  });
  app.get("/api/me", (_req, res) => res.json(res.locals.actor));
  app.get("/api/applications", (_req, res) =>
    res.json(config.repository.list(res.locals.actor)),
  );
  app.get("/api/applications/:id", (req, res) =>
    res.json(config.repository.get(req.params.id, res.locals.actor)),
  );
  app.post("/api/applications", (req, res) => {
    const { draft } = z.object({ draft: draftSchema }).parse(req.body);
    // Never accept a Telegram ID, price, status, snapshot, or ownership from the browser.
    delete draft.applicant.telegramId;
    res.status(201).json(config.repository.create(draft, res.locals.actor));
  });
  app.post("/api/applications/:id/actions", (req, res) => {
    const data = z
      .object({
        version: z.number().int().positive(),
        operationId: z.string().uuid(),
        action: actionSchema,
      })
      .parse(req.body);
    res.json(
      config.repository.act(
        req.params.id,
        data.version,
        data.action,
        res.locals.actor,
        data.operationId,
      ),
    );
  });
  app.use(
    (
      err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (err instanceof z.ZodError)
        return res
          .status(400)
          .json({
            error:
              "Проверьте поля запроса: есть некорректные или слишком длинные значения.",
          });
      if (err instanceof HttpError)
        return res.status(err.status).json({ error: err.message });
      if (err instanceof SyntaxError)
        return res.status(400).json({ error: "Не удалось прочитать запрос." });
      if (
        err instanceof Error &&
        /укажите|выберите|програм|заявк|действие|направлен|коробк|опыт|телефон|имя|Telegram/i.test(
          err.message,
        )
      )
        return res.status(400).json({ error: err.message });
      res
        .status(500)
        .json({
          error:
            "Не удалось сохранить. Ваши ответы остаются в анкете. Повторите попытку.",
        });
    },
  );
  return app;
}
