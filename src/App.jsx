import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import plan from "./plan.json";

const EDIT_SESSION_KEY = "lernplan-edit-pw";

// --- API-Helfer ---

async function fetchProgress() {
  try {
    const res = await fetch("api/progress");
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

async function saveProgressToServer(progress, password) {
  try {
    const res = await fetch("api/progress", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Edit-Password": password,
      },
      body: JSON.stringify(progress),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function normalizeProgress(rawObj) {
  const out = {};
  for (const [id, v] of Object.entries(rawObj || {})) {
    if (typeof v === "boolean") out[id] = { done: v, review: false, sub: {} };
    else out[id] = { done: !!v?.done, review: !!v?.review, sub: v?.sub || {} };
  }
  return out;
}

const WEEK_PLAN = [
  { week: 1, title: "AP1 – Projektmanagement & Kundenkommunikation", sections: [{ ptIdx: 0, fkIdx: 0 }, { ptIdx: 0, fkIdx: 1 }] },
  { week: 2, title: "AP1 – IT-Systeme beurteilen & IT-Lösungen (Teil 1)", sections: [{ ptIdx: 0, fkIdx: 2 }, { ptIdx: 0, fkIdx: 3, tkRange: [0, 3] }] },
  { week: 3, title: "AP1 – IT-Lösungen (Teil 2), Qualitätssicherung & IT-Sicherheit", sections: [{ ptIdx: 0, fkIdx: 3, tkRange: [4, 7] }, { ptIdx: 0, fkIdx: 4 }, { ptIdx: 0, fkIdx: 5 }] },
  { week: 4, title: "AP1 – Auftragsabschluss & Leistungserbringung", sections: [{ ptIdx: 0, fkIdx: 6 }] },
  { week: 5, title: "AP2 – Übergreifend: Kunden, IT-Lösungen & Qualität", sections: [{ ptIdx: 1, fkIdx: 0 }, { ptIdx: 1, fkIdx: 1 }, { ptIdx: 1, fkIdx: 2 }] },
  { week: 6, title: "AP2 – Übergreifend: IT-Sicherheit & Datenschutz", sections: [{ ptIdx: 1, fkIdx: 3 }] },
  { week: 7, title: "AP2 SI – Betreiben von IT-Systemen (Teil 1)", sections: [{ ptIdx: 2, fkIdx: 0, tkRange: [0, 6] }] },
  { week: 8, title: "AP2 SI – Betreiben von IT-Systemen (Teil 2) & Speicherlösungen (Teil 1)", sections: [{ ptIdx: 2, fkIdx: 0, tkRange: [7, 12] }, { ptIdx: 2, fkIdx: 1, tkRange: [0, 2] }] },
  { week: 9, title: "AP2 SI – Speicherlösungen (Teil 2) & Programmieren von Softwarelösungen", sections: [{ ptIdx: 2, fkIdx: 1, tkRange: [3, 5] }, { ptIdx: 2, fkIdx: 2 }] },
  { week: 10, title: "AP2 SI – Konzipieren & Realisieren von IT-Systemen (Teil 1)", sections: [{ ptIdx: 2, fkIdx: 3, tkRange: [0, 8] }] },
  { week: 11, title: "AP2 SI – Konzipieren & Realisieren von IT-Systemen (Teil 2)", sections: [{ ptIdx: 2, fkIdx: 3, tkRange: [9, 17] }] },
  { week: 12, title: "AP2 SI – Installieren & Konfigurieren von Netzwerken", sections: [{ ptIdx: 2, fkIdx: 4 }] },
  { week: 13, title: "AP2 SI – Administrieren von IT-Systemen (Teil 1)", sections: [{ ptIdx: 2, fkIdx: 5, tkRange: [0, 5] }] },
  { week: 14, title: "AP2 SI – Administrieren von IT-Systemen (Teil 2)", sections: [{ ptIdx: 2, fkIdx: 5, tkRange: [6, 11] }] },
  { week: 15, title: "AP2 WiSo – Berufsausbildung & Arbeitsrecht (Teil 1)", sections: [{ ptIdx: 3, fkIdx: 0, tkRange: [0, 8] }] },
  { week: 16, title: "AP2 WiSo – Berufsausbildung & Arbeitsrecht (Teil 2) & Unternehmensorganisation (Teil 1)", sections: [{ ptIdx: 3, fkIdx: 0, tkRange: [9, 13] }, { ptIdx: 3, fkIdx: 1, tkRange: [0, 3] }] },
  { week: 17, title: "AP2 WiSo – Unternehmensorganisation (Teil 2) & Arbeitsschutz", sections: [{ ptIdx: 3, fkIdx: 1, tkRange: [4, 8] }, { ptIdx: 3, fkIdx: 2 }] },
  { week: 18, title: "AP2 WiSo – Umweltschutz & Vernetztes Zusammenarbeiten", sections: [{ ptIdx: 3, fkIdx: 3 }, { ptIdx: 3, fkIdx: 4 }] },
];

function buildWeeks(weekPlan, catalog) {
  return weekPlan.map((wp) => {
    const tasks = [];
    for (const section of wp.sections) {
      const pt = catalog[section.ptIdx];
      const fk = pt.fragenkomplexe[section.fkIdx];
      const tks = section.tkRange ? fk.themenkreise.slice(section.tkRange[0], section.tkRange[1] + 1) : fk.themenkreise;
      for (const tk of tks) {
        const id = `pt${section.ptIdx}_fk${section.fkIdx}_tk${tk.nummer}`;
        tasks.push({ id, topic: tk.titel, subtopic: `${pt.pruefungsteil} · FK ${fk.nummer}`, fkTitel: fk.titel, unterpunkte: tk.unterpunkte || [] });
      }
    }
    return { week: wp.week, title: wp.title, tasks };
  });
}

export default function App() {
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [expanded, setExpanded] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [editPassword, setEditPassword] = useState(() => sessionStorage.getItem(EDIT_SESSION_KEY) || "");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const saveTimer = useRef(null);

  const skipNextFetch = useRef(false);

  // Fortschritt vom Server laden (einmalig + Polling im Lese-Modus)
  useEffect(() => {
    if (!skipNextFetch.current) {
      fetchProgress().then((data) => { setProgress(normalizeProgress(data)); setLoading(false); });
    } else {
      skipNextFetch.current = false;
      setLoading(false);
    }
    const interval = setInterval(async () => {
      if (!editMode) { const data = await fetchProgress(); setProgress(normalizeProgress(data)); }
    }, 15000);
    return () => clearInterval(interval);
  }, [editMode]);

  // Session-Passwort wiederherstellen
  useEffect(() => { if (editPassword) setEditMode(true); }, []);

  const weeks = useMemo(() => buildWeeks(WEEK_PLAN, plan.pruefungskatalog), []);
  const allTasks = useMemo(() => { const flat = []; for (const w of weeks) for (const t of w.tasks) flat.push({ week: w.week, weekTitle: w.title, ...t }); return flat; }, [weeks]);
  const doneCount = allTasks.filter((t) => progress[t.id]?.done).length;
  const totalCount = allTasks.length;
  const percent = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
  const nextTask = allTasks.find((t) => !progress[t.id]?.done);

  function saveNow(newProgress) {
    if (!editPassword) return;
    setSaving(true);
    saveProgressToServer(newProgress, editPassword).then((ok) => {
      setSaving(false);
      if (!ok) { setEditMode(false); setEditPassword(""); sessionStorage.removeItem(EDIT_SESSION_KEY); alert("Speichern fehlgeschlagen."); }
    });
  }

  function toggleDone(id) {
    if (!editMode) return;
    const cur = progress[id] || { done: false, review: false, sub: {} };
    const next = { ...progress, [id]: { ...cur, done: !cur.done } };
    setProgress(next);
    saveNow(next);
  }
  function toggleReview(id) {
    if (!editMode) return;
    const cur = progress[id] || { done: false, review: false, sub: {} };
    const next = { ...progress, [id]: { ...cur, review: !cur.review } };
    setProgress(next);
    saveNow(next);
  }
  function toggleSubDone(id, idx, total) {
    if (!editMode) return;
    const cur = progress[id] || { done: false, review: false, sub: {} };
    const sub = { ...cur.sub };
    const curSub = sub[idx] || { done: false, review: false };
    sub[idx] = { ...curSub, done: !curSub.done };
    const allDone = Array.from({ length: total }, (_, i) => !!sub[i]?.done).every(Boolean);
    const next = { ...progress, [id]: { ...cur, sub, done: allDone } };
    setProgress(next);
    saveNow(next);
  }
  function toggleSubReview(id, idx) {
    if (!editMode) return;
    const cur = progress[id] || { done: false, review: false, sub: {} };
    const sub = { ...cur.sub };
    const curSub = sub[idx] || { done: false, review: false };
    sub[idx] = { ...curSub, review: !curSub.review };
    const next = { ...progress, [id]: { ...cur, sub } };
    setProgress(next);
    saveNow(next);
  }
  function toggleExpand(id) { setExpanded((prev) => ({ ...prev, [id]: !prev[id] })); }
  function resetAll() { if (!editMode) return; if (window.confirm("Wirklich ALLE Häkchen zurücksetzen?")) { const empty = {}; setProgress(empty); saveNow(empty); } }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    const res = await fetch("api/progress", { method: "POST", headers: { "Content-Type": "application/json", "X-Edit-Password": passwordInput }, body: JSON.stringify(progress) });
    if (res.ok) { setEditMode(true); setEditPassword(passwordInput); sessionStorage.setItem(EDIT_SESSION_KEY, passwordInput); setShowPasswordModal(false); setPasswordInput(""); setPasswordError(""); }
    else { setPasswordError("Falsches Passwort!"); setPasswordInput(""); }
  }

  function handleEditClick() {
    if (editMode) {
      skipNextFetch.current = true;
      setEditMode(false);
      setEditPassword("");
      sessionStorage.removeItem(EDIT_SESSION_KEY);
    } else {
      setShowPasswordModal(true);
      setPasswordError("");
      setPasswordInput("");
    }
  }

  const reviewItems = allTasks.flatMap((t) => {
    const items = [];
    if (progress[t.id]?.review) items.push({ type: "task", t });
    t.unterpunkte.forEach((u, i) => { if (progress[t.id]?.sub?.[i]?.review) items.push({ type: "sub", t, u, i }); });
    return items;
  });

  if (loading) return (<div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-zinc-100 flex items-center justify-center"><div className="text-zinc-400 text-lg">Lade Fortschritt…</div></div>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-zinc-100">
      <div className="bg-neutral-800">
        <header className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold">Lernplan-Tracker (FISI Teil 2)</h1>
              <p className="text-zinc-400 mt-1">Häkchen setzen, Fortschritt sehen, Prüfung dominieren.</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {saving && <span className="text-xs text-zinc-500 animate-pulse">Speichert…</span>}
              {editMode && <button onClick={resetAll} className="text-sm px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700" title="Setzt alle Häkchen zurück">Reset</button>}
              <button onClick={handleEditClick} className={`text-sm px-3 py-2 rounded-xl transition-colors ${editMode ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"}`} title={editMode ? "Bearbeitung sperren" : "Bearbeitung freischalten"}>{editMode ? "🔓 Bearbeiten" : "🔒 Gesperrt"}</button>
            </div>
          </div>
          {!editMode && <div className="mt-2 text-xs text-zinc-500 bg-zinc-800/50 rounded-lg px-3 py-1.5 inline-block">Nur-Lesen-Modus — klicke auf 🔒 um zu bearbeiten</div>}
          <div className="mt-4 bg-zinc-900 rounded-2xl p-4 shadow">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-sm text-zinc-400">Gesamtfortschritt</div>
                <div className="text-lg font-medium">{doneCount}/{totalCount} erledigt ({percent}%)</div>
              </div>
              <label className="flex items-center gap-2 text-sm text-zinc-300">
                <input type="checkbox" className="accent-emerald-500" checked={showOpenOnly} onChange={(e) => setShowOpenOnly(e.target.checked)} />
                Nur offene anzeigen
              </label>
            </div>
            <div className="mt-3 w-full h-3 bg-zinc-800 rounded-full overflow-hidden"><div className="h-3 bg-emerald-500 transition-all" style={{ width: `${percent}%` }} /></div>
            <div className="mt-4">
              <div className="text-sm text-zinc-400">Nächste Aufgabe</div>
              {nextTask ? (<div className="mt-1"><div className="font-medium">Woche {nextTask.week}: {nextTask.weekTitle}</div><div className="text-zinc-200">{nextTask.topic}<span className="text-zinc-500 text-sm ml-2">{nextTask.subtopic}</span></div></div>) : (<div className="mt-1 text-emerald-400 font-medium">Alles erledigt. Prüfung kann kommen.</div>)}
            </div>
          </div>
        </header>

        <main className="space-y-4 p-6 pt-0">
          {weeks.map((w) => {
            const tasks = showOpenOnly ? w.tasks.filter((t) => !progress[t.id]?.done) : w.tasks;
            const weekDone = w.tasks.filter((t) => progress[t.id]?.done).length;
            return (
              <section key={w.week} className="bg-zinc-900 rounded-2xl p-4 shadow">
                <div className="flex items-baseline justify-between gap-3">
                  <h2 className="text-xl font-semibold"><span className="text-zinc-500 text-base font-normal mr-2">Woche {w.week}</span>{w.title}</h2>
                  <div className="text-sm text-zinc-400 shrink-0">{weekDone}/{w.tasks.length}</div>
                </div>
                <div className="mt-2 w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden"><div className="h-1.5 bg-emerald-600 transition-all" style={{ width: w.tasks.length ? `${Math.round((weekDone / w.tasks.length) * 100)}%` : "0%" }} /></div>
                <div className="mt-3 space-y-2">
                  {tasks.length === 0 ? (<div className="text-sm text-zinc-400">Keine offenen Aufgaben in dieser Woche.</div>) : (
                    tasks.map((t) => {
                      const isExpanded = !!expanded[t.id]; const isDone = !!progress[t.id]?.done; const isReview = !!progress[t.id]?.review;
                      return (
                        <div key={t.id} className={`rounded-xl bg-zinc-800/60 hover:bg-zinc-800 transition-colors ${isDone ? "opacity-50" : ""} ${isReview ? "ring-1 ring-amber-500/40" : ""}`}>
                          <div className="flex items-start gap-3 p-3">
                            <input type="checkbox" className={`mt-1 accent-emerald-500 shrink-0 ${!editMode ? "pointer-events-none opacity-60" : ""}`} checked={isDone} onChange={() => toggleDone(t.id)} disabled={!editMode} />
                            <div className="flex-1 cursor-pointer min-w-0" onClick={() => toggleExpand(t.id)}>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`font-medium ${isDone ? "line-through text-zinc-500" : "text-zinc-100"}`}>{t.topic}</span>
                                <span className="text-xs px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-400">{t.subtopic}</span>
                              </div>
                              <div className="text-xs text-zinc-500 mt-0.5 truncate">{t.fkTitel}</div>
                              {isExpanded && t.unterpunkte.length > 0 && (
                                <ul className="mt-2 space-y-1" onClick={(e) => e.stopPropagation()}>
                                  {t.unterpunkte.map((u, i) => {
                                    const subDone = !!progress[t.id]?.sub?.[i]?.done; const subReview = !!progress[t.id]?.sub?.[i]?.review;
                                    return (
                                      <li key={i} className={`flex items-start gap-2 text-sm rounded-lg px-2 py-1 ${subReview ? "ring-1 ring-amber-500/30" : ""}`}>
                                        <input type="checkbox" className={`mt-0.5 accent-emerald-500 shrink-0 ${!editMode ? "pointer-events-none opacity-60" : ""}`} checked={subDone} onChange={() => toggleSubDone(t.id, i, t.unterpunkte.length)} disabled={!editMode} />
                                        <span className={`flex-1 ${subDone ? "line-through text-zinc-500" : "text-zinc-300"}`}>{u}</span>
                                        <label className={`flex items-center gap-1 shrink-0 ${editMode ? "cursor-pointer" : "pointer-events-none opacity-60"}`}>
                                          <input type="checkbox" className="accent-amber-500" checked={subReview} onChange={() => toggleSubReview(t.id, i)} disabled={!editMode} title="Unsicher / Später wiederholen" />
                                          <span className="text-xs text-amber-400">R</span>
                                        </label>
                                      </li>
                                    );
                                  })}
                                </ul>
                              )}
                              {isExpanded && t.unterpunkte.length === 0 && <p className="mt-2 text-sm text-zinc-500 italic">Keine Unterpunkte hinterlegt.</p>}
                              <div className="text-xs text-zinc-600 mt-1">{isExpanded ? "▲ einklappen" : "▼ Unterpunkte"}</div>
                            </div>
                            <label className={`flex items-center gap-1.5 select-none shrink-0 ${editMode ? "cursor-pointer" : "pointer-events-none opacity-60"}`}>
                              <input type="checkbox" className="accent-amber-500" checked={isReview} onChange={() => toggleReview(t.id)} disabled={!editMode} title="Unsicher / Später wiederholen" />
                              <span className="text-xs text-amber-300">Review</span>
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
            <div className="flex items-baseline justify-between"><h2 className="text-xl font-semibold">Wiederholen (Review)</h2><div className="text-sm text-zinc-400">{reviewItems.length}</div></div>
            <div className="mt-3 space-y-2">
              {reviewItems.length === 0 ? (<div className="text-sm text-zinc-400">Keine markierten Themen. Entweder stabil – oder mutig.</div>) : (
                reviewItems.map((item, idx) => item.type === "task" ? (
                  <div key={idx} className="p-3 rounded-xl bg-zinc-800/60 ring-1 ring-amber-500/30"><div className="text-xs text-zinc-400">Woche {item.t.week}: {item.t.weekTitle}</div><div className="font-medium mt-0.5">{item.t.topic}</div><div className="text-xs text-zinc-500">{item.t.subtopic} · {item.t.fkTitel}</div></div>
                ) : (
                  <div key={idx} className="p-3 rounded-xl bg-zinc-800/60 ring-1 ring-amber-500/20 pl-5 border-l-2 border-amber-500/30"><div className="text-xs text-zinc-400">Woche {item.t.week} · {item.t.topic}</div><div className="text-sm text-zinc-200 mt-0.5">{item.u}</div></div>
                ))
              )}
            </div>
          </section>
        </main>
        <footer className="mt-8 p-6 text-xs text-zinc-500">Fortschritt wird auf dem Server gespeichert. Passwort nötig zum Bearbeiten.</footer>
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowPasswordModal(false)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-zinc-100 mb-1">Bearbeitung freischalten</h3>
            <p className="text-sm text-zinc-400 mb-4">Gib das Passwort ein, um Häkchen setzen zu können.</p>
            <div>
              <input type="password" className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-600 rounded-xl text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent" placeholder="Passwort" value={passwordInput} onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(""); }} onKeyDown={(e) => { if (e.key === "Enter") handlePasswordSubmit(e); }} autoFocus />
              {passwordError && <div className="mt-2 text-sm text-red-400">{passwordError}</div>}
              <div className="flex gap-2 mt-4">
                <button type="button" onClick={() => setShowPasswordModal(false)} className="flex-1 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm">Abbrechen</button>
                <button type="button" onClick={handlePasswordSubmit} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium">Freischalten</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
