import React, { useMemo, useState } from 'react';
import { Panel, Metric } from '../components/UI';
import { AveragePerformanceChart } from '../components/Charts';
import { add, scrollCls } from '../lib/logUtils';

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
              <p className="px-3 py-4 text-sm text-slate-500">
                No players found.
              </p>
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
              className="mb-3 grid grid-cols-[32px_1fr_38px] items-center gap-3 text-sm last:mb-0"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 font-black text-slate-100">
                {index + 1}
              </span>

              <div className="min-w-0">
                <p className="mb-1.5 truncate font-bold">{item.name}</p>

                <div className="h-2 rounded-full bg-slate-800">
                  <div
                    className={`h-2 rounded-full ${fillClass}`}
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

function TargetsAndNemesisPanel({ favouriteTargets, nemesisTargets }) {
  return (
    <Panel>
      <div className="grid gap-4 xl:grid-cols-2">
        <MiniRankList
          title="Favourite Targets"
          items={favouriteTargets}
          valueKey="kills"
          tone="blue"
        />

        <MiniRankList
          title="Nemesis"
          items={nemesisTargets}
          valueKey="kills"
          tone="pink"
        />
      </div>
    </Panel>
  );
}

function SortButton({ id, label, sort, setSort, align = 'left' }) {
  const active = sort.key === id;

  function toggle() {
    if (sort.key === id) {
      setSort({
        key: id,
        dir: sort.dir === 'desc' ? 'asc' : 'desc',
      });
      return;
    }

    setSort({
      key: id,
      dir: id === 'guild' ? 'asc' : 'desc',
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`w-full text-[11px] font-black uppercase tracking-[0.16em] transition hover:text-blue-300 ${
        active ? 'text-blue-300' : 'text-slate-400'
      } ${align === 'center' ? 'text-center' : 'text-left'}`}
    >
      {label} {active ? (sort.dir === 'desc' ? '↓' : '↑') : '↕'}
    </button>
  );
}

function EnemyGuildTable({ rows }) {
  const [sort, setSort] = useState({
    key: 'avgRatio',
    dir: 'desc',
  });

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      let av = a[sort.key];
      let bv = b[sort.key];

      if (sort.key === 'guild') {
        av = a.name.toLowerCase();
        bv = b.name.toLowerCase();
      }

      if (typeof av === 'string') {
        return sort.dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }

      av = Number(av) || 0;
      bv = Number(bv) || 0;

      if (av === bv) {
        return a.name.localeCompare(b.name);
      }

      return sort.dir === 'asc' ? av - bv : bv - av;
    });
  }, [rows, sort]);

  return (
    <Panel>
      <div className="mb-4">
        <h3 className="text-2xl font-black">Enemy Guilds</h3>
        <p className="text-sm text-slate-400">
          Matchups against the selected player
        </p>
      </div>

      {!sortedRows.length ? (
        <p className="text-slate-500">No enemy guild interactions found.</p>
      ) : (
        <div className={`max-h-[520px] overflow-y-auto pr-2 ${scrollCls}`}>
          <div className="space-y-2">
            <div className="sticky top-0 z-10 grid grid-cols-[minmax(150px,1.45fr)_72px_54px_54px_142px] gap-2 rounded-2xl border border-slate-800 bg-slate-950/95 px-3 py-2.5 backdrop-blur">
              <SortButton
                id="guild"
                label="Guild"
                sort={sort}
                setSort={setSort}
              />

              <SortButton
                id="wars"
                label="Wars"
                sort={sort}
                setSort={setSort}
                align="center"
              />

              <SortButton
                id="kills"
                label="K"
                sort={sort}
                setSort={setSort}
                align="center"
              />

              <SortButton
                id="deaths"
                label="D"
                sort={sort}
                setSort={setSort}
                align="center"
              />

              <SortButton
                id="avgRatio"
                label="Average K / D"
                sort={sort}
                setSort={setSort}
                align="center"
              />
            </div>

            {sortedRows.map((guild, index) => {
              const positive = guild.avgKills >= guild.avgDeaths;

              return (
                <div
                  key={guild.name}
                  className="grid grid-cols-[minmax(150px,1.45fr)_72px_54px_54px_142px] items-center gap-2 rounded-2xl border border-slate-800/90 bg-gradient-to-r from-slate-950/95 via-slate-900/70 to-slate-950/95 px-3 py-2.5 shadow-[0_8px_22px_rgba(0,0,0,.20)] transition hover:border-slate-700 hover:shadow-[0_10px_26px_rgba(0,0,0,.30)]"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-[11px] font-black text-slate-300">
                        {index + 1}
                      </span>

                      <p className="truncate text-sm font-black text-slate-100">
                        {guild.name}
                      </p>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="inline-flex min-w-[44px] items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 px-2 py-1 text-xs font-black text-slate-100">
                      {guild.wars}
                    </div>
                  </div>

                  <div className="text-center text-sm font-black text-cyan-300">
                    {guild.kills}
                  </div>

                  <div className="text-center text-sm font-black text-pink-300">
                    {guild.deaths}
                  </div>

                  <div className="text-center">
                    <div
                      className={`inline-flex min-w-[112px] items-center justify-center rounded-xl border px-2.5 py-1.5 text-xs font-black shadow-inner ${
                        positive
                          ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300'
                          : 'border-rose-400/25 bg-rose-500/10 text-rose-300'
                      }`}
                    >
                      <span className="text-cyan-300">
                        {guild.avgKills.toFixed(2)}
                      </span>
                      <span className="mx-1.5 text-slate-500">/</span>
                      <span className="text-pink-300">
                        {guild.avgDeaths.toFixed(2)}
                      </span>
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

function getFirstReachMap(events, playersByName) {
  const sortedEvents = [...events].sort((a, b) => {
    if (String(a.date) !== String(b.date)) {
      return String(a.date).localeCompare(String(b.date));
    }

    if (Number(a.sec) !== Number(b.sec)) {
      return Number(a.sec) - Number(b.sec);
    }

    return Number(a.i || 0) - Number(b.i || 0);
  });

  const run = {};
  const reach = {};

  sortedEvents
    .filter((event) => event.type === 'kill')
    .forEach((event) => {
      run[event.killer] = (run[event.killer] || 0) + 1;

      const finalKills = playersByName[event.killer]?.kills || 0;

      if (finalKills && run[event.killer] === finalKills) {
        reach[event.killer] = `${event.date} ${String(event.sec).padStart(5, '0')} ${String(event.i || 0).padStart(5, '0')}`;
      }
    });

  return reach;
}

function buildTieAwareRank(rows, key, desc = true) {
  const sorted = [...rows].sort((a, b) => {
    const av = Number(a[key]) || 0;
    const bv = Number(b[key]) || 0;

    if (av === bv) {
      return a.name.localeCompare(b.name);
    }

    return desc ? bv - av : av - bv;
  });

  const output = {};
  let lastValue;
  let rankNumber = 0;

  sorted.forEach((row, index) => {
    const value = Number(row[key]) || 0;

    if (index === 0 || value !== lastValue) {
      rankNumber = index + 1;
    }

    output[row.name] = rankNumber;
    lastValue = value;
  });

  return output;
}

function buildKillsRankLikeBestOverall(rows, events, playersByName) {
  const reach = getFirstReachMap(events, playersByName);

  return Object.fromEntries(
    [...rows]
      .sort(
        (a, b) =>
          b.kills - a.kills ||
          (reach[a.name] || '9999').localeCompare(reach[b.name] || '9999') ||
          a.name.localeCompare(b.name),
      )
      .map((player, index) => [player.name, index + 1]),
  );
}

function buildBestOverallAverageRanks(stats) {
  const playersByName = Object.fromEntries(
    stats.players.map((player) => [player.name, player]),
  );

  const rows = stats.players.map((player) => ({
    ...player,
    kdNumber: Number(player.kd) || 0,
    streak: stats.st?.[player.name] || 0,
    feed: stats.fd?.[player.name] || 0,
  }));

  if (!rows.length) return {};

  const ranks = {
    kills: buildKillsRankLikeBestOverall(rows, stats.ev, playersByName),
    deaths: buildTieAwareRank(rows, 'deaths', false),
    kd: buildTieAwareRank(rows, 'kdNumber', true),
    streak: buildTieAwareRank(rows, 'streak', true),
    feed: buildTieAwareRank(rows, 'feed', true),
  };

  return Object.fromEntries(
    rows.map((player) => [
      player.name,
      Number(
        (
          (ranks.kills[player.name] +
            ranks.deaths[player.name] +
            ranks.kd[player.name] +
            ranks.streak[player.name] +
            ranks.feed[player.name]) /
          5
        ).toFixed(2),
      ),
    ]),
  );
}

function getBestKillstreakForWar(events, playerName) {
  const sorted = [...events].sort((a, b) => {
    if (Number(a.sec) !== Number(b.sec)) {
      return Number(a.sec) - Number(b.sec);
    }

    return Number(a.i || 0) - Number(b.i || 0);
  });

  let current = 0;
  let best = 0;

  sorted.forEach((event) => {
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

function getBestKillfeedForWar(events, playerName, seconds = 10) {
  const kills = events
    .filter((event) => event.type === 'kill' && event.killer === playerName)
    .sort((a, b) => Number(a.sec) - Number(b.sec));

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

function StreakFeedPanel({ streakItems, feedItems }) {
  return (
    <Panel>
      <div className="grid gap-4 xl:grid-cols-2">
        <div>
          <h3 className="mb-4 text-xl font-black">Killstreak</h3>

          {!streakItems.length ? (
            <p className="text-sm text-slate-500">No killstreak data yet.</p>
          ) : (
            <div className="space-y-2">
              {streakItems.map((item, index) => (
                <div
                  key={`streak-${item.id}-${index}`}
                  className="grid grid-cols-[32px_1fr_48px] items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm"
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
          <h3 className="mb-4 text-xl font-black">Killfeed</h3>

          {!feedItems.length ? (
            <p className="text-sm text-slate-500">No killfeed data yet.</p>
          ) : (
            <div className="space-y-2">
              {feedItems.map((item, index) => (
                <div
                  key={`feed-${item.id}-${index}`}
                  className="grid grid-cols-[32px_1fr_48px] items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm"
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

  const bestOverallRanks = useMemo(
    () => buildBestOverallAverageRanks(stats),
    [stats],
  );

  const selectedStats = useMemo(() => {
    if (!player) return null;

    const victims = {};
    const killedBy = {};
    const days = {};
    const enemyGuilds = {};
    const involvedWarIds = new Set();
    const warMap = {};

    stats.ev.forEach((event) => {
      warMap[String(event.id)] ||= [];
      warMap[String(event.id)].push(event);

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

    const orderedDays = Object.values(days).sort((a, b) =>
      a.time.localeCompare(b.time),
    );

    const averageLine = orderedDays.map((day) => {
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

    const enemyGuildRows = Object.values(enemyGuilds)
      .map((guild) => {
        const wars = Math.max(1, guild.wars.size);
        const avgKills = Number((guild.kills / wars).toFixed(2));
        const avgDeaths = Number((guild.deaths / wars).toFixed(2));
        const avgRatio = Number(
          (avgDeaths ? avgKills / avgDeaths : avgKills).toFixed(2),
        );

        return {
          ...guild,
          wars,
          avgKills,
          avgDeaths,
          avgRatio,
        };
      })
      .sort(
        (a, b) =>
          b.avgRatio - a.avgRatio ||
          b.avgKills - a.avgKills ||
          a.avgDeaths - b.avgDeaths ||
          a.name.localeCompare(b.name),
      );

    const streakItems = Object.entries(warMap)
      .map(([warId, events]) => {
        const participated = events.some(
          (event) => event.killer === player || event.victim === player,
        );

        if (!participated) return null;

        return {
          id: warId,
          date: events[0]?.date || '-',
          war: events[0]?.war || 'Battle log',
          value: getBestKillstreakForWar(events, player),
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
      .map(([warId, events]) => {
        const participated = events.some(
          (event) => event.killer === player || event.victim === player,
        );

        if (!participated) return null;

        return {
          id: warId,
          date: events[0]?.date || '-',
          war: events[0]?.war || 'Battle log',
          value: getBestKillfeedForWar(events, player),
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

    return {
      ...playerRow,
      victims,
      killedBy,
      averageLine,
      enemyGuildRows,
      wars: involvedWarIds.size,
      averageRank: bestOverallRanks[player] || 0,
      streakItems,
      feedItems,
    };
  }, [player, stats, bestOverallRanks]);

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
              value={Number(selectedStats.averageRank || 0).toFixed(2)}
              sub="Same as Best Overall"
              className="border-emerald-400/25 from-emerald-500/20 text-emerald-300"
            />
          </div>

          <AveragePerformanceChart
            data={selectedStats.averageLine}
            title="Performance"
          />

          <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_1fr]">
            <EnemyGuildTable rows={selectedStats.enemyGuildRows} />

            <TargetsAndNemesisPanel
              favouriteTargets={Object.entries(selectedStats.victims)
                .map(([name, kills]) => ({ name, kills }))
                .sort((a, b) => b.kills - a.kills)}
              nemesisTargets={Object.entries(selectedStats.killedBy)
                .map(([name, kills]) => ({ name, kills }))
                .sort((a, b) => b.kills - a.kills)}
            />
          </div>

          <div className="mt-4">
            <StreakFeedPanel
              streakItems={selectedStats.streakItems}
              feedItems={selectedStats.feedItems}
            />
          </div>
        </>
      )}
    </Panel>
  );
}
