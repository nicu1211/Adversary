import React, { useMemo, useState } from "react";
import { Calendar, DeletePopup, Panel } from "../components/UI";
import {
  dateOf,
  parseLog,
  parseSecondaryRows,
  scrollCls,
  today,
} from "../lib/logUtils";

const SECONDARY_LOG_START = "===== ADVERSARY_SECONDARY_LOG_START =====";
const SECONDARY_LOG_END = "===== ADVERSARY_SECONDARY_LOG_END =====";

function cleanText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function countLines(text) {
  return String(text || "")
    .split("\n")
    .filter((line) => line.trim()).length;
}

function hasSecondaryLog(rawLog) {
  const text = String(rawLog || "");

  return text.includes(SECONDARY_LOG_START) && text.includes(SECONDARY_LOG_END);
}

function getMainLogOnly(rawLog) {
  const text = String(rawLog || "");

  if (!hasSecondaryLog(text)) {
    return text;
  }

  return text.split(SECONDARY_LOG_START)[0].trim();
}

function getSecondaryLog(rawLog) {
  const text = String(rawLog || "");

  if (!hasSecondaryLog(text)) {
    return "";
  }

  const afterStart = text.split(SECONDARY_LOG_START)[1] || "";
  const secondary = afterStart.split(SECONDARY_LOG_END)[0] || "";

  return secondary.trim();
}

function buildCombinedRawLog(mainRaw, secondaryRaw) {
  const cleanMain = cleanText(mainRaw);
  const cleanSecondary = cleanText(secondaryRaw);

  if (!cleanSecondary) {
    return cleanMain;
  }

  return [cleanMain, "", SECONDARY_LOG_START, cleanSecondary, SECONDARY_LOG_END]
    .filter((item) => item !== "")
    .join("\n");
}

function getParsedEntries(raw, name, date) {
  try {
    return parseLog(getMainLogOnly(raw), name, date, "preview").length;
  } catch {
    return 0;
  }
}

function getSavedLogStats(log) {
  const raw = String(log?.raw || "");
  const mainRaw = getMainLogOnly(raw);
  const secondaryRaw = getSecondaryLog(raw);

  return {
    mainRaw,
    secondaryRaw,
    mainLines: countLines(mainRaw),
    secondaryLines: countLines(secondaryRaw),
  };
}

function getSecondaryTotals(rows) {
  return rows.reduce(
    (totals, row) => ({
      kills: totals.kills + (Number(row.kills) || 0),
      deaths: totals.deaths + (Number(row.deaths) || 0),
      killStreak: Math.max(totals.killStreak, Number(row.killStreak) || 0),
      damageDealt: totals.damageDealt + (Number(row.damageDealt) || 0),
      damageTaken: totals.damageTaken + (Number(row.damageTaken) || 0),
      ccHits: totals.ccHits + (Number(row.ccHits) || 0),
      fortDamage: totals.fortDamage + (Number(row.fortDamage) || 0),
    }),
    {
      kills: 0,
      deaths: 0,
      killStreak: 0,
      damageDealt: 0,
      damageTaken: 0,
      ccHits: 0,
      fortDamage: 0,
    },
  );
}

