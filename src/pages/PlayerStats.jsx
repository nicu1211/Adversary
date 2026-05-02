import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Line,
} from 'recharts';
import { Panel, Metric } from '../components/UI';
import { add, scrollCls } from '../lib/logUtils';

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function orderEvents(events = []) {
  return [...events].sort((a, b) => {
    if (a.date !== b.date) return String(a.date).localeCompare(String(b.date));
    if ((a.sec || 0) !== (b.sec || 0)) return (a.sec || 0) - (b.sec || 0);
    return (a.i || 0) - (b.i || 0);
  });
}

function groupByWar(events = []) {
  const map = {};

  orderEvents(events).forEach((event) => {
    const key = String(event.id ?? `${event.date}-${event.war || 'war'}`);
    if (!map[key]) {
      map[key] = {
        id: key,
        date: event.date,
        war: event.war || 'Node War',
        events: [],
      };
    }
    map[key].events.push(event);
  });

  return Object.values(map).sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function getPlayerKillfeed(events, playerName, windowSeconds = 10) {
  const kills = orderEvents(events).filter(
    (event) => event.type === 'kill' && event.killer === playerName,
  );

  if (!kills.length) return 0;

  let left = 0;
  let best = 0;

  for (let right = 0; right < kills.length; right += 1) {
    while ((kills[right].sec || 0) - (kills[left].sec || 0) > windowSeconds) left += 1;
    best = Math.max(best, right - left + 1);
  }

  return best;
}

function getPlayerKillstreak(events, playerName) {
  let current = 0;
  let best = 0;

  orderEvents(events).forEach((event) => {
    if (event.type === 'kill' && event.killer === playerName) {
      current += 1;
      best = Math.max(best, current);
    }

    if (event.type === 'death' && event.victim === playerName) {
      current = 0;
    }
  });

  return best;
}

function buildRanks(rows, compareFn, rankKeyFn) {
  const sorted = [...rows].sort(compareFn);
  const ranks = {};
  let previousKey = null;
  let currentRank = 0;

  sorted.forEach((row, index) => {
    const key = rankKeyFn(row);
    if (index === 0 || key !== previousKey) currentRank = index + 1;
    ranks[row.name] = currentRank;
    previousKey = key;
  });

  return ranks;
}

function buildWarRows(events) {
  const sorted = orderEvents(events);
  const kills = {};
  const deaths = {};
  const players = new Set();
  const finalKills = {};
  const progressKills = {};
  const reachKillsAt = {};

  sorted.forEach((event) => {
    players.add(event.killer);
    players.add(event.victim);

    if (event.type === 'kill') {
      add(kills, event.killer);
      add(finalKills, event.killer);
    }

    if (event.type === 'death') {
      add(deaths, event.victim);
    }
  });

  sorted.forEach((event) => {
    if (event.type !== 'kill') return;

    progressKills[event.killer] = (progressKills[event.killer] || 0) + 1;

    if (
      progressKills[event.killer] === finalKills[event.killer] &&
      reachKillsAt[event.killer] == null
    ) {
      reachKillsAt[event.killer] = `${String(event.date)}-${String(event.sec).padStart(
        5,
        '0',
      )}-${String(event.i || 0).padStart(5, '0')}`;
    }
  });

  const rows = [...players]
    .filter(Boolean)
    .map((name) => {
      const playerKills = kills[name] || 0;
      const playerDeaths = deaths[name] || 0;
      const kdValue = playerDeaths ? playerKills / playerDeaths : playerKills;

      return {
        name,
        kills: playerKills,
        deaths: playerDeaths,
        kd: playerDeaths ? (playerKills / playerDeaths).toFixed(2) : playerKills.toFixed(2),
        kdNumber: kdValue,
        streak: getPlayerKillstreak(sorted, name),
        feed: getPlayerKillfeed(sorted, name),
        reachKillsAt: reachKillsAt[name] || '9999-99999-99999',
      };
    });

  const rankKills = buildRanks(
    rows,
    (a, b) =>
      b.kills - a.kills ||
      a.reachKillsAt.localeCompare(b.reachKillsAt) ||
      a.name.localeCompare(b.name),
    (row) => `${row.kills}|${row.reachKillsAt}`,
  );

  const rankDeaths = buildRanks(
    rows,
    (a, b) => a.deaths - b.deaths || a.name.localeCompare(b.name),
    (row) => `${row.deaths}`,
  );

  const rankKd = buildRanks(
    rows,
    (a, b) =>
      b.kdNumber - a.kdNumber || b.kills - a.kills || a.name.localeCompare(b.name),
    (row) => `${row.kdNumber.toFixed(6)}`,
  );

  const rankStreak = buildRanks(
    rows,
    (a, b) => b.streak - a.streak || b.kills - a.kills || a.name.localeCompare(b.name),
    (row) => `${row.streak}`,
  );

  const rankFeed = buildRanks(
    rows,
    (a, b) => b.feed - a.feed || b.kills - a.kills || a.name.localeCompare(b.name),
    (row) => `${row.feed}`,
  );

  return rows.map((row) => ({
    ...row,
    avgRank:
      (rankKills[row.name] +
        rankDeaths[row.name] +
        rankKd[row.name] +
        rankStreak[row.name] +
        rankFeed[row.name]) /
      5,
  }));
}

function formatShortDate(value) {
  if (!value) return '-';
  return String(value);
}

function GlassPlayerSelect({ players, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = players.find((player) => player.name === value);

  const filtered = players.filter((player) =>
    `${player.name} ${player.family || ''}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="relative mb-4 max-w-xl">
      <button
        type="button"
        onClick={() => setOpen((state) => !state)}
        className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl transition hover:border-cyan-300/40 hover:bg-white/10"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">
            Selected Player
          </p>
          <p className="truncate text-sm font-black text-white">
            {selected ? selected.name : 'Select player'}
          </p>
        </div>

        <span
          className={`ml-3 shrink-0 text-slate-400 transition ${
            open ? 'rotate-180' : ''
          }`}
        >
          ⌄
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-2 rounded-2xl border border-white/10 bg-slate-950/90 p-2 shadow-2xl backdrop-blur-2xl">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
            placeholder="Search player..."
            className="mb-2 w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm outline-none focus:border-blue-400"
          />

          <div className={`max-h-64 overflow-y-auto pr-1 ${scrollCls}`}>
            {!filtered.length ? (
              <p className="px-3 py-4 text-sm text-slate-500">No players found.</p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setOpen(false);
                    setQuery('');
                  }}
                  className={`mb-1 w-full rounded-xl px-3 py-2 text-left text-sm font-bold ${
                    !value
                      ? 'bg-blue-500/20 text-blue-100'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  Select player
                </button>

                {filtered.map((player) => (
                  <button
                    key={player.name}
                    type="button"
                    onClick={() => {
                      onChange(player.name);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={`mb-1 w-full rounded-xl px-3 py-2 text-left text-sm font-bold ${
                      value === player.name
                        ? 'bg-blue-500/25 text-blue-100'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate">{player.name}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PerformanceTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  const data = payload.reduce((accumulator, item) => {
    accumulator[item.dataKey] = item.value;
    return accumulator;
  }, {});

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
      <p className="mb-2 text-sm font-black text-white">{label}</p>
      <div className="space-y-1 text-sm">
        <p className="font-bold text-cyan-300">Kills: {data.kills ?? 0}</p>
        <p className="font-bold text-pink-300">Deaths: {data.deaths ?? 0}</p>
        <p className="font-bold text-emerald-300">Avg K/D: {data.avgKd ?? 0}</p>
      </div>
    </div>
  );
}

function PerformanceChart({ data, averages }) {
  return (
    <Panel>
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-3xl font-black leading-none">Performance</h3>
          <p className="mt-2 text-sm text-slate-400">
            Daily performance with kills, deaths and average K/D
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
              Average Kills
            </p>
            <p className="mt-1 text-2xl font-black text-cyan-300">
              {averages.avgKills.toFixed(2)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
              Average Deaths
            </p>
            <p className="mt-1 text-2xl font-black text-pink-300">
              {averages.avgDeaths.toFixed(2)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
              Average K/D
            </p>
            <p className="mt-1 text-2xl font-black text-emerald-300">
              {averages.avgKd.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="h-[360px] rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] p-3">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            barCategoryGap="10%"
            barGap={-18}
            margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
          >
            <CartesianGrid stroke="rgba(148,163,184,.10)" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(148,163,184,.18)' }}
            />
            <YAxis
              yAxisId="left"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(148,163,184,.18)' }}
              allowDecimals={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(148,163,184,.18)' }}
            />
            <Tooltip
              content={<PerformanceTooltip />}
              cursor={{ fill: 'rgba(255,255,255,0.02)' }}
              wrapperStyle={{ outline: 'none' }}
            />

            <Bar
              yAxisId="left"
              dataKey="kills"
              name="Kills"
              radius={[10, 10, 0, 0]}
              fill="url(#killsGradient)"
              maxBarSize={24}
            />
            <Bar
              yAxisId="left"
              dataKey="deaths"
              name="Deaths"
              radius={[10, 10, 0, 0]}
              fill="url(#deathsGradient)"
              maxBarSize={24}
            />
            <Line
              yAxisId="right"
              dataKey="avgKd"
              name="Avg K/D"
              type="monotone"
              stroke="#35e0b1"
              strokeWidth={2}
              dot={{ r: 4, strokeWidth: 2, fill: '#35e0b1' }}
              activeDot={{ r: 5, strokeWidth: 2, fill: '#35e0b1' }}
              fill="rgba(53,224,177,0.18)"
            />

            <defs>
              <linearGradient id="killsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#83e8ff" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#56b8ff" stopOpacity="0.55" />
              </linearGradient>
              <linearGradient id="deathsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffb6ee" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#ff5ec7" stopOpacity="0.55" />
              </linearGradient>
            </defs>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

function SplitTargetsPanel({ victims, killedBy }) {
  const favouriteTargets = Object.entries(victims)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const nemesis = Object.entries(killedBy)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const maxTargets = Math.max(1, ...favouriteTargets.map((item) => item.value));
  const maxNemesis = Math.max(1, ...nemesis.map((item) => item.value));

  return (
    <Panel>
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="mb-4 text-2xl font-black">Favourite Targets</h3>

          {!favouriteTargets.length ? (
            <p className="text-slate-500">No targets yet.</p>
          ) : (
            <div className="space-y-4">
              {favouriteTargets.map((item, index) => (
                <div key={item.name} className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-700/80 text-sm font-black text-white">
                    {index + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="truncate text-lg font-black">{item.name}</p>
                      <p className="shrink-0 text-lg font-black text-white">{item.value}</p>
                    </div>

                    <div className="h-3 rounded-full bg-slate-800/90">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-300"
                        style={{ width: `${Math.max(8, (item.value / maxTargets) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-4 text-2xl font-black">Nemesis</h3>

          {!nemesis.length ? (
            <p className="text-slate-500">No nemesis yet.</p>
          ) : (
            <div className="space-y-4">
              {nemesis.map((item, index) => (
                <div key={item.name} className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-700/80 text-sm font-black text-white">
                    {index + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="truncate text-lg font-black">{item.name}</p>
                      <p className="shrink-0 text-lg font-black text-white">{item.value}</p>
                    </div>

                    <div className="h-3 rounded-full bg-slate-800/90">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-300"
                        style={{ width: `${Math.max(8, (item.value / maxNemesis) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

function SortHead({ label, active, direction, onClick, align = 'text-left' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 font-bold uppercase tracking-wide text-slate-400 transition hover:text-blue-300 ${align}`}
    >
      <span>{label}</span>
      <span className="text-[10px]">{active ? (direction === 'asc' ? '▲' : '▼') : '↕'}</span>
    </button>
  );
}

function EnemyGuildsTable({ rows }) {
  const [sort, setSort] = useState({ key: 'avgKd', dir: 'desc' });

  const setSortKey = (key) => {
    setSort((state) => ({
      key,
      dir: state.key === key && state.dir === 'desc' ? 'asc' : 'desc',
    }));
  };

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      let result = 0;

      if (sort.key === 'name') result = a.name.localeCompare(b.name);
      if (sort.key === 'wars') result = a.wars - b.wars;
      if (sort.key === 'kills') result = a.kills - b.kills;
      if (sort.key === 'deaths') result = a.deaths - b.deaths;
      if (sort.key === 'avgKd') result = a.avgKd - b.avgKd;

      if (result === 0) result = a.name.localeCompare(b.name);
      return sort.dir === 'asc' ? result : -result;
    });
  }, [rows, sort]);

  return (
    <Panel>
      <div className="mb-4">
        <h3 className="text-2xl font-black">Enemy Guilds</h3>
      </div>

      {!sortedRows.length ? (
        <p className="text-slate-500">No enemy guild data for this player.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <div className={`max-h-[460px] overflow-y-auto ${scrollCls}`}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-xl">
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left">
                    <SortHead
                      label="Guild"
                      active={sort.key === 'name'}
                      direction={sort.dir}
                      onClick={() => setSortKey('name')}
                    />
                  </th>
                  <th className="px-3 py-3 text-center">
                    <SortHead
                      label="Wars"
                      active={sort.key === 'wars'}
                      direction={sort.dir}
                      onClick={() => setSortKey('wars')}
                      align="justify-center"
                    />
                  </th>
                  <th className="px-3 py-3 text-center">
                    <SortHead
                      label="K"
                      active={sort.key === 'kills'}
                      direction={sort.dir}
                      onClick={() => setSortKey('kills')}
                      align="justify-center"
                    />
                  </th>
                  <th className="px-3 py-3 text-center">
                    <SortHead
                      label="D"
                      active={sort.key === 'deaths'}
                      direction={sort.dir}
                      onClick={() => setSortKey('deaths')}
                      align="justify-center"
                    />
                  </th>
                  <th className="px-4 py-3 text-center">
                    <SortHead
                      label="Avg K/D"
                      active={sort.key === 'avgKd'}
                      direction={sort.dir}
                      onClick={() => setSortKey('avgKd')}
                      align="justify-center"
                    />
                  </th>
                </tr>
              </thead>

              <tbody>
                {sortedRows.map((row) => (
                  <tr
                    key={row.name}
                    className="border-b border-white/5 bg-transparent transition hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-3">
                      <p className="font-black text-white">{row.name}</p>
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-slate-300">
                      {row.wars}
                    </td>
                    <td className="px-3 py-3 text-center font-black text-cyan-300">
                      {row.kills}
                    </td>
                    <td className="px-3 py-3 text-center font-black text-pink-300">
                      {row.deaths}
                    </td>
                    <td className="px-4 py-3 text-center font-black">
                      <span className="text-cyan-300">{row.avgKills.toFixed(2)}</span>
                      <span className="mx-1 text-slate-500">/</span>
                      <span className="text-pink-300">{row.avgDeaths.toFixed(2)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Panel>
  );
}

function PremiumBarRows({ title, tag, rows, accent = 'cyan' }) {
  const maxValue = Math.max(1, ...rows.map((item) => item.value || 0));

  const accentBar =
    accent === 'gold'
      ? 'from-amber-400 via-yellow-300 to-yellow-200'
      : 'from-emerald-400 via-cyan-300 to-sky-300';

  const tagStyle =
    accent === 'gold'
      ? 'border-amber-400/20 bg-amber-500/10 text-amber-300'
      : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300';

  const valueStyle = accent === 'gold' ? 'text-amber-300' : 'text-emerald-300';

  return (
    <Panel>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-3xl font-black leading-none">{title}</h3>
        </div>

        <span className={`rounded-full border px-3 py-1 text-xs font-black ${tagStyle}`}>
          Top {rows.length}
        </span>
      </div>

      {!rows.length ? (
        <p className="text-slate-500">No data yet.</p>
      ) : (
        <div className="space-y-4">
          {rows.map((item, index) => (
            <div
              key={`${item.label}-${item.subLabel}-${index}`}
              className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] px-4 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl"
            >
              <div className="mb-3 flex items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-sm font-black text-slate-300">
                  {index + 1}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-2xl font-black leading-none text-white">
                      {item.label}
                    </p>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${tagStyle}`}
                    >
                      {tag}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{item.subLabel}</p>
                </div>

                <div className={`shrink-0 text-4xl font-black leading-none ${valueStyle}`}>
                  {item.value}
                </div>
              </div>

              <div className="h-2.5 rounded-full bg-slate-800/90">
                <div
                  className={`h-2.5 rounded-full bg-gradient-to-r ${accentBar}`}
                  style={{ width: `${Math.max(8, ((item.value || 0) / maxValue) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

export default function PlayerStats({ stats, allTimeStats }) {
  const [player, setPlayer] = useState('');

  const sourceStats = allTimeStats || stats;

  const selectedStats = useMemo(() => {
    if (!player || !sourceStats?.ev?.length) return null;

    const victims = {};
    const killedBy = {};
    const guildMap = {};
    const playedWarIds = new Set();
    const dayMap = {};
    const warGroups = groupByWar(sourceStats.ev);

    sourceStats.ev.forEach((event) => {
      const involved = event.killer === player || event.victim === player;
      if (!involved) return;

      const dayKey = String(event.date);
      if (!dayMap[dayKey]) {
        dayMap[dayKey] = {
          time: dayKey,
          kills: 0,
          deaths: 0,
          wars: new Set(),
        };
      }

      dayMap[dayKey].wars.add(String(event.id ?? `${event.date}-${event.war || 'war'}`));
      playedWarIds.add(String(event.id ?? `${event.date}-${event.war || 'war'}`));

      if (event.killer === player) {
        add(victims, event.victim);
        dayMap[dayKey].kills += 1;

        if (!guildMap[event.guild]) {
          guildMap[event.guild] = {
            name: event.guild,
            kills: 0,
            deaths: 0,
            wars: new Set(),
          };
        }
        guildMap[event.guild].kills += 1;
        guildMap[event.guild].wars.add(String(event.id ?? `${event.date}-${event.war || 'war'}`));
      }

      if (event.victim === player) {
        add(killedBy, event.killer);
        dayMap[dayKey].deaths += 1;

        if (!guildMap[event.guild]) {
          guildMap[event.guild] = {
            name: event.guild,
            kills: 0,
            deaths: 0,
            wars: new Set(),
          };
        }
        guildMap[event.guild].deaths += 1;
        guildMap[event.guild].wars.add(String(event.id ?? `${event.date}-${event.war || 'war'}`));
      }
    });

    const playedWars = warGroups
      .map((war) => {
        const playerEvents = war.events.filter(
          (event) => event.killer === player || event.victim === player,
        );

        if (!playerEvents.length) return null;

        const kills = playerEvents.filter(
          (event) => event.type === 'kill' && event.killer === player,
        ).length;

        const deaths = playerEvents.filter(
          (event) => event.type === 'death' && event.victim === player,
        ).length;

        const warRows = buildWarRows(war.events);
        const warRow = warRows.find((row) => row.name === player);

        return {
          id: war.id,
          date: war.date,
          war: war.war,
          kills,
          deaths,
          kd: deaths ? kills / deaths : kills,
          streak: getPlayerKillstreak(war.events, player),
          feed: getPlayerKillfeed(war.events, player),
          avgRank: warRow ? warRow.avgRank : 0,
        };
      })
      .filter(Boolean);

    const playerRow =
      sourceStats.players.find((item) => item.name === player) || {
        kills: 0,
        deaths: 0,
        kd: '0.00',
      };

    const orderedDays = Object.values(dayMap).sort((a, b) => a.time.localeCompare(b.time));

    const performanceData = orderedDays.map((day) => {
      const warCount = Math.max(1, day.wars.size);
      const avgKd = day.deaths ? day.kills / day.deaths : day.kills;

      return {
        time: day.time,
        kills: day.kills,
        deaths: day.deaths,
        avgKd: Number(avgKd.toFixed(2)),
        warCount,
      };
    });

    const totalKills = playedWars.reduce((sum, war) => sum + war.kills, 0);
    const totalDeaths = playedWars.reduce((sum, war) => sum + war.deaths, 0);
    const warCount = playedWars.length;

    const averages = {
      avgKills: warCount ? totalKills / warCount : 0,
      avgDeaths: warCount ? totalDeaths / warCount : 0,
      avgKd: totalDeaths ? totalKills / totalDeaths : totalKills,
    };

    const averageRank = playedWars.length
      ? playedWars.reduce((sum, war) => sum + (war.avgRank || 0), 0) / playedWars.length
      : 0;

    const enemyGuildRows = Object.values(guildMap)
      .map((guild) => {
        const wars = guild.wars.size || 1;
        const avgKills = guild.kills / wars;
        const avgDeaths = guild.deaths / wars;
        const avgKd = avgDeaths ? avgKills / avgDeaths : avgKills;

        return {
          name: guild.name,
          wars,
          kills: guild.kills,
          deaths: guild.deaths,
          avgKills,
          avgDeaths,
          avgKd,
        };
      })
      .sort((a, b) => b.avgKd - a.avgKd || b.kills - a.kills);

    const streakRows = [...playedWars]
      .sort((a, b) => b.streak - a.streak || String(b.date).localeCompare(String(a.date)))
      .slice(0, 6)
      .map((war) => ({
        label: formatShortDate(war.date),
        subLabel: war.date,
        value: war.streak,
      }));

    const feedRows = [...playedWars]
      .sort((a, b) => b.feed - a.feed || String(b.date).localeCompare(String(a.date)))
      .slice(0, 6)
      .map((war) => ({
        label: formatShortDate(war.date),
        subLabel: war.date,
        value: war.feed,
      }));

    return {
      ...playerRow,
      victims,
      killedBy,
      performanceData,
      averages,
      averageRank,
      warCount,
      enemyGuildRows,
      streakRows,
      feedRows,
    };
  }, [player, sourceStats]);

  return (
    <Panel>
      <h2 className="mb-4 text-2xl font-black">Player Stats</h2>

      <GlassPlayerSelect players={sourceStats?.players || []} value={player} onChange={setPlayer} />

      {!selectedStats ? (
        <p className="text-slate-500">Select a player to view all-time statistics.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Metric
              icon="⚔"
              label="Kills"
              value={selectedStats.kills}
              sub={player}
              className="border-blue-400/25 from-blue-500/20 text-blue-300"
            />

            <Metric
              icon="☠"
              label="Deaths"
              value={selectedStats.deaths}
              sub="All-time"
              className="border-pink-400/25 from-pink-500/20 text-pink-300"
            />

            <Metric
              icon="✦"
              label="K/D"
              value={selectedStats.kd}
              sub="All-time ratio"
              className="border-violet-400/25 from-violet-500/20 text-violet-300"
            />

            <Metric
              icon="⚑"
              label="Wars Played"
              value={selectedStats.warCount}
              sub="Wars with this player"
              className="border-amber-400/25 from-amber-500/20 text-amber-300"
            />

            <Metric
              icon="♛"
              label="Average Rank"
              value={selectedStats.averageRank.toFixed(2)}
              sub=""
              className="border-emerald-400/25 from-emerald-500/20 text-emerald-300"
            />
          </div>

          <PerformanceChart
            data={selectedStats.performanceData}
            averages={selectedStats.averages}
          />

          <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
            <EnemyGuildsTable rows={selectedStats.enemyGuildRows} />
            <SplitTargetsPanel
              victims={selectedStats.victims}
              killedBy={selectedStats.killedBy}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <PremiumBarRows
              title="Killstreak"
              tag="Killstreak"
              rows={selectedStats.streakRows}
              accent="cyan"
            />

            <PremiumBarRows
              title="Killfeed"
              tag="Killfeed"
              rows={selectedStats.feedRows}
              accent="gold"
            />
          </div>
        </div>
      )}
    </Panel>
  );
}
