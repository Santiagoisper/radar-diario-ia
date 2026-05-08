import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/briefing-hoy", label: "Briefing de hoy" },
  { to: "/papers", label: "Papers" },
  { to: "/autores", label: "Autores" },
  { to: "/archivo", label: "Archivo" },
  { to: "/tendencias", label: "Tendencias" },
  { to: "/configuracion", label: "Configuración" },
];

export function AppShell() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <p className="brand-kicker">Radar Diario de IA</p>
        <h1 className="brand-title">Observatorio Personal</h1>
        <nav className="main-nav" aria-label="Navegación principal">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? " nav-link-active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
