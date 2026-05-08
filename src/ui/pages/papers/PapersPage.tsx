import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useRadarAppData } from "../../../hooks/useRadarAppData";
import { PageError, PageSkeleton } from "../../components/RadarStatus";
import {
  applyPapersFilters,
  buildFilterOptions,
  buildPaperList,
  getPaperDetail,
  type PapersFilters,
} from "./papersViewModel";

const defaultFilters: PapersFilters = {
  datePreset: "all",
  author: "all",
  theme: "all",
  category: "all",
  scoreMin: 0,
  onlyNewToday: false,
  sortBy: "score_desc",
};

export function PapersPage() {
  const { data, isPending, isError, error, refetch } = useRadarAppData();
  const [filters, setFilters] = useState<PapersFilters>(defaultFilters);
  const [searchParams] = useSearchParams();
  const paperIdFromUrl = searchParams.get("paperId") ?? "";

  const options = useMemo(
    () => (data ? buildFilterOptions(data) : { authors: [], themes: [], categories: [] }),
    [data],
  );

  const list = useMemo(() => {
    if (!data) return [];
    return applyPapersFilters(buildPaperList(data), filters, data.radarDate);
  }, [data, filters]);

  const detail = useMemo(() => {
    if (!data || !paperIdFromUrl) return null;
    return getPaperDetail(paperIdFromUrl, data);
  }, [data, paperIdFromUrl]);

  if (isPending) {
    return <PageSkeleton title="Papers" />;
  }
  if (isError) {
    return <PageError message={error.message} onRetry={() => void refetch()} />;
  }

  return (
    <div className="page">
      <header className="page-header">
        <p className="page-kicker">Sección</p>
        <h2 className="page-title">Papers</h2>
      </header>

      <section className="card">
        <h3>Filtros</h3>
        <div className="archive-filters">
          <label>
            Fecha
            <select
              value={filters.datePreset}
              onChange={(e) =>
                setFilters((c) => ({ ...c, datePreset: e.target.value as PapersFilters["datePreset"] }))
              }
            >
              <option value="all">Todas</option>
              <option value="today">Solo hoy</option>
              <option value="last7">Últimos 7 días</option>
            </select>
          </label>
          <label>
            Autor
            <select
              value={filters.author}
              onChange={(e) => setFilters((c) => ({ ...c, author: e.target.value }))}
            >
              <option value="all">Todos</option>
              {options.authors.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tema
            <select
              value={filters.theme}
              onChange={(e) => setFilters((c) => ({ ...c, theme: e.target.value }))}
            >
              <option value="all">Todos</option>
              {options.themes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label>
            Categoría
            <select
              value={filters.category}
              onChange={(e) => setFilters((c) => ({ ...c, category: e.target.value }))}
            >
              <option value="all">Todas</option>
              {options.categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </label>
          <label>
            Score mín.
            <input
              type="number"
              step="0.1"
              min={0}
              max={10}
              value={filters.scoreMin}
              onChange={(e) => setFilters((c) => ({ ...c, scoreMin: Number(e.target.value) || 0 }))}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={filters.onlyNewToday}
              onChange={(e) => setFilters((c) => ({ ...c, onlyNewToday: e.target.checked }))}
            />{" "}
            Solo nuevos hoy
          </label>
          <label>
            Orden
            <select
              value={filters.sortBy}
              onChange={(e) =>
                setFilters((c) => ({ ...c, sortBy: e.target.value as PapersFilters["sortBy"] }))
              }
            >
              <option value="score_desc">Score ↓</option>
              <option value="date_desc">Fecha ↓</option>
              <option value="title_asc">Título A–Z</option>
              <option value="author_asc">Autor A–Z</option>
            </select>
          </label>
        </div>
      </section>

      <section className="content-grid">
        <article className="card">
          <h3>Listado ({list.length})</h3>
          <div className="table-wrap">
            <table className="simple-table">
              <thead>
                <tr>
                  <th>Título</th>
                  <th>Autores</th>
                  <th>Tema</th>
                  <th>Score</th>
                  <th>Nuevo hoy</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr key={row.id}>
                    <td>{row.title}</td>
                    <td>{row.authors.join(", ")}</td>
                    <td>{row.mainTheme}</td>
                    <td>{row.totalScore.toFixed(2)}</td>
                    <td>{row.isNewToday ? "Sí" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {list.length === 0 && <p className="muted">No hay papers para estos filtros.</p>}
        </article>

        {detail ? (
          <article className="card">
            <h3>Detalle (paperId en URL)</h3>
            <p className="item-title">{detail.title}</p>
            <p className="muted">{detail.authors.join(", ")}</p>
            <p className="muted">
              Score: {detail.totalScore.toFixed(2)} — {detail.mainTheme}
            </p>
            <p>{detail.abstract}</p>
            <p className="muted">
              <a href={detail.url} target="_blank" rel="noreferrer">
                Abrir en arXiv
              </a>
            </p>
          </article>
        ) : paperIdFromUrl ? (
          <article className="card">
            <p>No se encontró el paper {paperIdFromUrl}.</p>
          </article>
        ) : null}
      </section>
    </div>
  );
}
