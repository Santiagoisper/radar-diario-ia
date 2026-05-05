import { dailyBriefingsSeed } from "../../../data/seeds";

export function TodayBriefingPage() {
  const todayBriefing = dailyBriefingsSeed.find(
    (briefing) => briefing.briefing_date === "2026-05-05",
  );

  return (
    <div className="page">
      <header className="page-header">
        <p className="page-kicker">Sección</p>
        <h2 className="page-title">Briefing de hoy</h2>
      </header>
      <section className="card">
        <p className="muted">Vista mínima de Bloque 1/2</p>
        <h3>{todayBriefing?.title ?? "Sin briefing"}</h3>
        <p>{todayBriefing?.executive_summary ?? "No hay contenido."}</p>
      </section>
    </div>
  );
}
