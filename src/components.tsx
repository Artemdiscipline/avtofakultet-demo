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
export function VehicleArt({ kind }: { kind: "car" | "moto" }) {
  return (
    <svg className="vehicle-art" viewBox="0 0 180 90" fill="none" aria-hidden="true">
      <path d="M8 76h164" stroke="currentColor" opacity=".15" strokeWidth="2" />
      {kind === "car" ? <>
        <path d="m25 53 10-23a8 8 0 0 1 7-5h80a12 12 0 0 1 9 5l15 22 14 5v14H19V58l6-5Z" fill="currentColor" fillOpacity=".06" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
        <path d="m43 32-9 20h102l-15-20H43Z" fill="currentColor" fillOpacity=".09" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M81 33v19m-60 9h22m97 0h18M91 59h10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <path d="m64 59 27 12h24L86 59H64Z" fill="var(--red)" opacity=".9" />
        <circle cx="48" cy="70" r="12" fill="var(--paper)" stroke="currentColor" strokeWidth="2.5" /><circle cx="132" cy="70" r="12" fill="var(--paper)" stroke="currentColor" strokeWidth="2.5" />
        <circle cx="48" cy="70" r="5" fill="currentColor" fillOpacity=".17" /><circle cx="132" cy="70" r="5" fill="currentColor" fillOpacity=".17" />
        <path d="M72 24v-9h19v9" stroke="var(--red)" strokeWidth="2.5" /><path d="m78 20 3-3 3 3" stroke="var(--red)" strokeWidth="1.5" />
      </> : <>
        <circle cx="44" cy="65" r="17" fill="currentColor" fillOpacity=".04" stroke="currentColor" strokeWidth="2.5" /><circle cx="139" cy="65" r="17" fill="currentColor" fillOpacity=".04" stroke="currentColor" strokeWidth="2.5" />
        <path d="m44 65 29-26 24 25H44Zm53-1 26-25m-7-17h10l13 43M45 43h28m-15-9h26l9 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M73 45h18l8 10-7 12H71l-6-13 8-9Z" fill="currentColor" fillOpacity=".4" stroke="currentColor" strokeWidth="2" /><path d="M75 51h14m-15 5h17m-15 5h13m-7 6 29 3 9-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M84 34c3-10 19-14 29-4l8 8-22 13-15-17Z" fill="var(--red)" fillOpacity=".9" stroke="var(--red)" strokeWidth="2" />
        <path d="M99 52v12H79l-7-14M34 40l-7 5m101-13h8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /><circle cx="139" cy="65" r="4" fill="currentColor" /><circle cx="44" cy="65" r="4" fill="currentColor" />
      </>}
    </svg>
  );
}
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
            aria-label={"Изменить: " + title}
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
