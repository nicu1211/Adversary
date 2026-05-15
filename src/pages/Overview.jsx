import React, { useMemo, useState } from 'react';
import { Panel, Metric, Popup } from '../components/UI';
import { KillDeathChart } from '../components/Charts';
import {
  add,
  scrollCls,
  calculateKillFeed,
  calculateStats,
} from '../lib/logUtils';

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

function timeToSecondsValue(time) {
  const raw = String(time || '').trim();

  if (!raw) return 0;

  const parts = raw.split(':').map((part) => Number(part) || 0);

  if (parts.length === 1) return parts[0];

  if (parts.length === 2) {
    return parts[0] * 3600 + parts[1] * 60;
  }

  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

function looksLikeDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim());
}

function cleanGuild(value) {
  const text = String(value || '').trim();

  if (!text || looksLikeDate(text)) return '';

  return text;
}

function majorityGuildFromEvents(events = []) {
  const guildCounts = {};

  [...(events || [])].forEach((event) => {
    const guild = cleanGuild(event.guild);

    if (!guild) return;

    guildCounts[guild] = (guildCounts[guild] || 0) + 1;
  });

  return (
    Object.entries(guildCounts).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];

      return a[0].localeCompare(b[0]);
    })[0]?.[0] || ''
  );
}

function majorityGuildForKillFeed(feed, events = []) {
  const startSec = timeToSecondsValue(feed.start);
  const endSec = timeToSecondsValue(feed.end);
  const victims = new Set(feed.victims || []);
  const guildCounts = {};

  [...(events || [])]
    .filter((event) => {
      if (event.type !== 'kill') return false;
      if (event.killer !== feed.name) return false;

      const eventSec = timeToSecondsValue(event.time);
      const insideWindow =
        eventSec >= Math.min(startSec, endSec) &&
        eventSec <= Math.max(startSec, endSec);

      const victimMatches = !victims.size || victims.has(event.victim);

      return insideWindow && victimMatches;
    })
    .forEach((event) => {
      const guild = cleanGuild(event.guild);

      if (!guild) return;

      guildCounts[guild] = (guildCounts[guild] || 0) + 1;
    });

  const majorityGuild = Object.entries(guildCounts).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];

    return a[0].localeCompare(b[0]);
  })[0]?.[0];

  return majorityGuild || cleanGuild(feed.guild) || cleanGuild(feed.war) || '-';
}

