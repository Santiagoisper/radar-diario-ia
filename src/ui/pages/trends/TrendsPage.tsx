import { useMemo, useState } from "react";
import { useRadarAppData } from "../../../hooks/useRadarAppData";
import { PageError, PageSkeleton } from "../../components/RadarStatus";
import {
  buildTrendsFilterOptions,
  buildTrendsViewModel,
  type BarDatum,
  type TrendsFilters,
} from "./trendsViewModel";

const defaultFilters: TrendsFilters = {
  period: "30d",
  theme: "all",
  author: "all",
  category: "all",
};

function MiniBarChart({ title, data }: { title: string; data: BarDatum[] }) {
  const max = Math.max(...data.map((item) => item.value), 1);

  return (
    <section className="card" aria-label={title}>
      <h3>{title}</h3>
      <ul className="chart-list" role="list">
        {data.map((item) => (
          <li key={item.label} className="chart-row">
            <div className="chart-label-wrap">
              <span className="chart-label">{item.label}</span>
              <span className="chart-value">
                {item.value}
                {typeof item.delta === "number" && (
                  <span className={item.delta >= 0 ? "delta-up" : "delta-down"}>
                    {item.delta >= 0 ? ` +${item.delta}` : ` ${item.delta}`}
                  </span>
                )}
              </span>
            </div>
            <div className="chart-track" aria-hidden="true">
              <div className="chart-fill" style={{ width: `${(item.value / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function TrendsPage() {
  const { data, isPending, isError, error, refetch } = useRadarAppData();
  const [filters, setFilters] = useState<TrendsFilters>(defaultFilters);

  const options = useMemo(
    () => (data ? buildTrendsFilterOptions(data) : { themes: [], authors: [], categories: [] }),
    [data],
  );

  const view = useMemo(() => (data ? buildTrendsViewModel(filters, data) : null), [data, filters]);

  if (isPending) {
    return <PageSkeleton title="Tendencias" />;
  }
  if (isError) {
    return <PageError message={error.message} onRetry={() => void refetch()} />;
  }
  if (!view) {
    return <PageError message="Sin datos de tendencias." onRetry={() => void refetch()} />;
  }

  return (
    <div className="page">
      <header className="page-header">
        <p className="page-kicker">Inteligencia de evolución</p>
        <h2 className="page-title">Tendencias</h2>
      </header>

      <section className="card">
        <h3>Filtros</h3>
        <div className="trends-filters">
          <label>
            Período
            <select
              value={filters.period}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  period: event.target.value as TrendsFilters["period"],
                }))
              }
            >
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="all">Todos</option>
            </select>
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
            Autor
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
            Categoría
            <select
              value={filters.category}
              onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
            >
              <option value="all">Todas</option>
              {options.categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="trends-summary-grid" aria-label="Resumen de tendencia">
        <article className="card">
          <h3>Período</h3>
          <p className="metric-value metric-text">{view.summary.selectedPeriodLabel}</p>
        </article>
        <article className="card">
          <h3>Tema dominante</h3>
          <p className="metric-value metric-text">{view.summary.dominantTheme}</p>
        </article>
        <article className="card">
          <h3>Tema que más crece</h3>
          <p className="metric-value metric-text">{view.summary.fastestGrowingTheme}</p>
        </article>
        <article className="card">
          <h3>Autor más recurrente</h3>
          <p className="metric-value metric-text">{view.summary.mostRecurrentAuthor}</p>
        </article>
        <article className="card">
          <h3>Total de papers</h3>
          <p className="metric-value">{view.summary.totalPapers}</p>
        </article>
      </section>

      <section className="card">
        <h3>Lectura sintética del movimiento conceptual</h3>
        <p>{view.summary.conceptualReading}</p>
      </section>

      <section className="trends-grid">
        <article className="card">
          <h3>Temas en crecimiento</h3>
          <div className="table-wrap">
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Tema</th>
                  <th>Período actual</th>
                  <th>Período anterior</th>
                  <th>Variación</th>
                  <th>Por qué importa</th>
                </tr>
              </thead>
              <tbody>
                {view.growthThemes.map((row) => (
                  <tr key={row.theme}>
                    <td>{row.theme}</td>
                    <td>{row.currentCount}</td>
                    <td>{row.previousCount}</td>
                    <td>{row.delta >= 0 ? `+${row.delta}` : row.delta}</td>
                    <td>{row.importanceNote}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="card">
          <h3>Autores recurrentes</h3>
          <div className="table-wrap">
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Autor</th>
                  <th>Apariciones</th>
                  <th>Temas asociados</th>
                  <th>Papers destacados</th>
                </tr>
              </thead>
              <tbody>
                {view.recurrentAuthors.map((row) => (
                  <tr key={row.author}>
                    <td>{row.author}</td>
                    <td>{row.appearances}</td>
                    <td>{row.associatedThemes.join(", ")}</td>
                    <td>{row.highlightedPapers.join(" · ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <section className="card">
        <h3>Líneas conceptuales consolidadas</h3>
        <ul className="list-clean concept-lines">
          {view.conceptLines.slice(0, 5).map((line) => (
            <li key={line.theme} className="concept-line-item">
              <p className="item-title">{line.theme}</p>
              <p className="muted">Frecuencia: {line.frequency}</p>
              <p className="muted">Autores: {line.authors.join(", ")}</p>
              <p className="muted">Papers: {line.papers.join(" · ")}</p>
              <p>{line.interpretation}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="trends-charts-grid">
        <MiniBarChart title="Barras por tema" data={view.themeBars} />
        <MiniBarChart title="Barras por autor" data={view.authorBars} />
        <MiniBarChart title="Evolución semanal/mensual" data={view.evolutionBars} />
        <MiniBarChart title="Distribución por categoría arXiv" data={view.categoryBars} />
      </section>
    </div>
  );
}
