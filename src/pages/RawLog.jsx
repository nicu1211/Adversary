import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, DeletePopup, Panel } from '../components/UI';
import { dateOf, parseLog, scrollCls, today } from '../lib/logUtils';

const SECONDARY_LOG_START = '===== ADVERSARY_SECONDARY_LOG_START =====';
const SECONDARY_LOG_END = '===== ADVERSARY_SECONDARY_LOG_END =====';

function formatBytes(bytes) {
  if (!bytes) return '0 KB';

  const kb = bytes / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  return `${(kb / 1024).toFixed(1)} MB`;
}

function cleanText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

function buildCombinedRawLog(mainRaw, secondaryRaw) {
  const cleanMain = cleanText(mainRaw);
  const cleanSecondary = cleanText(secondaryRaw);

  if (!cleanSecondary) {
    return cleanMain;
  }

  return [
    cleanMain,
    '',
    SECONDARY_LOG_START,
    cleanSecondary,
    SECONDARY_LOG_END,
  ]
    .filter(Boolean)
    .join('\n');
}

function hasSecondaryLog(rawLog) {
  const text = String(rawLog || '');

  return text.includes(SECONDARY_LOG_START) && text.includes(SECONDARY_LOG_END);
}

function getSecondaryLog(rawLog) {
  const text = String(rawLog || '');

  if (!hasSecondaryLog(text)) return '';

  const afterStart = text.split(SECONDARY_LOG_START)[1] || '';
  const secondary = afterStart.split(SECONDARY_LOG_END)[0] || '';

  return secondary.trim();
}

function getMainLogOnly(rawLog) {
  const text = String(rawLog || '');

  if (!hasSecondaryLog(text)) return text;

  return text.split(SECONDARY_LOG_START)[0].trim();
}

function countLines(text) {
  return String(text || '')
    .split('\n')
    .filter((line) => line.trim())
    .length;
}

function countParsedEntries(raw, name, date) {
  try {
    return parseLog(getMainLogOnly(raw), name, date, 'preview').length;
  } catch {
    return 0;
  }
}

