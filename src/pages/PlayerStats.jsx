import React, { useMemo, useState } from 'react';
import { Panel, Metric } from '../components/UI';
import { AveragePerformanceChart } from '../components/Charts';
import { achievements, add, scrollCls } from '../lib/logUtils';

function PlayerSelect({ players, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = players.find((player) => player.name === value);

  const list = players.filter((player) =>
    `${player.name} ${player.family || ''}`.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="relative mb-4 max-w-xl">
      <button
        type="button"
        onClick={() => setOpen((state) => !state)}
        className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left shadow-lg backdrop-blur-xl transition hover:border-blue-300/50 hover:bg-white/10"
      >
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Selected player
          </p>
          <p className="truncate text-sm font-black">
            {selected ? selected.name : 'Select player'}
          </p>
        </div>

        <span
          className={`${open ? 'rotate-180 ' : ''}ml-3 shrink-0 text-slate-400 transition`}
        >
          ⌄
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-2 rounded-2xl border border-white/10 bg-slate-950/90 p-2 shadow-2xl backdrop-blur-xl">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoFocus
            placeholder="Search player..."
            className="mb-2 w-full rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2 text-sm outline-none focus:border-blue-400"
          />

          <div className={`max-h-64 overflow-y-auto pr-1 ${scrollCls}`}>
            {!list.length ? (
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
                    !value ? 'bg-blue-500/20 text-blue-100' : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  Select player
                </button>

                {list.map((player) => (
                  <button
                    type="button"
                    key={player.name}
                    onClick={() => {
                      onChange(player.name);
                      setOpen(false);
                      setQuery('');
                    }}
                    className={`mb-1 flex w-full rounded-xl px-3 py-2 text-left text-sm ${
                      value === player.name
                        ? 'bg-blue-500/25 text-blue-100'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <span className="truncate font-bold">{player.name}</span>
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

function MiniRankList({ title, items, valueKey, tone = 'blue' }) {
  const rows = items.slice(0, 5);
  const max = Math.max(1, ...rows.map((item) => Number(item[valueKey]) || 0));

  const fillClass =
    tone === 'pink'
      ? 'bg-gradient-to-r from-fuchsia-500 to-pink-300'
      : 'bg-gradient-to-r from-blue-500 to-cyan-300';

  return (
    <div className="rounded-2xl border border-slate-800/90 bg-slate-950/45 p-4">
      <h4 className="mb-4 text-xl font-black">{title}</h4>

      {!rows.length ? (
        <p className="text-sm text-slate-500">No data yet.</p>
      ) : (
        rows.map((item, index) => {
          const value = Number(item[valueKey]) || 0;

          return (
            <div
              key={`${title}-${item.name}`}
              className="mb-4 grid grid-cols-[34px_1fr_42px] items-center gap-3 text-sm last:mb-0"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 font-black text-slate-100">
                {index + 1}
              </span>

              <div className="min-w-0">
                <p className="mb-2 truncate font-bold">{item.name}</p>
                <div className="h-2.5 rounded-full bg-slate-800">
                  <div
                    className={`h-2.5 rounded-full ${fillClass}`}
                    style={{
                      width: `${Math.max(6, Math.round((value / max) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              <b className="text-right text-slate-100">{value}</b>
            </div>
          );
        })
      )}
    </div>
  );
}

function formatAvgPair(avgKills, avgDeaths) {
  return `${avgKills.toFixed(2)} / ${avgDeaths.toFixed(2)}`;
}

function EnemyGuildTable({ rows }) {
  return (
    <Panel>
      <div className="mb-4">
        <h3 className="text-2xl font-black">Enemy Guilds</h3>
        <p className="text-sm text-slate-400">
          Premium matchup view against the selected player
        </p>
      </div>

      {!rows.length ? (
        <p className="text-slate-500">No enemy guild interactions found.</p>
      ) : (
        <div className={`max-h-[560px] overflow-y-auto pr-2 ${scrollCls}`}>
          <div className="space-y-3">
            <div className="sticky top-0 z-10 grid grid-cols-[minmax(180px,1.5fr)_90px_70px_70px_160px] gap-3 rounded-2xl border border-slate-800 bg-slate-950/95 px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400 backdrop-blur">
              <div>Guild</div>
              <div className="text-center">Wars</div>
              <div className="text-center">K</div>
              <div className="text-center">D</div>
              <div className="text-center">Average K / D</div>
            </div>

            {rows.map((guild, index) => {
              const positive = guild.avgKills >= guild.avgDeaths;

              return (
                <div
                  key={guild.name}
                  className="grid grid-cols-[minmax(180px,1.5fr)_90px_70px_70px_160px] items-center gap-3 rounded-3xl border border-slate-800/90 bg-gradient-to-r from-slate-950/95 via-slate-900/70 to-slate-950/95 px-4 py-4 shadow-[0_10px_28px_rgba(0,0,0,.22)] transition hover:border-slate-700 hover:shadow-[0_12px_30px_rgba(0,0,0,.34)]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-xs font-black text-slate-300">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-lg font-black text-slate-100">
                          {guild.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          Sorted by average K / D ratio
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="inline-flex min-w-[56px] items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm font-black text-slate-100">
                      {guild.wars}
                    </div>
                  </div>

                  <div className="text-center text-lg font-black text-cyan-300">
                    {guild.kills}
                  </div>

                  <div className="text-center text-lg font-black text-pink-300">
                    {guild.deaths}
                  </div>

                  <div className="text-center">
                    <div
                      className={`inline-flex min-w-[128px] items-center justify-center rounded-2xl border px-3 py-2 text-sm font-black shadow-inner ${
                        positive
                          ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300'
                          : 'border-rose-400/25 bg-rose-500/10 text-rose-300'
                      }`}
                    >
                      <span className="text-cyan-300">{guild.avgKills.toFixed(2)}</span>
                      <span className="mx-1.5 text-slate-500">/</span>
                      <span className="text-pink-300">{guild.avgDeaths.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Panel>
  );
}

function buildPlacementRanks(rows, valueKey, direction = 'desc') {
  const sorted = [...rows].sort((a, b) => {
    const av = Number(a[valueKey]) || 0;
    const bv = Number(b[valueKey]) || 0;

    if (av === bv) {
      return a.name.localeCompare(b.name);
    }

    return direction === 'desc' ? bv - av : av - bv;
  });

  const rankMap = {};
  let lastValue = null;
  let lastRank = 0;

  sorted.forEach((row, index) => {
    const value = Number(row[valueKey]) || 0;

    if (index === 0 || value !== lastValue) {
      lastRank = index + 1;
      lastValue = value;
    }

    rankMap[row.name] = lastRank;
  });

  return rankMap;
}

function buildAverageRankForPlayer(playerName, events) {
  const warIds = [...new Set(events.map((event) => String(event.id)))];
  const ranks = [];

  warIds.forEach((warId) => {
    const warEvents = events.filter((event) => String(event.id) === warId);
    const map = {};

    warEvents.forEach((event) => {
      if (!map[event.killer]) {
        map[event.killer] = { name: event.killer, kills: 0, deaths: 0 };
      }

      if (!map[event.victim]) {
        map[event.victim] = { name: event.victim, kills: 0, deaths: 0 };
      }

      if (event.killer) {
        map[event.killer].kills += event.killer === event.victim ? 0 : 1;
      }

      if (event.victim) {
        map[event.victim].deaths += 1;
      }
    });

    const players = Object.values(map).map((row) => ({
      ...row,
      kd: row.deaths ? row.kills / row.deaths : row.kills,
    }));

    if (!players.find((row) => row.name === playerName)) {
      return;
    }

    const killsRank = buildPlacementRanks(players, 'kills', 'desc');
    const deathsRank = buildPlacementRanks(players, 'deaths', 'asc');
    const kdRank = buildPlacementRanks(players, 'kd', 'desc');

    const averageForWar =
      (killsRank[playerName] + deathsRank[playerName] + kdRank[playerName]) / 3;

    ranks.push(averageForWar);
  });

  if (!ranks.length) {
    return 0;
  }

  return Number((ranks.reduce((sum, value) => sum + value, 0) / ranks.length).toFixed(2));
}

export default function PlayerStats({ stats }) {
  const [player, setPlayer] = useState('');

  const selectedStats = useMemo(() => {
    if (!player) return null;

    const victims = {};
    const killedBy = {};
    const days = {};
    const enemyGuilds = {};
    const involvedWarIds = new Set();

    stats.ev.forEach((event) => {
      const involved = event.killer === player || event.victim === player;

      if (!involved) return;

      involvedWarIds.add(String(event.id));

      if (!days[event.date]) {
        days[event.date] = {
          time: event.date,
          kills: 0,
          deaths: 0,
          wars: new Set(),
        };
      }

      days[event.date].wars.add(String(event.id));

      if (!enemyGuilds[event.guild]) {
        enemyGuilds[event.guild] = {
          name: event.guild,
          kills: 0,
          deaths: 0,
          wars: new Set(),
        };
      }

      enemyGuilds[event.guild].wars.add(String(event.id));

      if (event.killer === player) {
        add(victims, event.victim);
        days[event.date].kills += 1;
        enemyGuilds[event.guild].kills += 1;
      }

      if (event.victim === player) {
        add(killedBy, event.killer);
        days[event.date].deaths += 1;
        enemyGuilds[event.guild].deaths += 1;
      }
    });

    const playerRow =
      stats.players.find((item) => item.name === player) || {
        kills: 0,
        deaths: 0,
        kd: '0.00',
      };

    const orderedDays = Object.values(days).sort((a, b) => a.time.localeCompare(b.time));

    const averageLine = orderedDays.map((day) => {
      const fights = Math.max(1, day.wars.size);
      const avgKills = Number((day.kills / fights).toFixed(2));
      const avgDeaths = Number((day.deaths / fights).toFixed(2));

      return {
        time: day.time,
        kills: day.kills,
        deaths: day.deaths,
        avgKd: Number((avgDeaths ? avgKills / avgDeaths : avgKills).toFixed(2)),
      };
    });

    const enemyGuildRows = Object.values(enemyGuilds)
      .map((guild) => {
        const wars = Math.max(1, guild.wars.size);
        const avgKills = Number((guild.kills / wars).toFixed(2));
        const avgDeaths = Number((guild.deaths / wars).toFixed(2));
        const avgRatio = Number((avgDeaths ? avgKills / avgDeaths : avgKills).toFixed(2));

        return {
          ...guild,
          wars,
          avgKills,
          avgDeaths,
          avgRatio,
          avgPair: formatAvgPair(avgKills, avgDeaths),
        };
      })
      .sort(
        (a, b) =>
          b.avgRatio - a.avgRatio ||
          b.avgKills - a.avgKills ||
          a.avgDeaths - b.avgDeaths ||
          a.name.localeCompare(b.name),
      );

    const achievementRows = achievements.map((achievement) => {
      const value =
        achievement[2] === 'k'
          ? playerRow.kills
          : achievement[2] === 'kd'
            ? Number(playerRow.kd)
            : achievement[2] === 's'
              ? stats.st[player] || 0
              : achievement[2] === 'f'
                ? stats.fd[player] || 0
                : 0;

      return {
        title: achievement[0],
        goal: achievement[1],
        value,
        done: value >= achievement[1],
      };
    });

    const playerEvents = stats.ev.filter(
      (event) => event.killer === player || event.victim === player,
    );

    const averageRank = buildAverageRankForPlayer(player, playerEvents);

    return {
      ...playerRow,
      victims,
      killedBy,
      averageLine,
      enemyGuildRows,
      achievements: achievementRows,
      wars: involvedWarIds.size,
      averageRank,
    };
  }, [player, stats]);

  return (
    <Panel>
      <h2 className="mb-4 text-2xl font-black">Player Stats</h2>

      <PlayerSelect players={stats.players} value={player} onChange={setPlayer} />

      {selectedStats && (
        <>
          <div className="grid gap-4 md:grid-cols-5">
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
              sub="Total deaths"
              className="border-pink-400/25 from-pink-500/20 text-pink-300"
            />

            <Metric
              icon="✦"
              label="K/D"
              value={selectedStats.kd}
              sub="Overall ratio"
              className="border-violet-400/25 from-violet-500/20 text-violet-300"
            />

            <Metric
              icon="⚑"
              label="Wars"
              value={selectedStats.wars}
              sub="Wars participated"
              className="border-amber-400/25 from-amber-500/20 text-amber-300"
            />

            <Metric
              icon="♛"
              label="Average Rank"
              value={selectedStats.averageRank || '0.00'}
              sub="Only wars played by this player"
              className="border-emerald-400/25 from-emerald-500/20 text-emerald-300"
            />
          </div>

          <AveragePerformanceChart data={selectedStats.averageLine} title="Performance" />

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_1fr]">
            <EnemyGuildTable rows={selectedStats.enemyGuildRows} />

            <Panel>
              <div className="grid gap-4 xl:grid-cols-2">
                <MiniRankList
                  title="Favourite Targets"
                  items={Object.entries(selectedStats.victims)
                    .map(([name, kills]) => ({ name, kills }))
                    .sort((a, b) => b.kills - a.kills)}
                  valueKey="kills"
                  tone="blue"
                />

                <MiniRankList
                  title="Nemesis"
                  items={Object.entries(selectedStats.killedBy)
                    .map(([name, kills]) => ({ name, kills }))
                    .sort((a, b) => b.kills - a.kills)}
                  valueKey="kills"
                  tone="pink"
                />
              </div>
            </Panel>
          </div>

          <div className="mt-4">
            <Panel>
              <h3 className="mb-4 text-xl font-black">✦ Achievements</h3>

              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {selectedStats.achievements.map((achievement) => (
                  <div
                    key={achievement.title}
                    className={`rounded-xl border p-3 ${
                      achievement.done
                        ? 'border-emerald-400 bg-emerald-500/10'
                        : 'border-slate-800 bg-slate-950/40'
                    }`}
                  >
                    <p className="font-bold">
                      {achievement.done ? '✅' : '🔒'} {achievement.title}
                    </p>

                    <div className="mt-2 h-2 rounded-full bg-slate-800">
                      <div
                        className={`h-2 rounded-full ${
                          achievement.done ? 'bg-emerald-400' : 'bg-blue-500'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            (achievement.value / achievement.goal) * 100,
                          )}%`,
                        }}
                      />
                    </div>

                    <p className="mt-1 text-xs text-slate-500">
                      {Number(achievement.value).toFixed(achievement.goal <= 10 ? 2 : 0)} /{' '}
                      {achievement.goal}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </>
      )}
    </Panel>
  );
}
