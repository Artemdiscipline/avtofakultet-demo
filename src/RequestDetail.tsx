import { useState } from "react";
import {
  ArrowLeft,
  Check,
  MessageCircle,
  Send,
  ChevronDown,
} from "lucide-react";
import { programs } from "./catalog";
import { type Application, type Action, type Actor } from "./model";
import { LIVE } from "./storage";
import { Summary, ProgramCard, StatusBadge, dateTime } from "./components";
export function RequestDetail({
  app: a,
  role,
  onAction,
  onBack,
  busy,
  error,
}: {
  app: Application;
  role: Actor["role"];
  onAction: (a: Action) => Promise<boolean>;
  onBack: () => void;
  busy: boolean;
  error: string;
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
          <h1>{a.id}</h1>
          <p className="small muted">
            Создана {dateTime(a.createdAt)} · обновлена {dateTime(a.updatedAt)}
          </p>
        </div>
        <StatusBadge status={a.status} />
      </div>
      {!LIVE && (
        <p className="local-note">
          Тестовая заявка · сохранена в этом браузере · не отправлена школе
        </p>
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
          <h2>Диалог по заявке</h2>
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
        {admin && !closed && (
          <div className="admin-actions">
            <h2>Следующий шаг</h2>
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
                Нужно уточнение
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
                Предложить программу
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
