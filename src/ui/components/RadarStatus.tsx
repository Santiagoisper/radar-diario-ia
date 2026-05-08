export function PageSkeleton({ title }: { title: string }) {
  return (
    <div className="page" aria-busy="true">
      <header className="page-header">
        <p className="page-kicker">Cargando…</p>
        <h2 className="page-title">{title}</h2>
      </header>
      <section className="card">
        <p className="muted">Obteniendo snapshot del radar…</p>
      </section>
    </div>
  );
}

export function PageError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="page" role="alert">
      <header className="page-header">
        <p className="page-kicker">Error</p>
        <h2 className="page-title">No se pudo cargar el radar</h2>
      </header>
      <section className="card">
        <p>{message}</p>
        <button type="button" className="cta-link" style={{ marginTop: "1rem" }} onClick={onRetry}>
          Reintentar
        </button>
      </section>
    </div>
  );
}
