import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import NodeWars from './pages/NodeWars';

import {
  MEMBER_KEY,
  buildLogSummary,
  calculateStats,
  dateOf,
  hashLog,
  monthDays,
  monthId,
  monthLabel,
  normalizeLog,
  normalizeLogs,
  normalizeMembers,
  parseLog,
  readStorage,
  scrollCls,
  shiftMonth,
  today,
} from './lib/logUtils';

import { Panel } from './components/UI';

const Overview = lazy(() => import('./pages/Overview'));
const PlayerStats = lazy(() => import('./pages/PlayerStats'));

const API_BASE = '';
const ADMIN_TOKEN_KEY = 'bdo_admin_token';

function getAdminToken() {
  let token = localStorage.getItem(ADMIN_TOKEN_KEY);

  if (!token) {
    token = prompt('Admin token for saving/deleting logs:') || '';

    if (token) {
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
    }
  }

  return token;
}

function parseApiResponse(text) {
  if (!text) return { ok: true };

  try {
    return JSON.parse(text);
  } catch {
    return { ok: true, raw: text };
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function queryString(params = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') return;
    search.set(key, String(value));
  });

  const text = search.toString();
  return text ? `?${text}` : '';
}

function logsPath(params = {}) {
  return `/api/logs${queryString(params)}`;
}

function isRetryableError(error) {
  const text = String(error?.message || error || '').toLowerCase();

  return (
    text.includes('failed to fetch') ||
    text.includes('networkerror') ||
    text.includes('network error') ||
    text.includes('timeout') ||
    text.includes('500') ||
    text.includes('502') ||
    text.includes('503') ||
    text.includes('504') ||
    text.includes('429')
  );
}

