import React, { useMemo, useState } from 'react';
import {
  Activity,
  CalendarDays,
  ChevronDown,
  Crosshair,
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
      weekday: 'War Day',
      full: String(date || '-'),
    };
  }

  return {
    weekday: parsed.toLocaleDateString('en-GB', {
      weekday: 'long',
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
    row.date ||
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
      date: 'from-violet-950/95 via-violet-900/35 to-slate-950',
      iconBox: 'bg-violet-500/15 text-violet-300 shadow-violet-500/20',
      topLine: 'from-violet-500/0 via-violet-400/40 to-violet-500/0',
      glow: 'bg-violet-500/20',
      hoverShadow: 'hover:shadow-[0_0_34px_rgba(139,92,246,0.20)]',
      checkbox: 'accent-violet-500',
    },
    {
      date: 'from-blue-950/95 via-blue-900/35 to-slate-950',
      iconBox: 'bg-blue-500/15 text-blue-300 shadow-blue-500/20',
      topLine: 'from-blue-500/0 via-blue-400/40 to-blue-500/0',
      glow: 'bg-blue-500/20',
      hoverShadow: 'hover:shadow-[0_0_34px_rgba(59,130,246,0.20)]',
      checkbox: 'accent-blue-500',
    },
    {
      date: 'from-cyan-950/95 via-cyan-900/35 to-slate-950',
      iconBox: 'bg-cyan-500/15 text-cyan-300 shadow-cyan-500/20',
      topLine: 'from-cyan-500/0 via-cyan-400/40 to-cyan-500/0',
      glow: 'bg-cyan-500/20',
      hoverShadow: 'hover:shadow-[0_0_34px_rgba(6,182,212,0.20)]',
      checkbox: 'accent-cyan-500',
    },
  ];

  return accents[index % accents.length];
}

function getDaysAgoFromLatest(date, latestTime) {
  const parsed = new Date(date).getTime();

  if (!latestTime || Number.isNaN(parsed)) return 0;

  const diff = latestTime - parsed;

  return diff / (1000 * 60 * 60 * 24);
}

