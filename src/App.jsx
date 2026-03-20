import { useEffect, useMemo, useState } from "react";
import plan from "./plan.json";

const STORAGE_KEY = "lernplan-progress-v2";
const LEGACY_KEY = "lernplan-progress-v1";

function normalizeProgress(rawObj) {
  const out = {};
  for (const [id, v] of Object.entries(rawObj || {})) {
    if (typeof v === "boolean") out[id] = { done: v, review: false };
    else out[id] = { done: !!v?.done, review: !!v?.review };
  }
  return out;
}

function loadProgress() {
  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY);
    if (rawV2) return normalizeProgress(JSON.parse(rawV2));
    const rawV1 = localStorage.getItem(LEGACY_KEY);
    if (rawV1) return normalizeProgress(JSON.parse(rawV1));
    return {};
  } catch {
    return {};
  }
}

function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

// Wochenplan: jede Woche enthält Abschnitte mit ptIdx (Prüfungsteil-Index),
// fkIdx (Fragenkomplex-Index) und optionalem tkRange [von, bis] (0-basiert, inklusiv).
const WEEK_PLAN = [
  {
    week: 1,
    title: "AP1 – Projektmanagement & Kundenkommunikation",
    sections: [
      { ptIdx: 0, fkIdx: 0 },          // AP1 FK01 komplett
      { ptIdx: 0, fkIdx: 1 },          // AP1 FK02 komplett
    ],
  },
  {
    week: 2,
    title: "AP1 – IT-Systeme beurteilen & IT-Lösungen (Teil 1)",
    sections: [
      { ptIdx: 0, fkIdx: 2 },                    // AP1 FK03 komplett
      { ptIdx: 0, fkIdx: 3, tkRange: [0, 3] },   // AP1 FK04 TK01–04
    ],
  },
  {
    week: 3,
    title: "AP1 – IT-Lösungen (Teil 2), Qualitätssicherung & IT-Sicherheit",
    sections: [
      { ptIdx: 0, fkIdx: 3, tkRange: [4, 7] },   // AP1 FK04 TK05–08
      { ptIdx: 0, fkIdx: 4 },                    // AP1 FK05 komplett
      { ptIdx: 0, fkIdx: 5 },                    // AP1 FK06 komplett
    ],
  },
  {
    week: 4,
    title: "AP1 – Auftragsabschluss & Leistungserbringung",
    sections: [
      { ptIdx: 0, fkIdx: 6 },          // AP1 FK07 komplett
    ],
  },
  {
    week: 5,
    title: "AP2 – Übergreifend: Kunden, IT-Lösungen & Qualität",
    sections: [
      { ptIdx: 1, fkIdx: 0 },          // AP2 übergreifend FK01
      { ptIdx: 1, fkIdx: 1 },          // AP2 übergreifend FK02
      { ptIdx: 1, fkIdx: 2 },          // AP2 übergreifend FK03
    ],
  },
  {
    week: 6,
    title: "AP2 – Übergreifend: IT-Sicherheit & Datenschutz",
    sections: [
      { ptIdx: 1, fkIdx: 3 },          // AP2 übergreifend FK04
    ],
  },
  {
    week: 7,
    title: "AP2 SI – Betreiben von IT-Systemen (Teil 1)",
    sections: [
      { ptIdx: 2, fkIdx: 0, tkRange: [0, 6] },   // AP2 SI FK01 TK01–07
    ],
  },
  {
    week: 8,
    title: "AP2 SI – Betreiben von IT-Systemen (Teil 2) & Speicherlösungen (Teil 1)",
    sections: [
      { ptIdx: 2, fkIdx: 0, tkRange: [7, 12] },  // AP2 SI FK01 TK08–13
      { ptIdx: 2, fkIdx: 1, tkRange: [0, 2] },   // AP2 SI FK02 TK01–03
    ],
  },
  {
    week: 9,
    title: "AP2 SI – Speicherlösungen (Teil 2) & Programmieren von Softwarelösungen",
    sections: [
      { ptIdx: 2, fkIdx: 1, tkRange: [3, 5] },   // AP2 SI FK02 TK04–06
      { ptIdx: 2, fkIdx: 2 },                    // AP2 SI FK03 komplett
    ],
  },
  {
    week: 10,
    title: "AP2 SI – Konzipieren & Realisieren von IT-Systemen (Teil 1)",
    sections: [
      { ptIdx: 2, fkIdx: 3, tkRange: [0, 8] },   // AP2 SI FK04 TK01–09
    ],
  },
  {
    week: 11,
    title: "AP2 SI – Konzipieren & Realisieren von IT-Systemen (Teil 2)",
    sections: [
      { ptIdx: 2, fkIdx: 3, tkRange: [9, 17] },  // AP2 SI FK04 TK10–18
    ],
  },
  {
    week: 12,
    title: "AP2 SI – Installieren & Konfigurieren von Netzwerken",
    sections: [
      { ptIdx: 2, fkIdx: 4 },          // AP2 SI FK05 komplett
    ],
  },
  {
    week: 13,
    title: "AP2 SI – Administrieren von IT-Systemen (Teil 1)",
    sections: [
      { ptIdx: 2, fkIdx: 5, tkRange: [0, 5] },   // AP2 SI FK06 TK01–06
    ],
  },
  {
    week: 14,
    title: "AP2 SI – Administrieren von IT-Systemen (Teil 2)",
    sections: [
      { ptIdx: 2, fkIdx: 5, tkRange: [6, 11] },  // AP2 SI FK06 TK07–12
    ],
  },
  {
    week: 15,
    title: "AP2 WiSo – Berufsausbildung & Arbeitsrecht (Teil 1)",
    sections: [
      { ptIdx: 3, fkIdx: 0, tkRange: [0, 8] },   // WiSo FK01 TK01–09
    ],
  },
  {
    week: 16,
    title: "AP2 WiSo – Berufsausbildung & Arbeitsrecht (Teil 2) & Unternehmensorganisation (Teil 1)",
    sections: [
      { ptIdx: 3, fkIdx: 0, tkRange: [9, 13] },  // WiSo FK01 TK10–14
      { ptIdx: 3, fkIdx: 1, tkRange: [0, 3] },   // WiSo FK02 TK01–04
    ],
  },
  {
    week: 17,
    title: "AP2 WiSo – Unternehmensorganisation (Teil 2) & Arbeitsschutz",
    sections: [
      { ptIdx: 3, fkIdx: 1, tkRange: [4, 8] },   // WiSo FK02 TK05–09
      { ptIdx: 3, fkIdx: 2 },                    // WiSo FK03 komplett
    ],
  },
  {
    week: 18,
    title: "AP2 WiSo – Umweltschutz & Vernetztes Zusammenarbeiten",
    sections: [
      { ptIdx: 3, fkIdx: 3 },          // WiSo FK04 komplett
      { ptIdx: 3, fkIdx: 4 },          // WiSo FK05 komplett
    ],
  },
  {
    week: 19,
    title: "AP2 WiSo – Grundlagen der IT-Sicherheit (WiSo)",
    sections: [
      { ptIdx: 3, fkIdx: 5 },          // WiSo FK08 komplett
    ],
  },
];

