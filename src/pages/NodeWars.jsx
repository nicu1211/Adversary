import React, { useMemo, useState } from 'react';

import { Panel } from '../components/UI';

import { calculateStats, dateOf } from '../lib/logUtils';

/* -------------------- SORT HEADER -------------------- */
function SortHeader({ id, label, sort, onSort }) {
  const active = sort.key === id;

  return (
    <button
      type="button"
      onClick={() => onSort(id)}
      className={`rounded-lg px-2 py-1 text-xs font-black uppercase tracking-wider transition ${
        active
          ? 'bg-blue-500/15 text-blue-300'
          : 'text-slate-500 hover:bg-slate-900 hover:text-slate-300'
      }`}
    >
      {label} {active ? (sort.dir === 'desc' ? '↓' : '↑') : '↕'}
    </button>
  );
}

/* -------------------- STAT BLOCK -------------------- */
function Stat({ label, value, color = 'text-slate-200' }) {
  return (
    <div className="min-w-[70px] text-center">
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className={`text-lg font-black leading-tight ${color}`}>
        {value}
      </div>
    </div>
  );
}

/* -------------------- ENEMY PILL -------------------- */
function EnemyPill({ guild }) {
  return (
    <span
      title={`${guild.name} · KD ${guild.kd}`}
      className="min-w-0 shrink rounded-full border border-slate-800 bg-slate-950/80 px-2.5 py-1 text-xs font-bold text-slate-400"
    >
      <span className="inline-block max-w-[105px] truncate align-bottom sm:max-w-[145px] 2xl:max-w-[180px]">
        {guild.name}
      </span>{' '}
      <b
        className={
          Number(guild.kd) >= 1 ? 'text-emerald-400' : 'text-rose-400'
        }
      >
        {guild.kd}
      </b>
    </span>
  );
}

/* -------------------- CARD -------------------- */
function WarCard({ row, checked, onClick, onToggle }) {
  const kdNumber = Number(row.kd) || 0;

  const kdColor =
    kdNumber >= 2
      ? 'text-emerald-400'
      : kdNumber >= 1
      ? 'text-yellow-300'
      : 'text-rose-400';

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 p-4 shadow-[0_18px_55px_rgba(2,6,23,0.35)] transition duration-200 hover:-translate-y-[1px] hover:border-blue-400/40 hover:shadow-blue-500/10 sm:p-5"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent opacity-0 transition group-hover:opacity-100" />

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between xl:gap-6">
        {/* DATE */}
        <div className="flex items-center justify-between gap-3 xl:w-[120px] xl:block">
          <div>
            <div className="text-sm font-black text-slate-100">
              {new Date(row.date).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
              })}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {new Date(row.date).toLocaleDateString('en-GB', {
                weekday: 'short',
                year: 'numeric',
              })}
            </div>
          </div>

          <div className="xl:hidden" onClick={(event) => event.stopPropagation()}>
            <input
              type="checkbox"
              checked={checked}
              onChange={onToggle}
              className="h-5 w-5 cursor-pointer accent-blue-500"
            />
          </div>
        </div>

        {/* GUILD */}
        <div className="flex min-w-[150px] items-center gap-3">
          <span className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1 text-sm font-black text-slate-200">
            Adversary
          </span>

          <span className={`text-sm font-black ${kdColor}`}>● {row.kd}</span>
        </div>

        {/* ENEMIES */}
        <div className="flex min-w-0 flex-1 flex-wrap gap-2 xl:flex-nowrap xl:overflow-hidden">
          {row.topEnemies.length ? (
            row.topEnemies.map((guild) => (
              <EnemyPill key={guild.name} guild={guild} />
            ))
          ) : (
            <span className="text-xs font-bold text-slate-600">
              No enemies detected
            </span>
          )}
        </div>

        {/* STATS */}
        <div className="grid grid-cols-4 gap-2 rounded-2xl border border-slate-800/80 bg-slate-950/50 p-3 sm:flex sm:items-center sm:gap-7 sm:bg-transparent sm:p-0 sm:border-0">
          <Stat label="Players" value={row.players} />
          <Stat label="Kills" value={row.kills} color="text-blue-400" />
          <Stat label="Deaths" value={row.deaths} color="text-rose-400" />
          <Stat
            label="K/D"
            value={row.kd}
            color={kdNumber >= 1 ? 'text-emerald-400' : 'text-rose-400'}
          />
        </div>

        {/* SELECT DESKTOP */}
        <div
          className="hidden xl:block"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={onToggle}
            className="h-5 w-5 cursor-pointer accent-blue-500"
          />
        </div>
      </div>
    </div>
  );
}

