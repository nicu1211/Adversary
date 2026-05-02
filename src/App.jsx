import React, { useEffect, useMemo, useState } from 'react';

import NodeWars from './pages/NodeWars';
import OverviewPage from './pages/Overview';
import PlayerStats from './pages/PlayerStats';
import RawLog from './pages/RawLog';

import {
  calculateStats,
  cleanLog,
  dateOf,
  hashLog,
  LOG_KEY,
  MEMBER_KEY,
  monthId,
  normalizeLog,
  normalizeLogs,
  normalizeMembers,
  parseLog,
  readStorage,
  today,
  writeStorage,
} from './lib/logUtils';

import { apiDeleteLog, apiGet, apiWrite } from './lib/api';

export default function App() {
  const [page, setPage] = useState('nodewars');

  const [raw, setRaw] = useState('');
  const [name, setName] = useState('Battle log');
  const [date, setDate] = useState(today());

  const [logs, setLogs] = useState([]);
  const [members, setMembers] = useState([]);

  const [selectedDays, setSelectedDays] = useState(['current']);
  const [selectedWars, setSelectedWars] = useState(['current']);

  const [message, setMessage] = useState('');

  const [rawMonth, setRawMonth] = useState(monthId(new Date()));
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    apiGet('/api/logs')
      .then((data) => setLogs(normalizeLogs(data)))
      .catch(() => setLogs(normalizeLogs(readStorage(LOG_KEY, []))));

    apiGet('/api/members')
      .then((data) => setMembers(normalizeMembers(data)))
      .catch(() => setMembers(readStorage(MEMBER_KEY, [])));
  }, []);

  const current = selectedDays.includes('current');
  const all = selectedDays.includes('all');

  const activeLogs = useMemo(() => {
    if (current) {
      return [{ id: 'current', name, date, raw }];
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
    all,
    logs,
    selectedDays,
    selectedWars,
    name,
    date,
    raw,
  ]);

  const stats = useMemo(() => calculateStats(activeLogs), [activeLogs]);

  const allTimeStats = useMemo(
    () =>
      calculateStats(
        logs.map((log) => ({
          ...log,
          date: dateOf(log),
        })),
      ),
    [logs],
  );

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

    const duplicate = logs.find(
      (log) =>
        log.hash === logHash ||
        cleanLog(log.raw) === cleanLog(raw),
    );

    if (duplicate) {
      setSelectedDays([dateOf(duplicate)]);
      setSelectedWars([String(duplicate.id)]);
      setMessage('Duplicate log detected locally');
      return;
    }

    const uniqueId = `${date}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;

    try {
      const response = await apiWrite('/api/logs', 'POST', {
        id: uniqueId,
        name: name || date,
        date,
        raw,
        hash: logHash,
        createdAt: new Date().toISOString(),
      });

      const item = normalizeLog(response);

      const next = [item, ...logs];

      setLogs(next);
      writeStorage(LOG_KEY, next);
      setSelectedDays([item.date]);
      setSelectedWars([String(item.id)]);
      setMessage('Log saved to database');
    } catch (error) {
      const text = String(error.message || error);

      const item = {
        id: uniqueId,
        apiId: null,
        name: name || date,
        date,
        raw,
        hash: logHash,
        created: new Date().toISOString(),
        localOnly: true,
      };

      const next = [item, ...logs];

      setLogs(next);
      writeStorage(LOG_KEY, next);
      setSelectedDays([item.date]);
      setSelectedWars([String(item.id)]);

      setMessage(
        text.includes('Duplicate log')
          ? `Database refused save: ${text}. Log saved locally only. Backend probably blocks duplicate date/hash.`
          : text.includes('UnsupportedHttpVerb') ||
              text.includes('404') ||
              text.includes('ResourceNotFound')
            ? `API save endpoint is not available: ${text}. Log saved locally only.`
            : `Database save failed: ${text}. Log saved locally only.`,
      );
    }
  }

  async function deleteLog() {
    if (!deleteTarget) return;

    try {
      setDeleting(true);

      if (deleteTarget.localOnly) {
        const next = logs.filter(
          (log) => String(log.id) !== String(deleteTarget.id),
        );

        setLogs(next);
        writeStorage(LOG_KEY, next);
        setMessage('Local log deleted');
        setDeleteTarget(null);
        return;
      }

      await apiDeleteLog(deleteTarget);

      const next = logs.filter(
        (log) => String(log.id) !== String(deleteTarget.id),
      );

      setLogs(next);
      writeStorage(LOG_KEY, next);
      setMessage('Log deleted from database');
      setDeleteTarget(null);
    } catch (error) {
      setMessage(error.message || 'Delete error');
    } finally {
      setDeleting(false);
    }
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
    if (selectedDays.includes('current')) {
      setSelectedDays(['all']);
      setSelectedWars(['all']);
    }

    setPage('overview');
  }

  function SubTabs() {
    return (
      <div className="flex gap-2 rounded-2xl border border-slate-700 bg-slate-950/70 p-2">
        <button
          onClick={() => setPage('nodewars')}
          className={`rounded-xl px-4 py-2 text-sm font-bold ${
            page === 'nodewars'
              ? 'border border-blue-400 bg-blue-500/20 text-white'
              : 'text-slate-300 hover:bg-slate-900'
          }`}
        >
          Node Wars
        </button>

        <button
          onClick={openOverview}
          className={`rounded-xl px-4 py-2 text-sm font-bold ${
            page === 'overview'
              ? 'border border-blue-400 bg-blue-500/20 text-white'
              : 'text-slate-300 hover:bg-slate-900'
          }`}
        >
          Overview
        </button>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#050b16] text-slate-100">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,.18),transparent_35%)]" />

      <div className="relative flex flex-col gap-4 p-3 sm:p-4 xl:flex-row xl:gap-5">
        <div className="sticky top-0 z-40 rounded-2xl border border-slate-700 bg-slate-950/95 p-3 shadow-2xl backdrop-blur xl:hidden">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-lg font-black">☾ Battle Analytics</h1>
            <span className="text-xs text-slate-400">Menu</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {menu.map((item) => (
              <button
                key={item[0]}
                onClick={() => setPage(item[0])}
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
        </div>

        <aside className="hidden w-64 shrink-0 rounded-3xl border border-slate-700 bg-slate-950/70 p-4 xl:block">
          <h1 className="mb-6 text-center text-xl font-black">
            ☾ Battle Analytics
          </h1>

          {menu.map((item) => (
            <button
              key={item[0]}
              onClick={() => setPage(item[0])}
              className={`mb-2 w-full rounded-xl px-4 py-3 text-left font-bold ${
                isActive(item[0])
                  ? 'border border-blue-400 bg-blue-500/20'
                  : 'hover:bg-slate-900'
              }`}
            >
              {item[1]}
            </button>
          ))}
        </aside>

        <section className="min-w-0 flex-1 space-y-4 pb-20 xl:pb-0">
          {page === 'nodewars' && (
            <>
              <SubTabs />

              <NodeWars
                logs={logs}
                setPage={setPage}
                setSelectedDays={setSelectedDays}
                setSelectedWars={setSelectedWars}
                selectedWars={selectedWars}
              />
            </>
          )}

          {page === 'overview' && (
            <>
              <SubTabs />

              {message && (
                <p className="rounded-xl bg-blue-500/10 p-3 text-blue-200">
                  {message}
                </p>
              )}

              <OverviewPage
                stats={stats}
                label={label}
                members={members}
              />
            </>
          )}

          {page === 'players' && (
            <PlayerStats stats={allTimeStats} />
          )}

          {page === 'raw' && (
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
          )}
        </section>
      </div>
    </main>
  );
}
