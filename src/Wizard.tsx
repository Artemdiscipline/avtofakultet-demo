import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  CarFront,
  Bike,
  Compass,
  LockKeyhole,
  Check,
  ChevronRight,
  Info,
} from "lucide-react";
import { programs, findProgram } from "./catalog";
import {
  changeCategory,
  labels,
  recommendation,
  contactError,
  toggleExclusive,
  type Draft,
} from "./model";
import { LIVE } from "./storage";
import { Choice, ProgramCard, Summary } from "./components";
export const stepTitles = [
  "С чего начнём ваше обучение?",
  "Расскажите о вашем опыте",
  "Когда вам удобно заниматься?",
  "Что хочется уточнить?",
  "Программы для обсуждения",
  "Всё верно? Давайте проверим",
];
export function Wizard({
  draft: d,
  setDraft,
  step,
  go,
  onSubmit,
  busy,
  error,
  editMode,
  onCancelEdit,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  step: number;
  go: (n: number) => void;
  onSubmit: () => void;
  busy: boolean;
  error: string;
  editMode: boolean;
  onCancelEdit: () => void;
}) {
  const [validation, setValidation] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    setValidation("");
    heading.current?.focus({ preventScroll: true });
  }, [step]);
  const patch = (p: Partial<Draft>) => setDraft({ ...d, ...p });
  const experienceOptions =
    d.category === "A"
      ? [
          ["zero", "Начинаю с нуля", "Раньше не управлял(а) мотоциклом"],
          [
            "tried",
            "Немного пробовал(а)",
            "Хочу увереннее чувствовать себя за рулём",
          ],
          [
            "confident",
            "Уверенно управляю",
            "Хочу обсудить программу и подготовку",
          ],
          [
            "other",
            "Уже учился(ась) в другой школе",
            "Расскажу о своей ситуации",
          ],
        ]
      : [
          ["zero", "Начинаю с нуля", "Первый опыт — вместе с инструктором"],
          [
            "tried",
            "Немного пробовал(а) водить",
            "Нужна подготовка к самостоятельному вождению",
          ],
          ["other", "Уже учился(ась) в другой школе", "Нужен дальнейший план"],
          [
            "restore",
            "Права уже есть, хочу восстановить навыки",
            "Отдельный запрос на практическую подготовку",
          ],
        ];
  const ready =
    step === 0
      ? !!d.category
      : step === 1
        ? d.category === "help"
          ? !!d.helpFocus
          : !!d.experience && (d.category !== "B" || !!d.transmission)
        : step === 2
          ? !!d.schedulePreferences.days.length &&
            !!d.schedulePreferences.times.length &&
            !!d.desiredStart
          : true;
  const proceed = () => {
    if (step === 5) {
      const e = contactError(d.applicant);
      setValidation(e);
      if (!e) onSubmit();
    } else if (
      editMode &&
      step === 0 &&
      ((d.category === "help" && !d.helpFocus) ||
        (d.category !== "help" && !d.experience))
    )
      go(1);
    else go(editMode ? 5 : step + 1);
  };
  return (
    <section className="wizard panel" aria-label="Подбор обучения">
      <div className="panel-eyebrow">
        <span>{step === 0 ? "ВАШ ПЕРВЫЙ ШАГ" : "ВАШ МАРШРУТ К ОБУЧЕНИЮ"}</span>
        <span className="step-count">
          {String(step + 1).padStart(2, "0")} <i>/ 06</i>
        </span>
      </div>
      <div className="wizard-content" key={step}>
        <h1 ref={heading} tabIndex={-1}>
          {step === 1 && d.category === "help"
            ? "С чем помочь разобраться?"
            : stepTitles[step]}
        </h1>
        {step === 0 && (
          <>
            <p className="lead">
              Ответьте на несколько вопросов — поможем разобраться в программах
              и передадим пожелания администратору.
            </p>
            <div className="direction-grid">
              <Choice
                title="Категория B"
                description="Автомобиль"
                selected={d.category === "B"}
                onClick={() => setDraft(changeCategory(d, "B"))}
                icon={<CarFront size={38} strokeWidth={1.5} />}
              />
              <Choice
                title="Категория A"
                description="Мотоцикл"
                selected={d.category === "A"}
                onClick={() => setDraft(changeCategory(d, "A"))}
                icon={<Bike size={39} strokeWidth={1.5} />}
              />
              <div className="help-choice">
                <Choice
                  title="Пока не знаю — нужна помощь"
                  description="Разберёмся вместе"
                  selected={d.category === "help"}
                  onClick={() => setDraft(changeCategory(d, "help"))}
                  icon={<Compass size={25} strokeWidth={1.5} />}
                />
              </div>
            </div>
            <p className="privacy-hint">
              <LockKeyhole size={15} />
              Начать можно без номера телефона
            </p>
          </>
        )}
        {step === 1 && (
          <>
            {d.category === "help" ? (
              <>
                <p className="lead">
                  К чему вы пока склоняетесь? Подробности можно обсудить с
                  сотрудником.
                </p>
                <div className="choices">
                  {(
                    [
                      ["car", "Скорее автомобиль"],
                      ["moto", "Скорее мотоцикл"],
                      ["general", "Нужна общая консультация"],
                    ] as const
                  ).map(([value, title]) => (
                    <Choice
                      key={value}
                      title={title}
                      selected={d.helpFocus === value}
                      onClick={() => patch({ helpFocus: value })}
                    />
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="lead">
                  {d.category === "A"
                    ? "Какой у вас опыт управления мотоциклом?"
                    : "Выберите, что ближе к вашей ситуации."}
                </p>
                <div className="choices">
                  {experienceOptions.map(([value, title, desc]) => (
                    <Choice
                      key={value}
                      title={title}
                      description={desc}
                      selected={d.experience === value}
                      onClick={() =>
                        patch({
                          experience: value as Draft["experience"],
                          situation: value === "other" ? d.situation : "",
                          interestedPrograms: [],
                        })
                      }
                    />
                  ))}
                </div>
                {d.experience === "other" && (
                  <label className="field">
                    Коротко о ситуации{" "}
                    <span className="optional">необязательно</span>
                    <textarea
                      maxLength={600}
                      value={d.situation}
                      onChange={(e) => patch({ situation: e.target.value })}
                      placeholder="Например, прошёл(ла) теорию, хочу продолжить практику"
                      rows={3}
                    />
                    <small>
                      Документы загружать не нужно. План обсудит сотрудник.
                    </small>
                  </label>
                )}
                {d.category === "B" && (
                  <fieldset>
                    <legend>Какую коробку рассматриваете?</legend>
                    <div className="choices">
                      {(
                        [
                          ["manual", "Механика"],
                          ["auto", "Автомат"],
                          ["unsure", "Хочу разобраться в различиях"],
                        ] as const
                      ).map(([value, title]) => (
                        <Choice
                          key={value}
                          title={title}
                          selected={d.transmission === value}
                          onClick={() =>
                            patch({
                              transmission: value,
                              interestedPrograms: [],
                            })
                          }
                        />
                      ))}
                    </div>
                  </fieldset>
                )}
              </>
            )}
          </>
        )}
        {step === 2 && (
          <>
            <p className="lead">
              Теория — дистанционно, практика — очно. Отметьте все удобные
              варианты.
            </p>
            <fieldset>
              <legend>Дни для практики</legend>
              <div className="chip-group">
                {(["weekdays", "weekends", "flexible"] as const).map(
                  (value) => (
                    <button
                      type="button"
                      className={
                        "chip " +
                        (d.schedulePreferences.days.includes(value)
                          ? "active"
                          : "")
                      }
                      aria-pressed={d.schedulePreferences.days.includes(value)}
                      key={value}
                      onClick={() =>
                        patch({
                          schedulePreferences: {
                            ...d.schedulePreferences,
                            days: toggleExclusive(
                              d.schedulePreferences.days,
                              value,
                              "flexible",
                            ),
                          },
                        })
                      }
                    >
                      {d.schedulePreferences.days.includes(value) && (
                        <Check size={15} />
                      )}{" "}
                      {labels.days[value]}
                    </button>
                  ),
                )}
              </div>
            </fieldset>
            <fieldset>
              <legend>Время дня</legend>
              <div className="chip-group">
                {(["morning", "afternoon", "evening", "unknown"] as const).map(
                  (value) => (
                    <button
                      type="button"
                      className={
                        "chip " +
                        (d.schedulePreferences.times.includes(value)
                          ? "active"
                          : "")
                      }
                      aria-pressed={d.schedulePreferences.times.includes(value)}
                      key={value}
                      onClick={() =>
                        patch({
                          schedulePreferences: {
                            ...d.schedulePreferences,
                            times: toggleExclusive(
                              d.schedulePreferences.times,
                              value,
                              "unknown",
                            ),
                          },
                        })
                      }
                    >
                      {d.schedulePreferences.times.includes(value) && (
                        <Check size={15} />
                      )}{" "}
                      {labels.times[value]}
                    </button>
                  ),
                )}
              </div>
            </fieldset>
            <fieldset>
              <legend>Когда хочется начать?</legend>
              <div className="two-columns">
                {(["soon", "next", "later", "choosing"] as const).map(
                  (value) => (
                    <Choice
                      key={value}
                      title={labels.start[value]}
                      selected={d.desiredStart === value}
                      onClick={() => patch({ desiredStart: value })}
                    />
                  ),
                )}
              </div>
            </fieldset>
            <p className="info-line">
              <Info size={18} />
              Это ваши пожелания. Возможное расписание согласует администратор.
            </p>
          </>
        )}
        {step === 3 && (
          <>
            <p className="lead">
              Добавим вопросы к заявке, чтобы сотрудник сразу понимал, что для
              вас важно. Этот шаг можно пропустить.
            </p>
            <div className="choices">
              {(
                [
                  "price",
                  "parts",
                  "online",
                  "practice",
                  "admission",
                  "other",
                ] as const
              ).map((value) => (
                <Choice
                  multiple
                  key={value}
                  title={labels.topics[value]}
                  selected={d.questions.topics.includes(value)}
                  onClick={() =>
                    patch({
                      questions: {
                        ...d.questions,
                        topics: d.questions.topics.includes(value)
                          ? d.questions.topics.filter((x) => x !== value)
                          : [...d.questions.topics, value],
                      },
                    })
                  }
                />
              ))}
            </div>
            <label className="field">
              Ваш вопрос <span className="optional">необязательно</span>
              <textarea
                value={d.questions.text}
                onChange={(e) =>
                  patch({ questions: { ...d.questions, text: e.target.value } })
                }
                maxLength={1000}
                rows={3}
                placeholder="Что ещё хочется узнать перед поступлением?"
              />
              <small>
                Вопросы о документах, здоровье и допуске обсудит сотрудник.
              </small>
            </label>
          </>
        )}
        {step === 4 && (
          <>
            <p className="lead">
              {recommendation(d).length
                ? "Эти варианты подходят для разговора с сотрудником. Можно выбрать программу или оставить запрос на консультацию."
                : "Администратор поможет подобрать программу под ваш случай. Выбирать тариф для обращения не нужно."}
            </p>
            <div className="program-grid">
              {recommendation(d).map(({ program, reason }) => (
                <ProgramCard
                  key={program.id}
                  program={program}
                  reason={reason}
                  selected={d.interestedPrograms.includes(program.id)}
                  onSelect={() =>
                    patch({
                      interestedPrograms: d.interestedPrograms.includes(
                        program.id,
                      )
                        ? d.interestedPrograms.filter((x) => x !== program.id)
                        : [...d.interestedPrograms, program.id],
                    })
                  }
                />
              ))}
            </div>
            <div className="consultation-choice">
              <Choice
                title="Пока нужна консультация"
                description="Сотрудник поможет определиться"
                selected={!d.interestedPrograms.length}
                onClick={() => patch({ interestedPrograms: [] })}
                icon={<Compass size={25} />}
              />
            </div>
            <p className="info-line">
              <Info size={18} />
              Цены проверены 23 октября 2026. Условия акции и полный состав
              согласует школа. Медсправка, фото и госпошлина оплачиваются
              отдельно.
            </p>
          </>
        )}
        {step === 5 && (
          <>
            <p className="lead">
              Проверьте пожелания и оставьте удобный способ связи. Окончательные
              условия согласует сотрудник школы.
            </p>
            <Summary
              draft={d}
              snapshots={d.interestedPrograms
                .map((id) => findProgram(id)!)
                .filter(Boolean)}
              onEdit={go}
              contact={false}
            />
            <div className="contact-heading">
              <h2>Как к вам обращаться?</h2>
              {!LIVE && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    patch({
                      applicant: {
                        name: "Тестовый ученик",
                        method: "telegram",
                        contact: "@demo_student",
                        contactTime: "После 18:00 · тестовые данные",
                      },
                    })
                  }
                >
                  Заполнить тестовыми данными <ChevronRight size={15} />
                </button>
              )}
            </div>
            <label className="field">
              Имя
              <input
                name="name"
                autoComplete="given-name"
                maxLength={80}
                value={d.applicant.name}
                onChange={(e) =>
                  patch({ applicant: { ...d.applicant, name: e.target.value } })
                }
                placeholder="Ваше имя"
              />
            </label>
            <fieldset>
              <legend>Удобный способ связи</legend>
              <div className="two-columns">
                {(["telegram", "phone"] as const).map((method) => (
                  <Choice
                    key={method}
                    title={method === "telegram" ? "Telegram" : "Телефон"}
                    selected={d.applicant.method === method}
                    onClick={() =>
                      patch({
                        applicant: {
                          ...d.applicant,
                          method,
                          contact:
                            method === d.applicant.method
                              ? d.applicant.contact
                              : "",
                        },
                      })
                    }
                  />
                ))}
              </div>
            </fieldset>
            {LIVE && d.applicant.method === "telegram" ? (
              <p className="info-line">
                <Check size={18} />
                Для связи используем ваш подтверждённый Telegram через
                отдельного бота проекта.
              </p>
            ) : (
              <label className="field">
                {d.applicant.method === "telegram"
                  ? "Имя пользователя Telegram"
                  : "Номер телефона"}
                <input
                  name="contact"
                  autoComplete={d.applicant.method === "phone" ? "tel" : "off"}
                  type={d.applicant.method === "phone" ? "tel" : "text"}
                  inputMode={d.applicant.method === "phone" ? "tel" : "text"}
                  maxLength={80}
                  value={d.applicant.contact}
                  onChange={(e) =>
                    patch({
                      applicant: { ...d.applicant, contact: e.target.value },
                    })
                  }
                  placeholder={
                    d.applicant.method === "telegram"
                      ? "@username"
                      : "+7 999 123-45-67"
                  }
                  aria-invalid={!!validation}
                />
                <small>
                  {d.applicant.method === "telegram"
                    ? "Телефон не требуется. В демо используйте тестовый контакт."
                    : "В демо используйте тестовый номер."}
                </small>
              </label>
            )}
            <label className="field">
              Когда удобно связаться{" "}
              <span className="optional">необязательно</span>
              <input
                maxLength={200}
                value={d.applicant.contactTime}
                onChange={(e) =>
                  patch({
                    applicant: { ...d.applicant, contactTime: e.target.value },
                  })
                }
                placeholder="Например, по будням после 18:00"
              />
            </label>
            <div className="demo-notice">
              <ShieldCheckIcon />
              {LIVE ? (
                <p>
                  Запрос сохранится на тестовом сервере проекта. Это обращение
                  для обсуждения условий, без зачисления и бронирования.
                </p>
              ) : (
                <p>
                  Это тестовая заявка. Она сохранится в этом браузере и не будет
                  отправлена автошколе.
                </p>
              )}
            </div>
          </>
        )}
      </div>
      {(validation || error) && (
        <div className="error" role="alert">
          {validation || error}
        </div>
      )}
      <div className="wizard-actions">
        {step > 0 && (
          <button
            type="button"
            className="button back"
            aria-label="Назад"
            disabled={busy}
            onClick={() => go(step - 1)}
          >
            <ArrowLeft size={18} />
            <span>Назад</span>
          </button>
        )}
        <button
          type="button"
          className="button primary"
          disabled={!ready || busy}
          onClick={proceed}
        >
          {busy
            ? "Сохраняем…"
            : step === 5
              ? error
                ? "Повторить"
                : LIVE
                  ? "Отправить запрос на подбор"
                  : "Создать тестовую заявку"
              : editMode
                ? "Сохранить и вернуться"
                : step === 4
                  ? "Проверить заявку"
                  : "Продолжить"}
          {!busy && <ArrowRight size={19} />}
        </button>
      </div>
      {editMode && step !== 5 && (
        <button className="text-button cancel-edit" onClick={onCancelEdit}>
          Вернуться к проверке заявки
        </button>
      )}
      {step === 3 && (
        <button
          type="button"
          className="skip-button"
          onClick={() => go(editMode ? 5 : 4)}
        >
          Продолжить без новых вопросов
        </button>
      )}
    </section>
  );
}
function ShieldCheckIcon() {
  return <LockKeyhole size={22} />;
}