function BestOverall({
  players,
  members,
  streaks,
  feeds,
  events,
  selectedLogs,
}) {
  const [query, setQuery] = useState('');

  const byName = Object.fromEntries(
    players.map((player) => [player.name, player]),
  );

  const names = [
    ...new Set([
      ...(members || []).map((member) => member.name),
      ...players.map((player) => player.name),
    ]),
  ];

  function statsHasTimeline(oneStats) {
    if (oneStats?.hasTimeline) return true;

    return (oneStats?.ev || []).some(
      (event) =>
        event?.hasTimestamp !== false &&
        event?.source !== 'summary' &&
        event?.time != null,
    );
  }

  function buildRowsFromStats(oneStats) {
    const hasTimeline = statsHasTimeline(oneStats);

    const oneByName = Object.fromEntries(
      oneStats.players.map((player) => [player.name, player]),
    );

    return oneStats.players.map((player) => {
      const fullPlayer = oneByName[player.name] || {
        name: player.name,
        kills: 0,
        deaths: 0,
        kd: '0.00',
      };

      return {
        ...fullPlayer,
        kdNumber: Number(fullPlayer.kd),
        streak: hasTimeline ? oneStats.st[player.name] || 0 : null,
        feed: hasTimeline ? oneStats.fd[player.name] || 0 : null,
      };
    });
  }

  function rankRows(rows, key, desc = true) {
    const sorted = [...rows].sort((a, b) => {
      const av = Number(a[key]) || 0;
      const bv = Number(b[key]) || 0;

      if (av < bv) return desc ? 1 : -1;
      if (av > bv) return desc ? -1 : 1;
      return 0;
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

  function rankKillsForStats(oneStats, rows) {
    const hasTimeline = statsHasTimeline(oneStats);

    if (!hasTimeline) {
      return rankRows(rows, 'kills', true);
    }

    const reach = {};
    const run = {};

    [...(oneStats.ev || [])]
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) || a.sec - b.sec || a.i - b.i,
      )
      .filter((event) => event.type === 'kill')
      .forEach((event) => {
        run[event.killer] = (run[event.killer] || 0) + 1;

        const finalKills =
          rows.find((player) => player.name === event.killer)?.kills || 0;

        if (finalKills && run[event.killer] === finalKills) {
          reach[event.killer] =
            event.date +
            ' ' +
            String(event.sec).padStart(5, '0') +
            ' ' +
            String(event.i).padStart(5, '0');
        }
      });

    return Object.fromEntries(
      [...rows]
        .sort(
          (a, b) =>
            b.kills - a.kills ||
            (reach[a.name] || '9999').localeCompare(reach[b.name] || '9999'),
        )
        .map((player, index) => [player.name, index + 1]),
    );
  }

  function feedTimeKey(feed) {
    return [
      feed.date || '9999-99-99',
      String(timeToSecondsValue(feed.start)).padStart(8, '0'),
      String(feed.id || ''),
      String(feed.name || ''),
    ].join(' ');
  }

  function rankFeedForStats(oneStats, rows) {
    const hasTimeline = statsHasTimeline(oneStats);

    if (!hasTimeline) return {};

    const feedDetails = calculateKillFeed(oneStats.ev || [], 10, true);
    const feedMeta = {};

    feedDetails.forEach((feed) => {
      const current = feedMeta[feed.name];
      const next = {
        count: Number(feed.count) || 0,
        firstKey: feedTimeKey(feed),
      };

      if (
        !current ||
        next.count > current.count ||
        (next.count === current.count && next.firstKey < current.firstKey)
      ) {
        feedMeta[feed.name] = next;
      }
    });

    return Object.fromEntries(
      [...rows]
        .sort((a, b) => {
          const aFeed = feedMeta[a.name] || {
            count: Number(a.feed) || 0,
            firstKey: '9999-99-99 99999999',
          };

          const bFeed = feedMeta[b.name] || {
            count: Number(b.feed) || 0,
            firstKey: '9999-99-99 99999999',
          };

          return (
            bFeed.count - aFeed.count ||
            aFeed.firstKey.localeCompare(bFeed.firstKey) ||
            a.name.localeCompare(b.name)
          );
        })
        .map((player, index) => [player.name, index + 1]),
    );
  }

  function calculateAverageRanksFromSelectedLogs() {
    const result = {};

    (selectedLogs || []).forEach((log) => {
      const oneStats = calculateStats([log]);
      const hasTimeline = statsHasTimeline(oneStats);
      const rows = buildRowsFromStats(oneStats);

      if (!rows.length) return;

      const ranks = {
        kills: rankKillsForStats(oneStats, rows),
        deaths: rankRows(rows, 'deaths', false),
        kd: rankRows(rows, 'kdNumber', true),
        streak: hasTimeline ? rankRows(rows, 'streak', true) : {},
        feed: hasTimeline ? rankFeedForStats(oneStats, rows) : {},
      };

      rows.forEach((player) => {
        const name = player.name;

        if (!result[name]) {
          result[name] = {
            matches: 0,
            kills: 0,
            deaths: 0,
            kd: 0,
            streak: 0,
            feed: 0,
            streakMatches: 0,
            feedMatches: 0,
            metricCount: 0,
          };
        }

        result[name].matches += 1;

        result[name].kills += ranks.kills[name] || 0;
        result[name].deaths += ranks.deaths[name] || 0;
        result[name].kd += ranks.kd[name] || 0;
        result[name].metricCount += 3;

        if (hasTimeline) {
          result[name].streak += ranks.streak[name] || 0;
          result[name].feed += ranks.feed[name] || 0;
          result[name].streakMatches += 1;
          result[name].feedMatches += 1;
          result[name].metricCount += 2;
        }
      });
    });

    return Object.fromEntries(
      Object.entries(result).map(([name, data]) => {
        const matches = Math.max(1, data.matches);
        const metricCount = Math.max(1, data.metricCount);

        const averageRanks = {
          kills: data.kills / matches,
          deaths: data.deaths / matches,
          kd: data.kd / matches,
          streak: data.streakMatches ? data.streak / data.streakMatches : null,
          feed: data.feedMatches ? data.feed / data.feedMatches : null,
        };

        return [
          name,
          {
            matches: data.matches,
            ranks: averageRanks,
            average:
              (data.kills +
                data.deaths +
                data.kd +
                (data.streakMatches ? data.streak : 0) +
                (data.feedMatches ? data.feed : 0)) /
              metricCount,
          },
        ];
      }),
    );
  }

  const averageRanks = calculateAverageRanksFromSelectedLogs();

  const rows = names.map((name) => {
    const player = byName[name] || {
      name,
      kills: 0,
      deaths: 0,
      kd: '0.00',
    };

    return {
      ...player,
      kdNumber: Number(player.kd),
      streak:
        averageRanks[name]?.ranks.streak == null ? null : streaks[name] || 0,
      feed: averageRanks[name]?.ranks.feed == null ? null : feeds[name] || 0,
      average: averageRanks[name]?.average ?? 9999,
      matches: averageRanks[name]?.matches ?? 0,
      averageRankKills: averageRanks[name]?.ranks.kills ?? null,
      averageRankDeaths: averageRanks[name]?.ranks.deaths ?? null,
      averageRankKd: averageRanks[name]?.ranks.kd ?? null,
      averageRankStreak: averageRanks[name]?.ranks.streak ?? null,
      averageRankFeed: averageRanks[name]?.ranks.feed ?? null,
    };
  });

  const final = rows
    .filter((player) => player.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.average - b.average);

  function formatAverageRank(value) {
    return value == null ? '-' : Number(value).toFixed(2);
  }

  return (
    <Panel cls="h-[680px]">
      <div className="flex h-full flex-col">
        <h3 className="text-xl font-black">♛ Best Overall</h3>

        <p className="mb-3 text-xs text-slate-400">
          Average of selected match ranks
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

                    <span className="ml-2 text-xs font-bold text-slate-500">
                      {player.matches} wars
                    </span>
                  </b>

                  <span className="rounded-md border border-blue-400/20 bg-blue-500/5 px-2 py-1 text-sm font-black text-blue-300">
                    <small className="mr-1 text-[9px] uppercase text-blue-200/80">
                      Avg
                    </small>

                    {player.average === 9999 ? '-' : player.average.toFixed(2)}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-1 text-center text-xs">
                  {[
                    [
                      'Kills',
                      formatAverageRank(player.averageRankKills),
                      'text-blue-300',
                    ],
                    [
                      'Deaths',
                      formatAverageRank(player.averageRankDeaths),
                      'text-pink-300',
                    ],
                    [
                      'K/D',
                      formatAverageRank(player.averageRankKd),
                      'text-emerald-300',
                    ],
                    [
                      'Streak',
                      formatAverageRank(player.averageRankStreak),
                      'text-slate-200',
                    ],
                    [
                      'Feed',
                      formatAverageRank(player.averageRankFeed),
                      'text-orange-300',
                    ],
                  ].map((item) => (
                    <div
                      key={item[0]}
                      className="rounded-md bg-slate-950/70 p-1"
                    >
                      <p className="text-slate-500">{item[0]}</p>
                      <b className={item[2]}>
                        {item[1] === '-' ? '-' : `#${item[1]}`}
                      </b>
                    </div>
                  ))}
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

function EnemyGuilds({ guilds, events }) {
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);

  const rows = useMemo(
    () =>
      [...(guilds || [])]
        .map((guild) => {
          const kills = Number(guild.deaths) || 0;
          const deaths = Number(guild.kills) || 0;
          const totalInteractions = kills + deaths;
          const kdNumber = deaths > 0 ? kills / deaths : kills > 0 ? kills : 0;

          return {
            ...guild,
            kills,
            deaths,
            totalInteractions,
            kdNumber,
            kd: kdNumber.toFixed(2),
          };
        })
        .filter((guild) => guild.totalInteractions > 0)
        .sort(
          (a, b) =>
            b.totalInteractions - a.totalInteractions ||
            b.kdNumber - a.kdNumber ||
            a.name.localeCompare(b.name),
        ),
    [guilds],
  );

  const width = 820;
  const height = 390;
  const pad = { top: 24, right: 28, bottom: 42, left: 56 };

  const chart = useMemo(() => {
    if (!rows.length) return null;

    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;

    const maxKillsRaw = Math.max(1, ...rows.map((item) => item.kills));
    const maxDeathsRaw = Math.max(1, ...rows.map((item) => item.deaths));
    const maxKdRaw = Math.max(1, ...rows.map((item) => item.kdNumber));

    const xMax = Math.max(2, Math.ceil(maxKillsRaw * 1.12));
    const yMax = Math.max(2, Math.ceil(maxDeathsRaw * 1.12));
    const maxKd = Math.max(1, Math.min(12, maxKdRaw));

    function xScale(value) {
      return pad.left + (Math.max(0, value) / xMax) * innerW;
    }

    function yScale(value) {
      return pad.top + innerH - (Math.max(0, value) / yMax) * innerH;
    }

    function radiusScale(value) {
      const safe = Math.max(0, Math.min(maxKd, value));
      const ratio = maxKd <= 0 ? 0 : safe / maxKd;

      return 18 + Math.sqrt(ratio) * 24;
    }

    const duplicateGroups = rows.reduce((acc, item) => {
      const key = `${item.kills}|${item.deaths}`;

      if (!acc[key]) acc[key] = [];
      acc[key].push(item.name);

      return acc;
    }, {});

    const points = rows.slice(0, 24).map((item) => {
      const key = `${item.kills}|${item.deaths}`;
      const group = duplicateGroups[key] || [item.name];
      const dupTotal = group.length;
      const dupIndex = group.indexOf(item.name);

      const baseX = xScale(item.kills);
      const baseY = yScale(item.deaths);

      let cx = baseX;
      let cy = baseY;

      if (dupTotal > 1 && dupIndex >= 0) {
        const offsetRadius = Math.min(18, 8 + dupTotal * 2);
        const angle = (Math.PI * 2 * dupIndex) / dupTotal;

        cx += Math.cos(angle) * offsetRadius;
        cy += Math.sin(angle) * offsetRadius;
      }

      return {
        ...item,
        cx,
        cy,
        baseX,
        baseY,
        radius: radiusScale(item.kdNumber),
      };
    });

    const xTicks = 5;
    const yTicks = 5;

    return {
      xMax,
      yMax,
      points,
      xScale,
      yScale,
      xTickValues: Array.from({ length: xTicks }, (_, i) =>
        Math.round((xMax * i) / (xTicks - 1)),
      ),
      yTickValues: Array.from({ length: yTicks }, (_, i) =>
        Math.round((yMax * i) / (yTicks - 1)),
      ),
    };
  }, [rows]);

  const log = selected
    ? events.filter((event) => event.guild === selected.name)
    : [];

  function shortName(name) {
    const text = String(name || '-');

    if (text.length <= 12) return text;
    return `${text.slice(0, 8)}…${text.slice(-2)}`;
  }

  const tooltipBelow = hovered ? hovered.cy < 92 : false;

  const tooltipHorizontalTransform = hovered
    ? hovered.cx < 170
      ? '-8%'
      : hovered.cx > width - 170
        ? '-92%'
        : '-50%'
    : '-50%';

  const tooltipVerticalTransform = tooltipBelow
    ? '12px'
    : 'calc(-100% - 12px)';

  return (
    <Panel cls="h-[520px]">
      <div className="flex h-full flex-col">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-xl font-black">🛡 Enemy Guilds</h3>

          <span className="shrink-0 rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-bold text-slate-300">
            {rows.length} guilds
          </span>
        </div>

        {!chart ? (
          <p className="text-slate-500">No guild data yet.</p>
        ) : (
          <div
            className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/30"
            onMouseLeave={() => setHovered(null)}
          >
            {hovered && (
              <div
                className="pointer-events-none absolute z-20 rounded-xl border border-slate-700 bg-slate-950/95 px-3 py-2 text-xs shadow-2xl backdrop-blur"
                style={{
                  left: `${(hovered.cx / width) * 100}%`,
                  top: `${(hovered.cy / height) * 100}%`,
                  transform: `translate(${tooltipHorizontalTransform}, ${tooltipVerticalTransform})`,
                }}
              >
                <p className="mb-1 font-black text-slate-100">{hovered.name}</p>
                <p className="font-bold text-blue-300">
                  Kills: {hovered.kills}
                </p>
                <p className="font-bold text-pink-300">
                  Deaths: {hovered.deaths}
                </p>
                <p className="font-bold text-violet-300">K/D: {hovered.kd}</p>
              </div>
            )}

            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="h-full w-full"
              role="img"
              aria-label="Enemy Guilds bubble chart"
            >
              <defs>
                <linearGradient id="enemyChartBg" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="rgba(15,23,42,0.95)" />
                  <stop offset="50%" stopColor="rgba(17,24,39,0.88)" />
                  <stop offset="100%" stopColor="rgba(8,15,31,0.94)" />
                </linearGradient>

                <radialGradient
                  id="enemyChartGlow"
                  cx="50%"
                  cy="12%"
                  r="85%"
                >
                  <stop offset="0%" stopColor="rgba(59,130,246,0.13)" />
                  <stop offset="45%" stopColor="rgba(99,102,241,0.07)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                </radialGradient>

                <radialGradient
                  id="enemyBubbleGood"
                  cx="35%"
                  cy="28%"
                  r="75%"
                >
                  <stop offset="0%" stopColor="rgba(191,219,254,0.98)" />
                  <stop offset="18%" stopColor="rgba(125,211,252,0.92)" />
                  <stop offset="55%" stopColor="rgba(59,130,246,0.80)" />
                  <stop offset="100%" stopColor="rgba(37,99,235,0.50)" />
                </radialGradient>

                <radialGradient
                  id="enemyBubbleBad"
                  cx="35%"
                  cy="28%"
                  r="75%"
                >
                  <stop offset="0%" stopColor="rgba(253,164,175,0.98)" />
                  <stop offset="18%" stopColor="rgba(244,114,182,0.92)" />
                  <stop offset="55%" stopColor="rgba(236,72,153,0.80)" />
                  <stop offset="100%" stopColor="rgba(190,24,93,0.48)" />
                </radialGradient>

                <filter
                  id="enemyBubbleGlow"
                  x="-90%"
                  y="-90%"
                  width="280%"
                  height="280%"
                >
                  <feGaussianBlur stdDeviation="10" result="blur1" />
                  <feMerge>
                    <feMergeNode in="blur1" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>

                <filter
                  id="enemyBubbleSoft"
                  x="-90%"
                  y="-90%"
                  width="280%"
                  height="280%"
                >
                  <feGaussianBlur stdDeviation="5" result="blur2" />
                  <feMerge>
                    <feMergeNode in="blur2" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <rect
                x="0"
                y="0"
                width={width}
                height={height}
                rx="18"
                fill="url(#enemyChartBg)"
              />
              <rect
                x="0"
                y="0"
                width={width}
                height={height}
                rx="18"
                fill="url(#enemyChartGlow)"
              />

              {chart.yTickValues.map((tick) => {
                const y = chart.yScale(tick);

                return (
                  <g key={`y-${tick}`}>
                    <line
                      x1={pad.left}
                      y1={y}
                      x2={width - pad.right}
                      y2={y}
                      stroke="rgba(255,255,255,0.07)"
                      strokeWidth="1"
                    />
                    <text
                      x={pad.left - 10}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="10"
                      fill="rgba(255,255,255,0.34)"
                    >
                      {tick}
                    </text>
                  </g>
                );
              })}

              {chart.xTickValues.map((tick) => {
                const x = chart.xScale(tick);

                return (
                  <g key={`x-${tick}`}>
                    <line
                      x1={x}
                      y1={pad.top}
                      x2={x}
                      y2={height - pad.bottom}
                      stroke="rgba(255,255,255,0.055)"
                      strokeWidth="1"
                      strokeDasharray="3 5"
                    />
                    <text
                      x={x}
                      y={height - 14}
                      textAnchor="middle"
                      fontSize="10"
                      fill="rgba(255,255,255,0.34)"
                    >
                      {tick}
                    </text>
                  </g>
                );
              })}

              <line
                x1={pad.left}
                y1={height - pad.bottom}
                x2={width - pad.right}
                y2={height - pad.bottom}
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="1.4"
              />

              <line
                x1={pad.left}
                y1={pad.top}
                x2={pad.left}
                y2={height - pad.bottom}
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="1.4"
              />

              <text
                x={(pad.left + (width - pad.right)) / 2}
                y={height - 4}
                textAnchor="middle"
                fontSize="11"
                fontWeight="800"
                fill="rgba(255,255,255,0.55)"
              >
                Kills
              </text>

              <text
                x="16"
                y={height / 2}
                textAnchor="middle"
                fontSize="11"
                fontWeight="800"
                fill="rgba(255,255,255,0.55)"
                transform={`rotate(-90 16 ${height / 2})`}
              >
                Deaths
              </text>

              {hovered && (
                <g pointerEvents="none">
                  <line
                    x1={pad.left}
                    y1={hovered.cy}
                    x2={width - pad.right}
                    y2={hovered.cy}
                    stroke="rgba(255,255,255,0.12)"
                    strokeDasharray="4 5"
                  />
                  <line
                    x1={hovered.cx}
                    y1={pad.top}
                    x2={hovered.cx}
                    y2={height - pad.bottom}
                    stroke="rgba(255,255,255,0.12)"
                    strokeDasharray="4 5"
                  />
                </g>
              )}

              {chart.points.map((guild) => {
                const fillId =
                  guild.kdNumber >= 1 ? 'enemyBubbleGood' : 'enemyBubbleBad';
                const strokeColor =
                  guild.kdNumber >= 1
                    ? 'rgba(191,219,254,0.92)'
                    : 'rgba(253,164,175,0.90)';

                const fontSize =
                  guild.radius >= 34 ? 12 : guild.radius >= 28 ? 11 : 10;

                return (
                  <g
                    key={guild.name}
                    className="cursor-pointer"
                    onMouseEnter={() => setHovered(guild)}
                    onClick={() => setSelected(guild)}
                  >
                    <circle
                      cx={guild.cx}
                      cy={guild.cy}
                      r={guild.radius + 4}
                      fill={
                        guild.kdNumber >= 1
                          ? 'rgba(59,130,246,0.10)'
                          : 'rgba(244,114,182,0.10)'
                      }
                      filter="url(#enemyBubbleGlow)"
                    />

                    <circle
                      cx={guild.cx}
                      cy={guild.cy}
                      r={guild.radius}
                      fill={`url(#${fillId})`}
                      stroke={strokeColor}
                      strokeWidth="1.5"
                      filter="url(#enemyBubbleSoft)"
                    />

                    <circle
                      cx={guild.cx - guild.radius * 0.3}
                      cy={guild.cy - guild.radius * 0.32}
                      r={Math.max(4, guild.radius * 0.16)}
                      fill="rgba(255,255,255,0.26)"
                    />

                    <text
                      x={guild.cx}
                      y={guild.cy - 4}
                      textAnchor="middle"
                      fontSize={fontSize}
                      fontWeight="900"
                      fill="rgba(248,250,252,0.95)"
                    >
                      {shortName(guild.name)}
                    </text>

                    <text
                      x={guild.cx}
                      y={guild.cy + 12}
                      textAnchor="middle"
                      fontSize="10"
                      fontWeight="800"
                      fill="rgba(226,232,240,0.88)"
                    >
                      KD {guild.kd}
                    </text>
                  </g>
                );
              })}
            </svg>
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

function KillFeedPanel({ killFeeds, events }) {
  const rows = killFeeds.slice(0, 5);

  return (
    <Panel cls="h-[520px]">
      <div className="flex h-full flex-col">
        <h3 className="mb-4 text-xl font-black">🔥 Kill Feed</h3>

        {!rows.length ? (
          <p className="text-slate-500">No kill feeds yet.</p>
        ) : (
          <div className="grid gap-2">
            {rows.map((feed, index) => {
              const guild = majorityGuildForKillFeed(feed, events);

              return (
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
                    {feed.start}-{feed.end}
                  </p>

                  <p className="truncate text-[11px] font-bold text-slate-300">
                    {guild}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Panel>
  );
}

export default function OverviewPage({
  stats,
  label,
  members,
  selectedLogs,
}) {
  const killFeeds = calculateKillFeed(stats.ev, 10, true);
  const showTimelineMarkers = (selectedLogs || []).length === 1;

  function eventSortValue(event) {
    return [
      String(event?.date || ''),
      String(timeToSecondsValue(event?.time)).padStart(8, '0'),
      String(Number(event?.i) || 0).padStart(6, '0'),
    ].join(' ');
  }

  function buildConsecutiveFlowMarkers(events) {
    const markers = [];
    let currentType = null;
    let run = [];
    let markerAddedForRun = false;

    const timelineEvents = [...(events || [])]
      .filter((event) => event.type === 'kill' || event.type === 'death')
      .sort((a, b) => eventSortValue(a).localeCompare(eventSortValue(b)));

    timelineEvents.forEach((event) => {
      const nextType = event.type;

      if (nextType !== currentType) {
        currentType = nextType;
        run = [event];
        markerAddedForRun = false;
      } else {
        run.push(event);
      }

      if (run.length >= 10 && !markerAddedForRun) {
        const windowEvents = run.slice(-10);
        const startEvent = windowEvents[0];
        const endEvent = windowEvents[windowEvents.length - 1];

        const startSec = timeToSecondsValue(startEvent.time);
        const endSec = timeToSecondsValue(endEvent.time);
        const isInsideThirtySeconds = endSec - startSec <= 30;

        if (!isInsideThirtySeconds) return;

        const markerType = currentType === 'kill' ? 'bluefeed' : 'redfeed';
        const feedLabel = currentType === 'kill' ? 'Bluefeed' : 'Redfeed';
        const markerTime = startEvent.time;
        const guild =
          majorityGuildFromEvents(windowEvents) ||
          cleanGuild(startEvent.guild) ||
          cleanGuild(endEvent.guild) ||
          '-';

        markers.push({
          id: `${markerType}-${markerTime}-${guild}-${markers.length}`,
          markerType,
          feedLabel,
          time: markerTime,
          seconds: timeToSecondsValue(markerTime),
          guild,
        });

        markerAddedForRun = true;
      }
    });

    return markers;
  }

  const topKillFeedMarkers = showTimelineMarkers
    ? killFeeds.slice(0, 5).map((feed, index) => {
        const markerTime = feed.start;
        const markerSeconds = timeToSecondsValue(markerTime);
        const guild = majorityGuildForKillFeed(feed, stats.ev || []);

        return {
          id: `${feed.name || 'killfeed'}-${markerTime || index}-${guild}-${index}`,
          markerType: 'killfeed',
          time: markerTime,
          seconds: markerSeconds,
          guild,
          player: feed.name || '-',
          count: Number(feed.count) || 0,
          victims: feed.victims || [],
        };
      })
    : [];

  const flowMarkers = showTimelineMarkers
    ? buildConsecutiveFlowMarkers(stats.ev || [])
    : [];

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

      <KillDeathChart
        data={stats.line}
        title="▧ Global Kill/Death Timeline"
        killFeedMarkers={[...topKillFeedMarkers, ...flowMarkers]}
      />

      <section className="grid items-stretch gap-4 xl:grid-cols-[420px_1fr]">
        <BestOverall
          players={stats.players}
          members={members}
          streaks={stats.st}
          feeds={stats.fd}
          events={stats.ev}
          selectedLogs={selectedLogs}
        />

        <PlayerOverview
          players={stats.players}
          streaks={stats.st}
          feeds={stats.fd}
          events={stats.ev}
        />
      </section>

      <section className="grid items-stretch gap-4 xl:grid-cols-[1fr_0.5fr_0.5fr]">
        <EnemyGuilds guilds={stats.guilds} events={stats.ev} />

        <KillFeedPanel killFeeds={killFeeds} events={stats.ev} />

        <div className="hidden xl:block" />
      </section>
    </>
  );
}
