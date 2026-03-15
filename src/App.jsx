import { useEffect, useMemo, useState } from "react";
import plan from "./plan.json";

const STORAGE_KEY = "lernplan-progress-v2";
const LEGACY_KEY = "lernplan-progress-v1";  

function normalizeProgress(rawObj) {
  // alt: { id: true }
  // neu: { id: { done: true, review: false } }
  const out = {};
  for (const [id, v] of Object.entries(rawObj || {})) {
    if (typeof v === "boolean") out[id] = { done: v, review: false };
    else out[id] = { done: !!v?.done, review: !!v?.review };
  }
  return out;
}

function loadProgress() {
  try {
    //first try with v2
    const rawV2 = localStorage.getItem(STORAGE_KEY);
    if(rawV2) return normalizeProgress(JSON.parse(rawV2));

    //fallback: v1 
    const rawV1 = localStorage.getItem(LEGACY_KEY);
    if(rawV1) return normalizeProgress(JSON.parse(rawV1));

    return{};
  } catch {
    return {};
  }
}

function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export default function App() {
  const [progress, setProgress] = useState(() => loadProgress());
  const [showOpenOnly, setShowOpenOnly] = useState(false);

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const allTasks = useMemo(() => {
    const flat = [];
    for (const w of plan.weeks) {
      for (const t of w.tasks) {
        flat.push({ week: w.week, weekTitle: w.title, ...t });
      }
    }
    return flat;
  }, []);

  const doneCount = allTasks.filter((t) => progress[t.id]?.done).length;
  const totalCount = allTasks.length;
  const percent = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
  const nextTask = allTasks.find((t) => !progress[t.id]?.done);
  

  function toggleDone(id) {
    setProgress((prev) => {
      const cur = prev[id] || {done: false, review: false};
      return {...prev, [id]: {...cur,done: !cur.done }};
  });
}

  function toggleReview(id){
    setProgress((prev) => {
      const cur = prev[id] || {done: false, review: false};
      return {...prev,[id]: {...cur, review: !cur.review }};
    });
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
                Häkchen setzen, Fortschritt sehen, Prüfung dominieren. (In diesera
                Reihenfolge.)
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
                className="h-3 bg-emerald-500"
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
                  <div className="text-zinc-200">{nextTask.text}</div>
                </div>
              ) : (
                <div className="mt-1 text-emerald-400 font-medium">
                  Alles erledigt. 😄
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="space-y-4">
          {plan.weeks.map((w) => {
            const tasks = showOpenOnly
              ? w.tasks.filter((t) => !progress[t.id]?.done)
              : w.tasks;

            return (
              <section
                key={w.week}
                className="bg-zinc-900 rounded-2xl p-4 shadow"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-xl font-semibold">
                    Woche {w.week}: {w.title}
                  </h2>
                  <div className="text-sm text-zinc-400">
                    {w.tasks.filter((t) => progress[t.id]?.done).length}/{w.tasks.length}
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  {tasks.length === 0 ? (
                    <div className="text-sm text-zinc-400">
                      Keine offenen Aufgaben in dieser Woche.
                    </div>
                  ) : (
                    tasks.map((t) => (
                      <div key={t.id} className="flex items-start gap-3 p-3 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 cursor-pointer">

                      <label className="flex items-start gap-3 cursor-pointer flex-1">
                        <input
                          type="checkbox"
                          className="mt-1 accent-emerald-500"
                          checked={!!progress[t.id]?.done}
                          onChange={() => toggleDone(t.id)}
                        />

                        <div>
                          <div className="font-medium">{t.text}</div>
                          <div className="text-xs text-zinc-400">ID: {t.id}</div>
                        </div>
                      </label>

                      <label className= "flex items-center gap-2 cursor-pointer select-none">
                      <input
                          type="checkbox"
                          className= "accent-amber-500"
                          checked =  {!!progress[t.id]?.review}
                          onChange={() => toggleReview(t.id)}
                          title="Unsicher / Später wiederholen"
                          />
                          <span className="text-xs text-amber-300">Review</span>
                     </label>
                      </div>
                    ))
                  )}
              </div>

                {w.traps?.length ? (
                  <div className="mt-4 border border-zinc-800 rounded-xl p-3">
                    <div className="text-sm font-semibold text-amber-300">
                      Typische IHK-Fallen
                    </div>
                    <ul className="mt-2 text-sm text-zinc-300 list-disc pl-5 space-y-1">
                      {w.traps.map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
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
        Keine markierten Themen. Entweder stabil – oder mutig. 😄
      </div>
    ) : (
      allTasks
        .filter((t) => progress[t.id]?.review)
        .map((t) => (
          <div key={t.id} className="p-3 rounded-xl bg-zinc-800/60">
            <div className="text-sm text-zinc-400">
              Woche {t.week}: {t.weekTitle}
            </div>
            <div className="font-medium">{t.text}</div>
          </div>
        ))
    )}
  </div>
</section>
        </main>

        <footer className="mt-8 text-xs text-zinc-500">
          Speicherung lokal im Browser (localStorage). Kein Login, kein Server,
          kein unnötiges Drama.
        </footer>
      </div>
    </div>
  );
}