export default function RawLog({
  raw,
  setRaw,
  name,
  setName,
  date,
  setDate,
  logs,
  message,
  saveLog,
  rawMonth,
  setRawMonth,
  calendarOpen,
  setCalendarOpen,
  markedDates,
  deleteTarget,
  setDeleteTarget,
  deleting,
  deleteLog,
}) {
  const [txtFile, setTxtFile] = useState(null);
  const [secondaryRaw, setSecondaryRaw] = useState('');
  const [pendingSave, setPendingSave] = useState(null);

  const mainRawOnly = useMemo(() => getMainLogOnly(raw), [raw]);

  const combinedPreview = useMemo(
    () => buildCombinedRawLog(mainRawOnly, secondaryRaw),
    [mainRawOnly, secondaryRaw],
  );

  const mainLines = useMemo(() => countLines(mainRawOnly), [mainRawOnly]);
  const secondaryLines = useMemo(() => countLines(secondaryRaw), [secondaryRaw]);
  const combinedLines = useMemo(() => countLines(combinedPreview), [combinedPreview]);

  const parsedEntries = useMemo(
    () => countParsedEntries(mainRawOnly, name, date),
    [mainRawOnly, name, date],
  );

  const canSave = parsedEntries > 0 && !pendingSave;

  useEffect(() => {
    if (!pendingSave) return;
    if (raw !== pendingSave.combinedRaw) return;

    let cancelled = false;

    async function runSave() {
      try {
        await saveLog();
      } finally {
        if (!cancelled) {
          setRaw(pendingSave.originalRaw);
          setPendingSave(null);
        }
      }
    }

    runSave();

    return () => {
      cancelled = true;
    };
  }, [pendingSave, raw, saveLog, setRaw]);

  async function handleTxtUpload(event) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    const isTextFile =
      file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');

    if (!isTextFile) {
      alert('Te rog încarcă doar fișiere .txt.');
      return;
    }

    try {
      const text = await file.text();

      setTxtFile(file);
      setRaw(cleanText(text));

      if (!name || name === 'Battle log') {
        setName(file.name.replace(/\.txt$/i, ''));
      }
    } catch (error) {
      console.error(error);
      alert('Nu am putut citi fișierul TXT.');
    }
  }

  function handleSave() {
    if (!canSave) return;

    const cleanSecondary = cleanText(secondaryRaw);

    if (!cleanSecondary) {
      saveLog();
      return;
    }

    const originalRaw = mainRawOnly;
    const combinedRaw = buildCombinedRawLog(mainRawOnly, cleanSecondary);

    setPendingSave({
      originalRaw,
      combinedRaw,
    });

    setRaw(combinedRaw);
  }

  function clearMainRaw() {
    setRaw('');
    setTxtFile(null);
  }

  function clearSecondaryRaw() {
    setSecondaryRaw('');
  }

  function loadSavedLogIntoEditor(log) {
    const savedMain = getMainLogOnly(log.raw);
    const savedSecondary = getSecondaryLog(log.raw);

    setName(log.name || 'Battle log');
    setDate(dateOf(log));
    setRaw(savedMain);
    setSecondaryRaw(savedSecondary);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Panel>
            <div className="mb-4 flex flex-col gap-3 xl:flex-row">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Battle log name"
                className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm outline-none focus:border-blue-400"
              />

              <div className="relative min-w-[220px]">
                <button
                  type="button"
                  onClick={() => setCalendarOpen(!calendarOpen)}
                  className="w-full rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-left hover:bg-blue-500/20"
                >
                  <span className="block text-xs font-black uppercase tracking-[0.18em] text-blue-200">
                    War date
                  </span>
                  <span className="font-bold text-white">{date}</span>
                </button>

                {calendarOpen && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-[320px] rounded-2xl border border-slate-700 bg-slate-950 p-3 shadow-2xl">
                    <Calendar
                      month={rawMonth}
                      setMonth={setRawMonth}
                      selected={date}
                      marked={markedDates}
                      onPick={(nextDate) => {
                        setDate(nextDate);
                        setCalendarOpen(false);
                      }}
                      footer={
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setDate(today());
                              setCalendarOpen(false);
                            }}
                            className="rounded-xl border border-slate-700 px-2 py-2 text-xs font-bold hover:bg-slate-900"
                          >
                            Today
                          </button>

                          <button
                            type="button"
                            onClick={() => setCalendarOpen(false)}
                            className="rounded-xl border border-slate-700 px-2 py-2 text-xs font-bold hover:bg-slate-900"
                          >
                            Close
                          </button>
                        </div>
                      }
                    />
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className="rounded-xl bg-blue-600 px-5 py-3 font-black hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pendingSave ? 'Saving...' : 'Save'}
              </button>
            </div>

            {message && (
              <p className="mb-4 whitespace-pre-line rounded-xl bg-slate-900 p-3 text-sm text-slate-300">
                {message}
              </p>
            )}

            <div className="mb-4 grid gap-3 md:grid-cols-3">
              <label className="cursor-pointer rounded-2xl border border-slate-700 bg-slate-900 p-4 transition hover:bg-slate-800">
                <input
                  type="file"
                  accept=".txt,text/plain"
                  className="hidden"
                  onChange={handleTxtUpload}
                />

                <span className="block text-sm font-black text-white">
                  Upload TXT log
                </span>

                <span className="mt-1 block text-xs text-slate-400">
                  Încarcă logul normal în format .txt.
                </span>

                {txtFile && (
                  <span className="mt-2 block text-xs text-blue-200">
                    {txtFile.name} · {formatBytes(txtFile.size)}
                  </span>
                )}
              </label>

              <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
                <span className="block text-sm font-black text-white">
                  Main log status
                </span>

                <span className="mt-1 block text-xs text-slate-400">
                  Logul principal este cel folosit la calculele actuale.
                </span>

                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-lg bg-slate-950 px-2 py-1 text-xs text-slate-300">
                    Lines: {mainLines}
                  </span>

                  <span
                    className={`rounded-lg px-2 py-1 text-xs ${
                      parsedEntries > 0
                        ? 'bg-emerald-500/10 text-emerald-200'
                        : 'bg-amber-500/10 text-amber-200'
                    }`}
                  >
                    Parsed: {parsedEntries}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                <span className="block text-sm font-black text-emerald-100">
                  Secondary manual log
                </span>

                <span className="mt-1 block text-xs text-emerald-200/80">
                  Al doilea format se salvează împreună cu logul principal.
                </span>

                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="rounded-lg bg-slate-950/70 px-2 py-1 text-xs text-emerald-100">
                    Lines: {secondaryLines}
                  </span>

                  <span className="rounded-lg bg-slate-950/70 px-2 py-1 text-xs text-emerald-100">
                    Total: {combinedLines}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Main Raw Log
                  </p>

                  <button
                    type="button"
                    onClick={clearMainRaw}
                    disabled={!mainRawOnly}
                    className="rounded-lg border border-slate-700 px-2 py-1 text-xs font-bold text-slate-300 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Clear
                  </button>
                </div>

                <textarea
                  value={mainRawOnly}
                  onChange={(event) => setRaw(event.target.value)}
                  placeholder="Paste your normal node war log here or upload a .txt file..."
                  className="h-96 w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm outline-none focus:border-blue-400"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Formatul actual acceptat rămâne cel normal, de tip kill/death log.
                </p>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">
                    Secondary Manual Log
                  </p>

                  <button
                    type="button"
                    onClick={clearSecondaryRaw}
                    disabled={!secondaryRaw}
                    className="rounded-lg border border-slate-700 px-2 py-1 text-xs font-bold text-slate-300 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Clear
                  </button>
                </div>

                <textarea
                  value={secondaryRaw}
                  onChange={(event) => setSecondaryRaw(event.target.value)}
                  placeholder="Lipește aici al doilea log, cu altă structură. Coloanele exacte le putem mapa în următorul pas."
                  className="h-96 w-full rounded-2xl border border-emerald-500/30 bg-slate-950 p-4 font-mono text-sm outline-none focus:border-emerald-400"
                />

                <p className="mt-2 text-xs text-slate-500">
                  Acest text este păstrat separat în raw log între markere speciale.
                </p>
              </div>
            </div>

            {secondaryRaw.trim() && (
              <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-slate-950 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Combined save preview
                  </p>

                  <p className="text-xs text-slate-400">
                    La Save se salvează Main Raw Log + Secondary Manual Log.
                  </p>
                </div>

                <pre className={`max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-900 p-3 font-mono text-xs text-slate-300 ${scrollCls}`}>
                  {combinedPreview}
                </pre>
              </div>
            )}

            {!canSave && (
              <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                Pentru Save, logul principal trebuie să conțină cel puțin o linie validă
                de kill/death. Secondary Manual Log poate fi completat separat, dar nu
                validează singur salvarea.
              </div>
            )}
          </Panel>
        </div>

        <Panel>
          <h2 className="mb-4 text-2xl font-black">History</h2>

          {!logs.length ? (
            <p className="text-sm text-slate-500">No saved logs yet.</p>
          ) : (
            <div className={`max-h-[640px] overflow-y-auto pr-2 ${scrollCls}`}>
              {logs.map((log) => {
                const secondarySaved = getSecondaryLog(log.raw);
                const secondarySavedLines = countLines(secondarySaved);

                return (
                  <div
                    key={log.id}
                    className="mb-3 rounded-xl bg-slate-900 p-3 last:mb-0"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <b className="block truncate text-sm text-white">
                          {log.name}
                        </b>

                        <p className="mt-1 text-xs text-slate-500">
                          {dateOf(log)}
                          {log.localOnly ? ' · local only' : ''}
                          {secondarySaved ? ` · secondary ${secondarySavedLines} lines` : ''}
                        </p>
                      </div>
                    </div>

                    {secondarySaved && (
                      <details className="mt-3 rounded-lg border border-emerald-500/20 bg-slate-950 p-2">
                        <summary className="cursor-pointer text-xs font-bold text-emerald-200">
                          View secondary log
                        </summary>

                        <pre className={`mt-2 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-slate-400 ${scrollCls}`}>
                          {secondarySaved}
                        </pre>
                      </details>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(log)}
                        className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold hover:bg-rose-500"
                      >
                        Delete
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget(log)}
                        className="rounded-lg border border-rose-500/50 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-100 hover:bg-rose-500/20"
                      >
                        Delete merged
                      </button>

                      <button
                        type="button"
                        onClick={() => loadSavedLogIntoEditor(log)}
                        className="rounded-lg border border-slate-700 px-3 py-1 text-xs font-bold text-slate-300 hover:bg-slate-800"
                      >
                        Load
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      </div>

      <DeletePopup
        target={deleteTarget}
        deleting={deleting}
        message={message}
        onCancel={() => setDeleteTarget(null)}
        onDelete={deleteLog}
      />
    </>
  );
}