function compactNumber(value) {
  const number = Number(value) || 0;

  if (Math.abs(number) >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
  if (Math.abs(number) >= 1000)
    return `${Math.round(number).toLocaleString("en-US")}`;

  return String(Math.round(number));
}

export default function RawLog({
  raw,
  setRaw,
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
  const [secondaryRaw, setSecondaryRaw] = useState("");
  const [saving, setSaving] = useState(false);

  const mainRawOnly = useMemo(() => getMainLogOnly(raw), [raw]);

  const combinedPreview = useMemo(
    () => buildCombinedRawLog(mainRawOnly, secondaryRaw),
    [mainRawOnly, secondaryRaw],
  );

  const mainLines = useMemo(() => countLines(mainRawOnly), [mainRawOnly]);
  const secondaryLines = useMemo(
    () => countLines(secondaryRaw),
    [secondaryRaw],
  );
  const secondaryRows = useMemo(
    () => parseSecondaryRows(secondaryRaw),
    [secondaryRaw],
  );
  const secondaryTotals = useMemo(
    () => getSecondaryTotals(secondaryRows),
    [secondaryRows],
  );
  const secondaryNamedRows = useMemo(
    () => secondaryRows.filter((row) => row.player).length,
    [secondaryRows],
  );
  const combinedLines = useMemo(
    () => countLines(combinedPreview),
    [combinedPreview],
  );

  const parsedEntries = useMemo(
    () => getParsedEntries(mainRawOnly, date, date),
    [mainRawOnly, date],
  );

  const hasSecondaryOnlyStats = secondaryRows.length > 0;
  const canSave = (parsedEntries > 0 || hasSecondaryOnlyStats) && !saving;

  async function handleSave() {
    if (!canSave) return;

    const cleanSecondary = cleanText(secondaryRaw);
    const rawToSave = cleanSecondary
      ? buildCombinedRawLog(mainRawOnly, cleanSecondary)
      : mainRawOnly;

    try {
      setSaving(true);
      await saveLog(rawToSave);
    } finally {
      setSaving(false);
    }
  }

  function clearMainRaw() {
    setRaw("");
  }

  function clearSecondaryRaw() {
    setSecondaryRaw("");
  }

  function loadSavedLogIntoEditor(log) {
    const savedMain = getMainLogOnly(log.raw);
    const savedSecondary = getSecondaryLog(log.raw);

    setDate(dateOf(log));
    setRaw(savedMain);
    setSecondaryRaw(savedSecondary);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Panel>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="relative w-full sm:max-w-[260px]">
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
                {saving ? "Saving..." : "Save"}
              </button>
            </div>

            {message && (
              <p className="mb-4 whitespace-pre-line rounded-xl bg-slate-900 p-3 text-sm text-slate-300">
                {message}
              </p>
            )}

            <div className="grid gap-4 xl:grid-cols-2">
              <div>
                <div className="mb-4 rounded-2xl border border-slate-700 bg-slate-900 p-4">
                  <span className="block text-sm font-black text-white">
                    Combat Log
                  </span>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-lg bg-slate-950 px-2 py-1 text-xs text-slate-300">
                      Lines: {mainLines}
                    </span>

                    <span
                      className={`rounded-lg px-2 py-1 text-xs ${
                        parsedEntries > 0
                          ? "bg-emerald-500/10 text-emerald-200"
                          : "bg-amber-500/10 text-amber-200"
                      }`}
                    >
                      Parsed: {parsedEntries}
                    </span>
                  </div>
                </div>

                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Combat Log
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
                  placeholder="Paste your normal node war log here..."
                  className="h-96 w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm outline-none focus:border-blue-400"
                />

              </div>

              <div>
                <div className="mb-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                  <span className="block text-sm font-black text-emerald-100">
                    Stats log
                  </span>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-lg bg-slate-950/70 px-2 py-1 text-xs text-emerald-100">
                      Lines: {secondaryLines}
                    </span>

                    <span className="rounded-lg bg-slate-950/70 px-2 py-1 text-xs text-emerald-100">
                      Rows: {secondaryRows.length}
                    </span>

                    <span className="rounded-lg bg-slate-950/70 px-2 py-1 text-xs text-emerald-100">
                      Named: {secondaryNamedRows}
                    </span>

                    <span className="rounded-lg bg-slate-950/70 px-2 py-1 text-xs text-emerald-100">
                      Total: {combinedLines}
                    </span>
                  </div>
                </div>

                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">
                    Stats Log
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
                  placeholder=""
                  className="h-96 w-full rounded-2xl border border-emerald-500/30 bg-slate-950 p-4 font-mono text-sm outline-none focus:border-emerald-400"
                />

                {secondaryRows.length > 0 && (
                  <p className="mt-2 text-xs text-emerald-200/80">
                    Secondary totals: {secondaryTotals.kills} kills ·{" "}
                    {secondaryTotals.deaths} deaths ·{" "}
                    {secondaryTotals.killStreak} max streak ·{" "}
                    {compactNumber(secondaryTotals.damageDealt)} damage dealt ·{" "}
                    {compactNumber(secondaryTotals.damageTaken)} damage taken ·{" "}
                    {secondaryTotals.ccHits} CC hits ·{" "}
                    {compactNumber(secondaryTotals.fortDamage)} fort damage
                  </p>
                )}
              </div>
            </div>

            {secondaryRaw.trim() && (
              <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-slate-950 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Combined save preview
                  </p>

                  <p className="text-xs text-slate-400">
                    La Save se salvează ce ai completat: Combat Log + Stats Log sau doar Stats Log.
                  </p>
                </div>

                <pre
                  className={`max-h-56 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-900 p-3 font-mono text-xs text-slate-300 ${scrollCls}`}
                >
                  {combinedPreview}
                </pre>
              </div>
            )}

          </Panel>
        </div>

        <div className="lg:self-end">
          <Panel>
            <h2 className="mb-4 text-2xl font-black">History</h2>

          {!logs.length ? (
            <p className="text-sm text-slate-500">No saved logs yet.</p>
          ) : (
            <div className={`max-h-[640px] overflow-y-auto pr-2 ${scrollCls}`}>
              {logs.map((log) => {
                const savedStats = getSavedLogStats(log);

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
                          {log.localOnly ? " · local only" : ""}
                          {savedStats.secondaryRaw
                            ? ` · secondary ${savedStats.secondaryLines} lines`
                            : ""}
                        </p>
                      </div>
                    </div>

                    {savedStats.secondaryRaw && (
                      <details className="mt-3 rounded-lg border border-emerald-500/20 bg-slate-950 p-2">
                        <summary className="cursor-pointer text-xs font-bold text-emerald-200">
                          View secondary log
                        </summary>

                        <pre
                          className={`mt-2 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-slate-400 ${scrollCls}`}
                        >
                          {savedStats.secondaryRaw}
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
