import React, { useState } from 'react';
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
      <h3 className="mb-4 text-lg font-black">{title}</h3>

      {!rows.length ? (
        <p className="text-sm text-slate-500">No data yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((item, index) => {
            const value = Number(item[valueKey]) || 0;
            const width = Math.max(5, Math.round((value / max) * 100));

            return (
              <div key={`${title}-${item.name}`}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-bold text-slate-200">
                    {index + 1}. {item.name}
                  </span>
                  <span className="font-black text-white">{value}</span>
                </div>

                <div className="h-2 rounded-full bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
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
      ...(members || []).map((member) => member.name).filter(Boolean),
      ...players.map((player) => player.name).filter(Boolean),
    ]),
  ];

  function statHasTimeline(oneStats) {
    return Boolean(
      oneStats?.hasTimeline ||
        (oneStats?.ev || []).some((event) => event.hasTimestamp !== false),
    );
  }

  function buildRowsFromStats(oneStats) {
    const hasTimeline = statHasTimeline(oneStats);

    return oneStats.players.map((player) => ({
      ...player,
      kdNumber: Number(player.kd) || 0,
      streak: hasTimeline ? oneStats.st[player.name] || 0 : null,
      feed: hasTimeline ? oneStats.fd[player.name] || 0 : null,
      hasTimeline,
    }));
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
    const hasTimeline = statHasTimeline(oneStats);

    if (!hasTimeline) {
      return rankRows(rows, 'kills', true);
    }

    const reach = {};
    const run = {};

    [...(oneStats.ev || [])]
      .sort(
        (a, b) =>
          a.date.localeCompare(b.date) ||
          a.sec - b.sec ||
          a.i - b.i,
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

  function calculateAverageRanksFromSelectedLogs() {
    const result = {};

    (selectedLogs || []).forEach((log) => {
      const oneStats = calculateStats([log]);
      const hasTimeline = statHasTimeline(oneStats);
      const rows = buildRowsFromStats(oneStats);

      if (!rows.length) return;

      const ranks = {
        kills: rankKillsForStats(oneStats, rows),
        deaths: rankRows(rows, 'deaths', false),
        kd: rankRows(rows, 'kdNumber', true),
        streak: hasTimeline ? rankRows(rows, 'streak', true) : {},
        feed: hasTimeline ? rankRows(rows, 'feed', true) : {},
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
            metricCount: 0,
            streakMatches: 0,
            feedMatches: 0,
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
          result[name].metricCount += 2;
          result[name].streakMatches += 1;
          result[name].feedMatches += 1;
        }
      });
    });

    return Object.fromEntries(
      Object.entries(result).map(([name, data]) => {
        const matches = Math.max(1, data.matches);

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
              Math.max(1, data.metricCount),
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
    <Panel>
      <h3 className="mb-1 text-xl font-black">♛ Best Overall</h3>
      <p className="mb-4 text-sm text-slate-500">
        Average of selected match ranks
      </p>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search player..."
        className="mb-3 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-400"
      />

      {!final.length ? (
        <p className="text-sm text-slate-500">No players.</p>
      ) : (
        <div className={`max-h-[520px] space-y-3 overflow-auto pr-2 ${scrollCls}`}>
          {final.map((player, index) => (
            <div
              key={player.name}
              className="rounded-2xl border border-slate-800 bg-slate-950 p-4"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-white">
                    {index + 1}. {player.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {player.matches} wars
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-slate-500">Avg</p>
                  <p className="text-lg font-black text-blue-300">
                    {player.average === 9999 ? '-' : player.average.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                {[
                  ['Kills', formatAverageRank(player.averageRankKills), 'text-blue-300'],
                  ['Deaths', formatAverageRank(player.averageRankDeaths), 'text-pink-300'],
                  ['K/D', formatAverageRank(player.averageRankKd), 'text-emerald-300'],
                  ['Streak', formatAverageRank(player.averageRankStreak), 'text-slate-200'],
                  ['Feed', formatAverageRank(player.averageRankFeed), 'text-orange-300'],
                ].map((item) => (
                  <div
                    key={`${player.name}-${item[0]}`}
                    className="rounded-xl bg-slate-900 p-2"
                  >
                    <p className="text-slate-500">{item[0]}</p>
                    <p className={`font-black ${item[2]}`}>
                      {item[1] === '-' ? '-' : `#${item[1]}`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
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

  function Header({ id, children }) {
    return (
      <button
        type="button"
        onClick={() => flip(id)}
        className={
          key === id ? 'font-black text-blue-300' : 'font-black hover:text-blue-300'
        }
      >
        {children} {key === id ? (direction === 'desc' ? '↓' : '↑') : '↕'}
      </button>
    );
  }

  const history = selected
    ? events
        .filter(
          (event) => event.killer === selected.name || event.victim === selected.name,
        )
        .sort((a, b) => a.date.localeCompare(b.date) || a.sec - b.sec)
    : [];

  const kills = history.filter((event) => event.killer === selected?.name).length;
  const deaths = history.filter((event) => event.victim === selected?.name).length;
  const kd = deaths ? (kills / deaths).toFixed(2) : kills.toFixed(2);

  const victims = {};
  const nemesis = {};

  history.forEach((event) => {
    if (event.killer === selected?.name) add(victims, event.victim);
    if (event.victim === selected?.name) add(nemesis, event.killer);
  });

  const favourite = Object.entries(victims).sort((a, b) => b[1] - a[1])[0] || ['-', 0];
  const worst = Object.entries(nemesis).sort((a, b) => b[1] - a[1])[0] || ['-', 0];

  return (
    <Panel>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-black">♙ Player Overview</h3>
          <p className="text-sm text-slate-500">
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

      <div className={`overflow-auto ${scrollCls}`}>
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="p-2">
                <Header id="name">Family</Header>
              </th>
              <th className="p-2 text-right">
                <Header id="kills">Kills</Header>
              </th>
              <th className="p-2 text-right">
                <Header id="deaths">Deaths</Header>
              </th>
              <th className="p-2 text-right">
                <Header id="kd">K/D</Header>
              </th>
              <th className="p-2 text-right">
                <Header id="streak">Killstreak</Header>
              </th>
              <th className="p-2 text-right">
                <Header id="feed">KillFeed</Header>
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((player) => (
              <tr key={player.name} className="border-t border-slate-800">
                <td className="p-2">
                  <button
                    type="button"
                    onClick={() => setSelected(player)}
                    className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 font-bold text-cyan-300 hover:border-cyan-300 hover:bg-cyan-500/20"
                  >
                    {player.name}
                  </button>
                </td>
                <td className="p-2 text-right">⚔ {player.kills}</td>
                <td className="p-2 text-right">☠ {player.deaths}</td>
                <td className="p-2 text-right">✺ {player.kd}</td>
                <td className="p-2 text-right">{player.streak}</td>
                <td className="p-2 text-right">{player.feed}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <Popup title={selected.name} close={() => setSelected(null)}>
          <div className="grid gap-3 md:grid-cols-5">
            <Metric label="Kills" value={kills} />
            <Metric label="Deaths" value={deaths} />
            <Metric label="KD" value={kd} />
            <Metric label="Killstreak" value={streaks[selected.name] || 0} />
            <Metric label="Killfeed" value={feeds[selected.name] || 0} />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Panel>
              <h4 className="font-black">Favorite victim</h4>
              <p className="mt-2 text-2xl font-black text-emerald-300">
                {favourite[0]}
              </p>
              <p className="text-sm text-slate-500">{favourite[1]} kills</p>
            </Panel>

            <Panel>
              <h4 className="font-black">Nemesis</h4>
              <p className="mt-2 text-2xl font-black text-rose-300">
                {worst[0]}
              </p>
              <p className="text-sm text-slate-500">{worst[1]} deaths</p>
            </Panel>
          </div>

          <div className={`mt-4 max-h-[50vh] overflow-auto ${scrollCls}`}>
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs uppercase tracking-[0.18em] text-slate-500">
                <tr>
                  <th className="p-2">Time</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Opponent</th>
                  <th className="p-2">Guild / War</th>
                </tr>
              </thead>

              <tbody>
                {history.map((event, index) => (
                  <tr key={`${event.id}-${event.i}-${index}`} className="border-t border-slate-800">
                    <td className="p-2">{event.time}</td>
                    <td className="p-2">
                      {event.killer === selected.name ? 'KILL' : 'DEATH'}
                    </td>
                    <td className="p-2">
                      {event.killer === selected.name ? event.victim : event.killer}
                    </td>
                    <td className="p-2">
                      {event.guild} / {event.war}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Popup>
      )}
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

  function Header({ id, children }) {
    return (
      <button
        type="button"
        onClick={() => flip(id)}
        className={
          key === id ? 'font-black text-blue-300' : 'font-black hover:text-blue-300'
        }
      >
        {children} {key === id ? (direction === 'desc' ? '↓' : '↑') : '↕'}
      </button>
    );
  }

  const log = selected ? events.filter((event) => event.guild === selected.name) : [];

  return (
    <Panel>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xl font-black"> Top Guilds</h3>
        <p className="text-sm text-slate-500">{rows.length} guilds</p>
      </div>

      {!rows.length ? (
        <p className="text-sm text-slate-500">No guild data yet.</p>
      ) : (
        <div className={`overflow-auto ${scrollCls}`}>
          <table className="w-full min-w-[620px] text-sm">
            <thead className="text-left text-xs uppercase tracking-[0.18em] text-slate-500">
              <tr>
                <th className="p-2">
                  <Header id="name">Guild</Header>
                </th>
                <th className="p-2 text-right">
                  <Header id="kills">Kills</Header>
                </th>
                <th className="p-2 text-right">
                  <Header id="deaths">Deaths</Header>
                </th>
                <th className="p-2 text-right">
                  <Header id="kdNumber">K/D</Header>
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.map((guild, index) => (
                <tr key={guild.name} className="border-t border-slate-800">
                  <td className="p-2">
                    <button
                      type="button"
                      onClick={() => setSelected(guild)}
                      className="max-w-[220px] truncate rounded-full border border-blue-400/20 bg-blue-500/5 px-3 py-1 text-left font-bold hover:border-blue-300 hover:bg-blue-500/15 hover:text-blue-300"
                    >
                      {index + 1}. {guild.name}
                    </button>
                  </td>
                  <td className="p-2 text-right">{guild.kills}</td>
                  <td className="p-2 text-right">{guild.deaths}</td>
                  <td
                    className={`p-2 text-right font-black ${
                      guild.kdNumber >= 1 ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  >
                    {guild.kd}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <Popup title={selected.name} close={() => setSelected(null)}>
          {!log.length ? (
            <p className="text-sm text-slate-500">No kill log found for this guild.</p>
          ) : (
            <div className={`max-h-[65vh] overflow-auto ${scrollCls}`}>
              {log.map((event, index) => (
                <div
                  key={`${event.id}-${event.i}-${index}`}
                  className="mb-2 rounded-xl bg-slate-950 p-3"
                >
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{event.time}</span>
                    <span>{event.date}</span>
                  </div>

                  <p className="mt-1 font-bold">
                    {event.type === 'kill' ? event.killer : event.victim}{' '}
                    {event.type === 'kill' ? 'killed' : 'died to'}{' '}
                    <span className="text-blue-300">
                      {event.type === 'kill' ? event.victim : event.killer}
                    </span>
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {event.type === 'kill' ? 'OUR KILL' : 'OUR DEATH'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Popup>
      )}
    </Panel>
  );
}

function KillFeedPanel({ killFeeds }) {
  const rows = killFeeds.slice(0, 5);

  return (
    <Panel>
      <h3 className="mb-4 text-xl font-black"> Kill Feed</h3>

      {!rows.length ? (
        <p className="text-sm text-slate-500">No kill feeds yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((feed, index) => (
            <div
              key={`${feed.name}-${feed.war}-${index}`}
              className="rounded-2xl bg-slate-950 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-black text-white">
                  {index + 1}. {feed.name}
                </p>
                <p className="text-xl font-black text-orange-300">{feed.count}</p>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                {feed.start}-{feed.end} · {feed.war}
              </p>

              <p className="mt-2 text-sm text-slate-300">
                {feed.victims.join(', ')}
              </p>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

export default function OverviewPage({
  stats,
  label,
  members,
  selectedLogs,
}) {
  const emptyStats = {
    ev: [],
    players: [],
    guilds: [],
    line: [],
    kills: 0,
    deaths: 0,
    kd: '0.00',
    st: {},
    fd: {},
    hasTimeline: false,
    summaryOnly: false,
  };

  const safeStats =
    stats?.ev?.length || stats?.players?.length || !selectedLogs?.length
      ? stats || emptyStats
      : calculateStats(selectedLogs);

  const killFeeds = calculateKillFeed(safeStats.ev || [], 10, true);

  const players = safeStats.players || [];
  const guilds = safeStats.guilds || [];

  const topKills = [...players].sort(
    (a, b) => Number(b.kills) - Number(a.kills),
  );

  const topDeaths = [...players].sort(
    (a, b) => Number(b.deaths) - Number(a.deaths),
  );

  const topKd = [...players].sort(
    (a, b) => Number(b.kd) - Number(a.kd),
  );

  return (
    <>
      <div className="mb-6">
        <h2 className="text-3xl font-black">Battle Analytics</h2>
        <p className="text-slate-500">{label}</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Kills" value={safeStats.kills} />
        <Metric label="Deaths" value={safeStats.deaths} />
        <Metric label="K/D" value={safeStats.kd} />
        <Metric label="Players" value={players.length} />
      </div>

      <div className="mb-6">
        <KillDeathChart data={safeStats.line || []} />
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-3">
        <RankList title="Top Kills" items={topKills} valueKey="kills" />
        <RankList title="Most Deaths" items={topDeaths} valueKey="deaths" />
        <RankList title="Best K/D" items={topKd} valueKey="kd" />
      </div>

      <div className="mb-6">
        <BestOverall
          players={players}
          members={members}
          streaks={safeStats.st || {}}
          feeds={safeStats.fd || {}}
          events={safeStats.ev || []}
          selectedLogs={selectedLogs}
        />
      </div>

      <div className="mb-6">
        <PlayerOverview
          players={players}
          streaks={safeStats.st || {}}
          feeds={safeStats.fd || {}}
          events={safeStats.ev || []}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <TopGuilds guilds={guilds} events={safeStats.ev || []} />
        <KillFeedPanel killFeeds={killFeeds} />
      </div>
    </>
  );
}
