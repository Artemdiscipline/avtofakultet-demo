import {
  ArrowUpRight,
  Check,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { type Program, priceText, money } from "./catalog";
import { labels, type Draft, type Application, type Status } from "./model";
export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={"status status-" + status}>
      <i />
      {labels.status[status]}
    </span>
  );
}
export function Choice({
  title,
  description,
  selected,
  onClick,
  icon,
  multiple = false,
}: {
  title: string;
  description?: string;
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  multiple?: boolean;
}) {
  return (
    <button
      type="button"
      className={
        "choice " + (selected ? "selected " : "") + (icon ? "with-icon" : "")
      }
      aria-label={description ? title + " · " + description : title}
      aria-pressed={selected}
      onClick={onClick}
    >
      {icon && <span className="choice-icon">{icon}</span>}
      <span className="choice-copy">
        <strong>{title}</strong>
        {description && <span>{description}</span>}
      </span>
      <span className={"selection " + (multiple ? "square" : "")}>
        {selected ? <Check size={15} strokeWidth={3} /> : null}
      </span>
    </button>
  );
}
export function ProgramCard({
  program: p,
  reason,
  selected,
  onSelect,
  compact = false,
}: {
  program: Program;
  reason?: string;
  selected?: boolean;
  onSelect?: () => void;
  compact?: boolean;
}) {
  return (
    <article className={"program-card " + (selected ? "chosen" : "")}>
      <div className="program-top">
        <span className="tag">Категория {p.category}</span>
        {p.id === "b-mix" && <span className="muted">Для сравнения</span>}
      </div>
      <h3>{p.name}</h3>
      <p className="program-format">
        {p.transmission && p.transmission + " · "}
        {p.format}
      </p>
      <div className="price">{priceText(p)}</div>
      {p.priceKind === "promotion" && (
        <p className="price-caption">
          Полная цена курса по акции на сайте · базовая {money(p.basePrice!)}
        </p>
      )}
      {p.priceKind === "from" && (
        <p className="price-caption">Ориентир за курс по данным сайта</p>
      )}
      {!compact && (
        <>
          <ul className="included">
            {p.includes.map((x) => (
              <li key={x}>
                <Check size={15} />
                {x}
              </li>
            ))}
          </ul>
          {p.duration && <p className="small muted">{p.duration}</p>}
          {p.payment && (
            <p className="small">
              {p.payment}. Применимость уточнит сотрудник.
            </p>
          )}
          {p.caution && <p className="program-caution">{p.caution}</p>}
          {reason && (
            <p className="reason">
              <ShieldCheck size={16} />
              {reason}
            </p>
          )}
        </>
      )}
      <div className="source-line">
        <a href={p.source} target="_blank" rel="noreferrer">
          Данные школы <ExternalLink size={12} />
        </a>
        <span>Проверено 23.10.2026</span>
      </div>
      {onSelect && (
        <button
          type="button"
          className={"button " + (selected ? "soft" : "outline")}
          aria-pressed={!!selected}
          onClick={onSelect}
        >
          {selected ? (
            <>
              <Check size={17} />
              Выбрано для обсуждения
            </>
          ) : (
            "Интересует эта программа"
          )}
        </button>
      )}
    </article>
  );
}
export function Summary({
  draft: d,
  snapshots,
  onEdit,
  contact = true,
}: {
  draft: Draft | Application;
  snapshots?: Program[];
  onEdit?: (step: number) => void;
  contact?: boolean;
}) {
  snapshots = snapshots?.filter((p) => d.interestedPrograms.includes(p.id));
  const block = (title: string, step: number, children: React.ReactNode) => (
    <div className="summary-block" key={title}>
      <div className="summary-label">
        <span>{title}</span>
        {onEdit && (
          <button
            type="button"
            className="text-button"
            onClick={() => onEdit(step)}
          >
            Изменить
          </button>
        )}
      </div>
      <div className="summary-value">{children}</div>
    </div>
  );
  return (
    <div className="summary">
      {block(
        "Направление",
        0,
        <>
          {labels.category[d.category]}
          {d.category === "help" && (
            <span className="small muted">{labels.helpFocus[d.helpFocus]}</span>
          )}
        </>,
      )}
      {d.category !== "help" &&
        block(
          "Опыт и предпочтения",
          1,
          <>
            {labels.experience[d.experience]}
            {d.category === "B" && (
              <span>{labels.transmission[d.transmission]}</span>
            )}
            {d.situation && <span className="small">{d.situation}</span>}
          </>,
        )}
      {block(
        "Пожелания по графику",
        2,
        <>
          {d.schedulePreferences.days.map((x) => labels.days[x]).join(", ") ||
            "Не указано"}{" "}
          ·{" "}
          {d.schedulePreferences.times.map((x) => labels.times[x]).join(", ") ||
            "Не указано"}
          <span className="small muted">
            Начало: {labels.start[d.desiredStart]}
          </span>
        </>,
      )}
      {block(
        "Программы для обсуждения",
        4,
        <>
          {snapshots?.length
            ? snapshots.map((p) => (
                <span key={p.id}>
                  {p.name} · {priceText(p)}
                </span>
              ))
            : "Пока нужна консультация"}
        </>,
      )}
      {block(
        "Вопросы и комментарий",
        3,
        <>
          {d.questions.topics.length
            ? d.questions.topics.map((x) => (
                <span key={x}>{labels.topics[x]}</span>
              ))
            : !d.questions.text && "Без дополнительных вопросов"}
          {d.questions.text && <span>{d.questions.text}</span>}
        </>,
      )}
      {contact &&
        block(
          "Как связаться",
          5,
          <>
            {d.applicant.name || "Имя не указано"}
            <span>{d.applicant.contact || "Контакт не указан"}</span>
            {d.applicant.contactTime && (
              <span className="small muted">{d.applicant.contactTime}</span>
            )}
          </>,
        )}
    </div>
  );
}
export function EmptyState({
  title,
  body,
  action,
  onClick,
}: {
  title: string;
  body: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <ArrowUpRight size={32} />
      </span>
      <h2>{title}</h2>
      <p>{body}</p>
      <button className="button primary" onClick={onClick}>
        {action}
        <ChevronRight size={19} />
      </button>
    </div>
  );
}
