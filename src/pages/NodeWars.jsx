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
      className={`text-xs font-bold uppercase tracking-wider transition ${
        active ? 'text-blue-300' : 'text-slate-500 hover:text-slate-300'
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
      <div className="text-[11px] uppercase text-slate-500">{label}</div>
      <div className={`text-lg font-black ${color}`}>{value}</div>
    </div>
  );
}

/* -------------------- CARD -------------------- */
function WarCard({ row, checked, onClick, onToggle }) {
  return (
    <div
      onClick={onClick}
      className="group flex cursor-pointer items-center justify-between gap-6 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 to-slate-900 p-5 transition hover:border-blue-400/40 hover:shadow-lg hover:shadow-blue-500/10"
    >
      {/* DATE */}
      <div className="w-[120px]">
        <div className="text-sm font-bold text-slate-200">
          {new Date(row.date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
          })}
        </div>
        <div className="text-xs text-slate-500">
          {new Date(row.date).toLocaleDateString('en-GB', {
            weekday: 'short',
          })}
        </div>
      </div>

      {/* GUILD */}
      <div className="flex items-center gap-3">
        <span className="font-semibold text-slate-200">Adversary</span>
        <span
          className={`text-sm font-bold ${
            Number(row.kd) >= 2
              ? 'text-emerald-400'
              : Number(row.kd) >= 1
              ? 'text-yellow-300'
              : 'text-rose-400'
          }`}
        >
          ● {row.kd}
        </span>
      </div>

      {/* ENEMIES */}
      <div className="flex flex-1 gap-2 overflow-hidden text-xs text-slate-400">
        {row.topEnemies.map((g) => (
          <span key={g.name} className="truncate">
            {g.name}{' '}
            <b className={Number(g.kd) >= 1 ? 'text-emerald-400' : 'text-rose-400'}>
              {g.kd}
            </b>
          </span>
        ))}
      </div>

      {/* STATS */}
      <div className="flex items-center gap-8">
        <Stat label="Players" value={row.players} />
        <Stat label="Kills" value={row.kills} color="text-blue-400" />
        <Stat label="Deaths" value={row.deaths} color="text-rose-400" />
        <Stat
          label="K/D"
          value={row.kd}
          color={Number(row.kd) >= 1 ? 'text-emerald-400' : 'text-rose-400'}
        />
      </div>

      {/* SELECT */}
      <div onClick={(e) => e.stopPropagation()}>
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="h-5 w-5 accent-blue-500"
        />
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
  const [sort, setSort] = useState({ key: 'time', dir: 'desc' });

  function toggleSort(key) {
    setSort((cur) => ({
      key,
      dir: cur.key === key && cur.dir === 'desc' ? 'asc' : 'desc',
    }));
  }

  const rows = useMemo(() => {
    const mapped = logs
      .map((log) => {
        const stats = calculateStats([{ ...log, date: dateOf(log) }]);

        const topEnemies = [...stats.guilds]
          .map((g) => ({
            name: g.name,
            kills: g.deaths,
            deaths: g.kills,
            total: g.kills + g.deaths,
            kd: g.kills ? (g.deaths / g.kills).toFixed(2) : '0.00',
          }))
          .sort((a, b) => b.total - a.total)
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
      .filter((r) => {
        if (!query.trim()) return true;

        return r.topEnemies.some((g) =>
          g.name.toLowerCase().includes(query.toLowerCase()),
        );
      });

    return mapped.sort((a, b) => {
      let av = 0;
      let bv = 0;

      if (sort.key === 'time') {
        av = new Date(a.date).getTime();
        bv = new Date(b.date).getTime();
      }

      if (sort.key === 'kills') {
        av = a.kills;
        bv = b.kills;
      }

      if (sort.key === 'deaths') {
        av = a.deaths;
        bv = b.deaths;
      }

      if (sort.key === 'kd') {
        av = a.kdNumber;
        bv = b.kdNumber;
      }

      return sort.dir === 'asc' ? av - bv : bv - av;
    });
  }, [logs, query, sort]);

  const selectedRealWars = selectedWars.filter(
    (id) => id !== 'all' && id !== 'current',
  );

  return (
    <Panel>
      {/* HEADER */}
      <div className="mb-6 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-2xl font-black text-white">Node Wars</h2>
          <p className="text-sm text-slate-400">
            Modern match history overview
          </p>
        </div>

        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setWarning('');
          }}
          placeholder="Search enemies..."
          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm text-white outline-none focus:border-blue-400 sm:w-80"
        />
      </div>

      {/* SORT */}
      <div className="mb-4 flex flex-wrap items-center gap-4 border-b border-slate-800 pb-4">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
          Sort by
        </span>

        <SortHeader id="time" label="Time" sort={sort} onSort={toggleSort} />
        <SortHeader id="kills" label="Kills" sort={sort} onSort={toggleSort} />
        <SortHeader id="deaths" label="Deaths" sort={sort} onSort={toggleSort} />
        <SortHeader id="kd" label="K/D" sort={sort} onSort={toggleSort} />
      </div>

      {/* WARNING */}
      {warning && (
        <div className="mb-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm font-semibold text-amber-200">
          {warning}
        </div>
      )}

      {/* LIST */}
      <div className="space-y-3">
        {rows.map((row) => {
          const id = String(row.id);
          const checked = selectedRealWars.includes(id);

          return (
            <WarCard
              key={row.id}
              row={row}
              checked={checked}
              onClick={() => {
                setSelectedDays([row.date]);
                setSelectedWars([id]);
                setPage('overview');
              }}
              onToggle={(e) => {
                e.stopPropagation();
                setSelectedDays(['all']);

                setSelectedWars((prev) =>
                  e.target.checked
                    ? [...prev.filter((x) => x !== 'all' && x !== 'current'), id]
                    : prev.filter((x) => x !== id),
                );
              }}
            />
          );
        })}
      </div>
    </Panel>
  );
}
