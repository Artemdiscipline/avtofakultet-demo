import { z } from "zod";
import { findProgram, type Program } from "./catalog";
export const categorySchema = z.enum(["B", "A", "help"]);
const text = (max: number) => z.string().max(max);
export const applicantSchema = z.object({
  name: text(80),
  method: z.enum(["telegram", "phone"]),
  contact: text(80),
  contactTime: text(200),
  telegramId: z.number().int().positive().optional(),
});
const scheduleSchema = z.object({
  days: z.array(z.enum(["weekdays", "weekends", "flexible"])).max(3),
  times: z.array(z.enum(["morning", "afternoon", "evening", "unknown"])).max(4),
});
export const draftSchema = z.object({
  idempotencyKey: z.string().min(8).max(100),
  category: z.enum(["", "B", "A", "help"]),
  helpFocus: z.enum(["", "car", "moto", "general"]),
  experience: z.enum(["", "zero", "tried", "confident", "other", "restore"]),
  transmission: z.enum(["", "manual", "auto", "unsure"]),
  situation: text(600),
  schedulePreferences: scheduleSchema,
  desiredStart: z.enum(["", "soon", "next", "later", "choosing"]),
  questions: z.object({
    topics: z
      .array(
        z.enum(["price", "parts", "online", "practice", "admission", "other"]),
      )
      .max(6),
    text: text(1000),
  }),
  interestedPrograms: z.array(text(60)).max(2),
  applicant: applicantSchema,
});
export type Draft = z.infer<typeof draftSchema>;
export const programSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(["B", "A"]),
  transmission: z.string().optional(),
  price: z.number().nullable(),
  basePrice: z.number().optional(),
  priceKind: z.enum(["promotion", "from", "unknown"]),
  payment: z.string().optional(),
  duration: z.string().optional(),
  format: z.string(),
  includes: z.array(z.string()),
  caution: z.string().optional(),
  source: z.string(),
  checkedAt: z.string(),
});
export const statusSchema = z.enum([
  "new",
  "clarification",
  "proposed",
  "contacted",
  "closed",
]);
export type Status = z.infer<typeof statusSchema>;
export const messageSchema = z.object({
  id: z.string(),
  author: z.enum(["student", "admin", "system"]),
  text: z.string(),
  createdAt: z.string(),
});
export const applicationSchema = draftSchema
  .omit({ idempotencyKey: true })
  .extend({
    id: z.string(),
    idempotencyKey: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
    status: statusSchema,
    version: z.number().int(),
    programSnapshots: z.array(programSchema),
    adminReply: z
      .object({
        program: programSchema,
        comment: z.string(),
        createdAt: z.string(),
        interestedAt: z.string().optional(),
      })
      .nullable(),
    messages: z.array(messageSchema),
  });
