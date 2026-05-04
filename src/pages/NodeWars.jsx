import React, { useMemo, useState } from 'react';
import {
  Activity,
  CalendarDays,
  ChevronRight,
  Crosshair,
  Filter,
  Skull,
  Swords,
  Users,
} from 'lucide-react';

import { Panel } from '../components/UI';
import { calculateStats, dateOf, scrollCls } from '../lib/logUtils';

/* -------------------- SORT HEADER -------------------- */
function SortHeader({ id, label, sort, onSort }) {
  const active = sort.key === id;

  return (
    <button
      type="button"
      onClick={() => onSort(id)}
      className={`rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wider transition ${
        active
          ? 'border-violet-400/40 bg-violet-500/15 text-violet-200'
          : 'border-slate-800 bg-slate-950/70 text-slate-500 hover:border-slate-700 hover:text-slate-300'
      }`}
    >
      {label} {active ? (sort.dir === 'desc' ? '↓' : '↑') : '↕'}
    </button>
  );
}

/* -------------------- HELPERS -------------------- */
function numberColor(value) {
  const num = Number(value) || 0;

  if (num >= 2) return 'text-emerald-400';
  if (num >= 1) return 'text-lime-400';
  if (num > 0) return 'text-rose-400';

  return 'text-slate-400';
}

function badgeColor(value) {
  const num = Number(value) || 0;

  if (num >= 2) {
    return 'border-emerald-400/20 bg-emerald-500/15 text-emerald-300';
  }

  if (num >= 1) {
    return 'border-lime-400/20 bg-lime-500/15 text-lime-300';
  }

  return 'border-rose-400/20 bg-rose-500/15 text-rose-300';
}

function formatWarDate(date) {
  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return {
      weekday: 'War',
      full: String(date || '-'),
    };
  }

  return {
    weekday: parsed.toLocaleDateString('en-GB', {
      weekday: 'short',
    }),
    full: parsed.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
  };
}

