import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  HelpCircle,
  LockKeyhole,
  MapPin,
  Route,
  ShieldCheck,
  ExternalLink,
  RefreshCw,
  UserRound,
  BriefcaseBusiness,
  Play,
  ChevronDown,
} from "lucide-react";
import { faq, findProgram } from "./catalog";
import {
  emptyDraft,
  draftSchema,
  labels,
  type Application,
  type Actor,
  type Draft,
  type Action,
} from "./model";
import {
  api,
  BrowserRepository,
  ServerRepository,
  LIVE,
  STORAGE_KEY,
  type Repository,
} from "./storage";
import { Wizard } from "./Wizard";
import { RequestDetail } from "./RequestDetail";
import { loadTelegramSdk } from "./telegram-shell";
import { EmptyState, Summary, StatusBadge, dateTime } from "./components";
const DRAFT_KEY = "af.draft.v1";
function initial() {
  try {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      const p = JSON.parse(saved);
      return {
        draft: draftSchema.parse(p.draft),
        step: Math.min(5, Math.max(0, Number(p.step) || 0)),
        edit: !!p.edit,
        error: "",
      };
    }
  } catch {
    return {
      draft: emptyDraft(),
      step: 0,
      edit: false,
      error:
        "Не удалось прочитать черновик. Проверьте доступ к хранилищу; сохранённые заявки не изменены.",
    };
  }
  return { draft: emptyDraft(), step: 0, edit: false, error: "" };
}
const first = initial();
const stages = [
  ["Направление", "Автомобиль или мотоцикл"],
  ["Опыт", "Ваша точка старта"],
  ["График", "Удобное время"],
  ["Вопросы", "Что важно для вас"],
  ["Программы", "Варианты для обсуждения"],
  ["Заявка", "Проверка и контакт"],
];
export default function App() {
  const [draft, setDraft] = useState<Draft>(first.draft),
    [lastStep, setLastStep] = useState(first.step),
    [edit, setEdit] = useState(first.edit),
    [hash, setHash] = useState(location.hash || "#/wizard/" + first.step),
    [apps, setApps] = useState<Application[]>([]),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [storageWarning, setStorageWarning] = useState(first.error),
    [saved, setSaved] = useState(false),
    [actor, setActor] = useState<Actor | null>(null);
  const repository = useRef<Repository | null>(null),
    busyRef = useRef(false),
    lastStudentRequest = useRef("");
  const parts = hash.replace(/^#\/?/, "").split("/"),
    page = parts[0] || "wizard",
    step =
      page === "wizard"
        ? Math.min(5, Math.max(0, Number(parts[1]) || 0))
        : lastStep;
  const role: Actor["role"] = LIVE
    ? actor?.role || "student"
    : page.startsWith("admin")
      ? "admin"
      : "student";
  const activeId =
    page === "request" || page === "success"
      ? decodeURIComponent(parts[1] || "")
      : page === "admin" && parts[1]
        ? decodeURIComponent(parts[1])
        : "";
  const selected = apps.find((a) => a.id === activeId);
  const navigate = useCallback((path: string) => {
    setError("");
    location.hash = path;
    setHash("#" + path);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);
  const reload = useCallback(async () => {
    if (!repository.current) return;
    try {
      const next = await repository.current.list();
      setApps(next);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось загрузить заявки.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const changed = () => setHash(location.hash || "#/wizard/0");
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  useEffect(() => {
    let disposed = false;
    async function setup() {
      try {
        if (LIVE) {
          if (!window.Telegram) {
            await loadTelegramSdk();
          }
          window.Telegram?.WebApp.ready();
          window.Telegram?.WebApp.expand();
          const me = await api<Actor>("/me");
          if (disposed) return;
          setActor(me);
          setDraft((d) => ({
            ...d,
            applicant: {
              ...d.applicant,
              name: d.applicant.name || me.firstName,
              telegramId: me.id,
            },
          }));
          repository.current = new ServerRepository();
          if (me.role === "admin") navigate("/admin");
        } else repository.current = new BrowserRepository();
        await reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось открыть сервис.");
        setLoading(false);
      }
    }
    void setup();
    return () => {
      disposed = true;
    };
  }, [navigate, reload]);
  useEffect(() => {
    setSaved(false);
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ draft, step, edit }));
        setStorageWarning("");
        setSaved(true);
      } catch {
        setStorageWarning(
          "Черновик пока не сохранён: браузер запретил запись. Ответы остаются на экране. Разрешите хранилище и повторите.",
        );
      }
    }, 180);
    return () => clearTimeout(timer);
  }, [draft, step, edit]);
  useEffect(() => {
    const sync = () => {
      void reload();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) sync();
    };
    window.addEventListener("focus", sync);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", sync);
    const timer = LIVE ? setInterval(sync, 15000) : undefined;
    const webapp = window.Telegram?.WebApp;
    webapp?.onEvent("activated", sync);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", sync);
      if (timer) clearInterval(timer);
      webapp?.offEvent("activated", sync);
    };
  }, [reload, actor]);
  useEffect(() => {
    if (page === "wizard") setLastStep(step);
  }, [page, step]);
  const go = (n: number) => {
    if (step === 5 && n !== 5) setEdit(true);
    if (n === 5) setEdit(false);
    navigate("/wizard/" + n);
  };
  const fresh = () => {
    setDraft(emptyDraft());
    setEdit(false);
    navigate("/wizard/0");
  };
  const submit = async () => {
    if (busyRef.current || !repository.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const a = await repository.current.create(draft);
      setApps((old) => [a, ...old.filter((x) => x.id !== a.id)]);
      lastStudentRequest.current = a.id;
      setDraft(emptyDraft());
      setEdit(false);
      setLastStep(0);
      navigate("/success/" + encodeURIComponent(a.id));
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Не удалось сохранить заявку. Повторите.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const act = async (action: Action) => {
    if (!selected || !repository.current || busyRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await repository.current.act(
        selected.id,
        selected.version,
        action,
        role,
      );
      setApps((old) => old.map((a) => (a.id === next.id ? next : a)));
      return true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не удалось сохранить изменения.",
      );
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const changeRole = (next: Actor["role"]) => {
    if (next === role) return;
    if (next === "admin") {
      if (activeId) lastStudentRequest.current = activeId;
      navigate(activeId ? "/admin/" + encodeURIComponent(activeId) : "/admin");
    } else {
      const requestId = activeId || lastStudentRequest.current;
      navigate(
        requestId
          ? "/request/" + encodeURIComponent(requestId)
          : draft.category
            ? "/wizard/" + step
            : "/wizard/0",
      );
    }
  };
  const retryDraft = () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ draft, step, edit }));
      setStorageWarning("");
      setSaved(true);
    } catch {
      setStorageWarning(
        "Браузер всё ещё запрещает сохранение. Ответы остаются на экране.",
      );
    }
  };
  const isWizard = page === "wizard" && role === "student";
  const currentStage = step;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content" onClick={(e) => { e.preventDefault(); document.getElementById("main-content")?.focus(); }}>К содержимому</a>
      <header className="site-header">
        <div className="header-inner">
          <button
            className="brand"
            onClick={() =>
              navigate(role === "admin" ? "/admin" : "/wizard/" + lastStep)
            }
            aria-label="Автофакультет — начало"
          >
            <span>
              АВТО<span className="brand-accent">ФАКУЛЬТЕТ</span>
            </span>
            <small>Нижний Новгород · авто и мотошкола</small>
          </button>
          <div className="header-meta">
            <span>
              <MapPin size={15} />
              Нижний Новгород
            </span>
            <a href="https://hi-prof.ru/" target="_blank" rel="noreferrer">
              Сайт школы
              <ArrowUpRight size={15} />
            </a>
          </div>
        </div>
      </header>
      <div className="demo-bar">
        <div className="demo-bar-inner">
          <span className="mode-label">
            <span className="demo-pill">
              {LIVE ? "Тестовый сервер" : "Демо"}
            </span>
            <span>
              {LIVE ? "Отдельный тестовый проект" : "Сейчас вы в роли"}
            </span>
          </span>
          {!LIVE ? (
            <div className="role-switch" aria-label="Демонстрационная роль">
              <button
                aria-pressed={role === "student"}
                className={role === "student" ? "active" : ""}
                onClick={() => changeRole("student")}
              >
                <UserRound size={15} aria-hidden="true" />
                Ученик
              </button>
              <button
                aria-pressed={role === "admin"}
                className={role === "admin" ? "active" : ""}
                onClick={() => changeRole("admin")}
              >
                <BriefcaseBusiness size={15} aria-hidden="true" />
                Администратор
              </button>
            </div>
          ) : (
            <span className="small">
              {actor
                ? (role === "admin" ? "Администратор" : "Ученик") +
                  " · Telegram проверен сервером"
                : "Проверяем Telegram…"}
            </span>
          )}
        </div>
      </div>
      <div className="main-container">
        <nav className="main-nav" aria-label="Разделы">
          {role === "student" ? (
            <>
              <button
                className={isWizard ? "active" : ""}
                onClick={() => navigate("/wizard/" + step)}
              >
                <Route size={17} />
                Подобрать обучение
              </button>
              <button
                className={
                  page === "requests" ||
                  page === "request" ||
                  page === "success"
                    ? "active"
                    : ""
                }
                onClick={() => navigate("/requests")}
              >
                <ClipboardList size={17} />
                Мои заявки
                {apps.length > 0 && (
                  <span className="count">{apps.length}</span>
                )}
              </button>
            </>
          ) : (
            <button className="active" onClick={() => navigate("/admin")}>
              <ClipboardList size={17} />
              Заявки учеников <span className="count">{apps.length}</span>
            </button>
          )}
          <button
            className={page === "faq" || page === "admin-faq" ? "active" : ""}
            onClick={() => navigate(role === "admin" ? "/admin-faq" : "/faq")}
          >
            <HelpCircle size={17} />
            Вопросы
          </button>
          {isWizard && <span className="saved-state" aria-live="polite">
            {saved && !storageWarning ? (
              <>
                <span className="green-dot" />
                Черновик сохранён
              </>
            ) : storageWarning ? (
              "Сохранение недоступно"
            ) : (
              "Сохраняем…"
            )}
          </span>}
        </nav>
        {!LIVE && (
          <details className="demo-guide">
            <summary>
              <span className="guide-icon"><Play size={14} aria-hidden="true" /></span>
              <strong>Как показать демо</strong>
              <span className="guide-caption">От анкеты до ответа школы за пару минут</span>
              <ChevronDown size={17} className="guide-chevron" aria-hidden="true" />
            </summary>
            <div className="guide-steps">
              <div><span>1</span><p><strong>Станьте учеником</strong>Пройдите анкету. На последнем шаге нажмите «Заполнить тестовыми данными» и создайте заявку.</p></div>
              <div><span>2</span><p><strong>Ответьте за школу</strong>Переключитесь на администратора. Задайте уточняющий вопрос или предложите программу.</p></div>
              <div><span>3</span><p><strong>Посмотрите результат</strong>Вернитесь в роль ученика: ответьте на вопрос или отметьте интерес к программе.</p></div>
            </div>
            <p className="guide-footnote">Обе роли работают с одной заявкой. В демо данные сохраняются только в этом браузере.</p>
          </details>
        )}
        {storageWarning && (
          <div className="error global-error" role="alert">
            {storageWarning}
            <button className="text-button" onClick={retryDraft}>
              Повторить сохранение
            </button>
          </div>
        )}
        {error && !isWizard && !selected && (
          <div className="error global-error" role="alert">
            {error}
            <button className="text-button" onClick={() => void reload()}>
              <RefreshCw size={15} />
              Повторить загрузку
            </button>
            {LIVE && !actor && (
              <button className="text-button" onClick={() => location.reload()}>
                Повторить открытие
              </button>
            )}
          </div>
        )}
        <div className="workspace">
          <aside className="sidebar">
            {isWizard ? (
              <>
                <div className="route-heading">
                  <span className="eyebrow">ВАШ МАРШРУТ</span>
                  <span className="small muted">{currentStage + 1} из 6</span>
                </div>
                <ol className="route-steps">
                  {stages.map(([title, description], i) => (
                    <li
                      key={title}
                      className={
                        i === currentStage
                          ? "current "
                          : i < currentStage
                            ? "done "
                            : ""
                      }
                    >
                      <button
                        aria-label={"Этап " + (i + 1) + ": " + title}
                        disabled={i > step}
                        aria-current={i === step ? "step" : undefined}
                        onClick={() => go(i)}
                      >
                        <span className="route-marker">
                          {i < currentStage ? <Check size={14} /> : i + 1}
                        </span>
                        <span className="route-copy">
                          <strong>{title}</strong>
                          <small>{description}</small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </>
            ) : (
              <div className="side-intro">
                <span className="eyebrow">
                  {role === "admin" ? "НА СТОРОНЕ ШКОЛЫ" : "НА СВЯЗИ СО ШКОЛОЙ"}
                </span>
                <h2>
                  {role === "admin"
                    ? "От пожеланий — к подходящей программе."
                    : "Всё начинается с разговора."}
                </h2>
                <p>
                  {role === "admin"
                    ? "Откройте обращение, задайте вопрос и предложите программу. Ученик увидит ответ в своей заявке."
                    : "Сохраните пожелания, уточните детали и обсудите обучение с администратором."}
                </p>
              </div>
            )}
            <figure className="school-photo">
              <img
                src={import.meta.env.BASE_URL + "images/fleet.jpg"}
                alt="Учебный Skoda Rapid автошколы «Автофакультет»"
                width="700"
                height="420"
              />
              <figcaption>
                <span>Учиться. Пробовать. Ехать.</span>
                <small>Фото с официального сайта школы</small>
              </figcaption>
            </figure>
            <div className="side-note">
              <ShieldCheck size={19} />
              <p>
                Сначала ваши пожелания.
                <br />
                Условия обучения согласует сотрудник.
              </p>
            </div>
            {isWizard && step > 0 && draft.category && (
              <div className="side-summary">
                <span className="eyebrow">УЖЕ В МАРШРУТЕ</span>
                <p>{labels.category[draft.category]}</p>
                {draft.experience && (
                  <small>{labels.experience[draft.experience]}</small>
                )}
                {draft.category === "B" && draft.transmission && (
                  <small>{labels.transmission[draft.transmission]}</small>
                )}
              </div>
            )}
          </aside>
          <main id="main-content" tabIndex={-1}>
            {LIVE && !actor ? (
              <section className="panel">
                <h1>Открываем приложение</h1>
                <p className="lead">
                  {loading
                    ? "Проверяем данные Telegram…"
                    : "Для этого режима нужна подтверждённая сессия отдельного тестового бота."}
                </p>
              </section>
            ) : isWizard ? (
              <Wizard
                draft={draft}
                setDraft={setDraft}
                step={step}
                go={go}
                onSubmit={submit}
                busy={busy}
                error={error}
                editMode={edit}
                onCancelEdit={() => go(5)}
              />
            ) : page === "faq" || page === "admin-faq" ? (
              <section className="panel faq-panel">
                <div className="eyebrow">ПЕРЕД ПЕРВЫМ ЗАНЯТИЕМ</div>
                <h1>
                  Хорошие вопросы —<br />
                  уверенный старт.
                </h1>
                <p className="lead">
                  Коротко об обучении. Анкета сохранена — к ней можно вернуться
                  в любой момент.
                </p>
                <div className="faq-list">
                  {faq.map((f) => (
                    <details key={f.id}>
                      <summary>
                        {f.question}
                        <ChevronRight size={18} />
                      </summary>
                      <p>{f.answer}</p>
                      <a
                        className="source-line"
                        href={f.source}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Источник школы · 23.10.2026 <ExternalLink size={12} />
                      </a>
                    </details>
                  ))}
                </div>
                <div className="service-links">
                  <h2>Официальная школа</h2>
                  <a
                    href="https://hi-prof.ru/kontakty"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Контакты и адрес школы <ArrowUpRight size={16} />
                  </a>
                  <a
                    href="https://t.me/hi_prof_bot"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Существующий Telegram-контакт школы{" "}
                    <ArrowUpRight size={16} />
                  </a>
                  <p className="small muted">
                    Функциональность официального бота не исследована. Демо к
                    нему не подключено. Вопросы о документах, медицинских
                    ограничениях и допуске решает сотрудник.
                  </p>
                </div>
                <button
                  className="button primary"
                  onClick={() =>
                    navigate(
                      role === "admin" ? "/admin" : "/wizard/" + lastStep,
                    )
                  }
                >
                  Вернуться {role === "admin" ? "к заявкам" : "к анкете"}
                  <ArrowRight size={18} />
                </button>
              </section>
            ) : page === "success" && selected ? (
              <section className="panel success-panel">
                <span className="success-icon">
                  <CheckCircle2 size={34} />
                </span>
                <div className="eyebrow">ЗАПРОС СОЗДАН</div>
                <h1>
                  {LIVE ? "Ваш запрос сохранён" : "Тестовая заявка сохранена"}
                </h1>
                <p className="lead">
                  {LIVE ? "Ваши пожелания готовы для обсуждения с администратором." : "Путь ученика пройден. Теперь посмотрите, как с этим обращением работает школа."}
                </p>
                <div className="success-reference">
                  <strong>{selected.id}</strong>
                  <StatusBadge status={selected.status} />
                </div>
                {!LIVE && (
                  <div className="next-scene">
                    <span className="scene-icon"><BriefcaseBusiness size={24} /></span>
                    <div><span className="eyebrow">СЛЕДУЮЩИЙ ШАГ ПОКАЗА</span><h2>Теперь — на сторону школы</h2><p>Откроется эта же заявка. Можно задать вопрос ученику или предложить программу.</p></div>
                    <button className="button primary" onClick={() => navigate("/admin/" + encodeURIComponent(selected.id))}>
                      Открыть как администратор <ArrowRight size={18} />
                    </button>
                  </div>
                )}
                <button
                  className={"button " + (LIVE ? "primary" : "outline")}
                  onClick={() =>
                    navigate("/request/" + encodeURIComponent(selected.id))
                  }
                >
                  Открыть мою заявку
                  <ArrowRight size={18} />
                </button>
                <details className="request-summary success-summary">
                  <summary>Что сохранилось в заявке <ChevronDown size={18} /></summary>
                  <Summary draft={selected} snapshots={selected.programSnapshots} />
                </details>
                <p className="demo-notice">
                  <LockKeyhole size={20} />
                  {LIVE
                    ? "Заявка в отдельном тестовом проекте. Действующая школа не подключена."
                    : "Тестовая заявка сохранена в этом браузере и не отправлена школе."}
                </p>
                <button className="text-button start-over" onClick={fresh}>
                  Вернуться к началу
                </button>
              </section>
            ) : selected ? (
              <RequestDetail
                key={selected.id + "-" + role}
                app={selected}
                role={role}
                onAction={act}
                busy={busy}
                error={error}
                onPreviewRole={!LIVE ? () => changeRole(role === "admin" ? "student" : "admin") : undefined}
                onBack={() =>
                  navigate(role === "admin" ? "/admin" : "/requests")
                }
              />
            ) : activeId ? (
              <section className="panel">
                <EmptyState
                  title={loading ? "Загружаем заявку…" : "Заявка не найдена"}
                  body="В этом режиме доступны только сохранённые обращения. Проверьте список заявок."
                  action="Открыть список"
                  onClick={() =>
                    navigate(role === "admin" ? "/admin" : "/requests")
                  }
                />
              </section>
            ) : (
              <section className="panel requests-panel">
                <div className="request-list-top">
                  <div>
                    <div className="eyebrow">
                      {role === "admin"
                        ? "ДЕМОНСТРАЦИОННАЯ ПРИЁМНАЯ"
                        : "ВАШИ ОБРАЩЕНИЯ"}
                    </div>
                    <h1>
                      {role === "admin" ? "Заявки учеников" : "Мои заявки"}
                    </h1>
                  </div>
                  <button
                    aria-label="Обновить заявки"
                    className="icon-button"
                    onClick={() => void reload()}
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
                <p className="lead">
                  {role === "admin"
                    ? "Здесь только обращения, которые созданы " +
                      (LIVE ? "на тестовом сервере." : "в этом браузере.")
                    : "Заявка, предложения и переписка — в одном месте."}
                </p>
                {role === "student" && draft.category && (
                  <button
                    className="draft-card"
                    onClick={() => navigate("/wizard/" + lastStep)}
                  >
                    <span className="draft-icon">
                      <Route size={23} />
                    </span>
                    <span>
                      <strong>Незавершённый черновик</strong>
                      <small>
                        {labels.category[draft.category]} · ещё не заявка
                      </small>
                    </span>
                    <ChevronRight size={20} />
                  </button>
                )}
                {loading ? (
                  <p className="loading-text">Загружаем…</p>
                ) : !apps.length ? (
                  <EmptyState
                    title={
                      role === "admin"
                        ? "Пока нет заявок"
                        : "Первое обращение впереди"
                    }
                    body={
                      role === "admin"
                        ? "Пройдите анкету в роли ученика и создайте тестовую заявку. Она появится здесь с тем же номером."
                        : "Ответьте на несколько вопросов — и сохраните пожелания для обсуждения."
                    }
                    action={
                      role === "admin"
                        ? "Перейти в роль ученика"
                        : "Подобрать обучение"
                    }
                    onClick={() => navigate("/wizard/0")}
                  />
                ) : (
                  <div className="application-list">
                    {apps.map((a) => (
                      <button
                        className="application-row"
                        key={a.id}
                        onClick={() => {
                          lastStudentRequest.current = a.id;
                          navigate(
                            (role === "admin" ? "/admin/" : "/request/") +
                              encodeURIComponent(a.id),
                          );
                        }}
                      >
                        <div className="application-row-top">
                          <span className="small muted">
                            {a.id} · {dateTime(a.createdAt)}
                          </span>
                          <StatusBadge status={a.status} />
                        </div>
                        <div className="application-name">
                          <strong>{a.applicant.name}</strong>
                          <ChevronRight size={20} />
                        </div>
                        <p>
                          {labels.category[a.category]}
                          {a.experience
                            ? " · " + labels.experience[a.experience]
                            : ""}
                        </p>
                        <span className="small muted">
                          {a.schedulePreferences.days
                            .map((x) => labels.days[x])
                            .join(", ")}{" "}
                          ·{" "}
                          {a.schedulePreferences.times
                            .map((x) => labels.times[x])
                            .join(", ")}{" "}
                          · {a.messages.length} сообщ.
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {role === "student" && apps.length > 0 && (
                  <button className="button primary" onClick={fresh}>
                    Новое обращение
                    <ArrowRight size={18} />
                  </button>
                )}
              </section>
            )}
            {isWizard && step === 0 && (
              <div className="after-card">
                <span>
                  <span>01</span>Ваши пожелания
                </span>
                <ChevronRight size={14} />
                <span>
                  <span>02</span>Диалог со школой
                </span>
                <ChevronRight size={14} />
                <span>
                  <span>03</span>Выбор программы
                </span>
              </div>
            )}
          </main>
        </div>
        <footer className="footer">
          <span>АВТОФАКУЛЬТЕТ · Первое обращение</span>
          <span>
            {LIVE
              ? "Отдельный тестовый проект"
              : "Демонстрационный проект. Данные остаются в этом браузере."}
          </span>
          <a href="https://hi-prof.ru/" target="_blank" rel="noreferrer">
            hi-prof.ru
            <ArrowUpRight size={13} />
          </a>
        </footer>
      </div>
    </div>
  );
}
