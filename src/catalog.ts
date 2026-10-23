export const CHECKED_AT = "2026-10-23";
export type Program = {
  id: string;
  name: string;
  category: "B" | "A";
  transmission?: string;
  price: number | null;
  basePrice?: number;
  priceKind: "promotion" | "from" | "unknown";
  payment?: string;
  duration?: string;
  format: string;
  includes: string[];
  caution?: string;
  source: string;
  checkedAt: string;
};
const auto = {
  category: "B" as const,
  priceKind: "promotion" as const,
  duration: "3 месяца по данным сайта",
  format: "Теория онлайн · практика очно",
  includes: [
    "Онлайн-курс ПДД",
    "Вождение на Skoda Rapid",
    "Сопровождение на экзамене",
  ],
  source: "https://hi-prof.ru/avto",
  checkedAt: CHECKED_AT,
};
export const programs: Program[] = [
  {
    ...auto,
    id: "b-standard-mt",
    name: "«Стандарт» МКПП",
    transmission: "Механика",
    price: 60000,
    basePrice: 68000,
    payment: "На сайте: 4 платежа по 15 000 ₽",
  },
  {
    ...auto,
    id: "b-standard-at",
    name: "«Стандарт» АКПП",
    transmission: "Автомат",
    price: 66000,
    basePrice: 74000,
    payment: "На сайте: 4 платежа по 16 500 ₽",
  },
  {
    ...auto,
    id: "b-mix",
    name: "«Микс»",
    transmission: "Механика + автомат",
    price: 64000,
    basePrice: 72000,
    payment: "На сайте: 4 платежа по 16 000 ₽",
  },
  {
    ...auto,
    id: "b-start",
    name: "«Старт»",
    transmission: "Механика; автомат по запросу",
    price: 36000,
    basePrice: 41000,
    duration: undefined,
    payment: "На сайте: оплата долями 50/50",
    includes: [
      "Индивидуальный план практики",
      "Онлайн-курс ПДД",
      "Сопровождение на экзамене",
    ],
    caution:
      "Для уже имеющих опыт или обучавшихся ранее. План и коробку уточнит сотрудник.",
  },
  {
    id: "b-refresh",
    name: "«Восстановление навыков»",
    category: "B",
    transmission: "Механика / автомат",
    price: null,
    priceKind: "unknown",
    format: "Очные занятия",
    includes: [
      "Авторский курс на Skoda Rapid",
      "От 2 до 8 занятий по данным сайта",
    ],
    caution:
      "На сайте указано 3 000 ₽ без однозначной единицы расчёта. Полную стоимость согласует администратор.",
    source: "https://hi-prof.ru/avto",
    checkedAt: CHECKED_AT,
  },
  {
    id: "a-basic",
    name: "Базовый групповой мотокурс",
    category: "A",
    price: 23000,
    basePrice: 28000,
    priceKind: "promotion",
    format: "Группа · тёплый сезон",
    includes: ["Теоретическая подготовка", "Практика на открытой площадке"],
    caution:
      "Для уверенно управляющих мотоциклом. Даты, сезон и доступность группы уточнит администратор.",
    source: "https://hi-prof.ru/no11-programma-bazovyj-kurs-prava",
    checkedAt: CHECKED_AT,
  },
  {
    id: "a-advanced",
    name: "Продвинутый мотокурс",
    category: "A",
    price: 45000,
    basePrice: 50000,
    priceKind: "promotion",
    format: "Индивидуально · круглый год",
    includes: [
      "Дистанционная теория",
      "Базовая и контраварийная практика",
      "Экипировка для занятий",
    ],
    caution:
      "Летняя площадка и тёплый зимний трек. Возможный старт и состав выбранного пакета согласует сотрудник.",
    source: "https://hi-prof.ru/no12-programma-prodvinutyj-kurs",
    checkedAt: CHECKED_AT,
  },
];
export const findProgram = (id: string) => programs.find((p) => p.id === id);
export const money = (n: number) =>
  new Intl.NumberFormat("ru-RU").format(n) + " ₽";
export const priceText = (p: Program) =>
  p.price === null
    ? "Стоимость уточнит администратор"
    : (p.priceKind === "from" ? "от " : "") + money(p.price);
export const faq = [
  {
    id: "format",
    question: "Что изучается онлайн, а что — очно?",
    answer:
      "Теория доступна дистанционно на платформе школы. Вождение проходит очно. Доступ к учебной системе оформляется отдельно после договора; этот сервис помогает до поступления.",
    source: "https://hi-prof.ru/on-line-obuchenie",
    checkedAt: CHECKED_AT,
  },
  {
    id: "schedule",
    question: "Как согласовать график практики?",
    answer:
      "Практику обсуждают с инструктором, в том числе на вечер и выходные. В анкете вы указываете пожелания. Возможное расписание подтвердит сотрудник.",
    source: "https://hi-prof.ru/faq",
    checkedAt: CHECKED_AT,
  },
  {
    id: "includes",
    question: "Что входит в выбранную программу?",
    answer:
      "Основные пункты перечислены в карточках программ. Полный состав выбранного курса уточните у администратора. Медсправка, фотографии и госпошлина — отдельные расходы; общую сумму здесь не рассчитываем.",
    source: "https://hi-prof.ru/faq",
    checkedAt: CHECKED_AT,
  },
  {
    id: "payment",
    question: "Где уточнить оплату частями?",
    answer:
      "Школа описывает поэтапную оплату на период обучения. Порядок платежей и применимость акции согласуйте с сотрудником для конкретной программы.",
    source: "https://hi-prof.ru/avto",
    checkedAt: CHECKED_AT,
  },
  {
    id: "previous",
    question: "Уже учился в другой автошколе. Как быть?",
    answer:
      "Кратко опишите ситуацию в анкете. Сотрудник обсудит предыдущую подготовку и дальнейший план. Загружать документы здесь не нужно; допуск и зачёт подготовки автоматически не определяются.",
    source: "https://hi-prof.ru/faq",
    checkedAt: CHECKED_AT,
  },
];
