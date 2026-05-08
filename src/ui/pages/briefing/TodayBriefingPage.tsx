import { useRadarAppData } from "../../../hooks/useRadarAppData";
import { PageError, PageSkeleton } from "../../components/RadarStatus";
import { buildBriefingTodayViewModel } from "./briefingViewModel";

export function TodayBriefingPage() {
  const { data, isPending, isError, error, refetch } = useRadarAppData();

  if (isPending) {
    return <PageSkeleton title="Briefing de hoy" />;
  }
  if (isError) {
    return <PageError message={error.message} onRetry={() => void refetch()} />;
  }

  const briefing = buildBriefingTodayViewModel(data);

  return (
    <div className="page">
      <header className="page-header">
        <p className="page-kicker">Radar intelectual diario</p>
        <h2 className="page-title">{briefing.title}</h2>
        <p className="muted">Fecha: {briefing.date}</p>
      </header>

      <section className="card">
        <h3>Resumen ejecutivo</h3>
        <p>{briefing.executiveSummary}</p>
      </section>

      <section className="card">
        <h3>Bloque 1 — Temas relevantes</h3>
        <ul className="list-clean">
          {briefing.relevantThemes.slice(0, 7).map((theme) => (
            <li key={theme.theme} className="theme-item">
              <p className="item-title">{theme.theme}</p>
              <p>
                {theme.paperCount} paper(s) · señal <strong>{theme.signalLevel}</strong>
              </p>
              <p className="muted">{theme.explanation}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h3>Bloque 2 — Hacia dónde apunta la idea</h3>
        <p>{briefing.directionalView}</p>
      </section>

      <section className="card">
        <h3>Bloque 3 — Cómo se conectan las ideas</h3>
        <p>{briefing.conceptualConnections}</p>
      </section>

      <section className="card">
        <h3>Bloque 4 — Papers destacados</h3>
        <div className="table-wrap">
          <table className="simple-table">
            <thead>
              <tr>
                <th>Paper</th>
                <th>Autor(es)</th>
                <th>Tema</th>
                <th>Score</th>
                <th>Por qué importa</th>
              </tr>
            </thead>
            <tbody>
              {briefing.highlightedPapers.map((paper) => (
                <tr key={paper.id}>
                  <td>{paper.title}</td>
                  <td>{paper.authors.join(", ")}</td>
                  <td>{paper.theme}</td>
                  <td>{paper.totalScore.toFixed(2)}</td>
                  <td>{paper.whyItMatters}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h3>Bloque 5 — Utilidad práctica</h3>
        <p>{briefing.practicalValue}</p>
      </section>

      <section className="card">
        <h3>Versión markdown renderizable</h3>
        <pre className="markdown-preview">{briefing.markdown}</pre>
      </section>
    </div>
  );
}
