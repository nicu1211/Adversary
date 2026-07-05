import React, { useEffect, useMemo, useState } from "react";
import { Calendar, DeletePopup, Panel } from "../components/UI";
import {
  dateOf,
  parseClassRows,
  parseLog,
  parseSecondaryRows,
  scrollCls,
  today,
} from "../lib/logUtils";

const SECONDARY_LOG_START = "===== ADVERSARY_SECONDARY_LOG_START =====";
const SECONDARY_LOG_END = "===== ADVERSARY_SECONDARY_LOG_END =====";
const CLASS_LOG_START = "===== ADVERSARY_CLASS_LOG_START =====";
const CLASS_LOG_END = "===== ADVERSARY_CLASS_LOG_END =====";

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

function extractMarkedSection(rawLog, startMarker, endMarker) {
  const text = String(rawLog || "");
  const startIndex = text.indexOf(startMarker);
  const endIndex = text.indexOf(endMarker, startIndex + startMarker.length);

  if (startIndex < 0 || endIndex < 0) return "";

  return text.slice(startIndex + startMarker.length, endIndex).trim();
}

function getMainLogOnly(rawLog) {
  const text = String(rawLog || "");
  const markerIndexes = [
    text.indexOf(SECONDARY_LOG_START),
    text.indexOf(CLASS_LOG_START),
  ].filter((index) => index >= 0);
  const firstMarkerIndex = markerIndexes.length
    ? Math.min(...markerIndexes)
    : text.length;

  return text.slice(0, firstMarkerIndex).trim();
}

function getSecondaryLog(rawLog) {
  return extractMarkedSection(
    rawLog,
    SECONDARY_LOG_START,
    SECONDARY_LOG_END,
  );
}

function getClassLog(rawLog) {
  return extractMarkedSection(rawLog, CLASS_LOG_START, CLASS_LOG_END);
}

function buildCombinedRawLog(mainRaw, secondaryRaw, classRaw) {
  const sections = [];
  const cleanMain = cleanText(mainRaw);
  const cleanSecondary = cleanText(secondaryRaw);
  const cleanClass = cleanText(classRaw);

  if (cleanMain) sections.push(cleanMain);

  if (cleanSecondary) {
    sections.push(
      [SECONDARY_LOG_START, cleanSecondary, SECONDARY_LOG_END].join("\n"),
    );
  }

  if (cleanClass) {
    sections.push([CLASS_LOG_START, cleanClass, CLASS_LOG_END].join("\n"));
  }

  return sections.join("\n\n");
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
  const classRaw = getClassLog(raw);

  return {
    mainRaw,
    secondaryRaw,
    classRaw,
    mainLines: countLines(mainRaw),
    secondaryLines: countLines(secondaryRaw),
    classLines: countLines(classRaw),
  };
}

function hasRecordedSecondaryMetric(row, flagKeys, valueKeys) {
  if (!row) return false;

  for (const key of flagKeys) {
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      return Boolean(row[key]);
    }
  }

  /*
   * Older stored rows may not have explicit availability flags. A non-zero
   * value is safe evidence that the column existed. A bare zero is not,
   * because older parsers inserted zero when a column was missing.
   */
  return valueKeys.some((key) => {
    if (!Object.prototype.hasOwnProperty.call(row, key)) return false;

    const value = Number(row[key]);
    return Number.isFinite(value) && value !== 0;
  });
}