/* -------------------- MAIN -------------------- */
export default function NodeWars({
  logs,
  setPage,
  setSelectedDays,
  setSelectedWars,
  selectedWars,
}) {
  const [query, setQuery] = useState('');
  const [warning, setWarning] = useState('');
  const [sort, setSort] = useState({
    key: 'time',
    dir: 'desc',
  });

  function toggleSort(key) {
    setSort((current) => {
      if (current.key === key) {
        return {
          key,
          dir: current.dir === 'desc' ? 'asc' : 'desc',
        };
      }

      return {
        key,
        dir: 'desc',
      };
    });
  }

  const rows = useMemo(() => {
    const mappedRows = logs
      .map((log) => {
        const stats = calculateStats([{ ...log, date: dateOf(log) }]);

        const topEnemies = [...stats.guilds]
          .map((guild) => {
            const ourKills = guild.kills;
            const ourDeaths = guild.deaths;
            const totalInteractions = ourKills + ourDeaths;

            return {
              name: guild.name,
              kills: ourDeaths,
              deaths: ourKills,
              total: totalInteractions,
              kd: ourKills
                ? (ourDeaths / ourKills).toFixed(2)
                : ourDeaths.toFixed(2),
            };
          })
          .sort((a, b) => b.total - a.total || b.kills - a.kills)
          .slice(0, 5);

        return {
          ...log,
          date: dateOf(log),
          players: stats.players.length,
          kills: Number(stats.kills) || 0,
          deaths: Number(stats.deaths) || 0,
          kd: stats.kd,
          kdNumber: Number(stats.kd) || 0,
          topEnemies,
        };
      })
      .filter((row) => {
        const cleanQuery = query.trim().toLowerCase();

        if (!cleanQuery) return true;

        return row.topEnemies.some((guild) =>
          guild.name.toLowerCase().includes(cleanQuery),
        );
      });

    return mappedRows.sort((a, b) => {
      let av = 0;
      let bv = 0;

      if (sort.key === 'time') {
        av = new Date(a.date).getTime() || 0;
        bv = new Date(b.date).getTime() || 0;
      }

      if (sort.key === 'kills') {
        av = Number(a.kills) || 0;
        bv = Number(b.kills) || 0;
      }

      if (sort.key === 'deaths') {
        av = Number(a.deaths) || 0;
        bv = Number(b.deaths) || 0;
      }

      if (sort.key === 'kd') {
        av = Number(a.kdNumber) || 0;
        bv = Number(b.kdNumber) || 0;
      }

      if (av === bv) {
        return String(b.date).localeCompare(String(a.date));
      }

      return sort.dir === 'asc' ? av - bv : bv - av;
    });
  }, [logs, query, sort]);

  const visibleIds = rows.map((row) => String(row.id));

  const selectedRealWars = selectedWars.filter(
    (id) => id !== 'all' && id !== 'current',
  );

  const allDisplayedLogsSelected =
    visibleIds.length > 0 &&
    visibleIds.every((id) => selectedRealWars.includes(id));

  const selectedVisibleCount = visibleIds.filter((id) =>
    selectedRealWars.includes(id),
  ).length;

  function openWar(row) {
    setWarning('');
    setSelectedDays([row.date]);
    setSelectedWars([String(row.id)]);
    setPage('overview');
  }

  function toggleWar(event, row) {
    event.stopPropagation();

    const id = String(row.id);

    setWarning('');
    setSelectedDays(['all']);

    setSelectedWars(
      event.target.checked
        ? [...new Set([...selectedRealWars, id])]
        : selectedRealWars.filter((x) => x !== id),
    );
  }

  function selectDisplayedLogs() {
    setWarning('');

    if (!visibleIds.length) {
      setSelectedDays(['all']);
      setSelectedWars([]);
      setWarning('No saved node wars found for this search.');
      return;
    }

    if (allDisplayedLogsSelected) {
      setSelectedDays(['all']);
      setSelectedWars([]);
      return;
    }

    setSelectedDays(['all']);
    setSelectedWars(visibleIds);
  }

  function openSelectedOverview() {
    if (selectedRealWars.length === 0) {
      setWarning('No node war selected. Select at least one war first.');
      return;
    }

    setWarning('');
    setSelectedDays(['all']);
    setPage('overview');
  }

  return (
    <Panel>
      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-2 inline-flex rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-blue-300">
            Battle history
          </div>

          <h2 className="text-2xl font-black text-white sm:text-3xl">
            Node Wars
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Modern match history overview · select multiple node wars for
            analysis in Overview
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={selectDisplayedLogs}
            className="rounded-xl border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-sm font-black text-blue-200 transition hover:border-blue-300/60 hover:bg-blue-500/20"
          >
            {allDisplayedLogsSelected ? 'Clear selection' : 'Select displayed'}
          </button>

          <button
            type="button"
            onClick={openSelectedOverview}
            className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-sm font-black text-emerald-200 transition hover:border-emerald-300/60 hover:bg-emerald-500/20"
          >
            Open overview
          </button>

          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setWarning('');
            }}
            placeholder="Search enemies..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400 focus:bg-slate-900 sm:w-80"
          />
        </div>
      </div>

      {/* WARNING */}
      {warning && (
        <div className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-200">
          {warning}
        </div>
      )}

      {/* FILTER / SORT BAR */}
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <span className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1">
            Displayed logs: <b className="text-slate-100">{rows.length}</b>
          </span>

          <span className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1">
            Selected displayed:{' '}
            <b className="text-blue-300">{selectedVisibleCount}</b>
          </span>

          {query.trim() && (
            <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-cyan-200">
              Filter active: {query.trim()}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-600">
            Sort by
          </span>

          <SortHeader id="time" label="Time" sort={sort} onSort={toggleSort} />
          <SortHeader
            id="kills"
            label="Kills"
            sort={sort}
            onSort={toggleSort}
          />
          <SortHeader
            id="deaths"
            label="Deaths"
            sort={sort}
            onSort={toggleSort}
          />
          <SortHeader id="kd" label="K/D" sort={sort} onSort={toggleSort} />
        </div>
      </div>

      {/* LIST */}
      <div className="max-h-[720px] space-y-3 overflow-auto pr-1 [scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700/80 [&::-webkit-scrollbar-thumb:hover]:bg-slate-600">
        {!rows.length ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-10 text-center text-sm font-bold text-slate-500">
            No saved node wars found for this search.
          </div>
        ) : (
          rows.map((row) => {
            const id = String(row.id);
            const checked = selectedRealWars.includes(id);

            return (
              <WarCard
                key={row.id}
                row={row}
                checked={checked}
                onClick={() => openWar(row)}
                onToggle={(event) => toggleWar(event, row)}
              />
            );
          })
        )}
      </div>
    </Panel>
  );
}
