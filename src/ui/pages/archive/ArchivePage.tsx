import { useMemo, useState } from "react";
import { useRadarAppData } from "../../../hooks/useRadarAppData";
import { PageError, PageSkeleton } from "../../components/RadarStatus";
import {
  buildArchiveDetail,
  buildArchiveFilterOptions,
  buildArchiveList,
  type ArchiveFilters,
} from "./archiveViewModel";

const defaultFilters: ArchiveFilters = {
  dateQuery: "",
  theme: "all",
  author: "all",
  range: "all",
};

export function ArchivePage() {
  const { data, isPending, isError, error, refetch } = useRadarAppData();
  const [filters, setFilters] = useState<ArchiveFilters>(defaultFilters);
  const [selectedBriefingId, setSelectedBriefingId] = useState<string>("");

  const options = useMemo(
    () => (data ? buildArchiveFilterOptions(data) : { themes: [], authors: [] }),
    [data],
  );

  const items = useMemo(() => (data ? buildArchiveList(filters, data) : []), [data, filters]);

  const effectiveSelectedId = selectedBriefingId || items[0]?.id || "";
  const detail = data && effectiveSelectedId ? buildArchiveDetail(effectiveSelectedId, data) : null;

  if (isPending) {
    return <PageSkeleton title="Archivo" />;
  }
  if (isError) {
    return <PageError message={error.message} onRetry={() => void refetch()} />;
  }

  return (
    <div className="page">
      <header className="page-header">
        <p className="page-kicker">Archivo de inteligencia</p>
        <h2 className="page-title">Archivo</h2>
      </header>

      <section className="card">
        <h3>Filtros</h3>
        <div className="archive-filters">
          <label>
            Fecha
            <input
              type="text"
              placeholder="YYYY-MM-DD"
              value={filters.dateQuery}
              onChange={(event) => setFilters((current) => ({ ...current, dateQuery: event.target.value }))}
            />
          </label>

          <label>
            Tema
            <select
              value={filters.theme}
              onChange={(event) => setFilters((current) => ({ ...current, theme: event.target.value }))}
            >
              <option value="all">Todos</option>
              {options.themes.map((theme) => (
                <option key={theme} value={theme}>
                  {theme}
                </option>
              ))}
            </select>
          </label>

          <label>
            Autor mencionado
            <select
              value={filters.author}
              onChange={(event) => setFilters((current) => ({ ...current, author: event.target.value }))}
            >
              <option value="all">Todos</option>
              {options.authors.map((author) => (
                <option key={author} value={author}>
                  {author}
                </option>
              ))}
            </select>
          </label>

          <label>
            Rango temporal
            <select
              value={filters.range}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  range: event.target.value as ArchiveFilters["range"],
                }))
              }
            >
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="all">Todos</option>
            </select>
          </label>
        </div>
      </section>

      <section className="archive-grid">
        <article className="card">
          <h3>Briefings históricos</h3>
          <ul className="list-clean">
            {items.map((item) => (
              <li key={item.id} className="archive-item">
                <button
                  type="button"
                  className={`archive-select${effectiveSelectedId === item.id ? " archive-select-active" : ""}`}
                  onClick={() => setSelectedBriefingId(item.id)}
                >
                  <span className="item-title">{item.title}</span>
                  <span className="muted">Fecha: {item.date}</span>
                  <span className="muted">{item.executiveSummaryShort}</span>
                  <span className="muted">
                    Papers: {item.papersCount} · Temas: {item.topThemes.join(", ")}
                  </span>
                  <span className="muted">Señal dominante: {item.dominantSignal}</span>
                </button>
              </li>
            ))}
            {items.length === 0 && <li>No hay briefings para los filtros seleccionados.</li>}
          </ul>
        </article>

        <article className="card">
          {detail ? (
            <>
              <h3>{detail.title}</h3>
              <p className="muted">Fecha: {detail.date}</p>

              <section className="archive-detail-block">
                <h4>Resumen ejecutivo</h4>
                <p>{detail.executiveSummary}</p>
              </section>

              <section className="archive-detail-block">
                <h4>Temas relevantes</h4>
                <p>{detail.relevantThemes.join(", ")}</p>
              </section>

              <section className="archive-detail-block">
                <h4>Hacia dónde apunta la idea</h4>
                <p>{detail.directionalView}</p>
              </section>

              <section className="archive-detail-block">
                <h4>Conexiones conceptuales</h4>
                <p>{detail.conceptualConnections}</p>
              </section>

              <section className="archive-detail-block">
                <h4>Papers destacados</h4>
                <div className="table-wrap">
                  <table className="simple-table">
                    <thead>
                      <tr>
                        <th>Paper</th>
                        <th>Fecha</th>
                        <th>Autor(es)</th>
                        <th>Tema</th>
                        <th>Score</th>
                        <th>Por qué importa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.highlightedPapers.map((paper) => (
                        <tr key={paper.id}>
                          <td>{paper.title}</td>
                          <td>{paper.date}</td>
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

              <section className="archive-detail-block">
                <h4>Utilidad práctica</h4>
                <p>{detail.practicalValue}</p>
              </section>

              <section className="archive-detail-block">
                <h4>Markdown renderizable</h4>
                <pre className="markdown-preview">{detail.markdown}</pre>
              </section>
            </>
          ) : (
            <p>No hay briefing seleccionado.</p>
          )}
        </article>
      </section>
    </div>
  );
}
