import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import NodeWars from './pages/NodeWars';
import RawLog from './pages/RawLog';
import adversaryEmblem from './assets/adversary-emblem.png';
import {
  MEMBER_KEY,
  buildLogSummary,
  calculateStats,
  dateOf,
  hashLog,
  monthId,
  normalizeLog,
  normalizeLogs,
  normalizeMembers,
  parseLog,
  readStorage,
  today,
} from './lib/logUtils';

const Overview = lazy(() => import('./pages/Overview'));
const PlayerStats = lazy(() => import('./pages/PlayerStats'));
const HallOfFame = lazy(() => import('./pages/HallOfFame'));
const Guild = lazy(() => import('./pages/Guild'));
const MonthlyReview = lazy(() => import('./pages/MonthlyReview'));

const API_BASE = '';
const ADMIN_TOKEN_KEY = 'bdo_admin_token';

const SECONDARY_LOG_START = '===== ADVERSARY_SECONDARY_LOG_START =====';

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

function getMainLogOnly(rawLog) {
  const text = String(rawLog || '');

  if (!text.includes(SECONDARY_LOG_START)) {
    return text;
  }

  return text.split(SECONDARY_LOG_START)[0].trim();
}

function stripSecondaryFromLog(log) {
  return {
    ...log,
    raw: getMainLogOnly(log.raw),
  };
}

function stripSecondaryFromLogs(logs) {
  return Array.isArray(logs) ? logs.map(stripSecondaryFromLog) : [];
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
    `Delete failed.\nBackend did not accept any delete route.\nLast error: ${
      lastError?.message || lastError || 'unknown error'
    }`,
  );
}

