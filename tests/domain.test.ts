import { describe, it, expect } from "vitest";
import {
  emptyDraft,
  changeCategory,
  toggleExclusive,
  recommendation,
  contactError,
  createApplication,
  applyAction,
  draftError,
  type Draft,
} from "../src/model";
import { programs, priceText } from "../src/catalog";
import { BrowserRepository } from "../src/storage";
export const validDraft = (): Draft => ({
  ...emptyDraft(),
  category: "B",
  experience: "zero",
  transmission: "auto",
  schedulePreferences: { days: ["weekdays"], times: ["evening"] },
  desiredStart: "soon",
  questions: { topics: ["parts"], text: "" },
  interestedPrograms: ["b-standard-at"],
  applicant: {
    name: "Тестовый ученик",
    method: "telegram",
    contact: "@demo_student",
    contactTime: "После 18",
  },
});
describe("Ветвление и подбор", () => {
  it("B → A очищает только зависимые ответы", () => {
    const d = validDraft(),
      next = changeCategory(d, "A");
    expect(next.transmission).toBe("");
    expect(next.experience).toBe("");
    expect(next.interestedPrograms).toEqual([]);
    expect(next.applicant).toEqual(d.applicant);
    expect(next.schedulePreferences).toEqual(d.schedulePreferences);
    expect(next.questions).toEqual(d.questions);
  });
  it("повторный выбор той же категории сохраняет ответы", () => {
    const d = validDraft();
    expect(changeCategory(d, "B")).toBe(d);
  });
  it("с нуля на автомате: Стандарт АКПП и отдельный Микс", () => {
    expect(recommendation(validDraft()).map((x) => x.program.id)).toEqual([
      "b-standard-at",
      "b-mix",
    ]);
  });
  it("с нуля не предлагает Старт по низкой цене", () => {
    const d = validDraft();
    d.transmission = "manual";
    expect(recommendation(d).map((x) => x.program.id)).not.toContain("b-start");
  });
  it("прежняя школа: отдельный индивидуальный план", () => {
    const d = validDraft();
    d.experience = "other";
    expect(recommendation(d).map((x) => x.program.id)).toEqual(["b-start"]);
  });
  it("восстановление не выдаёт цену занятия за курс", () => {
    const d = validDraft();
    d.experience = "restore";
    const p = recommendation(d)[0].program;
    expect(p.price).toBeNull();
    expect(priceText(p)).toBe("Стоимость уточнит администратор");
  });
  it("для новичка A не предлагает дешёвый сезонный групповой курс", () => {
    const d = {
      ...changeCategory(validDraft(), "A"),
      experience: "zero" as const,
    };
    expect(recommendation(d).map((x) => x.program.id)).toEqual(["a-advanced"]);
  });
  it("опытному A показывает сезонность без обещания набора", () => {
    const d = {
      ...changeCategory(validDraft(), "A"),
      experience: "confident" as const,
    };
    const basic = recommendation(d).find((x) => x.program.id === "a-basic")!;
    expect(basic.program.format).toContain("тёплый сезон");
    expect(basic.program.caution).toContain("уточнит");
  });
  it("консультация не требует тарифа", () => {
    const d = {
      ...changeCategory(validDraft(), "help"),
      helpFocus: "general" as const,
    };
    expect(recommendation(d)).toEqual([]);
    expect(draftError(d)).toBe("");
  });
  it("неизвестное время исключает другие варианты", () => {
    expect(
      toggleExclusive(["morning", "evening"], "unknown", "unknown"),
    ).toEqual(["unknown"]);
    expect(toggleExclusive(["unknown"], "evening", "unknown")).toEqual([
      "evening",
    ]);
  });
  it("несовместимая коробка в мотозаявке отклоняется", () => {
    const d = { ...validDraft(), category: "A" as const };
    expect(draftError(d)).toContain("коробка");
  });
});
describe("Контакт и сохранение", () => {
  it("запрет чтения хранилища допускает повтор после восстановления доступа", async () => {
    let denied = true;
    const r = new BrowserRepository({
      getItem: () => {
        if (denied) throw new DOMException("denied", "SecurityError");
        return null;
      },
      setItem: () => {},
    });
    await expect(r.list()).rejects.toThrow("Браузер");
    denied = false;
    expect(await r.list()).toEqual([]);
  });
  it("отметка связи и закрытие сохраняют историю и исходный запрос", () => {
    const a = createApplication(validDraft(), "test");
    const contacted = applyAction(a, { type: "contacted" }, "admin");
    expect(contacted.status).toBe("contacted");
    const closed = applyAction(contacted, { type: "close" }, "admin");
    expect(closed.status).toBe("closed");
    expect(closed.messages).toHaveLength(2);
    expect(closed.applicant).toEqual(a.applicant);
    expect(() =>
      applyAction(closed, { type: "message", text: "Позже" }, "student"),
    ).toThrow("закрыта");
  });
  it("пустой и некорректный контакт отклоняются", () => {
    const a = validDraft().applicant;
    expect(contactError({ ...a, contact: "" })).toContain("@username");
    expect(contactError({ ...a, contact: "abc" })).not.toBe("");
    expect(contactError({ ...a, method: "phone", contact: "123" })).not.toBe(
      "",
    );
  });
  it("Telegram не требует телефона", () => {
    expect(contactError(validDraft().applicant)).toBe("");
    expect(
      contactError({ ...validDraft().applicant, contact: "", telegramId: 100 }),
    ).toBe("");
  });
  it("созданная заявка сохраняет независимый снимок", () => {
    const d = validDraft(),
      a = createApplication(d, "test");
    const p = programs.find((p) => p.id === "b-standard-at")!;
    const old = p.price;
    p.price = 99999;
    d.applicant.name = "Изменён";
    expect(a.programSnapshots[0].price).toBe(66000);
    expect(a.applicant.name).toBe("Тестовый ученик");
    p.price = old;
  });
  it("сохраняются показанные цены даже при выборе консультации", () => {
    const d = validDraft();
    d.interestedPrograms = [];
    const a = createApplication(d, "test");
    expect(a.programSnapshots.map((p) => p.id)).toEqual([
      "b-standard-at",
      "b-mix",
    ]);
    expect(a.interestedPrograms).toEqual([]);
  });
  it("двойное создание имеет один номер и одну запись", async () => {
    const memory = new Map<string, string>(),
      r = new BrowserRepository({
        getItem: (k) => memory.get(k) || null,
        setItem: (k, v) => {
          memory.set(k, v);
        },
      }),
      d = validDraft();
    const [a, b] = await Promise.all([r.create(d), r.create(d)]);
    expect(a.id).toBe(b.id);
    expect(await r.list()).toHaveLength(1);
  });
  it("новая анкета не перезаписывает прежнюю заявку", async () => {
    const memory = new Map<string, string>(),
      r = new BrowserRepository({
        getItem: (k) => memory.get(k) || null,
        setItem: (k, v) => {
          memory.set(k, v);
        },
      });
    await r.create(validDraft());
    await r.create(validDraft());
    expect(await r.list()).toHaveLength(2);
  });
  it("ошибка записи не означает успех и допускает повтор", async () => {
    const memory = new Map<string, string>();
    let fail = true;
    const r = new BrowserRepository({
        getItem: (k) => memory.get(k) || null,
        setItem: (k, v) => {
          if (fail) throw new DOMException("quota", "QuotaExceededError");
          memory.set(k, v);
        },
      }),
      d = validDraft();
    await expect(r.create(d)).rejects.toThrow("Повторить");
    expect(await r.list()).toEqual([]);
    fail = false;
    await r.create(d);
    expect(await r.list()).toHaveLength(1);
  });
  it("конкурентное изменение не перетирает ответ", async () => {
    const m = new Map<string, string>(),
      r = new BrowserRepository({
        getItem: (k) => m.get(k) || null,
        setItem: (k, v) => {
          m.set(k, v);
        },
      }),
      a = await r.create(validDraft());
    await r.act(a.id, 1, { type: "question", text: "Когда удобно?" }, "admin");
    await expect(r.act(a.id, 1, { type: "close" }, "admin")).rejects.toThrow(
      "изменилась",
    );
  });
  it("переписка и интерес сохраняют исходные ответы", () => {
    const d = validDraft();
    let a = createApplication(d, "test");
    a = applyAction(a, { type: "question", text: "Удобна суббота?" }, "admin");
    a = applyAction(a, { type: "message", text: "Да, вечером" }, "student");
    a = applyAction(
      a,
      { type: "propose", programId: "b-standard-at", text: "Обсудим условия" },
      "admin",
    );
    a = applyAction(a, { type: "interest" }, "student");
    expect(a.messages).toHaveLength(4);
    expect(a.transmission).toBe("auto");
    expect(a.adminReply?.interestedAt).toBeTruthy();
    expect(
      applyAction(a, { type: "interest" }, "student").messages,
    ).toHaveLength(4);
  });
});
