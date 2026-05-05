import { Link } from "react-router-dom";
import { buildHomeViewModel } from "./homeMetrics";

export function HomePage() {
  const view = buildHomeViewModel();

  return (
    <div className="page">
      <header className="page-header">
        <p className="page-kicker">Radar intelectual diario</p>
        <h2 className="page-title">Home</h2>
      </header>

      <section className="metrics-grid" aria-label="Métricas principales">
        <article className="card stat-card">
          <h3>Papers nuevos hoy</h3>
          <p className="metric-value">{view.metrics.newPapersToday}</p>
        </article>
        <article className="card stat-card">
          <h3>Autores activos hoy</h3>
          <p className="metric-value">{view.metrics.activeAuthorsToday}</p>
        </article>
        <article className="card stat-card">
          <h3>Tema dominante</h3>
          <p className="metric-value metric-text">{view.metrics.dominantTheme}</p>
        </article>
        <article className="card stat-card">
          <h3>Señal principal del día</h3>
          <p className="metric-note">{view.metrics.mainSignal}</p>
        </article>
        <article className="card stat-card">
          <h3>Tendencia semanal</h3>
          <p className="metric-note">{view.metrics.weeklyTrend}</p>
        </article>
      </section>

      <section className="card briefing-highlight" aria-label="Acceso al briefing de hoy">
        <div>
          <p className="muted">Acceso destacado</p>
          <h3>{view.todayBriefing?.title ?? "Briefing de hoy"}</h3>
          <p>{view.todayBriefing?.executive_summary ?? "Todavía no hay briefing generado."}</p>
        </div>
        <Link className="cta-link" to="/briefing-hoy">
          Abrir briefing de hoy
        </Link>
      </section>

      <section className="content-grid">
        <article className="card">
          <h3>Papers top del día</h3>
          <div className="table-wrap">
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Autores</th>
                  <th>Tema</th>
                  <th>Score</th>
                  <th>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {view.topPapers.map((paper) => (
                  <tr key={paper.id}>
                    <td>{paper.title}</td>
                    <td>{paper.authors.join(", ")}</td>
                    <td>{paper.theme}</td>
                    <td>{paper.totalScore.toFixed(2)}</td>
                    <td>{paper.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card">
          <h3>Autores activos hoy</h3>
          <ul className="list-clean">
            {view.activeAuthorBlock.map((row, idx) => (
              <li key={`${row.author}-${idx}`}>
                <p className="item-title">{row.author}</p>
                <p>{row.paperTitle}</p>
                <p className="muted">Tema: {row.theme}</p>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="card" aria-label="Señal conceptual del día">
        <h3>Señal conceptual del día</h3>
        <p>{view.conceptualSignal}</p>
      </section>
    </div>
  );
}
