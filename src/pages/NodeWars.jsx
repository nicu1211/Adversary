import React, { useMemo, useState } from 'react';

import {
  Activity,
  CalendarDays,
  ChevronDown,
  Crosshair,
  Search,
  Skull,
  Swords,
  Users,
} from 'lucide-react';

import { Panel } from '../components/UI';
import { buildNodeWarRow } from '../lib/logUtils';

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
    },
    {
      date: 'from-blue-950/95 via-blue-900/35 to-slate-950',
      iconBox: 'bg-blue-500/15 text-blue-300 shadow-blue-500/20',
      topLine: 'from-blue-500/0 via-blue-400/40 to-blue-500/0',
      glow: 'bg-blue-500/20',
      hoverShadow: 'hover:shadow-[0_0_34px_rgba(59,130,246,0.20)]',
    },
    {
      date: 'from-cyan-950/95 via-cyan-900/35 to-slate-950',
      iconBox: 'bg-cyan-500/15 text-cyan-300 shadow-cyan-500/20',
      topLine: 'from-cyan-500/0 via-cyan-400/40 to-cyan-500/0',
      glow: 'bg-cyan-500/20',
      hoverShadow: 'hover:shadow-[0_0_34px_rgba(6,182,212,0.20)]',
    },
  ];

  return accents[index % accents.length];
}