function PageLoader({ text = 'Loading...' }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
      {text}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState('nodewars');

  const [raw, setRaw] = useState('');
  const [date, setDate] = useState(today());

  const [nodeLogs, setNodeLogs] = useState([]);
  const [allLogs, setAllLogs] = useState(null);
  const [overviewLogs, setOverviewLogs] = useState([]);
  const [members, setMembers] = useState([]);

  const [periodDays, setPeriodDays] = useState(30);
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
  const [matchHistoryDateFilter, setMatchHistoryDateFilter] = useState('');

  const logs = allLogs || nodeLogs;

  const loadNodeLogs = useCallback(async (nextPeriod = 30) => {
    try {
      setLoadingNodeLogs(true);

      const params = nextPeriod === 'all' ? { range: 'all' } : { days: nextPeriod };
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
        }.\nNu am încărcat loguri salvate local din browser.`,
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
        }.\nNu am încărcat loguri salvate local din browser.`,
      );

      return [];
    } finally {
      setLoadingAllLogs(false);
    }
  }, [allLogs]);

  const loadOverviewLogs = useCallback(async () => {
    if (page !== 'overview') return;

    try {
      setLoadingOverviewLogs(true);

      const availableLogs = Array.isArray(nodeLogs) ? nodeLogs : [];
      const needsAllLogs =
        selectedDays.includes('all') || selectedWars.includes('all');
      const allAvailableLogs = needsAllLogs
        ? await loadAllLogs()
        : Array.isArray(allLogs)
          ? allLogs
          : [];

      const sourceLogs = [
        ...new Map(
          [...availableLogs, ...allAvailableLogs]
            .filter(Boolean)
            .map((log) => [String(log.id), { ...log, date: dateOf(log) }]),
        ).values(),
      ];

      const selectedRealWars = selectedWars.includes('all')
        ? sourceLogs
            .map((log) => String(log.id))
            .filter((id) => id && id !== 'current' && id !== 'all')
        : selectedWars.filter((id) => id !== 'all' && id !== 'current');

      const uniqueSelectedWars = [...new Set(selectedRealWars)];

      if (!uniqueSelectedWars.length) {
        setOverviewLogs([]);
        return;
      }

      const fallbackById = new Map(
        sourceLogs.map((log) => [String(log.id), { ...log, date: dateOf(log) }]),
      );

      const rawById = new Map();

      sourceLogs.forEach((log) => {
        const id = String(log.id);

        if (!id || !log.raw) return;

        rawById.set(id, {
          ...log,
          date: dateOf(log),
        });
      });

      const idsToLoad = uniqueSelectedWars.filter((id) => !rawById.has(String(id)));

      const loaded = await Promise.allSettled(
        idsToLoad.map(async (id) => {
          const data = await apiGet(`/api/logs/${encodeURIComponent(id)}/raw`);
          return normalizeLog(data);
        }),
      );

      loaded.forEach((result) => {
        if (result.status !== 'fulfilled') return;

        const log = result.value;
        const id = String(log.id);

        if (!id || !log.raw) return;

        rawById.set(id, {
          ...log,
          date: dateOf(log),
        });
      });

      const selectedLogsWithFallback = uniqueSelectedWars
        .map((id) => rawById.get(String(id)) || fallbackById.get(String(id)))
        .filter(Boolean);

      setOverviewLogs(selectedLogsWithFallback);

      const loadedCount = uniqueSelectedWars.filter((id) => rawById.has(String(id))).length;
      const failedCount = uniqueSelectedWars.length - loadedCount;

      if (failedCount > 0) {
        console.warn(
          `Overview loaded ${loadedCount}/${uniqueSelectedWars.length} raw log(s). Falling back to saved summaries for ${failedCount} log(s).`,
        );
      }
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
  }, [page, selectedDays, selectedWars, nodeLogs, allLogs, loadAllLogs]);

  useEffect(() => {
    loadNodeLogs(30);

    apiGet('/api/members')
      .then((data) => {
        setMembers(normalizeMembers(data));
      })
      .catch(() => {
        setMembers(readStorage(MEMBER_KEY, []));
      });
  }, [loadNodeLogs]);

  useEffect(() => {
    if (
      page === 'players' ||
      page === 'hall' ||
      page === 'raw' ||
      page === 'guild' ||
      page === 'monthly'
    ) {
      loadAllLogs();
    }
  }, [page, loadAllLogs]);

  useEffect(() => {
    loadOverviewLogs();
  }, [loadOverviewLogs]);

  const current = selectedDays.includes('current');
  const all = selectedDays.includes('all');

  const activeLogs = useMemo(() => {
    let baseLogs;

    if (current) {
      baseLogs = [
        {
          id: 'current',
          name: date,
          date,
          raw,
        },
      ];
    } else if (page === 'overview') {
      baseLogs = overviewLogs.map((log) => ({
        ...log,
        date: dateOf(log),
      }));
    } else {
      const base = all
        ? logs
        : logs.filter((log) => selectedDays.includes(dateOf(log)));

      baseLogs = base
        .filter(
          (log) =>
            selectedWars.includes('all') || selectedWars.includes(String(log.id)),
        )
        .map((log) => ({
          ...log,
          date: dateOf(log),
        }));
    }

    return baseLogs;
  }, [
    current,
    page,
    overviewLogs,
    all,
    logs,
    selectedDays,
    selectedWars,
    date,
    raw,
  ]);

  const stats = useMemo(() => calculateStats(activeLogs), [activeLogs]);

  const allTimeStats = useMemo(() => {
    if (page !== 'players' && page !== 'hall' && page !== 'guild') {
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

  const hallOfFameReady =
    page !== 'hall' ||
    (Array.isArray(allLogs) &&
      allLogs.length > 0 &&
      allLogs.some((log) => Boolean(log.raw)));

  const guildReady =
    page !== 'guild' ||
    (Array.isArray(allLogs) &&
      allLogs.length > 0 &&
      allLogs.some((log) => Boolean(log.raw)));

  const monthlyReviewReady =
    page !== 'monthly' || Array.isArray(allLogs);

  const label = current ? 'Current log' : all ? 'All saved days' : selectedDays[0] || 'No day';

  const markedDates = useMemo(
    () => new Set([...new Set(logs.map(dateOf))]),
    [logs],
  );

  async function saveLog(rawOverride) {
    const rawToSave = rawOverride == null ? raw : rawOverride;

    if (!parseLog(rawToSave, date, date, 'x').length) {
      setMessage('Invalid log');
      return;
    }

    const localHash = hashLog(rawToSave);

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
      name: date,
      date,
      raw: rawToSave,
      hash: localHash,
      createdAt: new Date().toISOString(),
    };

    const summary = buildLogSummary(draftLog);

    const payload = {
      ...draftLog,
      summary,
    };

    setMessage('Saving log to database...\nattempt 1/5');

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
      setMessage('Log saved to database.\nSummary calculated and saved.');
    } catch (error) {
      const text = String(error?.message || error || 'Unknown error');

      console.error('Database save failed:', error);

      if (text.includes('Duplicate log')) {
        setMessage(
          `Database refused save: ${text}.\nLogul NU a fost salvat local în browser.`,
        );
        return;
      }

      if (
        text.includes('UnsupportedHttpVerb') ||
        text.includes('404') ||
        text.includes('ResourceNotFound')
      ) {
        setMessage(
          `API save endpoint is not available: ${text}.\nLogul NU a fost salvat local în browser.`,
        );
        return;
      }

      setMessage(
        `Database save failed after 5 attempts: ${text}.\nLogul NU a fost salvat local în browser.`,
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
          ? currentLogs.filter((log) => String(log.id) !== String(deleteTarget.id))
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
    ['guild', 'Guild'],
    ['nodewars', 'Node Wars'],
    ['players', 'Player Stats'],
    ['hall', 'Hall of Fame'],
    ['raw', 'Raw Logs'],
  ];

  function isMenuActive(id) {
    return id === 'nodewars'
      ? page === 'nodewars' || page === 'overview' || page === 'monthly'
      : page === id;
  }

  function openOverviewFromMenu() {
    const allSavedLogsSelected = selectedWars.includes('all');
    const selectedRealWars = selectedWars.filter(
      (id) => id !== 'all' && id !== 'current',
    );

    if (!allSavedLogsSelected && !selectedRealWars.length) {
      setNodeWarsWarning('No node war selected.\nSelect at least one war first.');
      setPage('nodewars');
      return;
    }

    setNodeWarsWarning('');
    setSelectedDays(['all']);
    setPage('overview');
  }

  function openPage(nextPage) {
    setNodeWarsWarning('');
    setMatchHistoryDateFilter('');
    setPage(nextPage);
  }

  function openMatchOverviewFromPlayerStats(match) {
    const warId = String(match?.warId || '').trim();

    if (!warId) {
      setMessage('This match has no valid war ID.');
      return;
    }

    setNodeWarsWarning('');
    setMatchHistoryDateFilter('');
    setSelectedDays(['all']);
    setSelectedWars([warId]);
    setPage('overview');
  }

  function openMatchOverviewFromMonthlyReview(match) {
    const warId = String(match?.id || match?.warId || '').trim();

    if (!warId) {
      setMessage('This match has no valid war ID.');
      return;
    }

    setNodeWarsWarning('');
    setMatchHistoryDateFilter('');
    setSelectedDays(['all']);
    setSelectedWars([warId]);
    setPage('overview');
  }

  const rawHistoryLogs = allLogs || nodeLogs;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 p-3 backdrop-blur-xl lg:hidden">
        <div className="mb-3 flex items-center gap-2 text-lg font-black text-white">
          <img
            src={adversaryEmblem}
            alt=""
            aria-hidden="true"
            className="h-9 w-9 shrink-0 object-contain"
          />
          <span>Battle Analytics</span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
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
              <span className="flex items-center justify-center gap-2">
                <span>{title}</span>
                {id === 'guild' && (
                  <img
                    src={adversaryEmblem}
                    alt=""
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0 object-contain"
                  />
                )}
              </span>
            </button>
          ))}
        </div>

        {(page === 'nodewars' ||
          page === 'overview' ||
          page === 'monthly') && (
          <div className="mt-2 grid grid-cols-3 gap-2">
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

            <button
              type="button"
              onClick={() => openPage('monthly')}
              className={`rounded-xl px-3 py-2 text-center text-xs font-black ${
                page === 'monthly'
                  ? 'border border-blue-400 bg-blue-500/20 text-white'
                  : 'border border-slate-700 bg-slate-900 text-slate-300'
              }`}
            >
              Monthly Review
            </button>
          </div>
        )}
      </div>

      <div className="grid min-h-screen lg:grid-cols-[250px_1fr]">
        <aside className="hidden min-h-screen flex-col border-r border-slate-800 bg-slate-950 p-4 lg:flex">
          <h1 className="mb-6 flex items-center gap-3 text-2xl font-black text-white">
            <img
              src={adversaryEmblem}
              alt=""
              aria-hidden="true"
              className="h-12 w-12 shrink-0 object-contain"
            />
            <span>Battle Analytics</span>
          </h1>

          <nav className="flex-1">
            {menu
              .filter(([id]) => id !== 'raw')
              .map(([id, title]) => {
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
                      <span className="flex items-center gap-2">
                        <span>{title}</span>
                        {id === 'guild' && (
                          <img
                            src={adversaryEmblem}
                            alt=""
                            aria-hidden="true"
                            className="h-6 w-6 shrink-0 object-contain"
                          />
                        )}
                      </span>
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

                        <button
                          type="button"
                          onClick={() => openPage('monthly')}
                          className={`w-full rounded-lg px-3 py-2 text-left text-sm font-bold ${
                            page === 'monthly'
                              ? 'bg-blue-500/20 text-white'
                              : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                          }`}
                        >
                          Monthly Review
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </nav>

          <div className="pt-4">
            <button
              type="button"
              onClick={() => openPage('raw')}
              className={`w-full rounded-xl px-4 py-3 text-left font-bold ${
                isMenuActive('raw')
                  ? 'border border-blue-400 bg-blue-500/20'
                  : 'hover:bg-slate-900'
              }`}
            >
              Raw Logs
            </button>
          </div>
        </aside>

        <main className="min-w-0 p-3 sm:p-5 lg:p-6">
          {page === 'guild' && (
            <Suspense fallback={<PageLoader text="Loading guild stats..." />}>
              {!guildReady || loadingAllLogs ? (
                <PageLoader text="Loading all logs for Guild..." />
              ) : (
                <Guild stats={allTimeStats} logs={Array.isArray(allLogs) ? allLogs : []} />
              )}
            </Suspense>
          )}

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
              matchHistoryDateFilter={matchHistoryDateFilter}
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

          {page === 'monthly' && (
            <Suspense
              fallback={<PageLoader text="Loading monthly review..." />}
            >
              {!monthlyReviewReady || loadingAllLogs ? (
                <PageLoader text="Loading all logs for Monthly Review..." />
              ) : (
                <MonthlyReview
                  logs={Array.isArray(allLogs) ? allLogs : []}
                  onOpenMatchOverview={openMatchOverviewFromMonthlyReview}
                />
              )}
            </Suspense>
          )}

          {page === 'players' && (
            <Suspense fallback={<PageLoader text="Loading player stats..." />}>
              {!playerStatsReady || loadingAllLogs ? (
                <PageLoader text="Loading all logs for Player Stats..." />
              ) : (
                <PlayerStats
                  stats={allTimeStats}
                  onOpenMatchOverview={openMatchOverviewFromPlayerStats}
                />
              )}
            </Suspense>
          )}

          {page === 'hall' && (
            <Suspense fallback={<PageLoader text="Loading Hall of Fame..." />}>
              {!hallOfFameReady || loadingAllLogs ? (
                <PageLoader text="Loading all logs for Hall of Fame..." />
              ) : (
                <HallOfFame stats={stats} allTimeStats={allTimeStats} />
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

              <RawLog
                raw={raw}
                setRaw={setRaw}
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