function buildLinePoints(values, maxValue, width = 260, top = 8, bottom = 50) {
  const safeValues = values.length ? values : [0];
  const max = Math.max(Number(maxValue) || 0, 1);
  const height = bottom - top;

  return safeValues
    .map((value, index) => {
      const x =
        safeValues.length === 1
          ? width / 2
          : (index / (safeValues.length - 1)) * width;
      const y = bottom - ((Number(value) || 0) / max) * height;

      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

/* -------------------- PERIOD SELECT -------------------- */
function PeriodSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);

  const options = [
    { value: 7, label: 'Last 7 Days' },
    { value: 30, label: 'Last 30 Days' },
    { value: 'all', label: 'All Time' },
  ];

  const selected =
    options.find((option) => option.value === value) || options[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2 text-xs font-black text-slate-300 transition hover:border-slate-700 hover:bg-slate-900"
      >
        <CalendarDays size={15} />
        {selected.label}
        <ChevronDown
          size={14}
          className={open ? 'rotate-180 transition' : 'transition'}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-[0_20px_70px_rgba(0,0,0,0.45)]">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`block w-full px-4 py-3 text-left text-xs font-black transition ${
                value === option.value
                  ? 'bg-violet-500/15 text-violet-200'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------- ENEMY PILL -------------------- */
function EnemyPill({ enemy }) {
  return (
    <div className="flex h-7 min-w-[92px] max-w-[155px] items-center justify-between gap-2 rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <span
        title={enemy.name}
        className="truncate text-[12px] font-black text-slate-100"
      >
        {enemy.name}
      </span>

      <span className={`text-[12px] font-black ${numberColor(enemy.kd)}`}>
        {enemy.kd}
      </span>
    </div>
  );
}

/* -------------------- METRIC -------------------- */
function WarMetric({ icon, label, value, valueClass = 'text-slate-100' }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-slate-900/80">
        {icon}
      </div>

      <div className="min-w-0">
        <div className="text-[9px] font-black uppercase tracking-wider text-slate-500">
          {label}
        </div>

        <div className={`text-lg font-black leading-tight ${valueClass}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

/* -------------------- MINI KILLS / DEATHS GRAPH -------------------- */
function KillsDeathsMiniGraph({ row, graphMax, id }) {
  const pointsSource = row.topEnemies.length
    ? row.topEnemies.map((enemy) => ({
        kills: Number(enemy.deaths) || 0,
        deaths: Number(enemy.kills) || 0,
      }))
    : [
        { kills: Number(row.kills) || 0, deaths: Number(row.deaths) || 0 },
        { kills: Number(row.kills) || 0, deaths: Number(row.deaths) || 0 },
      ];

  const killsValues =
    pointsSource.length === 1
      ? [pointsSource[0].kills, pointsSource[0].kills]
      : pointsSource.map((point) => point.kills);

  const deathsValues =
    pointsSource.length === 1
      ? [pointsSource[0].deaths, pointsSource[0].deaths]
      : pointsSource.map((point) => point.deaths);

  const max = Math.max(
    Number(graphMax) || 0,
    ...killsValues,
    ...deathsValues,
    1,
  );

  const killsPoints = buildLinePoints(killsValues, max, 260, 8, 50);
  const deathsPoints = buildLinePoints(deathsValues, max, 260, 8, 50);

  const gradientIdKills = `killsArea-${id}`;
  const gradientIdDeaths = `deathsArea-${id}`;

  return (
    <div className="hidden min-w-[300px] max-w-[320px] rounded-xl border border-slate-800 bg-slate-950/55 px-3 py-1.5 xl:block">
      <svg viewBox="0 0 260 56" className="h-[43px] w-full overflow-visible">
        <defs>
          <linearGradient id={gradientIdKills} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(52 211 153)" stopOpacity="0.14" />
            <stop offset="100%" stopColor="rgb(52 211 153)" stopOpacity="0.01" />
          </linearGradient>

          <linearGradient id={gradientIdDeaths} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgb(251 113 133)" stopOpacity="0.14" />
            <stop offset="100%" stopColor="rgb(251 113 133)" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        <line
          x1="0"
          y1="50"
          x2="260"
          y2="50"
          stroke="rgb(51 65 85)"
          strokeWidth="1"
          strokeDasharray="3 4"
          opacity="0.55"
        />

        <polygon
          points={`0,54 ${killsPoints} 260,54`}
          fill={`url(#${gradientIdKills})`}
        />
        <polygon
          points={`0,54 ${deathsPoints} 260,54`}
          fill={`url(#${gradientIdDeaths})`}
        />

        <polyline
          points={killsPoints}
          fill="none"
          stroke="rgb(52 211 153)"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <polyline
          points={deathsPoints}
          fill="none"
          stroke="rgb(251 113 133)"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {killsValues.map((value, index) => {
          const x =
            killsValues.length === 1
              ? 130
              : (index / (killsValues.length - 1)) * 260;
          const y = 50 - ((Number(value) || 0) / max) * 42;

          return (
            <circle
              key={`k-${value}-${index}`}
              cx={x}
              cy={y}
              r="2.2"
              fill="rgb(15 23 42)"
              stroke="rgb(52 211 153)"
              strokeWidth="1.8"
            />
          );
        })}

        {deathsValues.map((value, index) => {
          const x =
            deathsValues.length === 1
              ? 130
              : (index / (deathsValues.length - 1)) * 260;
          const y = 50 - ((Number(value) || 0) / max) * 42;

          return (
            <circle
              key={`d-${value}-${index}`}
              cx={x}
              cy={y}
              r="2.2"
              fill="rgb(15 23 42)"
              stroke="rgb(251 113 133)"
              strokeWidth="1.8"
            />
          );
        })}
      </svg>
    </div>
  );
}

/* -------------------- WAR CARD -------------------- */
function WarCard({ row, index, checked, onOpen, onToggle, graphMax }) {
  const accent = accentByIndex(index);
  const date = formatWarDate(row.date);
  const time = formatWarTime(row);
  const kdNumber = Number(row.kd) || 0;

  return (
    <div
      onClick={onOpen}
      className={`group relative grid cursor-pointer overflow-visible rounded-xl border transition duration-200 ${
        checked
          ? 'border-violet-400/60 bg-slate-950 shadow-[0_0_34px_rgba(139,92,246,0.26)]'
          : `border-slate-800/90 bg-slate-950 hover:-translate-y-[1px] hover:border-slate-600 ${accent.hoverShadow}`
      } lg:grid-cols-[118px_1fr]`}
    >
      <div
        className={`pointer-events-none absolute -inset-[2px] -z-10 rounded-xl ${accent.glow} opacity-0 blur-xl transition duration-200 group-hover:opacity-100`}
      />

      <div
        className={`relative flex min-h-[94px] flex-col justify-between overflow-hidden rounded-l-xl bg-gradient-to-br ${accent.date} p-3`}
      >
        <div>
          <div
            className={`mb-2 grid h-7 w-7 place-items-center rounded-lg ${accent.iconBox}`}
          >
            <CalendarDays size={15} />
          </div>

          <div
            title={date.weekday}
            className="max-w-[92px] truncate text-[12px] font-black leading-tight text-white"
          >
            {date.weekday},
          </div>

          <div className="mt-0.5 text-[14px] font-black leading-tight text-white">
            {date.full}
          </div>
        </div>

        {time && (
          <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-slate-400">
            <span className="h-2.5 w-2.5 rounded-full border border-slate-500" />
            {time}
          </div>
        )}
      </div>

      <div className="relative min-w-0 overflow-hidden rounded-r-xl p-3">
        <div
          className={`pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r ${accent.topLine} opacity-70`}
        />

        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="grid min-w-0 gap-3 xl:grid-cols-[140px_minmax(250px,1fr)_320px]">
              <div>
                <div className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-500">
                  Kills/Deaths Ratio
                </div>

                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-sm font-black ${badgeColor(
                    row.kd,
                  )}`}
                >
                  {row.kd}
                </span>
              </div>

              <div className="min-w-0">
                <div className="mb-1 text-[9px] font-black uppercase tracking-widest text-slate-500">
                  Top 5 Enemies
                </div>

                <div className="flex min-w-0 flex-wrap gap-1.5 xl:flex-nowrap xl:overflow-hidden">
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

              <KillsDeathsMiniGraph
                row={row}
                graphMax={graphMax}
                id={`${row.id}-${index}`}
              />
            </div>

            <div className="mt-2.5 h-px bg-slate-800/80" />

            <div className="mt-2.5 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
              <WarMetric
                label="Players"
                value={row.players}
                icon={<Users size={17} className="text-indigo-300" />}
              />

              <WarMetric
                label="Kills"
                value={row.kills}
                valueClass="text-emerald-400"
                icon={<Swords size={17} className="text-emerald-300" />}
              />

              <WarMetric
                label="Deaths"
                value={row.deaths}
                valueClass="text-rose-400"
                icon={<Skull size={17} className="text-rose-300" />}
              />

              <WarMetric
                label="K/D"
                value={row.kd}
                valueClass={kdNumber >= 1 ? 'text-emerald-400' : 'text-rose-400'}
                icon={<Crosshair size={17} className="text-lime-300" />}
              />
            </div>
          </div>

          <div
            className="mt-[28px] flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/70 transition group-hover:border-slate-700"
            onClick={(event) => event.stopPropagation()}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => {
                event.stopPropagation();
                onToggle();
              }}
              className={`h-[18px] w-[18px] cursor-pointer ${accent.checkbox}`}
              title={checked ? 'Deselect this war' : 'Select this war'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* -------------------- SUMMARY CARD -------------------- */
function SummaryStat({
  icon,
  label,
  value,
  valueClass = 'text-slate-100',
  barClass = 'bg-slate-100',
}) {
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

        <div className={`mt-1 h-[2px] w-10 rounded-full ${barClass}`} />
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
  const [periodDays, setPeriodDays] = useState(7);
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

  const allRows = useMemo(() => {
    return logs.map((log) => {
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
    });
  }, [logs]);

  const latestWarTime = useMemo(() => {
    const times = allRows
      .map((row) => new Date(row.date).getTime())
      .filter((time) => !Number.isNaN(time));

    return times.length ? Math.max(...times) : 0;
  }, [allRows]);

  const rows = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    const filtered = allRows
      .filter((row) => {
        if (periodDays === 'all') return true;

        const daysAgo = getDaysAgoFromLatest(row.date, latestWarTime);

        return daysAgo >= 0 && daysAgo < periodDays;
      })
      .filter((row) => {
        if (!cleanQuery) return true;

        return row.topEnemies.some((guild) =>
          guild.name.toLowerCase().includes(cleanQuery),
        );
      });

    return filtered.sort((a, b) => {
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
  }, [allRows, latestWarTime, periodDays, query, sort]);

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

  const graphMax = useMemo(() => {
    return Math.max(
      ...rows.flatMap((row) => [
        Number(row.kills) || 0,
        Number(row.deaths) || 0,
        ...row.topEnemies.flatMap((enemy) => [
          Number(enemy.kills) || 0,
          Number(enemy.deaths) || 0,
        ]),
      ]),
      1,
    );
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
        {/* FILTER PANEL */}
        <div className="rounded-xl border border-slate-800 bg-slate-950/95 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
          <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
            <div>
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
              <SortHeader id="kd" label="K/D" sort={sort} onSort={toggleSort} />
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

              {query.trim() && (
                <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 text-cyan-200">
                  Search: {query.trim()}
                </span>
              )}
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

              <PeriodSelect value={periodDays} onChange={setPeriodDays} />
            </div>
          </div>
        </div>

        {/* WARNING */}
        {warning && (
          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-200">
            {warning}
          </div>
        )}

        {/* SUMMARY */}
        <div className="grid overflow-hidden rounded-xl border border-slate-800/90 bg-slate-950 shadow-[0_18px_70px_rgba(0,0,0,0.30)] md:grid-cols-[repeat(4,minmax(130px,1fr))_minmax(220px,1.25fr)]">
          <SummaryStat
            label="Total Matches"
            value={totals.matches}
            valueClass="text-violet-400"
            barClass="bg-violet-400"
            icon={<Swords size={20} className="text-violet-300" />}
          />

          <SummaryStat
            label="Total Kills"
            value={totals.kills.toLocaleString('en-US')}
            valueClass="text-emerald-400"
            barClass="bg-emerald-400"
            icon={<Crosshair size={20} className="text-emerald-300" />}
          />

          <SummaryStat
            label="Total Deaths"
            value={totals.deaths.toLocaleString('en-US')}
            valueClass="text-rose-400"
            barClass="bg-rose-400"
            icon={<Skull size={20} className="text-rose-300" />}
          />

          <SummaryStat
            label="Overall K/D"
            value={totals.kd}
            valueClass={
              Number(totals.kd) >= 1 ? 'text-emerald-400' : 'text-rose-400'
            }
            barClass={
              Number(totals.kd) >= 1 ? 'bg-emerald-400' : 'bg-rose-400'
            }
            icon={<Activity size={20} className="text-cyan-300" />}
          />

          <Sparkline rows={rows} />
        </div>

        {/* LIST */}
        <div
          className={`max-h-[calc(100vh-330px)] space-y-2 overflow-auto px-1 py-1 ${scrollCls}`}
        >
          {!rows.length ? (
            <div className="rounded-xl border border-slate-800 bg-slate-950 px-4 py-12 text-center text-sm font-bold text-slate-500">
              No saved node wars found for this filter.
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
                  graphMax={graphMax}
                  onOpen={() => openWar(row)}
                  onToggle={() => toggleWar(row)}
                />
              );
            })
          )}
        </div>
      </div>
    </Panel>
  );
}