function buildWeeks(weekPlan, catalog) {
  return weekPlan.map((wp) => {
    const tasks = [];
    for (const section of wp.sections) {
      const pt = catalog[section.ptIdx];
      const fk = pt.fragenkomplexe[section.fkIdx];
      const tks = section.tkRange
        ? fk.themenkreise.slice(section.tkRange[0], section.tkRange[1] + 1)
        : fk.themenkreise;

      for (const tk of tks) {
        const id = `pt${section.ptIdx}_fk${section.fkIdx}_tk${tk.nummer}`;
        tasks.push({
          id,
          topic: tk.titel,
          subtopic: `${pt.pruefungsteil} · FK ${fk.nummer}`,
          fkTitel: fk.titel,
          unterpunkte: tk.unterpunkte || [],
        });
      }
    }
    return { week: wp.week, title: wp.title, tasks };
  });
}

export default function App() {
  const [progress, setProgress] = useState(() => loadProgress());
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const weeks = useMemo(
    () => buildWeeks(WEEK_PLAN, plan.pruefungskatalog),
    []
  );

  const allTasks = useMemo(() => {
    const flat = [];
    for (const w of weeks) {
      for (const t of w.tasks) {
        flat.push({ week: w.week, weekTitle: w.title, ...t });
      }
    }
    return flat;
  }, [weeks]);

  const doneCount = allTasks.filter((t) => progress[t.id]?.done).length;
  const totalCount = allTasks.length;
  const percent = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
  const nextTask = allTasks.find((t) => !progress[t.id]?.done);

  function toggleDone(id) {
    setProgress((prev) => {
      const cur = prev[id] || { done: false, review: false };
      return { ...prev, [id]: { ...cur, done: !cur.done } };
    });
  }

  function toggleReview(id) {
    setProgress((prev) => {
      const cur = prev[id] || { done: false, review: false };
      return { ...prev, [id]: { ...cur, review: !cur.review } };
    });
  }

  function toggleExpand(id) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function resetAll() {
    setProgress({});
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-zinc-100">
      <div className="bg-neutral-800">
        <header className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold">
                Lernplan-Tracker (FISI Teil 2)
              </h1>
              <p className="text-zinc-400 mt-1">
                Häkchen setzen, Fortschritt sehen, Prüfung dominieren.
              </p>
            </div>
            <button
              onClick={resetAll}
              className="text-sm px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700"
              title="Setzt alle Häkchen zurück"
            >
              Reset
            </button>
          </div>

          <div className="mt-4 bg-zinc-900 rounded-2xl p-4 shadow">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-sm text-zinc-400">Gesamtfortschritt</div>
                <div className="text-lg font-medium">
                  {doneCount}/{totalCount} erledigt ({percent}%)
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input
                  type="checkbox"
                  className="accent-emerald-500"
                  checked={showOpenOnly}
                  onChange={(e) => setShowOpenOnly(e.target.checked)}
                />
                Nur offene anzeigen
              </label>
            </div>

            <div className="mt-3 w-full h-3 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-3 bg-emerald-500 transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>

            <div className="mt-4">
              <div className="text-sm text-zinc-400">Nächste Aufgabe</div>
              {nextTask ? (
                <div className="mt-1">
                  <div className="font-medium">
                    Woche {nextTask.week}: {nextTask.weekTitle}
                  </div>
                  <div className="text-zinc-200">
                    {nextTask.topic}
                    <span className="text-zinc-500 text-sm ml-2">
                      {nextTask.subtopic}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-1 text-emerald-400 font-medium">
                  Alles erledigt. Prüfung kann kommen.
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="space-y-4 p-6 pt-0">
          {weeks.map((w) => {
            const tasks = showOpenOnly
              ? w.tasks.filter((t) => !progress[t.id]?.done)
              : w.tasks;

            const weekDone = w.tasks.filter((t) => progress[t.id]?.done).length;

            return (
              <section
                key={w.week}
                className="bg-zinc-900 rounded-2xl p-4 shadow"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-xl font-semibold">
                    <span className="text-zinc-500 text-base font-normal mr-2">
                      Woche {w.week}
                    </span>
                    {w.title}
                  </h2>
                  <div className="text-sm text-zinc-400 shrink-0">
                    {weekDone}/{w.tasks.length}
                  </div>
                </div>

                <div className="mt-2 w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-1.5 bg-emerald-600 transition-all"
                    style={{
                      width: w.tasks.length
                        ? `${Math.round((weekDone / w.tasks.length) * 100)}%`
                        : "0%",
                    }}
                  />
                </div>

                <div className="mt-3 space-y-2">
                  {tasks.length === 0 ? (
                    <div className="text-sm text-zinc-400">
                      Keine offenen Aufgaben in dieser Woche.
                    </div>
                  ) : (
                    tasks.map((t) => {
                      const isExpanded = !!expanded[t.id];
                      const isDone = !!progress[t.id]?.done;
                      const isReview = !!progress[t.id]?.review;

                      return (
                        <div
                          key={t.id}
                          className={`rounded-xl bg-zinc-800/60 hover:bg-zinc-800 transition-colors ${
                            isDone ? "opacity-50" : ""
                          } ${isReview ? "ring-1 ring-amber-500/40" : ""}`}
                        >
                          <div className="flex items-start gap-3 p-3">
                            <input
                              type="checkbox"
                              className="mt-1 accent-emerald-500 shrink-0"
                              checked={isDone}
                              onChange={() => toggleDone(t.id)}
                            />

                            <div
                              className="flex-1 cursor-pointer min-w-0"
                              onClick={() => toggleExpand(t.id)}
                            >
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`font-medium ${
                                    isDone
                                      ? "line-through text-zinc-500"
                                      : "text-zinc-100"
                                  }`}
                                >
                                  {t.topic}
                                </span>
                                <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400">
                                  {t.subtopic}
                                </span>
                              </div>

                              <div className="text-xs text-zinc-500 mt-0.5 truncate">
                                {t.fkTitel}
                              </div>

                              {isExpanded && t.unterpunkte.length > 0 && (
                                <ul className="mt-2 text-sm text-zinc-300 list-disc pl-4 space-y-0.5">
                                  {t.unterpunkte.map((u, i) => (
                                    <li key={i}>{u}</li>
                                  ))}
                                </ul>
                              )}

                              {isExpanded && t.unterpunkte.length === 0 && (
                                <p className="mt-2 text-sm text-zinc-500 italic">
                                  Keine Unterpunkte hinterlegt.
                                </p>
                              )}

                              <div className="text-xs text-zinc-600 mt-1">
                                {isExpanded ? "▲ einklappen" : "▼ Unterpunkte"}
                              </div>
                            </div>

                            <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
                              <input
                                type="checkbox"
                                className="accent-amber-500"
                                checked={isReview}
                                onChange={() => toggleReview(t.id)}
                                title="Unsicher / Später wiederholen"
                              />
                              <span className="text-xs text-amber-300">
                                Review
                              </span>
                            </label>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            );
          })}

          <section className="bg-zinc-900 rounded-2xl p-4 shadow">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-semibold">Wiederholen (Review)</h2>
              <div className="text-sm text-zinc-400">
                {allTasks.filter((t) => progress[t.id]?.review).length}
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {allTasks.filter((t) => progress[t.id]?.review).length === 0 ? (
                <div className="text-sm text-zinc-400">
                  Keine markierten Themen. Entweder stabil – oder mutig.
                </div>
              ) : (
                allTasks
                  .filter((t) => progress[t.id]?.review)
                  .map((t) => (
                    <div key={t.id} className="p-3 rounded-xl bg-zinc-800/60 ring-1 ring-amber-500/30">
                      <div className="text-xs text-zinc-400">
                        Woche {t.week}: {t.weekTitle}
                      </div>
                      <div className="font-medium mt-0.5">{t.topic}</div>
                      <div className="text-xs text-zinc-500">{t.subtopic} · {t.fkTitel}</div>
                    </div>
                  ))
              )}
            </div>
          </section>
        </main>

        <footer className="mt-8 p-6 text-xs text-zinc-500">
          Speicherung lokal im Browser (localStorage). Kein Login, kein Server, kein Drama.
        </footer>
      </div>
    </div>
  );
}
