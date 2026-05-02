import React, { useMemo, useState } from 'react';
import { Panel, Metric } from '../components/UI';
import { PerformanceChart } from '../components/Charts';
import { achievements, add, scrollCls } from '../lib/logUtils';

function sortEvents(events) {
  return [...events].sort((a, b) => {
    if (a.date !== b.date) return String(a.date).localeCompare(String(b.date));
    if (a.sec !== b.sec) return Number(a.sec) - Number(b.sec);
    return Number(a.i || 0) - Number(b.i || 0);
  });
}

function buildStreakMap(events) {
  const current = {};
  const best = {};

  sortEvents(events).forEach((event) => {
    if (event.type === 'kill') {
      current[event.killer] = (current[event.killer] || 0) + 1;
      best[event.killer] = Math.max(best[event.killer] || 0, current[event.killer]);
    } else {
      current[event.victim] = 0;
    }
  });

  return best;
}

function buildFeedMap(events, seconds = 10) {
  const byPlayer = {};

  sortEvents(events)
    .filter((event) => event.type === 'kill')
    .forEach((event) => {
      byPlayer[event.killer] ||= [];
      byPlayer[event.killer].push(event);
    });

  const best = {};

  Object.entries(byPlayer).forEach(([playerName, list]) => {
    let left = 0;
    let maxCount = 0;

    for (let right = 0; right < list.length; right += 1) {
      while (list[right].sec - list[left].sec > seconds) {
        left += 1;
      }

      maxCount = Math.max(maxCount, right - left + 1);
    }

    best[playerName] = maxCount;
  });

  return best;
}

