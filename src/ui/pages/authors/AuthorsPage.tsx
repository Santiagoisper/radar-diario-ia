import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useRadarAppData } from "../../../hooks/useRadarAppData";
import { PageError, PageSkeleton } from "../../components/RadarStatus";
import {
  buildAuthorDetail,
  buildAuthorsListView,
  formatAppearanceDate,
  getAuthorsActivityToday,
} from "./authorsViewModel";

export function AuthorsPage() {
  const { data, isPending, isError, error, refetch } = useRadarAppData();
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);

  const authors = useMemo(() => (data ? buildAuthorsListView(data) : []), [data]);

  const effectiveAuthorId = useMemo(() => {
    if (authors.length === 0) return null;
    if (selectedAuthorId && authors.some((a) => a.id === selectedAuthorId)) {
      return selectedAuthorId;
    }
    return authors[0].id;
  }, [authors, selectedAuthorId]);

  const detail = data && effectiveAuthorId ? buildAuthorDetail(effectiveAuthorId, data) : null;
  const todayActivity = data
    ? getAuthorsActivityToday(data)
    : { activeTodayCount: 0, activeTodayIds: new Set<string>() };

  if (isPending) {
    return <PageSkeleton title="Autores" />;
  }
  if (isError) {
    return <PageError message={error.message} onRetry={() => void refetch()} />;
  }

  return (
    <div className="page">
      <header className="page-header">
        <p className="page-kicker">Seguimiento estratégico</p>
        <h2 className="page-title">Autores</h2>
        <p className="muted">
          Autores observados: {authors.length} · activos hoy: {todayActivity.activeTodayCount}
        </p>
      </header>

      <section className="authors-grid">
        <article className="card">
          <h3>Autores observados</h3>
          <ul className="list-clean">
            {authors.map((author) => (
              <li key={author.id} className="author-item">
                <button
                  type="button"
                  className={`author-select${effectiveAuthorId === author.id ? " author-select-active" : ""}`}
                  onClick={() => setSelectedAuthorId(author.id)}
                >
                  <span className="item-title">{author.displayName}</span>
                  <span className="muted">
                    Prioridad: {author.priority} · {author.active ? "activo" : "inactivo"}
                  </span>
                  <span className="muted">
                    Última aparición: {formatAppearanceDate(author.lastAppearance)}
                  </span>
                  <span className="muted">Papers asociados: {author.linkedPapersCount}</span>
                  <span className="muted">
                    Temas:{" "}
                    {author.topThemes.map((theme) => `${theme.theme} (${theme.count})`).join(", ") ||
                      "sin señal"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </article>

        <article className="card">
          {detail ? (
            <>
              <h3>{detail.displayName}</h3>
              <p className="muted">Aliases: {detail.aliases.join(", ") || "—"}</p>
              <p className="muted">
                Prioridad: {detail.priority} · estado: {detail.active ? "activo" : "inactivo"}
              </p>
              <p className="muted">Notas: {detail.notes}</p>
              <p className="muted">Última aparición: {formatAppearanceDate(detail.lastAppearance)}</p>

              <section className="author-detail-block">
                <h4>Señal por autor</h4>
                <p>{detail.focusSignal}</p>
                <p className="muted">Tema más asociado: {detail.currentMainTheme}</p>
              </section>

              <section className="author-detail-block">
                <h4>Papers recientes asociados</h4>
                <div className="table-wrap">
                  <table className="simple-table">
                    <thead>
                      <tr>
                        <th>Título</th>
                        <th>Fecha</th>
                        <th>Tema</th>
                        <th>Score</th>
                        <th>Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.papers.map((paper) => (
                        <tr key={paper.id}>
                          <td>{paper.title}</td>
                          <td>{paper.date.slice(0, 10)}</td>
                          <td>{paper.mainTheme}</td>
                          <td>{paper.totalScore.toFixed(2)}</td>
                          <td>
                            <Link to={paper.detailPath}>Ver en Papers</Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <p>Seleccioná un autor para ver detalle.</p>
          )}
        </article>
      </section>
    </div>
  );
}