function PeriodSelect({ value, onChange, loading }) {
  const [open, setOpen] = useState(false);

  const options = [
    { value: 7, label: 'Last 7 Days' },
    { value: 30, label: 'Last 30 Days' },
    { value: 'all', label: 'All Time' },
  ];

  const selected = options.find((option) => option.value === value) || options[0];

  return (
    <div className="relative">
      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2 text-xs font-black text-slate-300 transition hover:border-slate-700 hover:bg-slate-900 disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? 'Loading...' : selected.label}
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
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

function EnemySearch({ value, onChange, suggestions, onPick }) {
  const [open, setOpen] = useState(false);
  const showSuggestions = open && value.trim() && suggestions.length > 0;

  return (
    <div className="relative w-full">
      <Search
        size={18}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
      />

      <input
        value={value}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 120);
        }}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        placeholder="Search enemies..."
        className="w-full rounded-xl border border-slate-800 bg-slate-950 py-3 pl-11 pr-4 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400 focus:bg-slate-900"
      />

      {showSuggestions && (
        <div className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-800 bg-slate-950 shadow-2xl">
          {suggestions.map((enemy) => (
            <button
              key={enemy}
              type="button"
              onMouseDown={(event) => {
                event.preventDefault();
                onPick(enemy);
                setOpen(false);
              }}
              className="flex w-full items-center justify-between gap-3 border-b border-slate-900 px-4 py-3 text-left text-sm font-black text-slate-300 transition last:border-b-0 hover:bg-violet-500/10 hover:text-white"
            >
              <span>{enemy}</span>
              <span className="text-xs text-slate-600">Enemy</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function EnemyPill({ enemy }) {
  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-black ${badgeColor(
        enemy.kd,
      )}`}
      title={`${enemy.name} · Kills: ${enemy.kills} · Deaths: ${enemy.deaths}`}
    >
      <span className="truncate">{enemy.name}</span>
      <span>{enemy.kd}</span>
    </div>
  );
}

function WarMetric({ icon, label, value, valueClass = 'text-slate-100' }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
        {icon}
        {label}
      </div>
      <div className={`text-2xl font-black ${valueClass}`}>{value}</div>
    </div>
  );
}

function WarCard({ row, index, checked, onOpen, onToggle }) {
  const accent = accentByIndex(index);
  const date = formatWarDate(row.date);
  const time = formatWarTime(row);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          onOpen();
        }
      }}
      className={`group relative cursor-pointer overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 p-4 shadow-xl transition hover:-translate-y-0.5 hover:border-violet-400/30 ${accent.hoverShadow}`}
    >
      <div
        className={`pointer-events-none absolute left-0 right-0 top-0 h-px bg-gradient-to-r ${accent.topLine}`}
      />

      <div
        className={`pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full blur-3xl ${accent.glow}`}
      />

      <div className="relative z-10 grid gap-4 xl:grid-cols-[220px_1fr_140px]">
        <div className={`rounded-2xl bg-gradient-to-br p-4 ${accent.date}`}>
          <div className="mb-3 flex items-center gap-3">
            <div className={`rounded-2xl p-3 shadow-lg ${accent.iconBox}`}>
              <CalendarDays size={22} />
            </div>

            <div className="min-w-0">
              <div className="truncate text-lg font-black text-white">
                {date.weekday}
              </div>
              <div className="text-sm font-bold text-slate-400">
                {date.full}
              </div>
            </div>
          </div>

          {time && (
            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-black text-slate-300">
              {time}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-xl font-black text-white">
                {row.name || 'Battle log'}
              </h3>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Kills/Deaths Ratio
              </p>
            </div>

            <div className={`text-3xl font-black ${numberColor(row.kd)}`}>
              {row.kd}
            </div>
          </div>

          <div className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
            Top 5 Enemies
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {row.topEnemies.length ? (
              row.topEnemies.map((enemy) => (
                <EnemyPill key={enemy.name} enemy={enemy} />
              ))
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs font-bold text-slate-500">
                No enemies detected
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 xl:grid-cols-1">
          <WarMetric
            label="Players"
            value={row.players}
            icon={<Users size={14} />}
          />

          <WarMetric
            label="Kills"
            value={row.kills}
            valueClass="text-blue-300"
            icon={<Crosshair size={14} />}
          />

          <WarMetric
            label="Deaths"
            value={row.deaths}
            valueClass="text-rose-300"
            icon={<Skull size={14} />}
          />
        </div>
      </div>

      <div className="relative z-10 mt-4 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onToggle();
          }}
          className={`rounded-xl border px-4 py-2 text-xs font-black transition ${
            checked
              ? 'border-white bg-white text-slate-950'
              : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-white hover:text-white'
          }`}
        >
          {checked ? 'Selected' : 'Select'}
        </button>

        <input
          checked={checked}
          type="checkbox"
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            event.stopPropagation();
            onToggle();
          }}
          className="h-[18px] w-[18px] cursor-pointer"
          style={{ accentColor: '#ffffff' }}
          title={checked ? 'Deselect this war' : 'Select this war'}
        />
      </div>
    </div>
  );
}

function SummaryStat({
  icon,
  label,
  value,
  valueClass = 'text-slate-100',
  barClass = 'bg-slate-100',
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
      <div className={`mb-4 h-1 w-16 rounded-full ${barClass}`} />
      <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
        {icon}
        {label}
      </div>
      <div className={`text-3xl font-black ${valueClass}`}>{value}</div>
    </div>
  );
}

function KillsDeathsTrend({ rows }) {
  const orderedRows = [...rows].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const killsValues = orderedRows.map((row) => Number(row.kills) || 0);
  const deathsValues = orderedRows.map((row) => Number(row.deaths) || 0);

  const safeKills = killsValues.length ? killsValues : [0];
  const safeDeaths = deathsValues.length ? deathsValues : [0];

  const max = Math.max(...safeKills, ...safeDeaths, 1);

  const width = 220;
  const top = 8;
  const bottom = 42;
  const height = bottom - top;

  function buildPoints(values) {
    return values
      .map((value, index) => {
        const x =
          values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
        const y = bottom - ((Number(value) || 0) / max) * height;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(' ');
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-black uppercase tracking-wider text-slate-500">
          Kills / Deaths Trend
        </div>

        <Activity size={16} className="text-slate-500" />
      </div>

      <svg viewBox={`0 0 ${width} 50`} className="h-20 w-full overflow-visible">
        <polyline
          points={buildPoints(safeKills)}
          fill="none"
          stroke="rgb(96 165 250)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <polyline
          points={buildPoints(safeDeaths)}
          fill="none"
          stroke="rgb(251 113 133)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="mt-2 flex items-center gap-4 text-xs font-black text-slate-500">
        <span className="text-blue-300">Kills</span>
        <span className="text-rose-300">Deaths</span>
      </div>
    </div>
  );
}

export default function NodeWars({
  logs,
  loading = false,
  periodDays = 7,
  onPeriodChange = () => {},
  setPage,
  setSelectedDays,
  setSelectedWars,
  selectedWars,
  externalWarning = '',
  clearExternalWarning = () => {},
}) {
  const [query, setQuery] = useState('');
  const [warning, setWarning] = useState('');
  const [sort, setSort] = useState({
    key: 'time',
    dir: 'desc',
  });

  function clearWarnings() {
    setWarning('');
    clearExternalWarning();
  }

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
    return logs.map(buildNodeWarRow);
  }, [logs]);

  const enemySuggestions = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    if (!cleanQuery) return [];

    const names = new Map();

    allRows.forEach((row) => {
      row.allEnemyNames.forEach((name) => {
        const lower = name.toLowerCase();

        if (lower.includes(cleanQuery)) {
          names.set(lower, name);
        }
      });
    });

    return [...names.values()]
      .sort((a, b) => {
        const al = a.toLowerCase();
        const bl = b.toLowerCase();

        const aStarts = al.startsWith(cleanQuery);
        const bStarts = bl.startsWith(cleanQuery);

        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        return a.localeCompare(b);
      })
      .slice(0, 10);
  }, [allRows, query]);

  const rows = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();

    const filtered = allRows.filter((row) => {
      if (!cleanQuery) return true;

      return row.allEnemyNames.some((name) =>
        name.toLowerCase().includes(cleanQuery),
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
  }, [allRows, query, sort]);

  const visibleIds = rows.map((row) => String(row.id));

  const selectedRealWars = selectedWars.filter(
    (id) => id !== 'all' && id !== 'current',
  );

  const hasAnySelection = selectedRealWars.length > 0;

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
    clearWarnings();
    setSelectedDays([row.date]);
    setSelectedWars([String(row.id)]);
    setPage('overview');
  }

  function toggleWar(row) {
    const id = String(row.id);

    clearWarnings();
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
    clearWarnings();

    if (hasAnySelection) {
      setSelectedDays(['all']);
      setSelectedWars([]);
      return;
    }

    if (!visibleIds.length) {
      setSelectedDays(['all']);
      setSelectedWars([]);
      setWarning('No saved node wars found for this search.');
      return;
    }

    setSelectedDays(['all']);
    setSelectedWars(visibleIds);
  }

  function openSelectedOverview() {
    if (selectedRealWars.length === 0) {
      clearExternalWarning();
      setWarning('No node war selected. Select at least one war first.');
      return;
    }

    clearWarnings();
    setSelectedDays(['all']);
    setPage('overview');
  }

  return (
    <div className="space-y-5">
      <Panel>
        <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">Node Wars</h2>
            <p className="text-sm font-bold text-slate-500">
              Match history, quick selection and enemy search.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <PeriodSelect
              value={periodDays}
              onChange={onPeriodChange}
              loading={loading}
            />

            <SortHeader id="time" label="Time" sort={sort} onSort={toggleSort} />
            <SortHeader id="kills" label="Kills" sort={sort} onSort={toggleSort} />
            <SortHeader
              id="deaths"
              label="Deaths"
              sort={sort}
              onSort={toggleSort}
            />
            <SortHeader id="kd" label="K/D" sort={sort} onSort={toggleSort} />
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[1fr_auto] xl:items-center">
          <EnemySearch
            value={query}
            suggestions={enemySuggestions}
            onChange={(value) => {
              setQuery(value);
              clearWarnings();
            }}
            onPick={(enemy) => {
              setQuery(enemy);
              clearWarnings();
            }}
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={selectDisplayedLogs}
              className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-xs font-black text-slate-200 transition hover:border-white hover:text-white"
            >
              {hasAnySelection ? 'Clear selection' : 'Select displayed'}
            </button>

            <button
              type="button"
              onClick={openSelectedOverview}
              className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-black text-white transition hover:bg-blue-500"
            >
              Open overview
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-black text-slate-500">
          <span>Displayed: {rows.length}</span>
          <span>Selected: {selectedVisibleCount}</span>
          {query.trim() && <span>Search: {query.trim()}</span>}
          {loading && <span className="text-blue-300">Loading database...</span>}
        </div>
      </Panel>

      {(warning || externalWarning) && (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4 text-sm font-bold text-amber-200">
          {warning || externalWarning}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryStat
          label="Matches"
          value={totals.matches}
          barClass="bg-violet-400"
          icon={<Swords size={16} />}
        />

        <SummaryStat
          label="Kills"
          value={totals.kills}
          valueClass="text-blue-300"
          barClass="bg-blue-400"
          icon={<Crosshair size={16} />}
        />

        <SummaryStat
          label="Deaths"
          value={totals.deaths}
          valueClass="text-rose-300"
          barClass="bg-rose-400"
          icon={<Skull size={16} />}
        />

        <SummaryStat
          label="K/D"
          value={totals.kd}
          valueClass={
            Number(totals.kd) >= 1 ? 'text-emerald-400' : 'text-rose-400'
          }
          barClass={Number(totals.kd) >= 1 ? 'bg-emerald-400' : 'bg-rose-400'}
          icon={<Activity size={16} />}
        />

        <KillsDeathsTrend rows={rows} />
      </div>

      <div className="space-y-4">
        {loading && !rows.length ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center text-sm font-bold text-slate-400">
            Loading node wars...
          </div>
        ) : !rows.length ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center text-sm font-bold text-slate-400">
            No saved node wars found for this filter.
          </div>
        ) : (
          rows.map((row, index) => {
            const id = String(row.id);
            const checked = selectedRealWars.includes(id);

            return (
              <WarCard
                key={id}
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
    </div>
  );
}