function formatWarTime(row) {
  const source =
    row.createdAt ||
    row.created_at ||
    row.created ||
    row.time ||
    row.timestamp ||
    '';

  if (!source) return '';

  const parsed = new Date(source);

  if (Number.isNaN(parsed.getTime())) return '';

  return parsed.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function accentByIndex(index) {
  const accents = [
    {
      name: 'violet',
      date: 'from-violet-950/90 via-violet-900/30 to-slate-950',
      iconBox: 'bg-violet-500/15 text-violet-300 shadow-violet-500/20',
      arrow: 'bg-violet-500/15 text-violet-300 hover:bg-violet-500/25',
      line: 'from-violet-500/0 via-violet-400/40 to-violet-500/0',
    },
    {
      name: 'blue',
      date: 'from-blue-950/90 via-blue-900/30 to-slate-950',
      iconBox: 'bg-blue-500/15 text-blue-300 shadow-blue-500/20',
      arrow: 'bg-blue-500/15 text-blue-300 hover:bg-blue-500/25',
      line: 'from-blue-500/0 via-blue-400/40 to-blue-500/0',
    },
    {
      name: 'cyan',
      date: 'from-cyan-950/90 via-cyan-900/30 to-slate-950',
      iconBox: 'bg-cyan-500/15 text-cyan-300 shadow-cyan-500/20',
      arrow: 'bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25',
      line: 'from-cyan-500/0 via-cyan-400/40 to-cyan-500/0',
    },
  ];

  return accents[index % accents.length];
}

/* -------------------- ENEMY PILL -------------------- */
function EnemyPill({ enemy }) {
  return (
    <div className="flex h-8 min-w-[82px] max-w-[145px] items-center justify-between gap-2 rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <span
        title={enemy.name}
        className="truncate text-[11px] font-black text-slate-200"
      >
        {enemy.name}
      </span>

      <span className={`text-[11px] font-black ${numberColor(enemy.kd)}`}>
        {enemy.kd}
      </span>
    </div>
  );
}

/* -------------------- METRIC -------------------- */
function WarMetric({ icon, label, value, valueClass = 'text-slate-100' }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-900/80">
        {icon}
      </div>

      <div className="min-w-0">
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
          {label}
        </div>

        <div className={`text-xl font-black leading-tight ${valueClass}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

/* -------------------- WAR CARD -------------------- */
function WarCard({ row, index, checked, onOpen, onToggle }) {
  const accent = accentByIndex(index);
  const date = formatWarDate(row.date);
  const time = formatWarTime(row);
  const kdNumber = Number(row.kd) || 0;

  return (
    <div
      onClick={onOpen}
      className={`group relative grid cursor-pointer overflow-hidden rounded-xl border transition duration-200 ${
        checked
          ? 'border-violet-400/60 bg-slate-950 shadow-[0_0_28px_rgba(139,92,246,0.16)]'
          : 'border-slate-800/90 bg-slate-950 hover:border-slate-700'
      } lg:grid-cols-[98px_1fr]`}
    >
      <div
        className={`relative flex min-h-[116px] flex-col justify-between bg-gradient-to-br ${accent.date} p-4`}
      >
        <div>
          <div
            className={`mb-6 grid h-9 w-9 place-items-center rounded-xl ${accent.iconBox}`}
          >
            <CalendarDays size={18} />
          </div>

          <div className="text-sm font-black leading-tight text-white">
            {date.weekday},
          </div>

          <div className="text-lg font-black leading-tight text-white">
            {date.full}
          </div>
        </div>

        {time && (
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
            <span className="h-3 w-3 rounded-full border border-slate-500" />
            {time}
          </div>
        )}
      </div>

      <div className="relative min-w-0 p-4 lg:p-5">
        <div
          className={`pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r ${accent.line} opacity-70`}
        />

        <div className="flex min-w-0 items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="grid min-w-0 gap-5 xl:grid-cols-[110px_1fr]">
              <div>
                <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Guild
                </div>

                <div className="flex items-center gap-2">
                  <span className="truncate text-lg font-black text-white">
                    Adversary
                  </span>

                  <span
                    className={`rounded-full border px-2 py-0.5 text-[11px] font-black ${badgeColor(
                      row.kd,
                    )}`}
                  >
                    {row.kd}
                  </span>
                </div>
              </div>

              <div className="min-w-0">
                <div className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Top 5 Enemies
                </div>

                <div className="flex min-w-0 flex-wrap gap-2 xl:flex-nowrap xl:overflow-hidden">
                  {row.topEnemies.length ? (
                    row.topEnemies.map((enemy) => (
                      <EnemyPill key={enemy.name} enemy={enemy} />
                    ))
                  ) : (
                    <div className="text-xs font-bold text-slate-600">
                      No enemies detected
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 h-px bg-slate-800/80" />

            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <WarMetric
                label="Players"
                value={row.players}
                icon={<Users size={19} className="text-indigo-300" />}
              />

              <WarMetric
                label="Kills"
                value={row.kills}
                valueClass="text-emerald-400"
                icon={<Swords size={19} className="text-emerald-300" />}
              />

              <WarMetric
                label="Deaths"
                value={row.deaths}
                valueClass="text-rose-400"
                icon={<Skull size={19} className="text-rose-300" />}
              />

              <WarMetric
                label="K/D"
                value={row.kd}
                valueClass={kdNumber >= 1 ? 'text-emerald-400' : 'text-rose-400'}
                icon={<Crosshair size={19} className="text-lime-300" />}
              />
            </div>
          </div>

          <button
            type="button"
            title={checked ? 'Selected for overview' : 'Select this war'}
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
            className={`mt-[42px] grid h-9 w-9 shrink-0 place-items-center rounded-xl transition ${
              checked
                ? 'bg-violet-500/30 text-violet-100 ring-1 ring-violet-300/50'
                : accent.arrow
            }`}
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------- SUMMARY CARD -------------------- */
function SummaryStat({ icon, label, value, valueClass = 'text-slate-100' }) {
  return (
    <div className="flex items-center gap-3 border-slate-800 px-4 py-3 md:border-r">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-900/80">
        {icon}
      </div>

      <div>
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-500">
          {label}
        </div>

        <div className={`text-xl font-black leading-tight ${valueClass}`}>
          {value}
        </div>

        <div className={`mt-1 h-[2px] w-10 rounded-full ${valueClass.replace('text-', 'bg-')}`} />
      </div>
    </div>
  );
}

function Sparkline({ rows }) {
  const values = rows.map((row) => Number(row.kdNumber) || 0);
  const safeValues = values.length ? values : [0];

  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);
  const range = max - min || 1;

  const points = safeValues
    .map((value, index) => {
      const x =
        safeValues.length === 1 ? 0 : (index / (safeValues.length - 1)) * 150;
      const y = 42 - ((value - min) / range) * 34;

      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  const areaPoints = `0,48 ${points} 150,48`;

  return (
    <div className="flex min-w-[190px] flex-1 items-center gap-4 px-4 py-3">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cyan-500/10">
        <Activity size={20} className="text-cyan-300" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
          K/D Trend
        </div>

        <svg viewBox="0 0 150 52" className="h-[44px] w-full overflow-visible">
          <defs>
            <linearGradient id="kdArea" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgb(34 197 94)" stopOpacity="0.32" />
              <stop offset="100%" stopColor="rgb(34 197 94)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          <polygon points={areaPoints} fill="url(#kdArea)" />

          <polyline
            points={points}
            fill="none"
            stroke="rgb(34 197 94)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {safeValues.map((value, index) => {
            const x =
              safeValues.length === 1
                ? 0
                : (index / (safeValues.length - 1)) * 150;
            const y = 42 - ((value - min) / range) * 34;

            return (
              <circle
                key={`${value}-${index}`}
                cx={x}
                cy={y}
                r="2.3"
                fill="rgb(15 23 42)"
                stroke="rgb(34 197 94)"
                strokeWidth="2"
              />
            );
          })}
        </svg>
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
  const [filterOpen, setFilterOpen] = useState(false);
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

  const totals = useMemo(() => {
    const kills = rows.reduce((sum, row) => sum + row.kills, 0);
    const deaths = rows.reduce((sum, row) => sum + row.deaths, 0);

    return {
      matches: rows.length,
      kills,
      deaths,
      kd: deaths ? (kills / deaths).toFixed(2) : kills.toFixed(2),
    };
  }, [rows]);

  function openWar(row) {
    setWarning('');
    setSelectedDays([row.date]);
    setSelectedWars([String(row.id)]);
    setPage('overview');
  }

  function toggleWar(row) {
    const id = String(row.id);

    setWarning('');
    setSelectedDays(['all']);

    setSelectedWars((previous) => {
      const cleanPrevious = previous.filter(
        (item) => item !== 'all' && item !== 'current',
      );

      return cleanPrevious.includes(id)
        ? cleanPrevious.filter((item) => item !== id)
        : [...new Set([...cleanPrevious, id])];
    });
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
    <Panel cls="border-0 bg-transparent p-0 shadow-none">
      <div className="space-y-3">
        {/* HEADER */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-900/80 bg-black/40 p-3 shadow-[0_18px_80px_rgba(0,0,0,0.35)] sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-violet-500/15 text-violet-300 shadow-[0_0_30px_rgba(139,92,246,0.2)]">
              <Swords size={22} />
            </div>

            <div>
              <h2 className="text-2xl font-black leading-tight text-white">
                Guild Warfare
              </h2>

              <p className="text-sm font-semibold text-slate-500">
                Match History
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2 text-xs font-black text-slate-300 transition hover:border-slate-700 hover:bg-slate-900"
            >
              <CalendarDays size={15} />
              Last 7 Days
              <span className="text-slate-600">⌄</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterOpen((value) => !value)}
              className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-black transition ${
                filterOpen || query.trim()
                  ? 'border-violet-400/40 bg-violet-500/15 text-violet-200'
                  : 'border-slate-800 bg-slate-950/80 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
              }`}
            >
              <Filter size={15} />
              Filter
            </button>
          </div>
        </div>

        {/* FILTER PANEL */}
        {filterOpen && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/95 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
            <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
              <div>
                <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Search enemies
                </label>

                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setWarning('');
                  }}
                  placeholder="Search enemies..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400 focus:bg-slate-900"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <SortHeader
                  id="time"
                  label="Time"
                  sort={sort}
                  onSort={toggleSort}
                />
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
                <SortHeader
                  id="kd"
                  label="K/D"
                  sort={sort}
                  onSort={toggleSort}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
              <div className="flex flex-wrap gap-2 text-xs font-bold text-slate-400">
                <span className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1">
                  Displayed: <b className="text-white">{rows.length}</b>
                </span>

                <span className="rounded-full border border-slate-800 bg-slate-950 px-3 py-1">
                  Selected:{' '}
                  <b className="text-violet-300">{selectedVisibleCount}</b>
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={selectDisplayedLogs}
                  className="rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-xs font-black text-violet-200 transition hover:border-violet-300/60 hover:bg-violet-500/20"
                >
                  {allDisplayedLogsSelected ? 'Clear selection' : 'Select displayed'}
                </button>

                <button
                  type="button"
                  onClick={openSelectedOverview}
                  className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-xs font-black text-emerald-200 transition hover:border-emerald-300/60 hover:bg-emerald-500/20"
                >
                  Open overview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WARNING */}
        {warning && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-200">
            {warning}
          </div>
        )}

        {/* LIST */}
        <div className={`max-h-[calc(100vh-260px)] space-y-3 overflow-auto pr-1 ${scrollCls}`}>
          {!rows.length ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-12 text-center text-sm font-bold text-slate-500">
              No saved node wars found for this search.
            </div>
          ) : (
            rows.map((row, index) => {
              const id = String(row.id);
              const checked = selectedRealWars.includes(id);

              return (
                <WarCard
                  key={row.id}
                  row={row}
                  index={index}
                  checked={checked}
                  onOpen={() => openWar(row)}
                  onToggle={() => toggleWar(row)}
                />
              );
            })
          )}
        </div>

        {/* SUMMARY */}
        <div className="grid overflow-hidden rounded-xl border border-slate-800/90 bg-slate-950 shadow-[0_18px_70px_rgba(0,0,0,0.30)] md:grid-cols-[repeat(4,minmax(130px,1fr))_minmax(220px,1.25fr)]">
          <SummaryStat
            label="Total Matches"
            value={totals.matches}
            valueClass="text-violet-400"
            icon={<Swords size={20} className="text-violet-300" />}
          />

          <SummaryStat
            label="Total Kills"
            value={totals.kills.toLocaleString('en-US')}
            valueClass="text-emerald-400"
            icon={<Crosshair size={20} className="text-emerald-300" />}
          />

          <SummaryStat
            label="Total Deaths"
            value={totals.deaths.toLocaleString('en-US')}
            valueClass="text-rose-400"
            icon={<Skull size={20} className="text-rose-300" />}
          />

          <SummaryStat
            label="Overall K/D"
            value={totals.kd}
            valueClass={Number(totals.kd) >= 1 ? 'text-emerald-400' : 'text-rose-400'}
            icon={<Activity size={20} className="text-cyan-300" />}
          />

          <Sparkline rows={rows} />
        </div>
      </div>
    </Panel>
  );
}
