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

  function buildRowsFromStats(oneStats) {
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
        streak: oneStats.st[player.name] || 0,
        feed: oneStats.fd[player.name] || 0,
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

  function calculateAverageRanksFromSelectedLogs() {
    const result = {};

    (selectedLogs || []).forEach((log) => {
      const oneStats = calculateStats([log]);
      const rows = buildRowsFromStats(oneStats);

      if (!rows.length) return;

      const ranks = {
        kills: rankKillsForStats(oneStats, rows),
        deaths: rankRows(rows, 'deaths', false),
        kd: rankRows(rows, 'kdNumber', true),
        streak: rankRows(rows, 'streak', true),
        feed: rankRows(rows, 'feed', true),
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
          };
        }

        result[name].matches += 1;
        result[name].kills += ranks.kills[name] || 0;
        result[name].deaths += ranks.deaths[name] || 0;
        result[name].kd += ranks.kd[name] || 0;
        result[name].streak += ranks.streak[name] || 0;
        result[name].feed += ranks.feed[name] || 0;
      });
    });

    return Object.fromEntries(
      Object.entries(result).map(([name, data]) => {
        const matches = Math.max(1, data.matches);

        const averageRanks = {
          kills: data.kills / matches,
          deaths: data.deaths / matches,
          kd: data.kd / matches,
          streak: data.streak / matches,
          feed: data.feed / matches,
        };

        return [
          name,
          {
            matches: data.matches,
            ranks: averageRanks,
            average:
              (averageRanks.kills +
                averageRanks.deaths +
                averageRanks.kd +
                averageRanks.streak +
                averageRanks.feed) /
              5,
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
      streak: streaks[name] || 0,
      feed: feeds[name] || 0,
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

  const targetRows = [
    ...new Set([...Object.keys(victims), ...Object.keys(nemesis)]),
  ]
    .map((name) => ({
      name,
      favourite: victims[name] || 0,
      nemesis: nemesis[name] || 0,
    }))
    .sort(
      (a, b) =>
        Math.max(b.favourite, b.nemesis) -
          Math.max(a.favourite, a.nemesis) ||
        b.favourite - a.favourite ||
        b.nemesis - a.nemesis,
    );

  const targetMax = Math.max(
    1,
    ...targetRows.flatMap((row) => [row.favourite, row.nemesis]),
  );

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

            <div className="mb-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="mb-3 grid grid-cols-[1fr_1px_1fr] items-center gap-0 text-xs font-black uppercase tracking-wide text-slate-400">
                <div className="pr-4 text-right text-blue-300">
                  Favourite Targets
                </div>
                <div className="h-4 bg-slate-600/80" />
                <div className="pl-4 text-left text-pink-300">Nemesis</div>
              </div>

              {!targetRows.length ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  No target data for this player.
                </p>
              ) : (
                <div
                  className={`max-h-[320px] space-y-2 overflow-y-auto pr-2 ${scrollCls}`}
                >
                  {targetRows.map((row) => {
                    const favouriteWidth = Math.max(
                      row.favourite ? 7 : 0,
                      Math.round((row.favourite / targetMax) * 100),
                    );

                    const nemesisWidth = Math.max(
                      row.nemesis ? 7 : 0,
                      Math.round((row.nemesis / targetMax) * 100),
                    );

                    return (
                      <div key={row.name}>
                        <div className="mb-1 flex items-center justify-center text-xs font-bold text-slate-300">
                          <span className="max-w-[260px] truncate rounded-full border border-slate-700 bg-slate-950/80 px-3 py-1">
                            {row.name}
                          </span>
                        </div>

                        <div className="relative grid h-8 grid-cols-2 overflow-hidden rounded-xl border border-slate-800 bg-slate-950/70">
                          <div className="absolute left-1/2 top-0 z-10 h-full w-px -translate-x-1/2 bg-slate-500/80" />

                          <div className="relative flex items-center justify-end">
                            {row.favourite > 0 && (
                              <div
                                className="flex h-full items-center justify-start rounded-l-xl bg-gradient-to-l from-blue-400/95 via-blue-500/70 to-blue-500/20 px-2 text-xs font-black text-blue-50 shadow-[0_0_18px_rgba(59,130,246,0.25)]"
                                style={{ width: `${favouriteWidth}%` }}
                              >
                                {row.favourite}
                              </div>
                            )}
                          </div>

                          <div className="relative flex items-center justify-start">
                            {row.nemesis > 0 && (
                              <div
                                className="flex h-full items-center justify-end rounded-r-xl bg-gradient-to-r from-pink-400/95 via-rose-500/70 to-rose-500/20 px-2 text-xs font-black text-rose-50 shadow-[0_0_18px_rgba(244,63,94,0.25)]"
                                style={{ width: `${nemesisWidth}%` }}
                              >
                                {row.nemesis}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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

export default function OverviewPage({
  stats,
  label,
  members,
  selectedLogs,
}) {
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

      <section className="grid items-stretch gap-4 xl:grid-cols-2">
        <TopGuilds guilds={stats.guilds} events={stats.ev} />

        <KillFeedPanel killFeeds={killFeeds} />
      </section>
    </>
  );
}
