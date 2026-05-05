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

import {
  buildLogSummary,
  calculateStats,
  cleanLog,
  dateOf,
  hashLog,
  MEMBER_KEY,
  monthId,
  normalizeLog,
  normalizeLogs,
  normalizeMembers,
  parseLog,
  readStorage,
  today,
} from './lib/logUtils';

import { apiDeleteLog, apiGet, apiWrite, logsPath } from './lib/api';

const OverviewPage = lazy(() => import('./pages/Overview'));
const PlayerStats = lazy(() => import('./pages/PlayerStats'));

function PageLoader({ text = 'Loading...' }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 text-sm font-bold text-slate-300">
      {text}
    </div>
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

  const [nodePeriod, setNodePeriod] = useState(7);
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

  const [overviewWarning, setOverviewWarning] = useState('');

  const logs = allLogs || nodeLogs;

  const loadNodeLogs = useCallback(async (period = 7) => {
    try {
      setLoadingNodeLogs(true);

      const path =
        period === 'all'
          ? logsPath({ range: 'all' })
          : logsPath({ days: period });

      const data = await apiGet(path);
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

    return calculateStats(
      (allLogs || []).map((log) => ({
        ...log,
        date: dateOf(log),
      })),
    );
  }, [page, allLogs]);

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

    const logHash = hashLog(raw);

    const duplicate = logs.find((log) => {
      if (log.hash && log.hash === logHash) return true;
      if (!log.raw) return false;
      return cleanLog(log.raw) === cleanLog(raw);
    });

    if (duplicate) {
      setSelectedDays([dateOf(duplicate)]);
      setSelectedWars([String(duplicate.id)]);
      setMessage('Duplicate log detected locally');
      return;
    }

    const uniqueId = `${date}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    const baseLog = {
      id: uniqueId,
      name: name || date,
      date,
      raw,
      hash: logHash,
      createdAt: new Date().toISOString(),
    };

    const summary = buildLogSummary(baseLog);

    const payload = {
      ...baseLog,
      summary,
    };

    setMessage('Saving log to database... attempt 1/5');

    try {
      const response = await apiWrite('/api/logs', 'POST', payload, {
        maxAttempts: 5,
        baseDelayMs: 700,
      });

      const item = normalizeLog({
        ...payload,
        ...response,
        summary: response?.summary || payload.summary,
      });

      setNodeLogs((currentLogs) => [item, ...currentLogs]);

      setAllLogs((currentLogs) =>
        currentLogs ? [item, ...currentLogs] : currentLogs,
      );

      setSelectedDays([item.date]);
      setSelectedWars([String(item.id)]);
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

      await apiDeleteLog(deleteTarget);

      setNodeLogs((currentLogs) =>
        currentLogs.filter(
          (log) => String(log.id) !== String(deleteTarget.id),
        ),
      );

      setAllLogs((currentLogs) =>
        currentLogs
          ? currentLogs.filter(
              (log) => String(log.id) !== String(deleteTarget.id),
            )
          : currentLogs,
      );

      setOverviewLogs((currentLogs) =>
        currentLogs.filter(
          (log) => String(log.id) !== String(deleteTarget.id),
        ),
      );

      setMessage('Log deleted from database');
      setDeleteTarget(null);
    } catch (error) {
      setMessage(error?.message || 'Delete error');
    } finally {
      setDeleting(false);
    }
  }

  function handleNodePeriodChange(nextPeriod) {
    setNodePeriod(nextPeriod);
    loadNodeLogs(nextPeriod);
  }

  const menu = [
    ['nodewars', 'Node Wars'],
    ['players', 'Player Stats'],
    ['raw', 'Raw Log'],
  ];

  function isActive(key) {
    return (
      (key === 'nodewars' && (page === 'nodewars' || page === 'overview')) ||
      page === key
    );
  }

  function openOverview() {
    const selectedRealWars = selectedWars.filter(
      (id) => id !== 'all' && id !== 'current',
    );

    if (selectedRealWars.length === 0) {
      setOverviewWarning('No node war selected. Select at least one war first.');
      setPage('nodewars');
      return;
    }

    setOverviewWarning('');
    setSelectedDays(['all']);
    setPage('overview');
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/95 p-3 backdrop-blur-xl lg:hidden">
        <div className="mb-3 text-lg font-black text-white">
          ☾ Battle Analytics
        </div>

        <div className="grid grid-cols-3 gap-2">
          {menu.map((item) => (
            <button
              key={item[0]}
              type="button"
              onClick={() => {
                setOverviewWarning('');
                setPage(item[0]);
              }}
              className={`rounded-xl px-3 py-2 text-center text-xs font-black ${
                isActive(item[0])
                  ? 'border border-blue-400 bg-blue-500/20 text-white'
                  : 'border border-slate-700 bg-slate-900 text-slate-300'
              }`}
            >
              {item[1]}
            </button>
          ))}
        </div>

        {(page === 'nodewars' || page === 'overview') && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setOverviewWarning('');
                setPage('nodewars');
              }}
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
              onClick={openOverview}
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
            {menu.map((item) => {
              const isNodeWars = item[0] === 'nodewars';

              return (
                <div key={item[0]} className="mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOverviewWarning('');
                      setPage(item[0]);
                    }}
                    className={`w-full rounded-xl px-4 py-3 text-left font-bold ${
                      isActive(item[0])
                        ? 'border border-blue-400 bg-blue-500/20'
                        : 'hover:bg-slate-900'
                    }`}
                  >
                    {item[1]}
                  </button>

                  {isNodeWars && (
                    <div className="ml-4 mt-2 space-y-1 border-l border-slate-800 pl-3">
                      <button
                        type="button"
                        onClick={() => {
                          setOverviewWarning('');
                          setPage('nodewars');
                        }}
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
                        onClick={openOverview}
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
              periodDays={nodePeriod}
              onPeriodChange={handleNodePeriodChange}
              setPage={setPage}
              setSelectedDays={setSelectedDays}
              setSelectedWars={setSelectedWars}
              selectedWars={selectedWars}
              externalWarning={overviewWarning}
              clearExternalWarning={() => setOverviewWarning('')}
            />
          )}

          {page === 'overview' && (
            <Suspense fallback={<PageLoader text="Loading overview..." />}>
              {loadingOverviewLogs ? (
                <PageLoader text="Loading selected raw logs for overview..." />
              ) : (
                <OverviewPage
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
              {loadingAllLogs && !allLogs ? (
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

              <RawLog
                raw={raw}
                setRaw={setRaw}
                name={name}
                setName={setName}
                date={date}
                setDate={setDate}
                logs={logs}
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