function getSecondaryTotals(rows) {
  const totals = {
    kills: 0,
    deaths: 0,
    killStreak: 0,
    killFeed: 0,
    damageDealt: 0,
    damageTaken: 0,
    ccHits: 0,
    fortDamage: 0,
    available: {
      kills: false,
      deaths: false,
      killStreak: false,
      killFeed: false,
      damageDealt: false,
      damageTaken: false,
      ccHits: false,
      fortDamage: false,
    },
  };

  const definitions = {
    kills: {
      flags: ["has_kills", "hasKills"],
      values: ["kills"],
      mode: "sum",
    },
    deaths: {
      flags: ["has_deaths", "hasDeaths"],
      values: ["deaths"],
      mode: "sum",
    },
    killStreak: {
      flags: ["has_kill_streak", "hasKillStreak"],
      values: ["killStreak", "killstreak", "streak"],
      mode: "max",
    },
    killFeed: {
      flags: ["has_kill_feed", "hasKillFeed"],
      values: ["killFeed", "killfeed", "feed"],
      mode: "max",
    },
    damageDealt: {
      flags: ["has_damage_dealt", "hasDamageDealt"],
      values: ["damageDealt", "damage_dealt", "damage"],
      mode: "sum",
    },
    damageTaken: {
      flags: ["has_damage_taken", "hasDamageTaken"],
      values: ["damageTaken", "damage_taken"],
      mode: "sum",
    },
    ccHits: {
      flags: ["has_cc_hits", "hasCcHits"],
      values: ["ccHits", "cc_hits", "cc"],
      mode: "sum",
    },
    fortDamage: {
      flags: ["has_fort_damage", "hasFortDamage"],
      values: ["fortDamage", "damageToFort", "damage_to_fort"],
      mode: "sum",
    },
  };

  (rows || []).forEach((row) => {
    Object.entries(definitions).forEach(([metric, definition]) => {
      if (
        !hasRecordedSecondaryMetric(
          row,
          definition.flags,
          definition.values,
        )
      ) {
        return;
      }

      totals.available[metric] = true;

      const valueKey = definition.values.find(
        (key) =>
          Object.prototype.hasOwnProperty.call(row, key) &&
          row[key] !== undefined &&
          row[key] !== null &&
          row[key] !== "",
      );
      const value = Number(valueKey == null ? 0 : row[valueKey]) || 0;

      if (definition.mode === "max") {
        totals[metric] = Math.max(totals[metric], value);
      } else {
        totals[metric] += value;
      }
    });
  });

  return totals;
}