async function apiGet(path, options = {}) {
  const timeoutMs = options.timeoutMs || 30000;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(API_BASE + path, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(text || `GET ${path} failed: ${response.status}`);
    }

    return parseApiResponse(text);
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`GET ${path} timeout after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

async function apiWrite(path, method, body, options = {}) {
  const timeoutMs = options.timeoutMs || 30000;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(API_BASE + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'x-admin-token': getAdminToken(),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await response.text();

    if (response.status === 401) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      throw new Error(text || 'Invalid admin token');
    }

    if (!response.ok) {
      throw new Error(text || `${method} ${path} failed: ${response.status}`);
    }

    return parseApiResponse(text);
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`${method} ${path} timeout after ${timeoutMs}ms`);
    }

    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

async function apiWriteWithRetry(path, method, body, options = {}) {
  const maxAttempts = options.maxAttempts || 5;
  const baseDelayMs = options.baseDelayMs || 700;

  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await apiWrite(path, method, body, options);
    } catch (error) {
      lastError = error;

      const text = String(error?.message || error || '');

      if (
        text.includes('Invalid admin token') ||
        text.includes('Duplicate log') ||
        text.includes('UnsupportedHttpVerb') ||
        text.includes('ResourceNotFound') ||
        text.includes('404')
      ) {
        throw error;
      }

      if (attempt >= maxAttempts || !isRetryableError(error)) {
        throw new Error(
          `Database save failed after ${attempt}/${maxAttempts} attempt(s): ${text}`,
        );
      }

      await sleep(baseDelayMs * attempt);
    }
  }

  throw new Error(
    `Database save failed after ${maxAttempts} attempts: ${
      lastError?.message || lastError || 'unknown error'
    }`,
  );
}

async function deleteApiLog(log) {
  const source = log._src || {};
  const apiId =
    log.apiId ||
    log.id ||
    source.id ||
    source._id ||
    source.log_id ||
    source.key ||
    source.objectKey ||
    source.filename ||
    source.fileName ||
    source.path ||
    source.slug;

  const body = {
    id: apiId,
    date: log.date,
    name: log.name,
    hash: log.hash,
  };

  const attempts = [];

  if (apiId) {
    attempts.push([
      `/api/logs/${encodeURIComponent(String(apiId))}`,
      'DELETE',
      undefined,
    ]);
  }

  attempts.push(
    ['/api/logs', 'DELETE', body],
    ['/api/logs/delete', 'POST', body],
    ['/api/logs', 'POST', { ...body, action: 'delete', _method: 'DELETE' }],
  );

  let lastError = null;

  for (const [path, method, payload] of attempts) {
    try {
      return await apiWriteWithRetry(path, method, payload, {
        maxAttempts: 3,
        baseDelayMs: 500,
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `Delete failed. Backend did not accept any delete route. Last error: ${
      lastError?.message || lastError || 'unknown error'
    }`,
  );
}

function PageLoader({ text = 'Loading...' }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-sm font-bold text-slate-300">
      {text}
    </div>
  );
}

function CalendarPicker({
  month,
  setMonth,
  selected,
  marked,
  onPick,
  footer,
}) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-950 p-3 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, -1))}
          className="rounded-lg border border-slate-700 px-2 py-1 hover:bg-slate-800"
        >
          ‹
        </button>

        <b className="text-sm">{monthLabel(month)}</b>

        <button
          type="button"
          onClick={() => setMonth(shiftMonth(month, 1))}
          className="rounded-lg border border-slate-700 px-2 py-1 hover:bg-slate-800"
        >
          ›
        </button>
      </div>

      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-black text-slate-500">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {monthDays(month).map((item) => (
          <button
            type="button"
            key={item.iso}
            onClick={() => onPick(item.iso)}
            className={`relative h-8 rounded-lg text-xs font-black transition ${
              selected === item.iso
                ? 'bg-blue-500 text-white ring-2 ring-blue-300'
                : marked.has(item.iso)
                  ? 'bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/35'
                  : item.currentMonth
                    ? 'text-slate-300 hover:bg-slate-800'
                    : 'text-slate-600 hover:bg-slate-900'
            }`}
          >
            {item.day}

            {marked.has(item.iso) && (
              <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-emerald-300" />
            )}
          </button>
        ))}
      </div>

      {footer}
    </div>
  );
}

function DeleteLogModal({
  target,
  deleting,
  message,
  onCancel,
  onDelete,
}) {
  if (!target) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-slate-700 bg-slate-950 p-5 shadow-2xl">
        <h3 className="text-xl font-black text-rose-300">Delete log?</h3>

        <p className="mt-2 text-sm text-slate-300">
          This action permanently deletes the selected log from the database.
        </p>

        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-3">
          <p className="font-bold">{target.name}</p>
          <p className="text-xs text-slate-500">
            {dateOf(target)}
            {target.localOnly ? ' · local only' : ''}
          </p>
        </div>

        {message && (
          <p className="mt-3 rounded-xl bg-blue-500/10 p-3 text-sm text-blue-200">
            {message}
          </p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <button
            type="button"
            disabled={deleting}
            onClick={onCancel}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 font-bold hover:bg-slate-800 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={deleting}
            onClick={onDelete}
            className="rounded-xl bg-rose-600 px-4 py-3 font-black hover:bg-rose-500 disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete permanently'}
          </button>
        </div>
      </div>
    </div>
  );
}

function RawLogPage({
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
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Panel>
          <h2 className="mb-4 text-2xl font-black">Raw Log</h2>

          <div className="mb-3 grid gap-3 md:grid-cols-[1fr_190px_100px]">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Battle log name"
              className="rounded-xl border border-slate-700 bg-slate-900 p-3"
            />

            <div className="relative">
              <button
                type="button"
                onClick={() => setCalendarOpen(!calendarOpen)}
                className="w-full rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-left hover:bg-blue-500/20"
              >
                <span className="block text-xs font-bold text-blue-200">
                  War date
                </span>
                <span className="font-black">{date}</span>
              </button>

              {calendarOpen && (
                <div className="absolute left-0 right-0 z-40 mt-2">
                  <CalendarPicker
                    month={rawMonth}
                    setMonth={setRawMonth}
                    selected={date}
                    marked={markedDates}
                    onPick={(nextDate) => {
                      setDate(nextDate);
                      setCalendarOpen(false);
                    }}
                    footer={
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDate(today());
                            setCalendarOpen(false);
                          }}
                          className="rounded-xl border border-slate-700 px-2 py-2 text-xs font-bold"
                        >
                          Today
                        </button>

                        <button
                          type="button"
                          onClick={() => setCalendarOpen(false)}
                          className="rounded-xl border border-slate-700 px-2 py-2 text-xs font-bold"
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
              onClick={saveLog}
              className="rounded-xl bg-blue-600 font-bold hover:bg-blue-500"
            >
              Save
            </button>
          </div>

          {message && (
            <p className="mb-3 rounded-xl bg-blue-500/10 p-3 text-blue-200">
              {message}
            </p>
          )}

          <textarea
            value={raw}
            onChange={(event) => setRaw(event.target.value)}
            placeholder="Paste your node war log here..."
            className="h-96 w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 font-mono text-sm"
          />
        </Panel>

        <Panel>
          <h2 className="mb-4 text-2xl font-black">History</h2>

          {logs.length ? (
            <div
              className={`max-h-[520px] overflow-y-auto pr-2 ${scrollCls}`}
            >
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="mb-3 rounded-xl bg-slate-900 p-3 last:mb-0"
                >
                  <b>{log.name}</b>

                  <p className="text-xs text-slate-500">
                    {dateOf(log)}
                    {log.localOnly ? ' · local only' : ''}
                  </p>

                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(log)}
                      className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold hover:bg-rose-500"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No saved logs yet.</p>
          )}
        </Panel>
      </div>

      <DeleteLogModal
        target={deleteTarget}
        deleting={deleting}
        message={message}
        onCancel={() => setDeleteTarget(null)}
        onDelete={deleteLog}
      />
    </>
  );
}

export default function App() {
  const [page, setPage] = useState('nodewars');

  const [raw, setRaw] = useState('');
  const [name, setName] = useState('Battle log');
  const [date, setDate] = useState(today());

  const [nodeLogs, setNodeLogs] = useState([]);
  const [allLogs, setAllLogs] = useState(null);
  const [overviewLogs, setOverviewLogs] = useState([]);

  const [members, setMembers] = useState([]);

  const [periodDays, setPeriodDays] = useState(7);

  const [loadingNodeLogs, setLoadingNodeLogs] = useState(false);
  const [loadingAllLogs, setLoadingAllLogs] = useState(false);
  const [loadingOverviewLogs, setLoadingOverviewLogs] = useState(false);

  const [selectedDays, setSelectedDays] = useState(['current']);
  const [selectedWars, setSelectedWars] = useState(['current']);

  const [message, setMessage] = useState('');

  const [rawMonth, setRawMonth] = useState(monthId(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [nodeWarsWarning, setNodeWarsWarning] = useState('');

  const logs = allLogs || nodeLogs;

  const loadNodeLogs = useCallback(async (nextPeriod = 7) => {
    try {
      setLoadingNodeLogs(true);

      const params =
        nextPeriod === 'all'
          ? { range: 'all' }
          : { days: nextPeriod };

      const data = await apiGet(logsPath(params));
      const normalized = normalizeLogs(data);

      setNodeLogs(normalized);
      setMessage('');
    } catch (error) {
      console.error('Failed to load node wars logs:', error);

      setNodeLogs([]);
      setMessage(
        `Database load failed: ${
          error?.message || error || 'unknown error'
        }. Nu am încărcat loguri salvate local din browser.`,
      );
    } finally {
      setLoadingNodeLogs(false);
    }
  }, []);

  const loadAllLogs = useCallback(async () => {
    const allLogsAlreadyLoadedWithRaw =
      Array.isArray(allLogs) &&
      allLogs.length > 0 &&
      allLogs.every((log) => Boolean(log.raw));

    if (allLogsAlreadyLoadedWithRaw) {
      return allLogs;
    }

    try {
      setLoadingAllLogs(true);

      const data = await apiGet(logsPath({ range: 'all', includeRaw: 1 }));
      const normalized = normalizeLogs(data);

      setAllLogs(normalized);
      return normalized;
    } catch (error) {
      console.error('Failed to load all logs:', error);

      setMessage(
        `Database load failed: ${
          error?.message || error || 'unknown error'
        }. Nu am încărcat loguri salvate local din browser.`,
      );

      return [];
    } finally {
      setLoadingAllLogs(false);
    }
  }, [allLogs]);

  const loadOverviewLogs = useCallback(async () => {
    if (page !== 'overview') return;

    const selectedRealWars = selectedWars.filter(
      (id) => id !== 'all' && id !== 'current',
    );

    if (!selectedRealWars.length) {
      setOverviewLogs([]);
      return;
    }

    try {
      setLoadingOverviewLogs(true);

      const loaded = await Promise.all(
        selectedRealWars.map(async (id) => {
          const data = await apiGet(`/api/logs/${encodeURIComponent(id)}/raw`);
          return normalizeLog(data);
        }),
      );

      const withRaw = loaded.filter((log) => Boolean(log.raw));

      setOverviewLogs(withRaw);
    } catch (error) {
      console.error('Failed to load overview raw logs:', error);

      setOverviewLogs([]);
      setMessage(
        `Failed to load selected raw logs: ${
          error?.message || error || 'unknown error'
        }`,
      );
    } finally {
      setLoadingOverviewLogs(false);
    }
  }, [page, selectedWars]);

  useEffect(() => {
    loadNodeLogs(7);

    apiGet('/api/members')
      .then((data) => {
        setMembers(normalizeMembers(data));
      })
      .catch(() => {
        setMembers(readStorage(MEMBER_KEY, []));
      });
  }, [loadNodeLogs]);

  useEffect(() => {
    if (page === 'players' || page === 'raw') {
      loadAllLogs();
    }
  }, [page, loadAllLogs]);

  useEffect(() => {
    loadOverviewLogs();
  }, [loadOverviewLogs]);

  const current = selectedDays.includes('current');
  const all = selectedDays.includes('all');

  const activeLogs = useMemo(() => {
    if (current) {
      return [{ id: 'current', name, date, raw }];
    }

    if (page === 'overview') {
      return overviewLogs.map((log) => ({
        ...log,
        date: dateOf(log),
      }));
    }

    const base = all
      ? logs
      : logs.filter((log) => selectedDays.includes(dateOf(log)));

    return base
      .filter(
        (log) =>
          selectedWars.includes('all') ||
          selectedWars.includes(String(log.id)),
      )
      .map((log) => ({
        ...log,
        date: dateOf(log),
      }));
  }, [
    current,
    page,
    overviewLogs,
    all,
    logs,
    selectedDays,
    selectedWars,
    name,
    date,
    raw,
  ]);

  const stats = useMemo(() => calculateStats(activeLogs), [activeLogs]);

  const allTimeStats = useMemo(() => {
    if (page !== 'players') {
      return calculateStats([]);
    }

    const sourceLogs = Array.isArray(allLogs) ? allLogs : [];

    return calculateStats(
      sourceLogs
        .filter((log) => Boolean(log.raw))
        .map((log) => ({
          ...log,
          date: dateOf(log),
        })),
    );
  }, [page, allLogs]);

  const playerStatsReady =
    page !== 'players' ||
    (Array.isArray(allLogs) &&
      allLogs.length > 0 &&
      allLogs.some((log) => Boolean(log.raw)));

  const label = current
    ? 'Current log'
    : all
      ? 'All saved days'
      : selectedDays[0] || 'No day';

  const markedDates = useMemo(
    () => new Set([...new Set(logs.map(dateOf))]),
    [logs],
  );

  async function saveLog() {
    if (!parseLog(raw, name, date, 'x').length) {
      setMessage('Invalid log');
      return;
    }

    const localHash = hashLog(raw);

    const duplicate = logs.find((log) => {
      if (log.hash && log.hash === localHash) return true;
      if (log.raw) return hashLog(log.raw) === localHash;
      return false;
    });

    if (duplicate) {
      setSelectedDays([dateOf(duplicate)]);
      setSelectedWars([String(duplicate.id)]);
      setMessage('Duplicate log detected locally');
      return;
    }

    const draftLog = {
      id: `${date}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name || date,
      date,
      raw,
      hash: localHash,
      createdAt: new Date().toISOString(),
    };

    const summary = buildLogSummary(draftLog);
    const payload = {
      ...draftLog,
      summary,
    };

    setMessage('Saving log to database... attempt 1/5');

    try {
      const response = await apiWriteWithRetry('/api/logs', 'POST', payload, {
        maxAttempts: 5,
        baseDelayMs: 700,
      });

      const savedLog = normalizeLog({
        ...payload,
        ...response,
        summary: response?.summary || payload.summary,
      });

      setNodeLogs((currentLogs) => [savedLog, ...currentLogs]);

      setAllLogs((currentLogs) =>
        Array.isArray(currentLogs) ? [savedLog, ...currentLogs] : currentLogs,
      );

      setOverviewLogs((currentLogs) =>
        Array.isArray(currentLogs) ? [savedLog, ...currentLogs] : currentLogs,
      );

      setSelectedDays([savedLog.date]);
      setSelectedWars([String(savedLog.id)]);

      setMessage('Log saved to database. Summary calculated and saved.');
    } catch (error) {
      const text = String(error?.message || error || 'Unknown error');

      console.error('Database save failed:', error);

      if (text.includes('Duplicate log')) {
        setMessage(
          `Database refused save: ${text}. Logul NU a fost salvat local în browser.`,
        );
        return;
      }

      if (
        text.includes('UnsupportedHttpVerb') ||
        text.includes('404') ||
        text.includes('ResourceNotFound')
      ) {
        setMessage(
          `API save endpoint is not available: ${text}. Logul NU a fost salvat local în browser.`,
        );
        return;
      }

      setMessage(
        `Database save failed after 5 attempts: ${text}. Logul NU a fost salvat local în browser.`,
      );
    }
  }

  async function deleteLog() {
    if (!deleteTarget) return;

    try {
      setDeleting(true);

      await deleteApiLog(deleteTarget);

      setNodeLogs((currentLogs) =>
        currentLogs.filter((log) => String(log.id) !== String(deleteTarget.id)),
      );

      setAllLogs((currentLogs) =>
        Array.isArray(currentLogs)
          ? currentLogs.filter(
              (log) => String(log.id) !== String(deleteTarget.id),
            )
          : currentLogs,
      );

      setOverviewLogs((currentLogs) =>
        currentLogs.filter((log) => String(log.id) !== String(deleteTarget.id)),
      );

      setMessage('Log deleted from database');
      setDeleteTarget(null);
    } catch (error) {
      setMessage(error?.message || 'Delete error');
    } finally {
      setDeleting(false);
    }
  }

  function changePeriod(nextPeriod) {
    setPeriodDays(nextPeriod);
    loadNodeLogs(nextPeriod);
  }

  const menu = [
    ['nodewars', 'Node Wars'],
    ['players', 'Player Stats'],
    ['raw', 'Raw Log'],
  ];

  function isMenuActive(id) {
    return id === 'nodewars'
      ? page === 'nodewars' || page === 'overview'
      : page === id;
  }

  function openOverviewFromMenu() {
    const selectedRealWars = selectedWars.filter(
      (id) => id !== 'all' && id !== 'current',
    );

    if (!selectedRealWars.length) {
      setNodeWarsWarning('No node war selected. Select at least one war first.');
      setPage('nodewars');
      return;
    }

    setNodeWarsWarning('');
    setSelectedDays(['all']);
    setPage('overview');
  }

  function openPage(nextPage) {
    setNodeWarsWarning('');
    setPage(nextPage);
  }

  const rawHistoryLogs = allLogs || nodeLogs;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 p-3 backdrop-blur-xl lg:hidden">
        <div className="mb-3 text-lg font-black text-white">
          ☾ Battle Analytics
        </div>

        <div className="grid grid-cols-3 gap-2">
          {menu.map(([id, title]) => (
            <button
              key={id}
              type="button"
              onClick={() => openPage(id)}
              className={`rounded-xl px-3 py-2 text-center text-xs font-black ${
                isMenuActive(id)
                  ? 'border border-blue-400 bg-blue-500/20 text-white'
                  : 'border border-slate-700 bg-slate-900 text-slate-300'
              }`}
            >
              {title}
            </button>
          ))}
        </div>

        {(page === 'nodewars' || page === 'overview') && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => openPage('nodewars')}
              className={`rounded-xl px-3 py-2 text-center text-xs font-black ${
                page === 'nodewars'
                  ? 'border border-blue-400 bg-blue-500/20 text-white'
                  : 'border border-slate-700 bg-slate-900 text-slate-300'
              }`}
            >
              Match History
            </button>

            <button
              type="button"
              onClick={openOverviewFromMenu}
              className={`rounded-xl px-3 py-2 text-center text-xs font-black ${
                page === 'overview'
                  ? 'border border-blue-400 bg-blue-500/20 text-white'
                  : 'border border-slate-700 bg-slate-900 text-slate-300'
              }`}
            >
              Overview
            </button>
          </div>
        )}
      </div>

      <div className="grid min-h-screen lg:grid-cols-[250px_1fr]">
        <aside className="hidden border-r border-slate-800 bg-slate-950 p-4 lg:block">
          <h1 className="mb-6 text-2xl font-black text-white">
            ☾ Battle Analytics
          </h1>

          <nav>
            {menu.map(([id, title]) => {
              const isNodeWars = id === 'nodewars';

              return (
                <div key={id} className="mb-2">
                  <button
                    type="button"
                    onClick={() => openPage(id)}
                    className={`w-full rounded-xl px-4 py-3 text-left font-bold ${
                      isMenuActive(id)
                        ? 'border border-blue-400 bg-blue-500/20'
                        : 'hover:bg-slate-900'
                    }`}
                  >
                    {title}
                  </button>

                  {isNodeWars && (
                    <div className="ml-4 mt-2 space-y-1 border-l border-slate-800 pl-3">
                      <button
                        type="button"
                        onClick={() => openPage('nodewars')}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm font-bold ${
                          page === 'nodewars'
                            ? 'bg-blue-500/20 text-white'
                            : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                        }`}
                      >
                        Match History
                      </button>

                      <button
                        type="button"
                        onClick={openOverviewFromMenu}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm font-bold ${
                          page === 'overview'
                            ? 'bg-blue-500/20 text-white'
                            : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                        }`}
                      >
                        Overview
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 p-3 sm:p-5 lg:p-6">
          {page === 'nodewars' && (
            <NodeWars
              logs={nodeLogs}
              loading={loadingNodeLogs}
              periodDays={periodDays}
              onPeriodChange={changePeriod}
              setPage={setPage}
              setSelectedDays={setSelectedDays}
              setSelectedWars={setSelectedWars}
              selectedWars={selectedWars}
              externalWarning={nodeWarsWarning}
              clearExternalWarning={() => setNodeWarsWarning('')}
            />
          )}

          {page === 'overview' && (
            <Suspense fallback={<PageLoader text="Loading overview..." />}>
              {loadingOverviewLogs ? (
                <PageLoader text="Loading selected raw logs for overview..." />
              ) : (
                <Overview
                  stats={stats}
                  label={label}
                  members={members}
                  selectedLogs={activeLogs}
                />
              )}
            </Suspense>
          )}

          {page === 'players' && (
            <Suspense fallback={<PageLoader text="Loading player stats..." />}>
              {!playerStatsReady || loadingAllLogs ? (
                <PageLoader text="Loading all logs for Player Stats..." />
              ) : (
                <PlayerStats stats={allTimeStats} />
              )}
            </Suspense>
          )}

          {page === 'raw' && (
            <>
              {loadingAllLogs && !allLogs && (
                <div className="mb-4">
                  <PageLoader text="Loading full log history..." />
                </div>
              )}

              <RawLogPage
                raw={raw}
                setRaw={setRaw}
                name={name}
                setName={setName}
                date={date}
                setDate={setDate}
                logs={rawHistoryLogs}
                message={message}
                saveLog={saveLog}
                rawMonth={rawMonth}
                setRawMonth={setRawMonth}
                calendarOpen={calendarOpen}
                setCalendarOpen={setCalendarOpen}
                markedDates={markedDates}
                deleteTarget={deleteTarget}
                setDeleteTarget={setDeleteTarget}
                deleting={deleting}
                deleteLog={deleteLog}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
