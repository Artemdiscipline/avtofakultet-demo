import ReactDOM from "react-dom/client";
import "@fontsource-variable/manrope";
import "@fontsource/golos-text/400.css";
import "@fontsource/golos-text/500.css";
import "./styles.css";
import { initializeTelegramShell } from "./telegram-shell";

async function boot() {
  const root = ReactDOM.createRoot(document.getElementById("root")!);
  try {
    await initializeTelegramShell();
    // App reads the saved route at module load; import it after launch normalization.
    const { default: App } = await import("./App");
    root.render(<App />);
  } catch (error) {
    root.render(
      <main className="panel" style={{ margin: "24px auto", maxWidth: 600 }}>
        <h1>Не удалось открыть приложение</h1>
        <p role="alert">
          {error instanceof Error ? error.message : "Повторите открытие."}
        </p>
        <button className="button primary" onClick={() => location.reload()}>
          Повторить
        </button>
      </main>,
    );
  }
}
void boot();
