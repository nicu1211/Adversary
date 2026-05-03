import React, { useState } from 'react';
import { Panel, Metric, Popup } from '../components/UI';
import { KillDeathChart } from '../components/Charts';
import { add, scrollCls, calculateKillFeed } from '../lib/logUtils';

function RankList({ title, items, valueKey }) {
  const rows = items.slice(0, 5);
  const max = Math.max(1, ...rows.map((x) => Number(x[valueKey]) || 0));

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
              key={item.name}
              className="mb-4 grid grid-cols-[34px_1fr_55px] items-center gap-3 text-sm"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 font-black">
                {index + 1}
              </span>

              <div className="min-w-0">
                <p className="mb-2 truncate font-bold">{item.name}</p>
                <div className="h-2.5 rounded-full bg-slate-800">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-300"
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

function BestOverall({ players, members, events }) {
  const [query, setQuery] = useState('');

  const knownNames = new Set([
    ...(members || []).map((member) => member.name),
    ...players.map((player) => player.name),
  ]);

  const names = [...knownNames];

  const sortedEvents = [...(events || [])].sort(
    (a, b) => a.date.localeCompare(b.date) || a.sec - b.sec || a.i - b.i,
  );

  function warKey(event) {
    return `${event.date || 'unknown'}__${event.war || 'unknown'}`;
  }

  const perPlayerWarStats = {};

  function ensurePlayerWar(name, key) {
    if (!knownNames.has(name)) return null;

    if (!perPlayerWarStats[name]) {
      perPlayerWarStats[name] = {};
    }

    if (!perPlayerWarStats[name][key]) {
      perPlayerWarStats[name][key] = {
        kills: 0,
        deaths: 0,
        maxStreak: 0,
        maxFeed: 0,
      };
    }

    return perPlayerWarStats[name][key];
  }

  const warGroups = {};

  sortedEvents.forEach((event) => {
    const key = warKey(event);

    if (!warGroups[key]) {
      warGroups[key] = [];
    }

    warGroups[key].push(event);
  });

  Object.entries(warGroups).forEach(([key, warEvents]) => {
    const streakRun = {};
    const recentKills = {};

    warEvents.forEach((event) => {
      const killer = event.killer;
      const victim = event.victim;

      if (knownNames.has(killer)) {
        const stats = ensurePlayerWar(killer, key);

        if (stats) {
          stats.kills += 1;

          streakRun[killer] = (streakRun[killer] || 0) + 1;
          stats.maxStreak = Math.max(stats.maxStreak, streakRun[killer]);

          if (!recentKills[killer]) {
            recentKills[killer] = [];
          }

          recentKills[killer] = recentKills[killer].filter(
            (sec) => event.sec - sec <= 10,
          );

          recentKills[killer].push(event.sec);

          stats.maxFeed = Math.max(stats.maxFeed, recentKills[killer].length);
        }
      }

      if (knownNames.has(victim)) {
        const stats = ensurePlayerWar(victim, key);

        if (stats) {
          stats.deaths += 1;
          streakRun[victim] = 0;
        }
      }
    });
  });

  const rows = names.map((name) => {
    const wars = Object.values(perPlayerWarStats[name] || {});
    const matches = wars.length;

    const totalKills = wars.reduce((sum, war) => sum + war.kills, 0);
    const totalDeaths = wars.reduce((sum, war) => sum + war.deaths, 0);
    const totalStreak = wars.reduce((sum, war) => sum + war.maxStreak, 0);
    const totalFeed = wars.reduce((sum, war) => sum + war.maxFeed, 0);

    const avgKills = matches ? totalKills / matches : 0;
    const avgDeaths = matches ? totalDeaths / matches : 0;
    const avgStreak = matches ? totalStreak / matches : 0;
    const avgFeed = matches ? totalFeed / matches : 0;
    const avgKd = avgDeaths ? avgKills / avgDeaths : avgKills;

    return {
      name,
      matches,
      totalKills,
      totalDeaths,
      avgKills,
      avgDeaths,
      avgKd,
      avgStreak,
      avgFeed,
    };
  });

  function rank(key, desc = true) {
    const sorted = [...rows].sort((a, b) => {
      const av = Number(a[key]) || 0;
      const bv = Number(b[key]) || 0;

      return desc ? bv - av : av - bv;
    });

    const output = {};
    let lastValue;
    let rankNumber = 0;

    sorted.forEach((player, index) => {
      const value = Number(player[key]) || 0;

      if (index === 0 || value !== lastValue) {
        rankNumber = index + 1;
      }

      output[player.name] = rankNumber;
      lastValue = value;
    });

    return output;
  }

  const ranks = {
    kills: rank('avgKills'),
    deaths: rank('avgDeaths', false),
    kd: rank('avgKd'),
    streak: rank('avgStreak'),
    feed: rank('avgFeed'),
  };

  const final = rows
    .map((player) => ({
      ...player,
      averageRank:
        (ranks.kills[player.name] +
          ranks.deaths[player.name] +
          ranks.kd[player.name] +
          ranks.streak[player.name] +
          ranks.feed[player.name]) /
        5,
    }))
    .filter((player) => player.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.averageRank - b.averageRank);

  return (
    <Panel cls="h-[680px]">
      <div className="flex h-full flex-col">
        <h3 className="text-xl font-black">♛ Best Overall</h3>

        <p className="mb-3 text-xs text-slate-400">
          Average performance across selected wars
        </p>

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search player..."
          className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-400"
        />

        {!final.length ? (
          <p className="text-slate-500">No players.</p>
        ) : (
          <div
            className={`min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1 ${scrollCls}`}
          >
            {final.map((player, index) => (
              <div
                key={player.name}
                className="rounded-xl border border-slate-800 bg-slate-900/70 p-2 hover:bg-slate-900"
              >
                <div className="mb-1.5 flex justify-between gap-2">
                  <b className="truncate">
                    <span className="mr-2 text-slate-500">{index + 1}</span>
                    {player.name}
                  </b>

                  <span className="rounded-md border border-blue-400/20 bg-blue-500/5 px-2 py-1 text-sm font-black text-blue-300">
                    <small className="mr-1 text-[9px] uppercase text-blue-200/80">
                      Avg Rank
                    </small>
                    {player.averageRank.toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-6 gap-1 text-center text-xs">
                  <div className="rounded-md bg-slate-950/70 p-1">
                    <p className="text-slate-500">Wars</p>
                    <b className="text-slate-200">{player.matches}</b>
                  </div>

                  <div className="rounded-md bg-slate-950/70 p-1">
                    <p className="text-slate-500">K/M</p>
                    <b className="text-blue-300">{player.avgKills.toFixed(1)}</b>
                  </div>

                  <div className="rounded-md bg-slate-950/70 p-1">
                    <p className="text-slate-500">D/M</p>
                    <b className="text-pink-300">
                      {player.avgDeaths.toFixed(1)}
                    </b>
                  </div>

                  <div className="rounded-md bg-slate-950/70 p-1">
                    <p className="text-slate-500">K/D</p>
                    <b
                      className={
                        player.avgKd >= 1
                          ? 'text-emerald-300'
                          : 'text-rose-300'
                      }
                    >
                      {player.avgKd.toFixed(2)}
                    </b>
                  </div>

                  <div className="rounded-md bg-slate-950/70 p-1">
                    <p className="text-slate-500">Streak</p>
                    <b className="text-slate-200">
                      {player.avgStreak.toFixed(1)}
                    </b>
                  </div>

                  <div className="rounded-md bg-slate-950/70 p-1">
                    <p className="text-slate-500">Feed</p>
                    <b className="text-orange-300">
                      {player.avgFeed.toFixed(1)}
                    </b>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

function PlayerOverview({ players, streaks, feeds, events }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(['kills', 'desc']);
  const [selected, setSelected] = useState(null);

  const [key, direction] = sort;

  const rows = players
    .map((player) => ({
      ...player,
      streak: streaks[player.name] || 0,
      feed: feeds[player.name] || 0,
    }))
    .filter((player) => player.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      const av = key === 'name' ? a.name.toLowerCase() : Number(a[key]);
      const bv = key === 'name' ? b.name.toLowerCase() : Number(b[key]);

      if (av < bv) return direction === 'asc' ? -1 : 1;
      if (av > bv) return direction === 'asc' ? 1 : -1;
      return 0;
    });

  function flip(nextKey) {
    setSort(
      key === nextKey
        ? [nextKey, direction === 'desc' ? 'asc' : 'desc']
        : [nextKey, nextKey === 'name' ? 'asc' : 'desc'],
    );
  }

  function Header({ id, children, className = '' }) {
    return (
      <th className={`py-3 ${className}`}>
        <button
          onClick={() => flip(id)}
          className={
            key === id
              ? 'font-black text-blue-300'
              : 'font-black hover:text-blue-300'
          }
        >
          {children} {key === id ? (direction === 'desc' ? '↓' : '↑') : '↕'}
        </button>
      </th>
    );
  }

  const history = selected
    ? events
        .filter(
          (event) =>
            event.killer === selected.name || event.victim === selected.name,
        )
        .sort((a, b) => a.date.localeCompare(b.date) || a.sec - b.sec)
    : [];

  const kills = history.filter(
    (event) => event.killer === selected?.name,
  ).length;

  const deaths = history.filter(
    (event) => event.victim === selected?.name,
  ).length;

  const kd = deaths ? (kills / deaths).toFixed(2) : kills.toFixed(2);

  const victims = {};
  const nemesis = {};

  history.forEach((event) => {
    if (event.killer === selected?.name) add(victims, event.victim);
    if (event.victim === selected?.name) add(nemesis, event.killer);
  });

  const favourite =
    Object.entries(victims).sort((a, b) => b[1] - a[1])[0] || ['-', 0];

  const worst =
    Object.entries(nemesis).sort((a, b) => b[1] - a[1])[0] || ['-', 0];

  return (
    <Panel cls="h-[680px]">
      <div className="flex h-full flex-col">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-xl font-black">♙ Player Overview</h3>
            <p className="text-xs text-slate-400">
              Click a player name to view kill history
            </p>
          </div>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search family name"
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-400 md:w-64"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-800">
          <div className={`h-full overflow-y-auto pr-1 ${scrollCls}`}>
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-slate-900 text-xs uppercase text-slate-400">
                <tr>
                  <Header id="name" className="pl-4 text-left">
                    Family
                  </Header>
                  <Header id="kills" className="text-right">
                    Kills
                  </Header>
                  <Header id="deaths" className="text-right">
                    Deaths
                  </Header>
                  <Header id="kd" className="text-right">
                    K/D
                  </Header>
                  <Header id="streak" className="text-right">
                    Killstreak
                  </Header>
                  <Header id="feed" className="pr-4 text-right">
                    KillFeed
                  </Header>
                </tr>
              </thead>

              <tbody>
                {rows.map((player) => (
                  <tr
                    key={player.name}
                    className="border-t border-slate-800 bg-slate-950/30 hover:bg-slate-900/50"
                  >
                    <td className="py-3 pl-4">
                      <button
                        onClick={() => setSelected(player)}
                        className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 font-bold text-cyan-300 hover:border-cyan-300 hover:bg-cyan-500/20"
                      >
                        {player.name}
                      </button>
                    </td>

                    <td className="py-3 text-right font-black text-blue-300">
                      ⚔ {player.kills}
                    </td>

                    <td className="py-3 text-right font-black text-pink-300">
                      ☠ {player.deaths}
                    </td>

                    <td className="py-3 text-right font-black text-emerald-300">
                      ✺ {player.kd}
                    </td>

                    <td className="py-3 text-right font-black">
                      {player.streak}
                    </td>

                    <td className="py-3 pr-4 text-right font-black text-orange-300">
                      🔥 {player.feed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selected && (
          <Popup
            title={`${selected.name} highlights & history`}
            close={() => setSelected(null)}
          >
            <div className="mb-4 flex flex-wrap gap-2 text-sm">
              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">
                Kills <b className="text-blue-300">{kills}</b>
              </span>

              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">
                Deaths <b className="text-pink-300">{deaths}</b>
              </span>

              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">
                KD <b className="text-emerald-300">{kd}</b>
              </span>

              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">
                Killstreak <b>{streaks[selected.name] || 0}</b>
              </span>

              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">
                Killfeed{' '}
                <b className="text-orange-300">{feeds[selected.name] || 0}</b>
              </span>
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Favorite victim
                </p>
                <p className="mt-1 font-black">{favourite[0]}</p>
                <p className="text-sm font-bold text-blue-300">
                  {favourite[1]} kills
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">
                  Nemesis
                </p>
                <p className="mt-1 font-black">{worst[0]}</p>
                <p className="text-sm font-bold text-pink-300">
                  {worst[1]} deaths
                </p>
              </div>
            </div>

            <div
              className={`max-h-[48vh] overflow-auto rounded-2xl border border-slate-800 ${scrollCls}`}
            >
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-900 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="py-3 pl-4 text-left">Time</th>
                    <th className="py-3 text-left">Type</th>
                    <th className="py-3 text-left">Opponent</th>
                    <th className="py-3 pr-4 text-left">Guild / War</th>
                  </tr>
                </thead>

                <tbody>
                  {history.map((event, index) => (
                    <tr
                      key={index}
                      className="border-t border-slate-800 bg-slate-950/30"
                    >
                      <td className="py-3 pl-4 font-black">{event.time}</td>

                      <td className="py-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            event.killer === selected.name
                              ? 'bg-blue-500/15 text-blue-300'
                              : 'bg-pink-500/15 text-pink-300'
                          }`}
                        >
                          {event.killer === selected.name ? 'KILL' : 'DEATH'}
                        </span>
                      </td>

                      <td className="py-3 font-bold">
                        {event.killer === selected.name
                          ? event.victim
                          : event.killer}
                      </td>

                      <td className="py-3 pr-4 text-slate-400">
                        {event.guild} / {event.war}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Popup>
        )}
      </div>
    </Panel>
  );
}

function TopGuilds({ guilds, events }) {
  const [selected, setSelected] = useState(null);
  const [sort, setSort] = useState(['totalInteractions', 'desc']);

  const [key, direction] = sort;

  const rows = [...guilds]
    .map((guild) => {
      const kills = guild.deaths;
      const deaths = guild.kills;
      const totalInteractions = kills + deaths;
      const kdNumber = deaths ? kills / deaths : kills;

      return {
        ...guild,
        kills,
        deaths,
        totalInteractions,
        kdNumber,
        kd: kdNumber.toFixed(2),
      };
    })
    .sort((a, b) => {
      const av = key === 'name' ? a.name.toLowerCase() : Number(a[key]);
      const bv = key === 'name' ? b.name.toLowerCase() : Number(b[key]);

      if (av < bv) return direction === 'asc' ? -1 : 1;
      if (av > bv) return direction === 'asc' ? 1 : -1;

      return b.totalInteractions - a.totalInteractions || b.kills - a.kills;
    });

  function flip(nextKey) {
    setSort(
      key === nextKey
        ? [nextKey, direction === 'desc' ? 'asc' : 'desc']
        : [nextKey, nextKey === 'name' ? 'asc' : 'desc'],
    );
  }

  function Header({ id, children, className = '' }) {
    return (
      <th className={`py-3 ${className}`}>
        <button
          onClick={() => flip(id)}
          className={
            key === id
              ? 'font-black text-blue-300'
              : 'font-black hover:text-blue-300'
          }
        >
          {children} {key === id ? (direction === 'desc' ? '↓' : '↑') : '↕'}
        </button>
      </th>
    );
  }

  const log = selected
    ? events.filter((event) => event.guild === selected.name)
    : [];

  return (
    <Panel cls="h-[520px]">
      <div className="flex h-full flex-col">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-xl font-black">🛡 Top Guilds</h3>

          <span className="shrink-0 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-bold text-slate-300">
            {rows.length} guilds
          </span>
        </div>

        {!rows.length ? (
          <p className="text-slate-500">No guild data yet.</p>
        ) : (
          <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-800">
            <div className={`h-full overflow-y-auto pr-1 ${scrollCls}`}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-slate-900 text-xs uppercase text-slate-400">
                  <tr>
                    <Header id="name" className="pl-4 text-left">
                      Guild
                    </Header>

                    <Header id="kills" className="text-center">
                      Kills
                    </Header>

                    <Header id="deaths" className="text-center">
                      Deaths
                    </Header>

                    <Header id="kdNumber" className="pr-4 text-center">
                      K/D
                    </Header>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((guild, index) => (
                    <tr
                      key={guild.name}
                      className="border-t border-slate-800 bg-slate-950/30 hover:bg-slate-900/50"
                    >
                      <td className="py-3 pl-4">
                        <button
                          onClick={() => setSelected(guild)}
                          className="max-w-[220px] truncate rounded-full border border-blue-400/20 bg-blue-500/5 px-3 py-1 text-left font-bold hover:border-blue-300 hover:bg-blue-500/15 hover:text-blue-300"
                        >
                          {index + 1}. {guild.name}
                        </button>
                      </td>

                      <td className="py-3 text-center font-black text-blue-300">
                        {guild.kills}
                      </td>

                      <td className="py-3 text-center font-black text-pink-300">
                        {guild.deaths}
                      </td>

                      <td
                        className={`py-3 pr-4 text-center font-black ${
                          Number(guild.kd) >= 1
                            ? 'text-emerald-300'
                            : 'text-rose-300'
                        }`}
                      >
                        {guild.kd}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {selected && (
          <Popup
            title={`${selected.name} Kill Log`}
            close={() => setSelected(null)}
          >
            {!log.length ? (
              <p className="text-slate-500">No kill log found for this guild.</p>
            ) : (
              <div
                className={`max-h-[60vh] space-y-2 overflow-y-auto pr-2 ${scrollCls}`}
              >
                {log.map((event, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[82px_1fr_105px] gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-sm"
                  >
                    <div>
                      <b>{event.time}</b>
                      <p className="text-[10px] text-slate-500">{event.date}</p>
                    </div>

                    <p className="truncate">
                      <b
                        className={
                          event.type === 'kill'
                            ? 'text-blue-300'
                            : 'text-pink-300'
                        }
                      >
                        {event.type === 'kill' ? event.killer : event.victim}
                      </b>{' '}
                      {event.type === 'kill' ? 'killed' : 'died to'}{' '}
                      <b>
                        {event.type === 'kill' ? event.victim : event.killer}
                      </b>
                    </p>

                    <span
                      className={
                        event.type === 'kill'
                          ? 'text-blue-300'
                          : 'text-pink-300'
                      }
                    >
                      {event.type === 'kill' ? 'OUR KILL' : 'OUR DEATH'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Popup>
        )}
      </div>
    </Panel>
  );
}

function KillFeedPanel({ killFeeds }) {
  const rows = killFeeds.slice(0, 5);

  return (
    <Panel cls="h-[520px]">
      <div className="flex h-full flex-col">
        <h3 className="mb-4 text-xl font-black">🔥 Kill Feed</h3>

        {!rows.length ? (
          <p className="text-slate-500">No kill feeds yet.</p>
        ) : (
          <div className="grid gap-2">
            {rows.map((feed, index) => (
              <div
                key={index}
                className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <b className="truncate text-sm">
                    {index + 1}. {feed.name}
                  </b>

                  <b className="shrink-0 text-sm text-orange-300">
                    🔥 {feed.count}
                  </b>
                </div>

                <p className="truncate text-[11px] text-slate-400">
                  {feed.start}-{feed.end} · {feed.war}
                </p>

                <p className="truncate text-[11px] text-slate-500">
                  {feed.victims.join(', ')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

export default function OverviewPage({ stats, label, members }) {
  const killFeeds = calculateKillFeed(stats.ev, 10, true);

  return (
    <>
      <header className="rounded-3xl border border-slate-700 bg-slate-950/70 p-5">
        <div className="mb-4">
          <h2 className="text-2xl font-black">Battle Analytics</h2>
          <p className="text-slate-400">{label}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            icon="⚔"
            label="Total Kills"
            value={stats.kills}
            sub="Eliminations"
            className="border-blue-400/25 from-blue-500/20 text-blue-300"
          />

          <Metric
            icon="☠"
            label="Total Deaths"
            value={stats.deaths}
            sub="Deaths"
            className="border-pink-400/25 from-pink-500/20 text-pink-300"
          />

          <Metric
            icon="✦"
            label="K/D"
            value={stats.kd}
            sub="Ratio"
            className="border-violet-400/25 from-violet-500/20 text-violet-300"
          />

          <Metric
            icon="♟"
            label="Players"
            value={stats.players.length}
            sub="Active"
            className="border-emerald-400/25 from-emerald-500/20 text-emerald-300"
          />
        </div>
      </header>

      <KillDeathChart data={stats.line} title="▧ Global Kill/Death Timeline" />

      <section className="grid items-stretch gap-4 xl:grid-cols-[420px_1fr]">
        <BestOverall
          players={stats.players}
          members={members}
          events={stats.ev}
        />

        <PlayerOverview
          players={stats.players}
          streaks={stats.st}
          feeds={stats.fd}
          events={stats.ev}
        />
      </section>

      <section className="grid items-stretch gap-4 xl:grid-cols-2">
        <TopGuilds guilds={stats.guilds} events={stats.ev} />

        <KillFeedPanel killFeeds={killFeeds} />
      </section>
    </>
  );
}
