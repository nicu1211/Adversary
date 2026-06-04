import React, { useMemo, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import { Bubble, getElementAtEvent } from 'react-chartjs-2';
import { Panel, Metric, Popup } from '../components/UI';
import { KillDeathChart } from '../components/Charts';
import {
  add,
  scrollCls,
  calculateKillFeed,
  calculateStats,
} from '../lib/logUtils';

ChartJS.register(LinearScale, PointElement, ChartTooltip, Legend);

function compactNumber(value, digits = 1) {
  const number = Number(value) || 0;
  const abs = Math.abs(number);

  function format(divisor, suffix) {
    const compact = number / divisor;
    const decimals = Math.abs(compact) >= 10 || Number.isInteger(compact) ? 0 : digits;

    return `${compact.toFixed(decimals).replace(/\.0$/, '')}${suffix}`;
  }

  if (abs >= 1_000_000_000_000) return format(1_000_000_000_000, 'T');
  if (abs >= 1_000_000_000) return format(1_000_000_000, 'B');
  if (abs >= 1_000_000) return format(1_000_000, 'M');
  if (abs >= 1_000) return format(1_000, 'K');

  return number.toLocaleString('en-US');
}

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

  function hasAnyValue(rows, key) {
    return rows.some((player) => Number(player[key]) || 0);
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

      const hasDamageDealt = hasAnyValue(rows, 'damageDealt');
      const hasDamageTaken = hasAnyValue(rows, 'damageTaken');
      const hasCcHits = hasAnyValue(rows, 'ccHits');
      const hasFortDamage = hasAnyValue(rows, 'fortDamage');

      const ranks = {
        kills: rankKillsForStats(oneStats, rows),
        deaths: rankRows(rows, 'deaths', false),
        kd: rankRows(rows, 'kdNumber', true),
        streak: hasTimeline ? rankRows(rows, 'streak', true) : {},
        feed: hasTimeline ? rankFeedForStats(oneStats, rows) : {},
        damageDealt: hasDamageDealt ? rankRows(rows, 'damageDealt', true) : {},
        damageTaken: hasDamageTaken ? rankRows(rows, 'damageTaken', false) : {},
        ccHits: hasCcHits ? rankRows(rows, 'ccHits', true) : {},
        fortDamage: hasFortDamage ? rankRows(rows, 'fortDamage', true) : {},
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
            damageDealt: 0,
            damageTaken: 0,
            ccHits: 0,
            fortDamage: 0,
            streakMatches: 0,
            feedMatches: 0,
            damageDealtMatches: 0,
            damageTakenMatches: 0,
            ccHitsMatches: 0,
            fortDamageMatches: 0,
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

        if (hasDamageDealt) {
          result[name].damageDealt += ranks.damageDealt[name] || 0;
          result[name].damageDealtMatches += 1;
          result[name].metricCount += 1;
        }

        if (hasDamageTaken) {
          result[name].damageTaken += ranks.damageTaken[name] || 0;
          result[name].damageTakenMatches += 1;
          result[name].metricCount += 1;
        }

        if (hasCcHits) {
          result[name].ccHits += ranks.ccHits[name] || 0;
          result[name].ccHitsMatches += 1;
          result[name].metricCount += 1;
        }

        if (hasFortDamage) {
          result[name].fortDamage += ranks.fortDamage[name] || 0;
          result[name].fortDamageMatches += 1;
          result[name].metricCount += 1;
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
          damageDealt: data.damageDealtMatches
            ? data.damageDealt / data.damageDealtMatches
            : null,
          damageTaken: data.damageTakenMatches
            ? data.damageTaken / data.damageTakenMatches
            : null,
          ccHits: data.ccHitsMatches ? data.ccHits / data.ccHitsMatches : null,
          fortDamage: data.fortDamageMatches
            ? data.fortDamage / data.fortDamageMatches
            : null,
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
                (data.feedMatches ? data.feed : 0) +
                (data.damageDealtMatches ? data.damageDealt : 0) +
                (data.damageTakenMatches ? data.damageTaken : 0) +
                (data.ccHitsMatches ? data.ccHits : 0) +
                (data.fortDamageMatches ? data.fortDamage : 0)) /
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
      averageRankDamageDealt: averageRanks[name]?.ranks.damageDealt ?? null,
      averageRankDamageTaken: averageRanks[name]?.ranks.damageTaken ?? null,
      averageRankCcHits: averageRanks[name]?.ranks.ccHits ?? null,
      averageRankFortDamage: averageRanks[name]?.ranks.fortDamage ?? null,
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

                <div className="grid grid-cols-3 gap-1 text-center text-xs sm:grid-cols-5 xl:grid-cols-9">
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
                    [
                      'Dmg',
                      formatAverageRank(player.averageRankDamageDealt),
                      'text-cyan-300',
                    ],
                    [
                      'Taken',
                      formatAverageRank(player.averageRankDamageTaken),
                      'text-rose-300',
                    ],
                    [
                      'CC',
                      formatAverageRank(player.averageRankCcHits),
                      'text-violet-300',
                    ],
                    [
                      'Fort',
                      formatAverageRank(player.averageRankFortDamage),
                      'text-amber-300',
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

  function formatNumber(value) {
    const number = Number(value) || 0;
    const abs = Math.abs(number);

    const formatCompact = (divisor, suffix) => {
      const compact = number / divisor;
      const decimals = Math.abs(compact) >= 10 || Number.isInteger(compact) ? 0 : 1;

      return `${compact.toFixed(decimals).replace(/\.0$/, '')}${suffix}`;
    };

    if (abs >= 1_000_000_000_000) return formatCompact(1_000_000_000_000, 'T');
    if (abs >= 1_000_000_000) return formatCompact(1_000_000_000, 'B');
    if (abs >= 1_000_000) return formatCompact(1_000_000, 'M');
    if (abs >= 1_000) return formatCompact(1_000, 'K');

    return new Intl.NumberFormat('en-US').format(number);
  }

  const rows = players
    .map((player) => ({
      ...player,
      streak: streaks[player.name] || 0,
      feed: feeds[player.name] || 0,
      damageDealt: Number(player.damageDealt) || 0,
      damageTaken: Number(player.damageTaken) || 0,
      ccHits: Number(player.ccHits) || 0,
      fortDamage: Number(player.fortDamage) || 0,
    }))
    .filter((player) => player.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => {
      const av = key === 'name' ? a.name.toLowerCase() : Number(a[key]);
      const bv = key === 'name' ? b.name.toLowerCase() : Number(b[key]);

      if (av < bv) return direction === 'asc' ? -1 : 1;
      if (av > bv) return direction === 'asc' ? 1 : -1;
      return 0;
    });

  const progressMax = {
    kills: Math.max(1, ...rows.map((player) => Number(player.kills) || 0)),
    deaths: Math.max(1, ...rows.map((player) => Number(player.deaths) || 0)),
    kd: Math.max(1, ...rows.map((player) => Number(player.kd) || 0)),
    streak: Math.max(1, ...rows.map((player) => Number(player.streak) || 0)),
    feed: Math.max(1, ...rows.map((player) => Number(player.feed) || 0)),
    damageDealt: Math.max(1, ...rows.map((player) => Number(player.damageDealt) || 0)),
    damageTaken: Math.max(1, ...rows.map((player) => Number(player.damageTaken) || 0)),
    ccHits: Math.max(1, ...rows.map((player) => Number(player.ccHits) || 0)),
    fortDamage: Math.max(1, ...rows.map((player) => Number(player.fortDamage) || 0)),
  };

  const progressThemes = {
    kills: 'from-blue-500 to-cyan-300',
    deaths: 'from-pink-500 to-rose-300',
    kd: 'from-emerald-500 to-lime-300',
    streak: 'from-slate-200 to-white',
    feed: 'from-orange-500 to-amber-300',
    damageDealt: 'from-cyan-500 to-sky-300',
    damageTaken: 'from-rose-500 to-pink-300',
    ccHits: 'from-violet-500 to-fuchsia-300',
    fortDamage: 'from-amber-500 to-yellow-300',
  };

  function ProgressValue({ id, value, children, className = '' }) {
    const numeric = Number(value) || 0;
    const width = numeric <= 0
      ? 0
      : Math.max(3, Math.min(100, Math.round((numeric / (progressMax[id] || 1)) * 100)));

    return (
      <div className={`ml-auto flex min-w-[58px] flex-col items-end ${className}`}>
        <span className="whitespace-nowrap leading-none">{children}</span>

        <span className="mt-1.5 block h-[2px] w-[92%] overflow-hidden rounded-full bg-slate-800/55">
          <span
            className={`relative block h-full rounded-full bg-gradient-to-r ${progressThemes[id] || 'from-slate-500 to-slate-300'} opacity-90`}
            style={{ width: `${width}%`, boxShadow: '0 0 6px rgba(255,255,255,0.08)' }}
          >
            <span className="absolute right-0 top-1/2 h-[4px] w-[4px] -translate-y-1/2 rounded-full bg-white/55 blur-[0.5px]" />
          </span>
        </span>
      </div>
    );
  }

  function flip(nextKey) {
    setSort(
      key === nextKey
        ? [nextKey, direction === 'desc' ? 'asc' : 'desc']
        : [nextKey, nextKey === 'name' ? 'asc' : 'desc'],
    );
  }

  function Header({ id, children, className = '' }) {
    return (
      <th className={`py-2 ${className}`}>
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
            <table className="w-full text-xs">
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
                  <Header id="feed" className="text-right">
                    KillFeed
                  </Header>
                  <Header id="damageDealt" className="text-right">
                    Damage Dealt
                  </Header>
                  <Header id="damageTaken" className="text-right">
                    Damage Taken
                  </Header>
                  <Header id="ccHits" className="text-right">
                    CC Hits
                  </Header>
                  <Header id="fortDamage" className="pr-4 text-right">
                    Damage to Fort
                  </Header>
                </tr>
              </thead>

              <tbody>
                {rows.map((player) => (
                  <tr
                    key={player.name}
                    className="border-t border-slate-800 bg-slate-950/30 hover:bg-slate-900/50"
                  >
                    <td className="py-2 pl-3">
                      <button
                        onClick={() => setSelected(player)}
                        className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2 py-1 font-bold text-cyan-300 hover:border-cyan-300 hover:bg-cyan-500/20"
                      >
                        {player.name}
                      </button>
                    </td>

                    <td className="py-2 text-right font-black text-blue-300">
                      <ProgressValue id="kills" value={player.kills}>
                        ⚔ {formatNumber(player.kills)}
                      </ProgressValue>
                    </td>

                    <td className="py-2 text-right font-black text-pink-300">
                      <ProgressValue id="deaths" value={player.deaths}>
                        ☠ {formatNumber(player.deaths)}
                      </ProgressValue>
                    </td>

                    <td className="py-2 text-right font-black text-emerald-300">
                      <ProgressValue id="kd" value={player.kd}>
                        ✺ {player.kd}
                      </ProgressValue>
                    </td>

                    <td className="py-2 text-right font-black">
                      <ProgressValue id="streak" value={player.streak}>
                        {formatNumber(player.streak)}
                      </ProgressValue>
                    </td>

                    <td className="py-2 text-right font-black text-orange-300">
                      <ProgressValue id="feed" value={player.feed}>
                        🔥 {formatNumber(player.feed)}
                      </ProgressValue>
                    </td>

                    <td className="py-2 text-right font-black text-cyan-300">
                      <ProgressValue id="damageDealt" value={player.damageDealt}>
                        {formatNumber(player.damageDealt)}
                      </ProgressValue>
                    </td>

                    <td className="py-2 text-right font-black text-rose-300">
                      <ProgressValue id="damageTaken" value={player.damageTaken}>
                        {formatNumber(player.damageTaken)}
                      </ProgressValue>
                    </td>

                    <td className="py-2 text-right font-black text-violet-300">
                      <ProgressValue id="ccHits" value={player.ccHits}>
                        {formatNumber(player.ccHits)}
                      </ProgressValue>
                    </td>

                    <td className="py-2 pr-3 text-right font-black text-amber-300">
                      <ProgressValue id="fortDamage" value={player.fortDamage}>
                        {formatNumber(player.fortDamage)}
                      </ProgressValue>
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
              <table className="w-full text-xs">
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
  const chartRef = useRef(null);
  const [selected, setSelected] = useState(null);
  const [guildListOpen, setGuildListOpen] = useState(false);
  const [guildSearch, setGuildSearch] = useState('');
  const [chartGuildFilter, setChartGuildFilter] = useState('');

  const guildMatches = useMemo(() => {
    const matches = {};

    [...(events || [])].forEach((event) => {
      const guildName = cleanGuild(event.guild);

      if (!guildName) return;

      matches[guildName] ||= new Set();
      matches[guildName].add(
        String(event.id || event.war || event.date || `${event.date || ''}-${event.time || ''}`),
      );
    });

    return matches;
  }, [events]);

  function formatAverageValue(value) {
    const number = Number(value) || 0;

    if (number >= 100) {
      return Math.round(number).toLocaleString('en-US');
    }

    return number.toFixed(1).replace(/\.0$/, '');
  }

  function formatGuildKd(value) {
    return (Number(value) || 0).toFixed(2);
  }

  const rows = useMemo(
    () =>
      [...(guilds || [])]
        .map((guild) => {
          const kills = Number(guild.deaths) || 0;
          const deaths = Number(guild.kills) || 0;
          const totalInteractions = kills + deaths;
          const kdNumber = deaths > 0 ? kills / deaths : kills > 0 ? kills : 0;
          const totalMatches = Math.max(
            1,
            guildMatches[guild.name]?.size ||
              Number(guild.matches) ||
              Number(guild.wars) ||
              Number(guild.totalMatches) ||
              0,
          );
          const averageKills = kills / totalMatches;
          const averageDeaths = deaths / totalMatches;
          const averageKd = averageDeaths > 0 ? averageKills / averageDeaths : averageKills > 0 ? averageKills : 0;

          return {
            ...guild,
            kills,
            deaths,
            totalInteractions,
            totalMatches,
            averageKills,
            averageDeaths,
            averageKd,
            kdNumber,
            kd: kdNumber.toFixed(2),
          };
        })
        .filter((guild) => guild.totalInteractions > 30)
        .sort(
          (a, b) =>
            b.kdNumber - a.kdNumber ||
            b.totalInteractions - a.totalInteractions ||
            a.name.localeCompare(b.name),
        ),
    [guilds, guildMatches],
  );

  const guildListRows = useMemo(() => {
    const query = guildSearch.trim().toLowerCase();

    return [...rows]
      .sort((a, b) => a.name.localeCompare(b.name))
      .filter((guild) => !query || guild.name.toLowerCase().includes(query));
  }, [rows, guildSearch]);

  const chartRows = useMemo(() => {
    const firstRows = rows.slice(0, 32);

    if (!chartGuildFilter) return firstRows;

    const selectedGuild = rows.find((guild) => guild.name === chartGuildFilter);

    if (!selectedGuild || firstRows.some((guild) => guild.name === chartGuildFilter)) {
      return firstRows;
    }

    return [...firstRows.slice(0, 31), selectedGuild];
  }, [rows, chartGuildFilter]);

  const chartMeta = useMemo(() => {
    if (!chartRows.length) {
      return {
        minX: 0,
        maxX: 1,
        minY: 0,
        maxY: 1,
        maxV: 1,
      };
    }

    const killsValues = chartRows.map((guild) => guild.kills);
    const deathsValues = chartRows.map((guild) => guild.deaths);
    const kdValues = chartRows.map((guild) => guild.kdNumber);

    const minKills = Math.min(...killsValues);
    const maxKills = Math.max(...killsValues);
    const minDeaths = Math.min(...deathsValues);
    const maxDeaths = Math.max(...deathsValues);

    const xRange = Math.max(1, maxKills - minKills);
    const yRange = Math.max(1, maxDeaths - minDeaths);

    return {
      minX: Math.max(0, Math.floor(minKills - xRange * 0.08)),
      maxX: Math.ceil(maxKills + xRange * 0.08),
      minY: Math.max(0, Math.floor(minDeaths - yRange * 0.08)),
      maxY: Math.ceil(maxDeaths + yRange * 0.08),
      maxV: Math.max(1, ...kdValues),
    };
  }, [chartRows]);

  function kdColorChannels(kd) {
    if (kd >= 2) {
      return [0, 250, 250];
    }

    if (kd >= 1.5) {
      return [50, 150, 150];
    }

    if (kd >= 1) {
      return [0, 150, 250];
    }

    if (kd >= 0.75) {
      return [150, 50, 150];
    }

    return [250, 0, 0];
  }

  function isHighlightedGuild(context) {
    const guild = context.raw?.guild;

    return chartGuildFilter && guild?.name === chartGuildFilter;
  }

  function colorize(opaque, context) {
    const value = context.raw || {};
    const guild = value.guild || {};
    const kd = Number(guild.kdNumber) || 0;
    const [r, g, b] = kdColorChannels(kd);

    if (chartGuildFilter && guild.name === chartGuildFilter) {
      return opaque ? 'rgba(250,204,21,1)' : `rgba(${r},${g},${b},0.92)`;
    }

    if (chartGuildFilter) {
      return opaque ? `rgba(${r},${g},${b},0.34)` : `rgba(${r},${g},${b},0.16)`;
    }

    const a = opaque ? 1 : 0.45 + 0.35 * Math.min(1, value.v / 1000);

    return `rgba(${r},${g},${b},${a})`;
  }

  const bubbleData = useMemo(
    () => ({
      datasets: [
        {
          label: 'Enemy Guilds',
          data: chartRows.map((guild) => ({
            x: guild.kills,
            y: guild.deaths,
            v: Math.max(1, (guild.kdNumber / chartMeta.maxV) * 1000),
            guild,
          })),
        },
      ],
    }),
    [chartRows, chartMeta],
  );

  const bubbleOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 450,
      },
      layout: {
        padding: 8,
      },
      plugins: {
        legend: false,
        tooltip: {
          enabled: true,
          displayColors: false,
          backgroundColor: 'rgba(2, 6, 23, 0.96)',
          borderColor: 'rgba(148, 163, 184, 0.35)',
          borderWidth: 1,
          padding: 14,
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          titleFont: {
            size: 14,
            weight: 900,
          },
          bodyFont: {
            size: 12,
            weight: 700,
          },
          titleMarginBottom: 8,
          bodySpacing: 4,
          callbacks: {
            title: (items) => {
              const guild = items?.[0]?.raw?.guild;

              return guild?.name || '-';
            },
            label: (context) => {
              const guild = context.raw?.guild;

              if (!guild) return '';

              return [
                `Matches: ${guild.totalMatches}`,
                `Kills: ${guild.kills}`,
                `Deaths: ${guild.deaths}`,
                `K/D: ${guild.kd}`,
                `Average kills: ${formatAverageValue(guild.averageKills)}`,
                `Average deaths: ${formatAverageValue(guild.averageDeaths)}`,
                `Average K/D: ${formatGuildKd(guild.averageKd)}`,
              ];
            },
          },
        },
      },
      scales: {
        x: {
          min: chartMeta.minX,
          max: chartMeta.maxX,
          title: {
            display: true,
            text: 'Kills',
            color: 'rgba(255,255,255,0.55)',
            font: {
              weight: 800,
              size: 11,
            },
          },
          grid: {
            color: 'rgba(255,255,255,0.055)',
            borderColor: 'rgba(255,255,255,0.18)',
            tickColor: 'rgba(255,255,255,0.12)',
          },
          ticks: {
            color: 'rgba(255,255,255,0.34)',
            font: {
              size: 10,
            },
          },
        },
        y: {
          min: chartMeta.minY,
          max: chartMeta.maxY,
          title: {
            display: true,
            text: 'Deaths',
            color: 'rgba(255,255,255,0.55)',
            font: {
              weight: 800,
              size: 11,
            },
          },
          grid: {
            color: 'rgba(255,255,255,0.07)',
            borderColor: 'rgba(255,255,255,0.18)',
            tickColor: 'rgba(255,255,255,0.12)',
          },
          ticks: {
            color: 'rgba(255,255,255,0.34)',
            font: {
              size: 10,
            },
          },
        },
      },
      elements: {
        point: {
          backgroundColor: colorize.bind(null, false),
          borderColor: colorize.bind(null, true),
          borderWidth(context) {
            return isHighlightedGuild(context) ? 4 : 1;
          },
          hoverBackgroundColor(context) {
            return colorize(false, context);
          },
          hoverBorderColor(context) {
            return colorize(true, context);
          },
          hoverBorderWidth(context) {
            return isHighlightedGuild(context)
              ? 6
              : Math.max(2, Math.round(8 * context.raw.v / 1000));
          },
          radius(context) {
            const size = Math.min(context.chart.width, context.chart.height);
            const base = Math.abs(context.raw.v) / 1000;
            const radius = Math.max(6, (size / 16) * base);

            return isHighlightedGuild(context) ? radius + 7 : radius;
          },
        },
      },
    }),
    [chartMeta, chartGuildFilter],
  );

  const log = selected
    ? events.filter((event) => event.guild === selected.name)
    : [];

  function handleBubbleClick(event) {
    if (!chartRef.current) return;

    const elements = getElementAtEvent(chartRef.current, event);
    const first = elements?.[0];

    if (!first) return;

    const guild = chartRows[first.index];

    if (guild) setSelected(guild);
  }

  function handleBubbleHover(event, elements) {
    const canvas = event?.native?.target;

    if (!canvas) return;

    canvas.style.cursor = elements?.length ? 'pointer' : 'default';
  }

  function clearGuildFilter() {
    setChartGuildFilter('');
    setSelected(null);
  }

  return (
    <Panel cls="h-[520px]">
      <div className="flex h-full flex-col">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-xl font-black">🛡 Enemy Guilds</h3>

          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            {chartGuildFilter && (
              <button
                type="button"
                onClick={clearGuildFilter}
                className="flex max-w-[220px] items-center gap-2 rounded-full border border-amber-400/35 bg-amber-500/15 px-3 py-1 text-xs font-black text-amber-100 transition hover:border-amber-300/70 hover:bg-amber-500/25"
                title="Clear selected guild"
              >
                <span className="text-amber-300">×</span>
                <span className="truncate">{chartGuildFilter}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setGuildSearch('');
                setGuildListOpen(true);
              }}
              className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-bold text-slate-300 transition hover:border-blue-400/60 hover:bg-slate-800 hover:text-blue-100"
              title="Show enemy guilds"
            >
              {rows.length} guilds
            </button>
          </div>
        </div>

        {!chartRows.length ? (
          <p className="text-slate-500">No guild data yet.</p>
        ) : (
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-800">
            <Bubble
              ref={chartRef}
              data={bubbleData}
              options={bubbleOptions}
              onClick={handleBubbleClick}
              onHover={handleBubbleHover}
            />
          </div>
        )}

        {guildListOpen && (
          <Popup title="Enemy Guilds" close={() => setGuildListOpen(false)}>
            {!rows.length ? (
              <p className="text-slate-500">No guild data yet.</p>
            ) : (
              <div
                className={`max-h-[60vh] space-y-2 overflow-y-auto pr-2 ${scrollCls}`}
              >
                <button
                  type="button"
                  onClick={() => {
                    clearGuildFilter();
                    setGuildListOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    !chartGuildFilter
                      ? 'border-blue-400/40 bg-blue-500/15 text-blue-100'
                      : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-blue-400/40 hover:bg-slate-800/90 hover:text-blue-100'
                  }`}
                >
                  <span className="font-black">All guilds</span>
                  <span className="text-xs font-bold text-slate-400">
                    {rows.length} guilds
                  </span>
                </button>

                <div className="sticky top-0 z-10 rounded-2xl border border-slate-800 bg-slate-950/95 p-2 backdrop-blur-xl">
                  <input
                    value={guildSearch}
                    onChange={(event) => setGuildSearch(event.target.value)}
                    autoFocus
                    placeholder="Search guild..."
                    className="w-full rounded-xl border border-slate-700/70 bg-slate-900/80 px-3 py-2 text-sm font-bold text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400"
                  />

                  {guildSearch.trim() && (
                    <p className="mt-2 px-1 text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {guildListRows.length} suggestions
                    </p>
                  )}
                </div>

                {!guildListRows.length ? (
                  <p className="rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-5 text-sm font-bold text-slate-500">
                    No guild found.
                  </p>
                ) : (
                  guildListRows.map((guild) => (
                    <button
                      key={guild.name}
                      type="button"
                      onClick={() => {
                        setChartGuildFilter(guild.name);
                        setGuildListOpen(false);
                        setSelected(null);
                      }}
                      className={`grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition ${
                        chartGuildFilter === guild.name
                          ? 'border-amber-400/45 bg-amber-500/15 text-amber-100'
                          : 'border-slate-800 bg-slate-900/70 text-slate-300 hover:border-blue-400/40 hover:bg-slate-800/90 hover:text-blue-100'
                      }`}
                    >
                      <span className="min-w-0 truncate font-black">
                        {guild.name}
                      </span>

                      <span className="grid grid-cols-2 gap-x-3 gap-y-1 text-right text-[10px] font-black uppercase tracking-wide text-slate-400 sm:grid-cols-4">
                        <span>Matches {guild.totalMatches}</span>
                        <span>Avg K {formatAverageValue(guild.averageKills)}</span>
                        <span>Avg D {formatAverageValue(guild.averageDeaths)}</span>
                        <span>Avg K/D {formatGuildKd(guild.averageKd)}</span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </Popup>
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
                    {feed.date ? `${feed.date} · ` : ''}{feed.start}-{feed.end}
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

  const playerSecondaryTotals = (stats.players || []).reduce(
    (totals, player) => ({
      damageDealt:
        totals.damageDealt + (Number(player.damageDealt) || 0),
      damageTaken:
        totals.damageTaken + (Number(player.damageTaken) || 0),
      ccHits: totals.ccHits + (Number(player.ccHits) || 0),
      fortDamage: totals.fortDamage + (Number(player.fortDamage) || 0),
    }),
    { damageDealt: 0, damageTaken: 0, ccHits: 0, fortDamage: 0 },
  );

  const secondaryTotals = stats.secondary?.totals || {};
  const damageDealt =
    Number(secondaryTotals.damageDealt) || playerSecondaryTotals.damageDealt || 0;
  const damageTaken =
    Number(secondaryTotals.damageTaken) || playerSecondaryTotals.damageTaken || 0;
  const ccHits = Number(secondaryTotals.ccHits) || playerSecondaryTotals.ccHits || 0;
  const fortDamage =
    Number(secondaryTotals.fortDamage) || playerSecondaryTotals.fortDamage || 0;

  return (
    <>
      <header className="rounded-3xl border border-slate-700 bg-slate-950/70 p-5">
        <div className="mb-4">
          <h2 className="text-2xl font-black">Battle Analytics</h2>
          <p className="text-slate-400">{label}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
          <Metric
            icon="⚔"
            label="Total Kills"
            value={stats.kills}
            sub="Eliminations"
            className="border-emerald-400/25 from-emerald-500/20 text-emerald-300"
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
            className="border-blue-400/25 from-blue-500/20 text-blue-300"
          />

          <Metric
            icon="⚡"
            label="Damage"
            value={compactNumber(damageDealt)}
            sub="Dealt"
            className="border-amber-400/25 from-amber-500/20 text-amber-300"
          />

          <Metric
            icon="🛡"
            label="Damage Taken"
            value={compactNumber(damageTaken)}
            sub="Taken"
            className="border-pink-400/25 from-pink-500/20 text-pink-300"
          />

          <Metric
            icon="◎"
            label="CC Hits"
            value={compactNumber(ccHits)}
            sub="Control"
            className="border-cyan-400/25 from-cyan-500/20 text-cyan-300"
          />

          <Metric
            icon="♜"
            label="Fort Damage"
            value={compactNumber(fortDamage)}
            sub="Structure"
            className="border-violet-400/25 from-violet-500/20 text-violet-300"
          />
        </div>
      </header>

      <KillDeathChart
        data={stats.line}
        title="▧ Global Kill/Death Timeline"
        killFeedMarkers={[...topKillFeedMarkers, ...flowMarkers]}
      />

      <section className="grid items-stretch gap-4 xl:grid-cols-[520px_minmax(0,1fr)]">
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

      <section className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <EnemyGuilds guilds={stats.guilds} events={stats.ev} />

        <KillFeedPanel killFeeds={killFeeds} events={stats.ev} />
      </section>
    </>
  );
}