export type Application = z.infer<typeof applicationSchema>;
export type Actor = {
  id: number;
  role: "student" | "admin";
  firstName: string;
  username?: string;
};
export const actionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("question"),
    text: z.string().trim().min(1).max(1000),
  }),
  z.object({
    type: z.literal("propose"),
    programId: z.string(),
    text: z.string().trim().min(1).max(1000),
  }),
  z.object({ type: z.literal("contacted") }),
  z.object({ type: z.literal("close") }),
  z.object({
    type: z.literal("message"),
    text: z.string().trim().min(1).max(1000),
  }),
  z.object({ type: z.literal("interest") }),
]);
export type Action = z.infer<typeof actionSchema>;
export function emptyDraft(): Draft {
  return {
    idempotencyKey: crypto.randomUUID(),
    category: "",
    helpFocus: "",
    experience: "",
    transmission: "",
    situation: "",
    schedulePreferences: { days: [], times: [] },
    desiredStart: "",
    questions: { topics: [], text: "" },
    interestedPrograms: [],
    applicant: { name: "", method: "telegram", contact: "", contactTime: "" },
  };
}
export const labels = {
  category: {
    B: "Категория B · автомобиль",
    A: "Категория A · мотоцикл",
    help: "Нужна помощь с выбором",
    "": "Не выбрано",
  },
  helpFocus: {
    car: "Скорее автомобиль",
    moto: "Скорее мотоцикл",
    general: "Общая консультация",
    "": "",
  },
  experience: {
    zero: "Начинаю с нуля",
    tried: "Немного пробовал(а)",
    confident: "Уверенно управляю мотоциклом",
    other: "Учился(ась) в другой школе",
    restore: "Права есть — восстановить навыки",
    "": "Не указано",
  },
  transmission: {
    manual: "Механика",
    auto: "Автомат",
    unsure: "Хочу разобраться в различиях",
    "": "Не указано",
  },
  days: { weekdays: "Будни", weekends: "Выходные", flexible: "Гибко" },
  times: {
    morning: "Утро",
    afternoon: "День",
    evening: "Вечер",
    unknown: "Ещё не знаю",
  },
  start: {
    soon: "В ближайшее время",
    next: "В следующем месяце",
    later: "Позже",
    choosing: "Пока выбираю",
    "": "Не указано",
  },
  topics: {
    price: "Стоимость и состав курса",
    parts: "Оплата частями",
    online: "Как проходит онлайн-теория",
    practice: "Как согласовать практику",
    admission: "С чего начать поступление",
    other: "Другой вопрос",
  },
  status: {
    new: "Новая заявка",
    clarification: "Нужно уточнение",
    proposed: "Предложена программа",
    contacted: "Связь отмечена",
    closed: "Заявка закрыта",
  },
};
export function changeCategory(d: Draft, category: Draft["category"]): Draft {
  if (d.category === category) return d;
  return {
    ...d,
    category,
    helpFocus: "",
    experience: "",
    transmission: "",
    situation: "",
    interestedPrograms: [],
  };
}
export function toggleExclusive<T extends string>(
  values: T[],
  value: T,
  exclusive: T,
): T[] {
  if (values.includes(value)) return values.filter((x) => x !== value);
  if (value === exclusive) return [value];
  return [...values.filter((x) => x !== exclusive), value];
}
export function recommendation(
  d: Draft,
): { program: Program; reason: string }[] {
  if (d.category === "help" || !d.category) return [];
  let ids: string[] = [];
  let reason = "";
  if (d.category === "A") {
    ids =
      d.experience === "confident" ? ["a-advanced", "a-basic"] : ["a-advanced"];
    reason =
      d.experience === "confident"
        ? "Вы рассматриваете категорию A и уже уверенно управляете мотоциклом."
        : "Вы рассматриваете категорию A. Индивидуальная подготовка позволяет обсудить ваш уровень.";
  } else if (d.experience === "restore") {
    ids = ["b-refresh"];
    reason = "У вас уже есть права, вы хотите восстановить навыки.";
  } else if (d.experience === "other") {
    ids = ["b-start"];
    reason =
      "Вы уже учились. Индивидуальный план нужно обсудить с сотрудником.";
  } else {
    ids =
      d.transmission === "manual"
        ? ["b-standard-mt", "b-mix"]
        : d.transmission === "auto"
          ? ["b-standard-at", "b-mix"]
          : ["b-standard-mt", "b-standard-at"];
    reason =
      d.transmission === "auto"
        ? "Вы рассматриваете категорию B и автомат."
        : d.transmission === "manual"
          ? "Вы рассматриваете категорию B и механику."
          : "Вы хотите разобраться в выборе коробки передач.";
  }
  return ids.map((id) => ({
    program: findProgram(id)!,
    reason:
      id === "b-mix"
        ? "Для сравнения: отдельная программа с двумя коробками. Это не меняет ваш ответ."
        : reason,
  }));
}
export function contactError(a: Draft["applicant"]): string {
  if (a.name.trim().length < 2) return "Укажите имя: не менее двух символов.";
  if (a.method === "telegram" && a.telegramId) return "";
  if (
    a.method === "telegram" &&
    !/^@[A-Za-z][A-Za-z0-9_]{4,31}$/.test(a.contact.trim())
  )
    return "Укажите Telegram в формате @username, от 5 символов после @.";
  if (a.method === "phone" && !/^\+?[\d\s()\-]{10,22}$/.test(a.contact.trim()))
    return "Укажите телефон, например +7 999 123-45-67.";
  if (
    a.method === "phone" &&
    ![10, 11, 12, 13, 14, 15].includes(a.contact.replace(/\D/g, "").length)
  )
    return "В номере должно быть от 10 до 15 цифр.";
  return "";
}
export function draftError(d: Draft): string {
  if (!d.category) return "Выберите направление.";
  if (d.category === "help" && !d.helpFocus)
    return "Уточните направление консультации.";
  if (d.category !== "help" && !d.experience) return "Укажите опыт.";
  if (d.category === "B" && !d.transmission)
    return "Выберите коробку или вариант «Хочу разобраться».";
  if (d.category !== "B" && d.transmission)
    return "Для этого направления коробка автомобиля не нужна.";
  if (d.category === "A" && d.experience === "restore")
    return "Укажите опыт управления мотоциклом.";
  if (d.category === "B" && d.experience === "confident")
    return "Укажите опыт вождения автомобиля.";
  if (
    !d.schedulePreferences.days.length ||
    !d.schedulePreferences.times.length ||
    !d.desiredStart
  )
    return "Укажите пожелания по графику и началу.";
  if (
    d.interestedPrograms.some(
      (id) => !recommendation(d).some((r) => r.program.id === id),
    )
  )
    return "Программа не соответствует ответам. Повторите подбор.";
  return contactError(d.applicant);
}
export function createApplication(d: Draft, id: string): Application {
  const error = draftError(d);
  if (error) throw new Error(error);
  const now = new Date().toISOString();
  return {
    ...structuredClone(d),
    id,
    createdAt: now,
    updatedAt: now,
    status: "new",
    version: 1,
    programSnapshots: recommendation(d).map(({ program }) =>
      structuredClone(program),
    ),
    adminReply: null,
    messages: [],
  };
}
export function applyAction(
  app: Application,
  input: Action,
  actorRole: Actor["role"],
): Application {
  const action = actionSchema.parse(input);
  const admin = ["question", "propose", "contacted", "close"].includes(
    action.type,
  );
  if (admin && actorRole !== "admin")
    throw new Error("Действие доступно только администратору.");
  if (!admin && actorRole !== "student")
    throw new Error("Действие доступно ученику.");
  if (app.status === "closed")
    throw new Error("Заявка закрыта. Создайте новое обращение.");
  const next = structuredClone(app),
    now = new Date().toISOString();
  next.updatedAt = now;
  next.version++;
  const add = (text: string, author: "admin" | "student" | "system") =>
    next.messages.push({
      id: crypto.randomUUID(),
      text,
      author,
      createdAt: now,
    });
  if (action.type === "question") {
    next.status = "clarification";
    add(action.text, "admin");
  }
  if (action.type === "propose") {
    const p = findProgram(action.programId);
    if (!p) throw new Error("Программа не найдена.");
    if (app.category !== "help" && p.category !== app.category)
      throw new Error("Выберите программу нужной категории.");
    next.status = "proposed";
    next.adminReply = {
      program: structuredClone(p),
      comment: action.text,
      createdAt: now,
    };
    add("Предложена программа " + p.name + ". " + action.text, "admin");
  }
  if (action.type === "contacted") {
    next.status = "contacted";
    add("Сотрудник отметил связь с учеником.", "system");
  }
  if (action.type === "close") {
    next.status = "closed";
    add("Сотрудник закрыл заявку.", "system");
  }
  if (action.type === "message") {
    add(action.text, "student");
  }
  if (action.type === "interest") {
    if (!next.adminReply)
      throw new Error("Сначала дождитесь предложения программы.");
    if (next.adminReply.interestedAt) return app;
    next.adminReply.interestedAt = now;
    add(
      "Хочу обсудить программу " + next.adminReply.program.name + ".",
      "student",
    );
  }
  return next;
}
