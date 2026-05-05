import { useMemo, useState } from "react";
import {
  addThemeKeyword,
  buildDefaultSettingsState,
  removeThemeKeyword,
  scoringWeightMeta,
  toggleSourceActive,
  updateAuthorField,
  updateSourceFrequency,
  updateWeight,
  validateWeightsSum,
} from "./settingsViewModel";

const sectionTabs = [
  { id: "sources", label: "Fuentes" },
  { id: "authors", label: "Autores" },
  { id: "keywords", label: "Keywords" },
  { id: "weights", label: "Scoring" },
  { id: "workflow", label: "Horario" },
] as const;

type SettingsSection = (typeof sectionTabs)[number]["id"];

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("sources");
  const [settings, setSettings] = useState(buildDefaultSettingsState);
  const [newKeywordByTheme, setNewKeywordByTheme] = useState<Record<string, string>>({});

  const weightValidation = useMemo(() => validateWeightsSum(settings.weights), [settings.weights]);
  const weightMeta = scoringWeightMeta();

  return (
    <div className="page">
      <header className="page-header">
        <p className="page-kicker">Calibración del radar</p>
        <h2 className="page-title">Configuración</h2>
      </header>

      <section className="card">
        <div className="settings-tabs" role="tablist" aria-label="Secciones de configuración">
          {sectionTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeSection === tab.id}
              className={`settings-tab${activeSection === tab.id ? " settings-tab-active" : ""}`}
              onClick={() => setActiveSection(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="settings-actions">
          <button
            type="button"
            className="reset-button"
            onClick={() => {
              setSettings(buildDefaultSettingsState());
              setNewKeywordByTheme({});
            }}
          >
            Restaurar defaults
          </button>
        </div>
      </section>

      {activeSection === "sources" && (
        <section className="card">
          <h3>Fuentes activas</h3>
          <p className="muted">
            Definí qué fuentes entran al radar y con qué frecuencia se consultan.
          </p>
          <div className="table-wrap">
            <table className="simple-table">
              <caption className="sr-only">
                Tabla de fuentes con tipo, frecuencia, última ejecución y estado.
              </caption>
              <thead>
                <tr>
                  <th>Fuente</th>
                  <th>Tipo</th>
                  <th>Frecuencia</th>
                  <th>Última ejecución</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {settings.sources.map((source) => (
                  <tr key={source.id}>
                    <td>
                      <p className="item-title">{source.name}</p>
                      <p className="muted">{source.url}</p>
                    </td>
                    <td>{source.type}</td>
                    <td>
                      <select
                        aria-label={`Frecuencia de ${source.name}`}
                        value={source.frequency}
                        onChange={(event) =>
                          setSettings((current) => ({
                            ...current,
                            sources: updateSourceFrequency(
                              current.sources,
                              source.id,
                              event.target.value as typeof source.frequency,
                            ),
                          }))
                        }
                      >
                        <option value="hourly">hourly</option>
                        <option value="daily">daily</option>
                        <option value="weekly">weekly</option>
                      </select>
                    </td>
                    <td>
                      {source.last_run_at
                        ? source.last_run_at.slice(0, 16).replace("T", " ")
                        : "Sin ejecución registrada"}
                    </td>
                    <td>
                      <button
                        type="button"
                        aria-pressed={source.active}
                        aria-label={`Cambiar estado de ${source.name}`}
                        className={source.active ? "status-button status-on" : "status-button status-off"}
                        onClick={() =>
                          setSettings((current) => ({
                            ...current,
                            sources: toggleSourceActive(current.sources, source.id),
                          }))
                        }
                      >
                        {source.active ? "Activo" : "Inactivo"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeSection === "authors" && (
        <section className="card">
          <h3>Autores observados</h3>
          <p className="muted">
            Ajustá prioridad y notas para calibrar qué autores pesan más en tu radar.
          </p>
          <ul className="list-clean settings-authors-list">
            {settings.authors.map((author) => (
              <li key={author.id} className="settings-author-item">
                <div className="settings-author-header">
                  <p className="item-title">{author.display_name}</p>
                  <button
                    type="button"
                    aria-pressed={author.active}
                    aria-label={`Cambiar estado de ${author.display_name}`}
                    className={author.active ? "status-button status-on" : "status-button status-off"}
                    onClick={() =>
                      setSettings((current) => ({
                        ...current,
                        authors: updateAuthorField(current.authors, author.id, { active: !author.active }),
                      }))
                    }
                  >
                    {author.active ? "Activo" : "Inactivo"}
                  </button>
                </div>

                <div className="settings-author-grid">
                  <label>
                    Aliases (coma separada)
                    <input
                      type="text"
                      value={author.aliases.join(", ")}
                      onChange={(event) => {
                        const aliases = event.target.value
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean);

                        setSettings((current) => ({
                          ...current,
                          authors: updateAuthorField(current.authors, author.id, { aliases }),
                        }));
                      }}
                    />
                  </label>

                  <label>
                    Prioridad
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={author.priority}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          authors: updateAuthorField(current.authors, author.id, {
                            priority: Number(event.target.value) || 1,
                          }),
                        }))
                      }
                    />
                  </label>
                </div>

                <label>
                  Notas
                  <input
                    type="text"
                    value={author.notes}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        authors: updateAuthorField(current.authors, author.id, {
                          notes: event.target.value,
                        }),
                      }))
                    }
                  />
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      {activeSection === "keywords" && (
        <section className="card">
          <h3>Keywords por tema</h3>
          <p className="muted">
            Estas keywords alimentarán la clasificación temática del motor lógico.
          </p>
          <ul className="list-clean settings-keywords-list">
            {Object.entries(settings.keywordsByTheme).map(([theme, keywords]) => (
              <li key={theme} className="settings-keyword-item">
                <p className="item-title">{theme}</p>
                <div className="keyword-chips">
                  {keywords.map((keyword) => (
                    <button
                      key={`${theme}-${keyword}`}
                      type="button"
                      aria-label={`Quitar keyword ${keyword} del tema ${theme}`}
                      className="keyword-chip"
                      onClick={() =>
                        setSettings((current) => ({
                          ...current,
                          keywordsByTheme: removeThemeKeyword(current.keywordsByTheme, theme, keyword),
                        }))
                      }
                    >
                      {keyword} ×
                    </button>
                  ))}
                </div>

                <div className="keyword-add-row">
                  <input
                    type="text"
                    placeholder="Agregar keyword"
                    value={newKeywordByTheme[theme] ?? ""}
                    onChange={(event) =>
                      setNewKeywordByTheme((current) => ({
                        ...current,
                        [theme]: event.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="inline-action"
                    onClick={() => {
                      const candidate = newKeywordByTheme[theme] ?? "";
                      setSettings((current) => ({
                        ...current,
                        keywordsByTheme: addThemeKeyword(current.keywordsByTheme, theme, candidate),
                      }));
                      setNewKeywordByTheme((current) => ({ ...current, [theme]: "" }));
                    }}
                  >
                    Añadir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {activeSection === "weights" && (
        <section className="card">
          <h3>Pesos del scoring</h3>
          <p className="muted">
            Los pesos definen cómo se compone el score total de relevancia.
          </p>
          <div className="settings-weights-grid">
            {weightMeta.map((item) => {
              const value = settings.weights[item.key];
              return (
                <label key={item.key} className="weight-item">
                  <span className="item-title">{item.label}</span>
                  <input
                    type="number"
                    step={0.01}
                    min={0}
                    max={1}
                    value={value}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        weights: updateWeight(
                          current.weights,
                          item.key,
                          Number(event.target.value),
                        ),
                      }))
                    }
                  />
                  <span className="muted">{item.description}</span>
                </label>
              );
            })}
          </div>

          <div
            role="status"
            aria-live="polite"
            className={weightValidation.isValid ? "weights-status ok" : "weights-status warn"}
          >
            <p className="item-title">Suma total: {weightValidation.sum.toFixed(2)}</p>
            <p className="muted">{weightValidation.message}</p>
          </div>
        </section>
      )}

      {activeSection === "workflow" && (
        <section className="card">
          <h3>Horario de workflow diario</h3>
          <ul className="list-clean">
            <li>
              <p className="item-title">Ingesta</p>
              <p>{settings.workflow.ingestionWindow}</p>
            </li>
            <li>
              <p className="item-title">Clasificación / scoring</p>
              <p>{settings.workflow.scoringWindow}</p>
            </li>
            <li>
              <p className="item-title">Generación briefing</p>
              <p>{settings.workflow.briefingWindow}</p>
            </li>
            <li>
              <p className="item-title">Disponible en dashboard</p>
              <p>{settings.workflow.dashboardAvailableAt}</p>
            </li>
          </ul>
        </section>
      )}
    </div>
  );
}
