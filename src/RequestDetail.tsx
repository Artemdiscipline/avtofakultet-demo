import { useState } from "react";
import {
  ArrowLeft,
  Check,
  MessageCircle,
  Send,
  ChevronDown,
  ArrowRight,
  UserRound,
  Phone,
  BriefcaseBusiness,
} from "lucide-react";
import { programs } from "./catalog";
import { labels, type Application, type Action, type Actor } from "./model";
import { LIVE } from "./storage";
import { Summary, ProgramCard, StatusBadge, dateTime } from "./components";
export function RequestDetail({
  app: a,
  role,
  onAction,
  onBack,
  busy,
  error,
  onPreviewRole,
}: {
  app: Application;
  role: Actor["role"];
  onAction: (a: Action) => Promise<boolean>;
  onBack: () => void;
  busy: boolean;
  error: string;
  onPreviewRole?: () => void;
}) {
  const [text, setText] = useState(""),
    [tool, setTool] = useState<"question" | "propose" | null>(null),
    [programId, setProgramId] = useState("");
  const [validation, setValidation] = useState("");
  const send = async (action: Action) => {
    setValidation("");
    if ("text" in action && !action.text.trim()) {
      setValidation("Напишите сообщение.");
      return;
    }
    if (action.type === "propose" && !action.programId) {
      setValidation("Выберите программу.");
      return;
    }
    if (await onAction(action)) {
      setText("");
      setTool(null);
    }
  };
  const admin = role === "admin",
    closed = a.status === "closed";
  const lastReply = a.messages.filter((m) => m.author !== "system").at(-1);
  const previewReady = admin ? lastReply?.author === "admin" : lastReply?.author !== "admin";
  return (
    <section className="panel request-detail">
      <button className="text-button back-link" onClick={onBack}>
        <ArrowLeft size={16} />К списку заявок
      </button>
      <div className="request-heading">
        <div>
          <div className="eyebrow">
            {admin ? "ОБРАЩЕНИЕ УЧЕНИКА" : "МОЯ ЗАЯВКА"}
          </div>
          <h1>{admin ? a.applicant.name : "Моё обращение"}</h1>
          <p className="small muted">
            {a.id} · {dateTime(a.createdAt)}
          </p>
        </div>
        <StatusBadge status={a.status} />
      </div>
      {!LIVE && (
        <p className="local-note">
          Тестовая заявка · сохранена в этом браузере · не отправлена школе
        </p>
      )}
      <div className="applicant-overview">
        <div><UserRound size={18} aria-hidden="true" /><span><small>Ученик</small><strong>{a.applicant.name}</strong></span></div>
        <div><Phone size={18} aria-hidden="true" /><span><small>{a.applicant.method === "telegram" ? "Telegram" : "Телефон"}</small><strong>{a.applicant.contact || "Через тестового бота"}</strong></span></div>
        <div><span className="category-token">{a.category === "help" ? "?" : a.category}</span><span><small>Направление</small><strong>{labels.category[a.category]}</strong></span></div>
      </div>
      {onPreviewRole && previewReady && (
        <div className="role-preview">
          <span className="preview-symbol">{admin ? <UserRound size={22} /> : <BriefcaseBusiness size={22} />}</span>
          <div><strong>{admin ? "Ответ школы сохранён" : lastReply ? "Ответ ученика сохранён" : "Попробуйте ответить за школу"}</strong><p>{admin ? "Переключитесь в роль ученика: он увидит ваш вопрос или предложение в этой же заявке." : "Откройте эту же заявку в роли администратора. Все ответы ученика уже на месте."}</p></div>
          <button className="button outline" onClick={onPreviewRole}>{admin ? "Посмотреть как ученик" : "Открыть как администратор"}<ArrowRight size={16} /></button>
        </div>
      )}
        {admin && !closed && (
          <div className="admin-actions">
            <div className="eyebrow">ДЕЙСТВИЯ АДМИНИСТРАТОРА</div>
            <h2>Что ответим ученику?</h2>
            <p className="muted small">Изучите пожелания в разделе «Все ответы и контакт» и выберите действие.</p>
            <div className="two-columns">
              <button
                className={
                  "button " + (tool === "question" ? "soft" : "outline")
                }
                onClick={() => {
                  setTool("question");
                  setText("");
                }}
              >
                <MessageCircle size={18} />Задать вопрос
              </button>
              <button
                className={
                  "button " + (tool === "propose" ? "soft" : "outline")
                }
                onClick={() => {
                  setTool("propose");
                  setText("");
                }}
              >
                <Check size={18} />Предложить программу
              </button>
            </div>
            {tool && (
              <form
                className="admin-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  void send(
                    tool === "question"
                      ? { type: "question", text }
                      : { type: "propose", text, programId },
                  );
                }}
              >
                {tool === "propose" && (
                  <label className="field">
                    Программа
                    <select
                      value={programId}
                      onChange={(e) => setProgramId(e.target.value)}
                    >
                      <option value="">Выберите программу</option>
                      {programs
                        .filter(
                          (p) =>
                            a.category === "help" || p.category === a.category,
                        )
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </label>
                )}
                {tool === "propose" && programId && <ProgramCard compact program={programs.find((p) => p.id === programId)!} />}
                {tool === "question" && <button type="button" className="question-example" onClick={() => setText("Подскажите, занятия в будни вечером вам подойдут? Или удобнее выходные?")}>Вставить пример вопроса <ArrowRight size={14} /></button>}
                <label className="field">
                  {tool === "question"
                    ? "Вопрос ученику"
                    : "Комментарий сотрудника"}
                  <textarea
                    maxLength={1000}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={3}
                    placeholder={
                      tool === "question"
                        ? "Например, удобны ли вам занятия по выходным?"
                        : "Какие условия и детали стоит обсудить?"
                    }
                  />
                </label>
                {tool === "propose" && (
                  <p className="small muted">
                    К предложению добавятся подтверждённые сведения из каталога.
                    Исходная заявка сохранится.
                  </p>
                )}
                <button
                  type="submit"
                  className="button primary"
                  disabled={
                    busy || !text.trim() || (tool === "propose" && !programId)
                  }
                >
                  {busy
                    ? "Сохраняем…"
                    : tool === "question"
                      ? "Сохранить вопрос"
                      : "Сохранить предложение"}
                  <Send size={17} />
                </button>
              </form>
            )}
            <div className="secondary-actions">
              <button
                className="text-button"
                disabled={busy}
                onClick={() => send({ type: "contacted" })}
              >
                Отметить связь с учеником
              </button>
              <button
                className="text-button danger"
                disabled={busy}
                onClick={() => send({ type: "close" })}
              >
                Закрыть заявку
              </button>
            </div>
          </div>
        )}
      {a.adminReply && (
        <div className="proposal">
          <div className="eyebrow">ПРЕДЛОЖЕНИЕ АДМИНИСТРАТОРА</div>
          <ProgramCard program={a.adminReply.program} />
          <p className="proposal-comment">{a.adminReply.comment}</p>
          {!admin && (
            <button
              className="button primary"
              disabled={busy || closed || !!a.adminReply.interestedAt}
              onClick={() => send({ type: "interest" })}
            >
              {a.adminReply.interestedAt ? (
                <>
                  <Check size={18} />
                  Интерес зафиксирован
                </>
              ) : (
                "Хочу обсудить эту программу"
              )}
            </button>
          )}
          <p className="small muted">
            {a.adminReply.interestedAt
              ? "Ученик хочет обсудить предложение. "
              : ""}
            Это обсуждение программы. Оплата, договор и место в группе не
            оформлены.
          </p>
        </div>
      )}
      <details className="request-summary" open={!a.messages.length}>
        <summary>
          Все ответы и контакт <ChevronDown size={18} />
        </summary>
        <Summary draft={a} snapshots={a.programSnapshots} />
      </details>
      <div className="conversation">
        <div className="section-title">
          <MessageCircle size={20} />
          <h2>{!admin && lastReply?.author === "admin" && !a.adminReply ? "Администратор ждёт ваш ответ" : "Диалог по заявке"}</h2>
        </div>
        {!a.messages.length && (
          <p className="muted">
            Здесь появятся уточнения и ответы по вашему обращению.
          </p>
        )}
        <ol className="messages" aria-live="polite">
          {a.messages.map((m) => (
            <li className={"message message-" + m.author} key={m.id}>
              <div className="message-meta">
                <strong>
                  {m.author === "admin"
                    ? "Администратор"
                    : m.author === "student"
                      ? "Ученик"
                      : "История заявки"}
                </strong>
                <time dateTime={m.createdAt}>{dateTime(m.createdAt)}</time>
              </div>
              <p>{m.text}</p>
            </li>
          ))}
        </ol>
        {!admin && !closed && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send({ type: "message", text });
            }}
            className="message-form"
          >
            <label className="field">
              Ответить администратору
              <textarea
                maxLength={1000}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ваш ответ или дополнительный вопрос"
                rows={3}
              />
            </label>
            <button
              className="button primary"
              disabled={busy || !text.trim()}
              type="submit"
            >
              {busy ? "Сохраняем…" : "Отправить ответ"}
              <Send size={17} />
            </button>
          </form>
        )}
        {closed && (
          <p className="info-line">
            <Check size={18} />
            Обращение закрыто. История и исходные ответы сохранены.
          </p>
        )}
        {(validation || error) && (
          <div className="error" role="alert">
            {validation || error}
          </div>
        )}
      </div>
    </section>
  );
}