function getPlayerBestStreak(events, playerName) {
  let current = 0;
  let best = 0;

  sortEvents(events).forEach((event) => {
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

function getPlayerBestFeed(events, playerName, seconds = 10) {
  const kills = sortEvents(events).filter(
    (event) => event.type === 'kill' && event.killer === playerName,
  );

  let left = 0;
  let best = 0;

  for (let right = 0; right < kills.length; right += 1) {
    while (kills[right].sec - kills[left].sec > seconds) {
      left += 1;
    }

    best = Math.max(best, right - left + 1);
  }

  return best;
}

function tieAwareRank(rows, key, desc = true) {
  const sorted = [...rows].sort((a, b) => {
    const aValue = Number(a[key]) || 0;
    const bValue = Number(b[key]) || 0;
    return desc ? bValue - aValue : aValue - bValue;
  });

  const output = {};
  let lastValue;
  let currentRank = 0;

  sorted.forEach((row, index) => {
    const value = Number(row[key]) || 0;

    if (index === 0 || value !== lastValue) {
      currentRank = index + 1;
    }

    output[row.name] = currentRank;
    lastValue = value;
  });

  return output;
}

function getMatchBasedAverageRank(events, playerName) {
  const warMap = {};

  events.forEach((event) => {
    warMap[event.id] ||= [];
    warMap[event.id].push(event);
  });

  const warScores = [];

  Object.values(warMap).forEach((warEvents) => {
    const playerParticipated = warEvents.some(
      (event) => event.killer === playerName || event.victim === playerName,
    );

    if (!playerParticipated) return;

    const kills = {};
    const deaths = {};

    warEvents.forEach((event) => {
      if (event.type === 'kill') add(kills, event.killer);
      if (event.type === 'death') add(deaths, event.victim);
    });

    const streakMap = buildStreakMap(warEvents);
    const feedMap = buildFeedMap(warEvents);

    const rows = Array.from(
      new Set([...Object.keys(kills), ...Object.keys(deaths)]),
    ).map((name) => {
      const playerKills = kills[name] || 0;
      const playerDeaths = deaths[name] || 0;

      return {
        name,
        kills: playerKills,
        deaths: playerDeaths,
        kdNumber: playerDeaths
          ? Number((playerKills / playerDeaths).toFixed(2))
          : Number(playerKills.toFixed(2)),
        streak: streakMap[name] || 0,
        feed: feedMap[name] || 0,
      };
    });

    if (!rows.some((row) => row.name === playerName)) return;

    const ranks = {
      kills: tieAwareRank(rows, 'kills', true),
      deaths: tieAwareRank(rows, 'deaths', false),
      kd: tieAwareRank(rows, 'kdNumber', true),
      streak: tieAwareRank(rows, 'streak', true),
      feed: tieAwareRank(rows, 'feed', true),
    };

    const averageRank =
      (ranks.kills[playerName] +
        ranks.deaths[playerName] +
        ranks.kd[playerName] +
        ranks.streak[playerName] +
        ranks.feed[playerName]) /
      5;

    warScores.push(averageRank);
  });

  if (!warScores.length) return '0.00';

  const total = warScores.reduce((sum, value) => sum + value, 0);
  return (total / warScores.length).toFixed(2);
}

function PlayerSelect({ players, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = players.find((player) => player.name === value);

  const list = players.filter((player) =>
    `${player.name} ${player.family || ''}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );

  return (
    <div className="relative mb-4 max-w-xl">
      <button
        type="button"
        onClick={() => setOpen(!open)}
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
              <p className="px-3 py-4 text-sm text-slate-500">
                No players found.
              </p>
            ) : (
              <>
                <button
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

                {list.map((player) => (
                  <button
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

function RankList({ title, items, valueKey, limit = 5, accent = 'blue' }) {
  const rows = items.slice(0, limit);
  const max = Math.max(1, ...rows.map((item) => Number(item[valueKey]) || 0));

  const barClass =
    accent === 'pink'
      ? 'from-pink-500 to-fuchsia-300'
      : accent === 'orange'
        ? 'from-orange-500 to-amber-300'
        : accent === 'emerald'
          ? 'from-emerald-500 to-cyan-300'
          : 'from-blue-500 to-cyan-300';

  return (
    <Panel>
      <h3 className="mb-4 text-xl font-black">{title}</h3>

      {!rows.length ? (
        <p className="text-slate-500">No data yet.</p>
      ) : (
        rows.map((item, index) => {
          const value = Number(item[valueKey]) || 0;

          return (
            <div
              key={`${title}-${item.name}-${index}`}
              className="mb-4 grid grid-cols-[34px_1fr_55px] items-center gap-3 text-sm"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 font-black">
                {index + 1}
              </span>

              <div className="min-w-0">
                <p className="mb-2 truncate font-bold">{item.name}</p>

                <div className="h-2.5 rounded-full bg-slate-800">
                  <div
                    className={`h-2.5 rounded-full bg-gradient-to-r ${barClass}`}
                    style={{
                      width: `${Math.max(6, Math.round((value / max) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              <b className="text-right">{value}</b>
            </div>
          );
        })
      )}
    </Panel>
  );
}

function PlayerStreakFeed({ streakItems, feedItems }) {
  return (
    <Panel cls="h-full">
      <div className="grid gap-4 xl:grid-cols-2">
        <div>
          <h4 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-400">
            Killstreak
          </h4>

          {!streakItems.length ? (
            <p className="text-sm text-slate-500">No killstreak data yet.</p>
          ) : (
            <div className="space-y-2">
              {streakItems.map((item, index) => (
                <div
                  key={`streak-${item.id}-${index}`}
                  className="grid grid-cols-[30px_1fr_46px] items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm"
                >
                  <span className="text-slate-500">{index + 1}</span>

                  <div className="min-w-0">
                    <b className="block truncate">{item.date}</b>
                    <p className="truncate text-[10px] text-slate-500">
                      {item.war}
                    </p>
                  </div>

                  <b className="text-right text-emerald-300">{item.value}</b>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h4 className="mb-3 text-sm font-black uppercase tracking-wider text-slate-400">
            Killfeed
          </h4>

          {!feedItems.length ? (
            <p className="text-sm text-slate-500">No killfeed data yet.</p>
          ) : (
            <div className="space-y-2">
              {feedItems.map((item, index) => (
                <div
                  key={`feed-${item.id}-${index}`}
                  className="grid grid-cols-[30px_1fr_46px] items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm"
                >
                  <span className="text-slate-500">{index + 1}</span>

                  <div className="min-w-0">
                    <b className="block truncate">{item.date}</b>
                    <p className="truncate text-[10px] text-slate-500">
                      {item.war}
                    </p>
                  </div>

                  <b className="text-right text-orange-300">{item.value}</b>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

export default function PlayerStats({ stats }) {
  const [player, setPlayer] = useState('');

  const selectedStats = useMemo(() => {
    if (!player) return null;

    const victims = {};
    const killedBy = {};
    const days = {};
    const participatedWars = new Set();
    const warMap = {};

    stats.ev.forEach((event) => {
      warMap[event.id] ||= [];
      warMap[event.id].push(event);

      if (event.killer === player || event.victim === player) {
        participatedWars.add(event.id);

        days[event.date] ||= {
          time: event.date,
          kills: 0,
          deaths: 0,
          wars: new Set(),
        };

        days[event.date].wars.add(event.id);
      }

      if (event.killer === player) {
        add(victims, event.victim);
        days[event.date].kills += 1;
      }

      if (event.victim === player) {
        add(killedBy, event.killer);
        days[event.date].deaths += 1;
      }
    });

    const playerRow =
      stats.players.find((item) => item.name === player) || {
        kills: 0,
        deaths: 0,
        kd: '0.00',
      };

    const orderedDays = Object.values(days).sort((a, b) =>
      a.time.localeCompare(b.time),
    );

    const performanceLine = orderedDays.map((day) => {
      const fights = Math.max(1, day.wars.size);
      const avgKills = Number((day.kills / fights).toFixed(2));
      const avgDeaths = Number((day.deaths / fights).toFixed(2));

      return {
        time: day.time,
        kills: day.kills,
        deaths: day.deaths,
        avgKills,
        avgDeaths,
        avgKd: Number((avgDeaths ? avgKills / avgDeaths : avgKills).toFixed(2)),
      };
    });

    const streakItems = Object.entries(warMap)
      .map(([id, events]) => {
        const participated = events.some(
          (event) => event.killer === player || event.victim === player,
        );

        if (!participated) return null;

        return {
          id,
          value: getPlayerBestStreak(events, player),
          date: events[0]?.date || '-',
          war: events[0]?.war || 'Battle log',
        };
      })
      .filter((item) => item && item.value > 0)
      .sort(
        (a, b) =>
          b.value - a.value ||
          String(b.date).localeCompare(String(a.date)) ||
          String(a.war).localeCompare(String(b.war)),
      )
      .slice(0, 10);

    const feedItems = Object.entries(warMap)
      .map(([id, events]) => {
        const participated = events.some(
          (event) => event.killer === player || event.victim === player,
        );

        if (!participated) return null;

        return {
          id,
          value: getPlayerBestFeed(events, player),
          date: events[0]?.date || '-',
          war: events[0]?.war || 'Battle log',
        };
      })
      .filter((item) => item && item.value > 0)
      .sort(
        (a, b) =>
          b.value - a.value ||
          String(b.date).localeCompare(String(a.date)) ||
          String(a.war).localeCompare(String(b.war)),
      )
      .slice(0, 10);

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

    return {
      ...playerRow,
      wars: participatedWars.size,
      averageRank: getMatchBasedAverageRank(stats.ev, player),
      victims,
      killedBy,
      performanceLine,
      streakItems,
      feedItems,
      achievements: achievementRows,
    };
  }, [player, stats]);

  return (
    <Panel>
      <h2 className="mb-4 text-2xl font-black">Player Stats</h2>

      <PlayerSelect
        players={stats.players}
        value={player}
        onChange={setPlayer}
      />

      {selectedStats && (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <Metric
              icon="⚔"
              label="Kills"
              value={selectedStats.kills}
              sub="All time"
              className="border-blue-400/25 from-blue-500/20 text-blue-300"
            />

            <Metric
              icon="☠"
              label="Deaths"
              value={selectedStats.deaths}
              sub="All time"
              className="border-pink-400/25 from-pink-500/20 text-pink-300"
            />

            <Metric
              icon="✦"
              label="K/D"
              value={selectedStats.kd}
              sub="All time"
              className="border-violet-400/25 from-violet-500/20 text-violet-300"
            />

            <Metric
              icon="⚑"
              label="Wars"
              value={selectedStats.wars}
              sub="Participated"
              className="border-cyan-400/25 from-cyan-500/20 text-cyan-300"
            />

            <Metric
              icon="♛"
              label="Average Rank"
              value={selectedStats.averageRank}
              sub="Average from wars played"
              className="border-amber-400/25 from-amber-500/20 text-amber-300"
            />
          </div>

          <PerformanceChart data={selectedStats.performanceLine} />

          <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
            <div className="space-y-4">
              <RankList
                title="Favourite Targets"
                items={Object.entries(selectedStats.victims)
                  .map(([name, kills]) => ({ name, kills }))
                  .sort((a, b) => b.kills - a.kills)}
                valueKey="kills"
                accent="blue"
              />

              <RankList
                title="Nemesis"
                items={Object.entries(selectedStats.killedBy)
                  .map(([name, kills]) => ({ name, kills }))
                  .sort((a, b) => b.kills - a.kills)}
                valueKey="kills"
                accent="pink"
              />
            </div>

            <PlayerStreakFeed
              streakItems={selectedStats.streakItems}
              feedItems={selectedStats.feedItems}
            />
          </div>

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
                        width:
                          Math.min(
                            100,
                            (achievement.value / achievement.goal) * 100,
                          ) + '%',
                      }}
                    />
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    {Number(achievement.value).toFixed(
                      achievement.goal <= 10 ? 2 : 0,
                    )}{' '}
                    / {achievement.goal}
                  </p>
                </div>
              ))}
            </div>
          </Panel>
        </>
      )}
    </Panel>
  );
}