function compactNumber(value) {
  const number = Number(value) || 0;

  if (Math.abs(number) >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
  if (Math.abs(number) >= 1000)
    return `${Math.round(number).toLocaleString("en-US")}`;

  return String(Math.round(number));
}

function formatSecondaryTotal(value, available, compact = false) {
  if (!available) return "—";

  return compact
    ? compactNumber(value)
    : String(Math.round(Number(value) || 0));
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
  const [classRaw, setClassRaw] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingLogId, setEditingLogId] = useState(null);


  useEffect(() => {
    if (editingLogId == null) return;

    const stillExists = (logs || []).some(
      (log) => String(log.id) === String(editingLogId),
    );

    if (!stillExists) {
      setEditingLogId(null);
    }
  }, [editingLogId, logs]);

  const mainRawOnly = useMemo(() => getMainLogOnly(raw), [raw]);

  const combinedPreview = useMemo(
    () => buildCombinedRawLog(mainRawOnly, secondaryRaw, classRaw),
    [mainRawOnly, secondaryRaw, classRaw],
  );

  const mainLines = useMemo(() => countLines(mainRawOnly), [mainRawOnly]);
  const secondaryLines = useMemo(
    () => countLines(secondaryRaw),
    [secondaryRaw],
  );
  const classLines = useMemo(() => countLines(classRaw), [classRaw]);
  const secondaryRows = useMemo(
    () => parseSecondaryRows(secondaryRaw),
    [secondaryRaw],
  );
  const classRows = useMemo(() => parseClassRows(classRaw), [classRaw]);
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

    const rawToSave = buildCombinedRawLog(
      mainRawOnly,
      secondaryRaw,
      classRaw,
    );

    try {
      setSaving(true);

      const savedLog = await saveLog(rawToSave, editingLogId);

      if (savedLog?.id != null) {
        setEditingLogId(savedLog.id);
      }
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

  function clearClassRaw() {
    setClassRaw("");
  }

  function loadSavedLogIntoEditor(log) {
    const savedMain = getMainLogOnly(log.raw);
    const savedSecondary = getSecondaryLog(log.raw);
    const savedClass = getClassLog(log.raw);

    setDate(dateOf(log));
    setRaw(savedMain);
    setSecondaryRaw(savedSecondary);
    setClassRaw(savedClass);
    setEditingLogId(log.id);

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

              <div className="flex flex-wrap items-center justify-end gap-2">
                {editingLogId != null && (
                  <button
                    type="button"
                    onClick={() => setEditingLogId(null)}
                    disabled={saving}
                    className="rounded-xl border border-slate-700 px-4 py-3 text-sm font-bold text-slate-300 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Save as new
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!canSave}
                  className="rounded-xl bg-blue-600 px-5 py-3 font-black hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? editingLogId != null
                      ? "Updating..."
                      : "Saving..."
                    : editingLogId != null
                      ? "Update log"
                      : "Save"}
                </button>
              </div>
            </div>

            {editingLogId != null && (
              <p className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm font-bold text-amber-100">
                Editing a saved log. Update log will replace the loaded History entry.
              </p>
            )}

            {message && (
              <p className="mb-4 whitespace-pre-line rounded-xl bg-slate-900 p-3 text-sm text-slate-300">
                {message}
              </p>
            )}

            <div className="grid gap-4 xl:grid-cols-3">
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
                    Secondary totals:{" "}
                    {formatSecondaryTotal(
                      secondaryTotals.kills,
                      secondaryTotals.available.kills,
                    )}{" "}
                    kills ·{" "}
                    {formatSecondaryTotal(
                      secondaryTotals.deaths,
                      secondaryTotals.available.deaths,
                    )}{" "}
                    deaths ·{" "}
                    {formatSecondaryTotal(
                      secondaryTotals.killFeed,
                      secondaryTotals.available.killFeed,
                    )}{" "}
                    max kill feed ·{" "}
                    {formatSecondaryTotal(
                      secondaryTotals.damageDealt,
                      secondaryTotals.available.damageDealt,
                      true,
                    )}{" "}
                    damage dealt ·{" "}
                    {formatSecondaryTotal(
                      secondaryTotals.damageTaken,
                      secondaryTotals.available.damageTaken,
                      true,
                    )}{" "}
                    damage taken ·{" "}
                    {formatSecondaryTotal(
                      secondaryTotals.ccHits,
                      secondaryTotals.available.ccHits,
                    )}{" "}
                    CC hits ·{" "}
                    {formatSecondaryTotal(
                      secondaryTotals.fortDamage,
                      secondaryTotals.available.fortDamage,
                      true,
                    )}{" "}
                    fort damage
                  </p>
                )}
              </div>

              <div>
                <div className="mb-4 rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4">
                  <span className="block text-sm font-black text-violet-100">
                    Class Log
                  </span>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-lg bg-slate-950/70 px-2 py-1 text-xs text-violet-100">
                      Lines: {classLines}
                    </span>

                    <span className="rounded-lg bg-slate-950/70 px-2 py-1 text-xs text-violet-100">
                      Players: {classRows.length}
                    </span>
                  </div>
                </div>

                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-400">
                    Class Log
                  </p>

                  <button
                    type="button"
                    onClick={clearClassRaw}
                    disabled={!classRaw}
                    className="rounded-lg border border-slate-700 px-2 py-1 text-xs font-bold text-slate-300 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Clear
                  </button>
                </div>

                <textarea
                  value={classRaw}
                  onChange={(event) => setClassRaw(event.target.value)}
                  placeholder={
                    "Player            Class        Mode\nDevilKittenSins   Maegu        Succession\nHamsti            Corsair      Awakening"
                  }
                  className="h-96 w-full rounded-2xl border border-violet-500/30 bg-slate-950 p-4 font-mono text-sm outline-none focus:border-violet-400"
                />

                {classRaw.trim() && (
                  <p className="mt-2 text-xs text-violet-200/80">
                    Parsed {classRows.length} valid player assignment{classRows.length === 1 ? "" : "s"}.
                    Succession spelling mistakes such as “Succesion” are accepted automatically.
                  </p>
                )}
              </div>
            </div>

            {(secondaryRaw.trim() || classRaw.trim()) && (
              <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-slate-950 p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Combined save preview
                  </p>

                  <p className="text-xs text-slate-400">
                    Save stores Combat Log, Stats Log and Class Log together in the same war.
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
                            ? ` · stats ${savedStats.secondaryLines} lines`
                            : ""}
                          {savedStats.classRaw
                            ? ` · classes ${savedStats.classLines} lines`
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

                    {savedStats.classRaw && (
                      <details className="mt-3 rounded-lg border border-violet-500/20 bg-slate-950 p-2">
                        <summary className="cursor-pointer text-xs font-bold text-violet-200">
                          View class log
                        </summary>

                        <pre
                          className={`mt-2 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[11px] text-slate-400 ${scrollCls}`}
                        >
                          {savedStats.classRaw}
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
