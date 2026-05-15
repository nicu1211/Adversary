import React, { useMemo, useState } from 'react';
import { Panel, Metric, Popup } from '../components/UI';
import { KillDeathChart } from '../components/Charts';
import {
  add,
  scrollCls,
  calculateKillFeed,
  calculateStats,
} from '../lib/logUtils';

function num(value) {
  return Number(value) || 0;
}

function formatRank(value) {
  return value == null ? '-' : Number(value).toFixed(2);
}

function RankList({ title, items, valueKey }) {
  const rows = items.slice(0, 5);
  const max = Math.max(1, ...rows.map((item) => Number(item[valueKey]) || 0));

  return (
    <Panel>
      <h3 className="mb-4 text-lg font-black text-white">{title}</h3>

      {!rows.length ? (
        <p className="text-sm text-slate-500">No data yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((item, index) => {
            const value = Number(item[valueKey]) || 0;
            const width = Math.max(8, Math.round((value / max) * 100));

            return (
              <div key={`${title}-${item.name}-${index}`}>
                <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate font-bold text-slate-200">
                    <span className="mr-2 text-slate-500">{index + 1}.</span>
                    {item.name}
                  </span>

                  <span className="font-black text-white">{value}</span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-blue-500"
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
  selectedLogs,
  hasTimeline,
}) {
  const [query, setQuery] = useState('');

  const byName = Object.fromEntries(players.map((player) => [player.name, player]));

  const names = [
    ...new Set([
      ...(members || []).map((member) => member.name).filter(Boolean),
      ...players.map((player) => player.name).filter(Boolean),
    ]),
  ];

  function buildRowsFromStats(oneStats) {
    return oneStats.players.map((player) => ({
      ...player,
      kdNumber: Number(player.kd) || 0,
      streak: oneStats.hasTimeline ? oneStats.st[player.name] || 0 : null,
      feed: oneStats.hasTimeline ? oneStats.fd[player.name] || 0 : null,
    }));
  }

  function rankRows(rows, key, desc = true) {
    const sorted = [...rows].sort((a, b) => {
      const av = Number(a[key]) || 0;
      const bv = Number(b[key]) || 0;

      if (av < bv) return desc ? 1 : -1;
      if (av > bv) return desc ? -1 : 1;

      return a.name.localeCompare(b.name);
    });

    const output = {};
    let lastValue = null;
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
    if (!oneStats.hasTimeline) {
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
            (reach[a.name] || '9999').localeCompare(reach[b.name] || '9999') ||
            a.name.localeCompare(b.name),
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

      const metrics = oneStats.hasTimeline
        ? ['kills', 'deaths', 'kd', 'streak', 'feed']
        : ['kills', 'deaths', 'kd'];

      const ranks = {
        kills: rankKillsForStats(oneStats, rows),
        deaths: rankRows(rows, 'deaths', false),
        kd: rankRows(rows, 'kdNumber', true),
        streak: oneStats.hasTimeline ? rankRows(rows, 'streak', true) : {},
        feed: oneStats.hasTimeline ? rankRows(rows, 'feed', true) : {},
      };

      rows.forEach((player) => {
        const name = player.name;

        if (!result[name]) {
          result[name] = {
            matches: 0,
            metricCount: 0,
            kills: 0,
            deaths: 0,
            kd: 0,
            streak: 0,
            feed: 0,
            streakMatches: 0,
            feedMatches: 0,
          };
        }

        result[name].matches += 1;
        result[name].metricCount += metrics.length;
        result[name].kills += ranks.kills[name] || 0;
        result[name].deaths += ranks.deaths[name] || 0;
        result[name].kd += ranks.kd[name] || 0;

        if (oneStats.hasTimeline) {
          result[name].streak += ranks.streak[name] || 0;
          result[name].feed += ranks.feed[name] || 0;
          result[name].streakMatches += 1;
          result[name].feedMatches += 1;
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

        const average =
          (data.kills +
            data.deaths +
            data.kd +
            (data.streakMatches ? data.streak : 0) +
            (data.feedMatches ? data.feed : 0)) /
          metricCount;

        return [
          name,
          {
            matches: data.matches,
            ranks: averageRanks,
            average,
          },
        ];
      }),
    );
  }

  const averageRanks = calculateAverageRanksFromSelectedLogs();

  const rows = names
    .map((name) => {
      const player = byName[name] || {
        name,
        kills: 0,
        deaths: 0,
        kd: '0.00',
      };

      return {
        ...player,
        kdNumber: Number(player.kd) || 0,
        streak: hasTimeline ? streaks[name] || 0 : null,
        feed: hasTimeline ? feeds[name] || 0 : null,
        average: averageRanks[name]?.average ?? 9999,
        matches: averageRanks[name]?.matches ?? 0,
        averageRankKills: averageRanks[name]?.ranks.kills ?? null,
        averageRankDeaths: averageRanks[name]?.ranks.deaths ?? null,
        averageRankKd: averageRanks[name]?.ranks.kd ?? null,
        averageRankStreak: averageRanks[name]?.ranks.streak ?? null,
        averageRankFeed: averageRanks[name]?.ranks.feed ?? null,
      };
    })
    .filter((player) => player.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => a.average - b.average || b.kills - a.kills);

  return (
    <Panel>
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-black text-white">Best Overall</h3>
          <p className="mt-1 text-sm text-slate-400">
            {hasTimeline
              ? 'Average rank includes kills, deaths, K/D, killstreak and killfeed.'
              : 'Summary logs have no timestamp, so ranking uses only kills, deaths and K/D.'}
          </p>
        </div>

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search player..."
          className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-400"
        />
      </div>

      <div className={`max-h-[520px] overflow-auto pr-2 ${scrollCls}`}>
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="sticky top-0 bg-slate-900 text-xs uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="p-2">#</th>
              <th className="p-2">Player</th>
              <th className="p-2 text-right">Kills</th>
              <th className="p-2 text-right">Deaths</th>
              <th className="p-2 text-right">K/D</th>
              <th className="p-2 text-right">Killstreak</th>
              <th className="p-2 text-right">Killfeed</th>
              <th className="p-2 text-right">Avg rank</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((player, index) => (
              <tr
                key={player.name}
                className="border-b border-slate-800/80 hover:bg-slate-800/40"
              >
                <td className="p-2 font-black text-slate-500">{index + 1}</td>

                <td className="p-2">
                  <div className="font-bold text-white">{player.name}</div>
                  <div className="text-xs text-slate-500">
                    {player.matches ? `${player.matches} match(es)` : 'No selected match'}
                  </div>
                </td>

                <td className="p-2 text-right">
                  <div className="font-bold text-white">{num(player.kills)}</div>
                  <div className="text-xs text-slate-500">
                    #{formatRank(player.averageRankKills)}
                  </div>
                </td>

                <td className="p-2 text-right">
                  <div className="font-bold text-white">{num(player.deaths)}</div>
                  <div className="text-xs text-slate-500">
                    #{formatRank(player.averageRankDeaths)}
                  </div>
                </td>

                <td className="p-2 text-right">
                  <div className="font-bold text-white">
                    {Number(player.kdNumber || 0).toFixed(2)}
                  </div>
                  <div className="text-xs text-slate-500">
                    #{formatRank(player.averageRankKd)}
                  </div>
                </td>

                <td className="p-2 text-right">
                  <div className="font-bold text-white">
                    {player.streak == null ? '-' : num(player.streak)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {player.averageRankStreak == null
                      ? 'No timestamp'
                      : `#${formatRank(player.averageRankStreak)}`}
                  </div>
                </td>

                <td className="p-2 text-right">
                  <div className="font-bold text-white">
                    {player.feed == null ? '-' : num(player.feed)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {player.averageRankFeed == null
                      ? 'No timestamp'
                      : `#${formatRank(player.averageRankFeed)}`}
                  </div>
                </td>

                <td className="p-2 text-right font-black text-blue-200">
                  {player.average === 9999 ? '-' : player.average.toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

function DetailsPopup({ title, rows, close }) {
  return (
    <Popup title={title} close={close}>
      {!rows.length ? (
        <p className="text-sm text-slate-500">No data yet.</p>
      ) : (
        <div className={`max-h-[70vh] overflow-auto pr-2 ${scrollCls}`}>
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="sticky top-0 bg-slate-950 text-xs uppercase tracking-[0.16em] text-slate-500">
              <tr>
                <th className="p-2">#</th>
                <th className="p-2">Name</th>
                <th className="p-2 text-right">Kills</th>
                <th className="p-2 text-right">Deaths</th>
                <th className="p-2 text-right">K/D</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.name}-${index}`} className="border-b border-slate-800">
                  <td className="p-2 text-slate-500">{index + 1}</td>
                  <td className="p-2 font-bold text-white">{row.name}</td>
                  <td className="p-2 text-right">{num(row.kills)}</td>
                  <td className="p-2 text-right">{num(row.deaths)}</td>
                  <td className="p-2 text-right">
                    {Number(row.kd || 0).toFixed
                      ? Number(row.kd || 0).toFixed(2)
                      : row.kd}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Popup>
  );
}

export default function Overview({
  stats,
  label,
  members = [],
  selectedLogs = [],
}) {
  const [popup, setPopup] = useState(null);

  const players = stats?.players || [];
  const guilds = stats?.guilds || [];
  const line = stats?.line || [];
  const hasTimeline = Boolean(stats?.hasTimeline && line.length);

  const topKills = useMemo(
    () => [...players].sort((a, b) => num(b.kills) - num(a.kills)),
    [players],
  );

  const topDeaths = useMemo(
    () => [...players].sort((a, b) => num(b.deaths) - num(a.deaths)),
    [players],
  );

  const topKd = useMemo(
    () =>
      [...players]
        .filter((player) => num(player.kills) > 0)
        .sort((a, b) => Number(b.kd) - Number(a.kd)),
    [players],
  );

  const feedDetails = useMemo(
    () => (hasTimeline ? calculateKillFeed(stats.ev || [], 10, true) : []),
    [hasTimeline, stats],
  );

  const favouriteTargets = useMemo(() => {
    const map = {};

    (stats?.ev || [])
      .filter((event) => event.type === 'kill')
      .forEach((event) => add(map, event.victim));

    return Object.entries(map)
      .map(([name, kills]) => ({ name, kills }))
      .sort((a, b) => b.kills - a.kills);
  }, [stats]);

  const nemesisTargets = useMemo(() => {
    const map = {};

    (stats?.ev || [])
      .filter((event) => event.type === 'death')
      .forEach((event) => add(map, event.killer));

    return Object.entries(map)
      .map(([name, kills]) => ({ name, kills }))
      .sort((a, b) => b.kills - a.kills);
  }, [stats]);

  return (
    <>
      <div className="space-y-6">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.2em] text-blue-300">
            Overview
          </p>
          <h1 className="mt-1 text-3xl font-black text-white">{label}</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Metric
            icon="⚔"
            label="Kills"
            value={num(stats?.kills)}
            sub="Total kills"
          />

          <Metric
            icon="☠"
            label="Deaths"
            value={num(stats?.deaths)}
            sub="Total deaths"
          />

          <Metric
            icon="◆"
            label="K/D"
            value={stats?.kd || '0.00'}
            sub="Kill / death ratio"
          />

          <Metric
            icon="👥"
            label="Players"
            value={players.length}
            sub={hasTimeline ? 'Timeline enabled' : 'Summary mode'}
          />
        </div>

        {hasTimeline ? (
          <KillDeathChart data={line} />
        ) : (
          <Panel>
            <h3 className="text-lg font-black text-white">Timeline disabled</h3>
            <p className="mt-2 text-sm text-slate-400">
              Acest log este în format summary, fără timestamp. Din acest motiv nu
              calculăm timeline, killstreak sau killfeed pentru acest match.
            </p>
          </Panel>
        )}

        <div className="grid gap-4 xl:grid-cols-3">
          <RankList title="Top Kills" items={topKills} valueKey="kills" />
          <RankList title="Most Deaths" items={topDeaths} valueKey="deaths" />
          <RankList title="Best K/D" items={topKd} valueKey="kd" />
        </div>

        <BestOverall
          players={players}
          members={members}
          streaks={stats?.st || {}}
          feeds={stats?.fd || {}}
          events={stats?.ev || []}
          selectedLogs={selectedLogs}
          hasTimeline={hasTimeline}
        />

        <div className="grid gap-4 xl:grid-cols-2">
          <Panel>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-black text-white">Enemy Guilds</h3>

              <button
                type="button"
                onClick={() => setPopup({ title: 'Enemy Guilds', rows: guilds })}
                className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-slate-900"
              >
                View all
              </button>
            </div>

            {!guilds.length ? (
              <p className="text-sm text-slate-500">
                No enemy guild data for this format.
              </p>
            ) : (
              <div className="space-y-2">
                {guilds.slice(0, 8).map((guild, index) => (
                  <div
                    key={guild.name}
                    className="flex items-center justify-between rounded-xl bg-slate-950 p-3 text-sm"
                  >
                    <span className="font-bold text-white">
                      {index + 1}. {guild.name}
                    </span>

                    <span className="text-slate-400">
                      {guild.kills}/{guild.deaths} · {guild.kd}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel>
            <h3 className="mb-4 text-lg font-black text-white">
              Killfeed / Targets
            </h3>

            {!hasTimeline ? (
              <p className="text-sm text-slate-500">
                Killfeed și targets sunt dezactivate pentru summary logs, deoarece nu
                există timestamp și victim/killer real.
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Killfeed
                  </p>

                  {!feedDetails.length ? (
                    <p className="text-sm text-slate-500">No killfeed data.</p>
                  ) : (
                    feedDetails.slice(0, 5).map((item, index) => (
                      <div
                        key={`${item.name}-${index}`}
                        className="mb-2 rounded-xl bg-slate-950 p-3 text-sm"
                      >
                        <b className="text-white">{item.name}</b>
                        <p className="text-xs text-slate-400">
                          {item.count} kills · {item.start} - {item.end}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Favourite Targets
                  </p>

                  {!favouriteTargets.length ? (
                    <p className="text-sm text-slate-500">No data.</p>
                  ) : (
                    favouriteTargets.slice(0, 5).map((item, index) => (
                      <div
                        key={`${item.name}-${index}`}
                        className="mb-2 flex justify-between rounded-xl bg-slate-950 p-3 text-sm"
                      >
                        <span>{item.name}</span>
                        <b>{item.kills}</b>
                      </div>
                    ))
                  )}
                </div>

                <div>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                    Nemesis
                  </p>

                  {!nemesisTargets.length ? (
                    <p className="text-sm text-slate-500">No data.</p>
                  ) : (
                    nemesisTargets.slice(0, 5).map((item, index) => (
                      <div
                        key={`${item.name}-${index}`}
                        className="mb-2 flex justify-between rounded-xl bg-slate-950 p-3 text-sm"
                      >
                        <span>{item.name}</span>
                        <b>{item.kills}</b>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </Panel>
        </div>
      </div>

      {popup && (
        <DetailsPopup
          title={popup.title}
          rows={popup.rows}
          close={() => setPopup(null)}
        />
      )}
    </>
  );
}
