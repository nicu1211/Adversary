import React, { useMemo, useState } from 'react';
import { Panel, Metric } from '../components/UI';
import { AveragePerformanceChart } from '../components/Charts';
import { add, scrollCls } from '../lib/logUtils';

function PlayerSelect({ players, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = players.find((player) => samePlayerName(player.name, value));

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
                      samePlayerName(value, player.name)
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

function shortenMiddle(name, maxLength = 12) {
  const text = String(name || '');

  if (text.length <= maxLength) return text;

  const left = Math.ceil((maxLength - 1) / 2);
  const right = Math.floor((maxLength - 1) / 2);

  return `${text.slice(0, left)}…${text.slice(text.length - right)}`;
}

function TargetName({ name, side }) {
  return (
    <span
      title={name}
      className={`block max-w-full overflow-hidden whitespace-nowrap text-[clamp(10px,1.05vw,14px)] font-black leading-none text-white ${
        side === 'left' ? 'text-right' : 'text-left'
      }`}
      style={{
        textShadow:
          side === 'left'
            ? '0 0 5px rgba(59,130,246,.45), 0 1px 2px rgba(0,0,0,.7)'
            : '0 0 5px rgba(244,63,94,.45), 0 1px 2px rgba(0,0,0,.7)',
      }}
    >
      {shortenMiddle(name, 12)}
    </span>
  );
}

function TargetsAndNemesisPanel({ favouriteTargets, nemesisTargets }) {
  const favouriteRows = useMemo(() => {
    return [...favouriteTargets]
      .map((item) => ({
        name: item.name,
        kills: Number(item.kills) || 0,
      }))
      .filter((item) => item.kills > 0)
      .sort((a, b) => b.kills - a.kills || a.name.localeCompare(b.name))
      .slice(0, 10);
  }, [favouriteTargets]);

  const nemesisRows = useMemo(() => {
    return [...nemesisTargets]
      .map((item) => ({
        name: item.name,
        kills: Number(item.kills) || 0,
      }))
      .filter((item) => item.kills > 0)
      .sort((a, b) => b.kills - a.kills || a.name.localeCompare(b.name))
      .slice(0, 10);
  }, [nemesisTargets]);

  const rows = Array.from({ length: 10 }, (_, index) => ({
    favourite: favouriteRows[index] || null,
    nemesis: nemesisRows[index] || null,
  }));

  const max = Math.max(
    1,
    ...favouriteRows.map((item) => item.kills),
    ...nemesisRows.map((item) => item.kills),
  );

  const hasData = favouriteRows.length || nemesisRows.length;

  const blueShade = 'from-blue-500/80 via-sky-500/75 to-cyan-400/70';
  const redShade = 'from-rose-500/80 via-red-500/75 to-pink-400/70';

  return (
    <Panel cls="h-full">
      <div className="flex h-full flex-col">
        <div className="mb-4">
          <h3 className="text-2xl font-black">Targets & Nemesis</h3>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950/75 p-4 shadow-[0_24px_80px_rgba(0,0,0,.32)]">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            <div className="absolute -left-16 bottom-0 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl" />
            <div className="absolute -right-16 bottom-0 h-40 w-40 rounded-full bg-rose-500/10 blur-3xl" />
            <div className="absolute inset-x-4 bottom-0 h-32 bg-gradient-to-t from-violet-500/8 via-sky-500/8 to-transparent blur-3xl" />
          </div>

          <div className="relative mb-4 grid grid-cols-[1fr_1px_1fr] items-center text-xs font-black uppercase tracking-[0.18em]">
            <div className="pr-4 text-right text-blue-300">
              Favourite Targets
            </div>

            <div className="h-5 bg-slate-500/80" />

            <div className="pl-4 text-left text-pink-300">Nemesis</div>
          </div>

          {!hasData ? (
            <p className="relative rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-6 text-center text-sm text-slate-500">
              No target data yet.
            </p>
          ) : (
            <div className="relative flex h-[calc(100%-36px)] flex-col justify-between gap-2">
              {rows.map((row, index) => {
                const favouriteWidth = row.favourite
                  ? Math.round((row.favourite.kills / max) * 100)
                  : 0;

                const nemesisWidth = row.nemesis
                  ? Math.round((row.nemesis.kills / max) * 100)
                  : 0;

                const finalFavouriteWidth = row.favourite
                  ? Math.max(18, favouriteWidth)
                  : 0;

                const finalNemesisWidth = row.nemesis
                  ? Math.max(18, nemesisWidth)
                  : 0;

                return (
                  <div
                    key={`${row.favourite?.name || 'empty'}-${row.nemesis?.name || 'empty'}-${index}`}
                    className="min-h-0"
                  >
                    <div className="grid h-[36px] grid-cols-[1fr_1px_1fr] items-center">
                      <div className="relative flex h-full items-center justify-end pr-1">
                        {row.favourite && (
                          <>
                            <span className="mr-1 min-w-[32px] shrink-0 text-right text-sm font-black text-slate-100">
                              {row.favourite.kills}
                            </span>

                            <div className="relative h-full w-full overflow-hidden rounded-l-md">
                              <div
                                className={`absolute right-0 top-0 h-full rounded-l-md bg-gradient-to-l ${blueShade} shadow-[0_0_14px_rgba(59,130,246,.18)]`}
                                style={{
                                  width: `${finalFavouriteWidth}%`,
                                }}
                              />

                              <div
                                className="absolute inset-y-0 right-0 flex min-w-0 items-center justify-end px-2"
                                style={{
                                  width: `${finalFavouriteWidth}%`,
                                }}
                              >
                                <TargetName
                                  name={row.favourite.name}
                                  side="left"
                                />
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      <div className="h-full bg-slate-500/90" />

                      <div className="relative flex h-full items-center justify-start pl-1">
                        {row.nemesis && (
                          <>
                            <div className="relative h-full w-full overflow-hidden rounded-r-md">
                              <div
                                className={`absolute left-0 top-0 h-full rounded-r-md bg-gradient-to-r ${redShade} shadow-[0_0_14px_rgba(244,63,94,.18)]`}
                                style={{
                                  width: `${finalNemesisWidth}%`,
                                }}
                              />

                              <div
                                className="absolute inset-y-0 left-0 flex min-w-0 items-center px-2"
                                style={{
                                  width: `${finalNemesisWidth}%`,
                                }}
                              >
                                <TargetName
                                  name={row.nemesis.name}
                                  side="right"
                                />
                              </div>
                            </div>

                            <span className="ml-1 min-w-[32px] shrink-0 text-left text-sm font-black text-slate-100">
                              {row.nemesis.kills}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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

function normalizePlayerName(value) {
  const key = String(value || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();

  if (key === 'mrsracoon' || key === 'mrsraccoon') {
    return 'mrsraccoon';
  }

  return key;
}

function samePlayerName(left, right) {
  const a = normalizePlayerName(left);
  const b = normalizePlayerName(right);

  return Boolean(a && b && a === b);
}

function getPlayerKeyFromObject(object, playerName) {
  if (!object) return null;

  if (Object.prototype.hasOwnProperty.call(object, playerName)) {
    return playerName;
  }

  const target = normalizePlayerName(playerName);

  if (!target) return null;

  return Object.keys(object).find((key) => normalizePlayerName(key) === target) || null;
}

function getPlayerObjectValue(object, playerName, fallback = 0) {
  const key = getPlayerKeyFromObject(object, playerName);

  return key == null ? fallback : object[key];
}

function getGuildPlayerFromEvent(event) {
  return event?.guildPlayer || (event?.type === 'kill' ? event?.killer : event?.victim) || '';
}

function getEnemyPlayerFromEvent(event) {
  return event?.enemyPlayer || (event?.type === 'kill' ? event?.victim : event?.killer) || '';
}

function getWarEventsSorted(events) {
  return [...events].sort((a, b) => {
    if (Number(a.sec) !== Number(b.sec)) {
      return Number(a.sec) - Number(b.sec);
    }

    return Number(a.i || 0) - Number(b.i || 0);
  });
}

function getBestKillstreakForWar(events, playerName) {
  const sorted = getWarEventsSorted(events);

  let current = 0;
  let best = 0;

  sorted.forEach((event) => {
    const guildPlayer = getGuildPlayerFromEvent(event);

    if (event.type === 'kill' && samePlayerName(guildPlayer, playerName)) {
      current += 1;
      best = Math.max(best, current);
    }

    if (event.type === 'death' && samePlayerName(guildPlayer, playerName)) {
      current = 0;
    }
  });

  return best;
}

function getBestKillfeedForWar(events, playerName, seconds = 10) {
  const kills = events
    .filter(
      (event) => event.type === 'kill' && samePlayerName(getGuildPlayerFromEvent(event), playerName),
    )
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

function buildKillsRankLikeBestOverall(rows, events) {
  const sortedEvents = getWarEventsSorted(events);
  const byName = Object.fromEntries(rows.map((row) => [row.name, row]));
  const runningKills = {};
  const reached = {};

  sortedEvents
    .filter((event) => event.type === 'kill')
    .forEach((event) => {
      const guildPlayer = getGuildPlayerFromEvent(event);

      if (!guildPlayer) return;

      runningKills[guildPlayer] = (runningKills[guildPlayer] || 0) + 1;

      const finalKills = byName[guildPlayer]?.kills || 0;

      if (finalKills && runningKills[guildPlayer] === finalKills) {
        reached[guildPlayer] = `${String(event.sec).padStart(5, '0')} ${String(
          event.i || 0,
        ).padStart(5, '0')}`;
      }
    });

  return Object.fromEntries(
    [...rows]
      .sort(
        (a, b) =>
          b.kills - a.kills ||
          (reached[a.name] || '999999').localeCompare(
            reached[b.name] || '999999',
          ) ||
          a.name.localeCompare(b.name),
      )
      .map((row, index) => [row.name, index + 1]),
  );
}

function getOurPlayerRowsForWar(warEvents) {
  const kills = {};
  const deaths = {};
  const names = new Set();

  warEvents.forEach((event) => {
    const guildPlayer = getGuildPlayerFromEvent(event);

    if (!guildPlayer) return;

    if (event.type === 'kill') {
      names.add(guildPlayer);
      add(kills, guildPlayer);
    }

    if (event.type === 'death') {
      names.add(guildPlayer);
      add(deaths, guildPlayer);
    }
  });

  return [...names].map((name) => {
    const k = kills[name] || 0;
    const d = deaths[name] || 0;

    return {
      name,
      kills: k,
      deaths: d,
      kdNumber: d ? Number((k / d).toFixed(2)) : Number(k.toFixed(2)),
      streak: getBestKillstreakForWar(warEvents, name),
      feed: getBestKillfeedForWar(warEvents, name),
    };
  });
}


function secondaryWarId(row, index = 0) {
  return String(row?.id || row?.date || row?.war || `secondary-${index}`);
}

function buildSecondaryRankValues(rows, playerName, excludedWarIds = new Set()) {
  const warMap = {};

  (rows || [])
    .filter((row) => row?.player)
    .forEach((row, index) => {
      const id = secondaryWarId(row, index);

      if (excludedWarIds.has(id)) return;

      warMap[id] ||= [];
      warMap[id].push({
        ...row,
        id,
        name: row.player,
        kills: Number(row.kills) || 0,
        deaths: Number(row.deaths) || 0,
        kdNumber: Number(row.deaths)
          ? Number(((Number(row.kills) || 0) / Number(row.deaths)).toFixed(2))
          : Number((Number(row.kills) || 0).toFixed(2)),
        streak: Number(row.killStreak) || 0,
        feed: 0,
      });
    });

  const values = [];

  Object.values(warMap).forEach((rowsForWar) => {
    if (!rowsForWar.some((row) => samePlayerName(row.name, playerName))) return;

    const ranks = {
      kills: buildTieAwareRank(rowsForWar, 'kills', true),
      deaths: buildTieAwareRank(rowsForWar, 'deaths', false),
      kd: buildTieAwareRank(rowsForWar, 'kdNumber', true),
      streak: buildTieAwareRank(rowsForWar, 'streak', true),
    };

    values.push(
      (getPlayerObjectValue(ranks.kills, playerName) +
        getPlayerObjectValue(ranks.deaths, playerName) +
        getPlayerObjectValue(ranks.kd, playerName) +
        getPlayerObjectValue(ranks.streak, playerName)) /
        4,
    );
  });

  return values;
}

function formatAverageRank(values) {
  const clean = (values || []).filter((value) => Number.isFinite(Number(value)));

  if (!clean.length) return '0.00';

  const average = clean.reduce((sum, value) => sum + Number(value), 0) / clean.length;

  return average.toFixed(2);
}

function buildAverageRankValuesFromPlayedWars(events, playerName) {
  const warMap = {};

  events.forEach((event) => {
    const id = String(event.id);
    warMap[id] ||= [];
    warMap[id].push(event);
  });

  const playedWarAverages = [];

  Object.values(warMap).forEach((warEvents) => {
    const rows = getOurPlayerRowsForWar(warEvents);

    if (!rows.some((row) => samePlayerName(row.name, playerName))) {
      return;
    }

    const ranks = {
      kills: buildKillsRankLikeBestOverall(rows, warEvents),
      deaths: buildTieAwareRank(rows, 'deaths', false),
      kd: buildTieAwareRank(rows, 'kdNumber', true),
      streak: buildTieAwareRank(rows, 'streak', true),
      feed: buildTieAwareRank(rows, 'feed', true),
    };

    const averageForThisWar =
      (getPlayerObjectValue(ranks.kills, playerName) +
        getPlayerObjectValue(ranks.deaths, playerName) +
        getPlayerObjectValue(ranks.kd, playerName) +
        getPlayerObjectValue(ranks.streak, playerName) +
        getPlayerObjectValue(ranks.feed, playerName)) /
      5;

    playedWarAverages.push(averageForThisWar);
  });

  return playedWarAverages;
}

function buildAverageRankFromPlayedWars(events, playerName) {
  return formatAverageRank(buildAverageRankValuesFromPlayedWars(events, playerName));
}

function PremiumStatList({ title, items, accent = 'emerald' }) {
  const isFeed = accent === 'amber';
  const max = Math.max(1, ...items.map((item) => Number(item.value) || 0));

  const theme = isFeed
    ? {
        title: 'Killfeed Overview',
        valueColor: 'text-amber-300',
        border: 'border-amber-300/20',
        bar: 'from-amber-300 via-orange-400 to-yellow-200',
        bg: 'from-amber-500/10 via-slate-950/75 to-slate-950',
        glow: 'shadow-[0_0_20px_rgba(245,158,11,.18)]',
        dot: 'bg-amber-300',
      }
    : {
        title: 'Killstreak Overview',
        valueColor: 'text-cyan-300',
        border: 'border-cyan-300/20',
        bar: 'from-cyan-300 via-sky-400 to-blue-500',
        bg: 'from-cyan-500/10 via-slate-950/75 to-slate-950',
        glow: 'shadow-[0_0_20px_rgba(34,211,238,.18)]',
        dot: 'bg-cyan-300',
      };

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border ${theme.border} bg-gradient-to-br ${theme.bg} p-4 shadow-[0_24px_80px_rgba(0,0,0,.42)] backdrop-blur-2xl`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-44 w-44 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative mb-3 flex items-center gap-3 border-b border-white/10 pb-3">
        <div
          className={`rounded-xl border ${theme.border} bg-slate-950/60 px-2.5 py-1 text-[11px] font-black ${theme.valueColor}`}
        >
          Top {items.length}
        </div>

        <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-100">
          {theme.title}
        </h3>
      </div>

      {!items.length ? (
        <p className="relative rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-5 text-sm text-slate-500">
          No data yet.
        </p>
      ) : (
        <div className="relative space-y-1.5">
          {items.map((item, index) => {
            const value = Number(item.value) || 0;
            const width = Math.max(7, Math.round((value / max) * 100));

            return (
              <div
                key={`${title}-${item.id}-${index}`}
                className="group grid grid-cols-[54px_1fr_34px] items-center gap-3 border-b border-white/8 py-2.5 last:border-b-0"
              >
                <div className="text-3xl font-light tracking-tight text-white drop-shadow-[0_0_10px_rgba(255,255,255,.16)]">
                  {value}
                </div>

                <div className="min-w-0">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-black text-slate-100">
                      {item.date}
                    </p>

                    <div className="text-[11px] font-black text-slate-500">
                      #{index + 1}
                    </div>
                  </div>

                  <div className="relative h-3 overflow-hidden rounded-md border border-white/10 bg-slate-950/70 shadow-inner">
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,.08)_1px,transparent_1px)] bg-[length:18px_100%] opacity-20" />

                    <div
                      className={`relative h-full rounded-md bg-gradient-to-r ${theme.bar} ${theme.glow} transition-all duration-500`}
                      style={{ width: `${width}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 opacity-20" />
                      <div className="absolute right-0 top-0 h-full w-8 bg-white/35 blur-md" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <div
                    className={`h-2 w-2 rounded-full ${theme.dot} shadow-[0_0_16px_currentColor]`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="relative mt-3 flex items-center border-t border-white/10 pt-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span
            className={`h-3 w-3 rounded-full ${theme.dot} shadow-[0_0_18px_currentColor]`}
          />
          <span>Player performance record</span>
        </div>
      </div>
    </div>
  );
}

function StreakFeedPanel({ streakItems, feedItems }) {
  return (
    <Panel>
      <div className="grid gap-4 xl:grid-cols-2">
        <PremiumStatList
          title="Killstreak"
          items={streakItems}
          accent="emerald"
        />

        <PremiumStatList
          title="Killfeed"
          items={feedItems}
          accent="amber"
        />
      </div>
    </Panel>
  );
}

// ─── MatchHistoryList ─────────────────────────────────────────────────────────

const MATCH_HISTORY_COLORS = {
  kills: '#93c5fd',
  deaths: '#f9a8d4',
  kdPositive: '#6ee7b7',
  kdNegative: '#fda4af',
  killstreak: '#f8fafc',
  killfeed: '#fb923c',
  damageDealt: '#67e8f9',
  damageTaken: '#fda4af',
  ccHits: '#c4b5fd',
  damageToFort: '#fde047',
};


const SECONDARY_MATCH_METRIC_KEYS = {
  kills: ['kills', 'Kills'],
  deaths: ['deaths', 'Deaths'],
  killstreak: [
    'killStreak',
    'killstreak',
    'streak',
    'Killstreak',
    'KillStreak',
  ],
  killfeed: [
    'killFeed',
    'killfeed',
    'feed',
    'KillFeed',
    'Killfeed',
  ],
  damageDealt: [
    'damageDealt',
    'damage_dealt',
    'damageDone',
    'damage',
    'Damage Dealt',
    'DamageDealt',
  ],
  damageTaken: [
    'damageTaken',
    'damage_taken',
    'Damage Taken',
    'DamageTaken',
  ],
  ccHits: ['ccHits', 'cc_hits', 'cc', 'CC Hits', 'CCHits'],
  damageToFort: [
    'damageToFort',
    'damage_to_fort',
    'fortDamage',
    'damageFort',
    'Damage to Fort',
    'DamageToFort',
  ],
};

const SECONDARY_CORE_METRICS = new Set(['kills', 'deaths']);
const SECONDARY_DETAIL_METRICS = [
  'killstreak',
  'killfeed',
  'damageDealt',
  'damageTaken',
  'ccHits',
  'damageToFort',
];

function findRawKey(row, keys) {
  return keys.find(
    (key) => row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== '',
  );
}

function normalizeLogText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getRowRawText(row) {
  if (!row) return '';

  return [
    row.raw,
    row.rawLine,
    row.original,
    row.originalLine,
    row.source,
    row.sourceLine,
    row.text,
    row.line,
    row.input,
    row.entry,
    row.content,
    row.note,
  ]
    .filter((value) => value !== undefined && value !== null && value !== '')
    .join(' ');
}


function getStructuredPresenceText(value, depth = 0) {
  if (value === undefined || value === null || depth > 3) return '';

  if (Array.isArray(value)) {
    return value.map((item) => getStructuredPresenceText(item, depth + 1)).join(' ');
  }

  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, item]) => `${key} ${getStructuredPresenceText(item, depth + 1)}`)
      .join(' ');
  }

  return String(value);
}

function hasMetricNameInStructuredFields(row, keys) {
  if (!row) return false;

  const containers = [
    row.headers,
    row.header,
    row.columns,
    row.columnNames,
    row.fieldNames,
    row.fields,
    row.providedFields,
    row.availableFields,
    row.schema,
    row.metrics,
  ];

  const structuredText = normalizeLogText(
    containers
      .map((value) => getStructuredPresenceText(value))
      .filter(Boolean)
      .join(' '),
  );

  if (!structuredText) return false;

  return keys.some((key) => {
    const alias = normalizeLogText(key);
    const spacedAlias = normalizeLogText(
      String(key)
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]/g, ' '),
    );

    return Boolean(
      (alias && structuredText.includes(alias)) ||
        (spacedAlias && structuredText.includes(spacedAlias)),
    );
  });
}

function rowHasOwnMetricKey(row, keys) {
  return Boolean(row && keys.some((key) => Object.prototype.hasOwnProperty.call(row, key)));
}

function getRowMetricNumber(row, metric, fallback = NaN) {
  const keys = SECONDARY_MATCH_METRIC_KEYS[metric] || [metric];
  const key = findRawKey(row, keys);

  if (!key) return fallback;

  return parseNumericValue(row[key], fallback);
}

function getSecondaryWarMetricPresence(rows) {
  const output = {};

  (rows || []).forEach((row, index) => {
    const warId = secondaryWarId(row, index);

    output[warId] ||= {
      __detailed: false,
    };

    Object.entries(SECONDARY_MATCH_METRIC_KEYS).forEach(([metric, keys]) => {
      const key = findRawKey(row, keys);
      const number = key ? parseNumericValue(row[key], NaN) : NaN;
      const presenceFlag = getPresenceFlag(row, keys);
      const explicitPresence =
        presenceFlag === true ||
        hasMetricNameInRawText(row, keys) ||
        hasMetricNameInStructuredFields(row, keys);
      const nonZeroValue = Number.isFinite(number) && number !== 0;

      if (explicitPresence || nonZeroValue) {
        output[warId][metric] = true;
      }

      if (SECONDARY_DETAIL_METRICS.includes(metric) && (explicitPresence || nonZeroValue)) {
        output[warId].__detailed = true;
      }
    });
  });

  // When one of the extra columns exists in a detailed secondary log, a 0 in
  // another extra column is still a real cell from that same log table. This is
  // what makes values like Kawoy -> 2026-05-01 -> Damage to Fort = 0 count in
  // the average, instead of being treated as an auto-generated missing value.
  (rows || []).forEach((row, index) => {
    const warId = secondaryWarId(row, index);
    const presence = output[warId];

    if (!presence?.__detailed) return;

    SECONDARY_DETAIL_METRICS.forEach((metric) => {
      const keys = SECONDARY_MATCH_METRIC_KEYS[metric] || [metric];
      const number = getRowMetricNumber(row, metric, NaN);

      if (rowHasOwnMetricKey(row, keys) && Number.isFinite(number)) {
        presence[metric] = true;
      }
    });
  });

  return output;
}

function getSecondaryMetricExists(row, metric, warPresence = {}) {
  const keys = SECONDARY_MATCH_METRIC_KEYS[metric] || [metric];

  if (hasRawValue(row, keys)) return true;

  const number = getRowMetricNumber(row, metric, NaN);

  if (!Number.isFinite(number)) return false;

  if (SECONDARY_CORE_METRICS.has(metric) && rowHasOwnMetricKey(row, keys)) {
    return true;
  }

  if (number !== 0) return true;

  if (warPresence?.[metric]) return true;

  if (
    SECONDARY_DETAIL_METRICS.includes(metric) &&
    warPresence?.__detailed &&
    rowHasOwnMetricKey(row, keys)
  ) {
    return true;
  }

  return false;
}

function getPresenceFlag(row, keys) {
  if (!row) return undefined;

  const suffixes = [
    'HasValue',
    'hasValue',
    'Exists',
    'exists',
    'Present',
    'present',
    'Provided',
    'provided',
    'Added',
    'added',
  ];

  for (const key of keys) {
    const keyText = String(key);
    const compact = keyText.replace(/[^a-zA-Z0-9]/g, '');
    const camel = compact.charAt(0).toLowerCase() + compact.slice(1);
    const pascal = compact.charAt(0).toUpperCase() + compact.slice(1);
    const snake = keyText
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();

    const candidates = [
      `has_${snake}`,
      `${snake}_exists`,
      `${snake}_present`,
      `${snake}_provided`,
      `${snake}_added`,
      ...suffixes.flatMap((suffix) => [`${camel}${suffix}`, `${pascal}${suffix}`]),
    ];

    const found = candidates.find((candidate) =>
      Object.prototype.hasOwnProperty.call(row, candidate),
    );

    if (found) return Boolean(row[found]);
  }

  return undefined;
}

function hasMetricNameInRawText(row, keys) {
  const rawText = normalizeLogText(getRowRawText(row));

  if (!rawText) return false;

  return keys.some((key) => {
    const alias = normalizeLogText(key);
    const spacedAlias = normalizeLogText(
      String(key)
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_-]/g, ' '),
    );

    return Boolean(
      (alias && rawText.includes(alias)) ||
        (spacedAlias && rawText.includes(spacedAlias)),
    );
  });
}

function hasRawValue(row, keys) {
  const key = findRawKey(row, keys);

  if (!key) return false;

  const number = parseNumericValue(row[key], NaN);

  if (!Number.isFinite(number)) return false;

  const presenceFlag = getPresenceFlag(row, keys);

  if (presenceFlag !== undefined) return presenceFlag;

  // Non-zero values prove that the metric was actually added in the log.
  if (number !== 0) return true;

  // A plain 0 is often generated automatically for missing secondary-log columns.
  // Count it only when the original/raw row also contains the metric name, which
  // means that the 0 was explicitly written in the log for that column.
  return hasMetricNameInRawText(row, keys);
}

function parseNumericValue(value, fallback = 0) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  let text = String(value).trim().toLowerCase();

  if (!text) return fallback;

  let multiplier = 1;

  if (text.endsWith('k')) {
    multiplier = 1000;
    text = text.slice(0, -1);
  } else if (text.endsWith('m')) {
    multiplier = 1000000;
    text = text.slice(0, -1);
  } else if (text.endsWith('b')) {
    multiplier = 1000000000;
    text = text.slice(0, -1);
  }

  text = text.replace(/[^0-9.,-]/g, '');

  if (!text || text === '-' || text === '.' || text === ',') {
    return fallback;
  }

  const commaCount = (text.match(/,/g) || []).length;
  const dotCount = (text.match(/\./g) || []).length;

  if (commaCount && dotCount) {
    const lastComma = text.lastIndexOf(',');
    const lastDot = text.lastIndexOf('.');

    if (lastComma > lastDot) {
      text = text.replace(/\./g, '').replace(',', '.');
    } else {
      text = text.replace(/,/g, '');
    }
  } else if (commaCount) {
    if (commaCount > 1) {
      text = text.replace(/,/g, '');
    } else {
      const [left, right = ''] = text.split(',');
      text = right.length === 3 && left.replace('-', '').length <= 3
        ? `${left}${right}`
        : `${left}.${right}`;
    }
  } else if (dotCount > 1) {
    text = text.replace(/\./g, '');
  } else if (dotCount === 1) {
    const [left, right = ''] = text.split('.');
    text = right.length === 3 && left.replace('-', '').length <= 3
      ? `${left}${right}`
      : text;
  }

  const number = Number(text);

  return Number.isFinite(number) ? number * multiplier : fallback;
}

function readNumber(row, keys, fallback = 0) {
  const key = findRawKey(row, keys);

  if (!key) return fallback;

  return parseNumericValue(row[key], fallback);
}

function trimCompactZeros(value) {
  return String(value)
    .replace(/\.0+$/, '')
    .replace(/(\.\d*?)0+$/, '$1');
}

function formatCompactNumber(value, decimals = 2) {
  const number = Number(value) || 0;

  if (!Number.isFinite(number)) return '0';

  const abs = Math.abs(number);
  const sign = number < 0 ? '-' : '';

  if (abs >= 1000000000) {
    return `${sign}${trimCompactZeros((abs / 1000000000).toFixed(1))}b`;
  }

  if (abs >= 1000000) {
    return `${sign}${trimCompactZeros((abs / 1000000).toFixed(1))}m`;
  }

  if (abs >= 1000) {
    return `${sign}${trimCompactZeros((abs / 1000).toFixed(1))}k`;
  }

  if (Number.isInteger(number)) return String(number);

  return trimCompactZeros(number.toFixed(decimals));
}

function formatMatchNumber(value) {
  return formatCompactNumber(value, 2);
}

function formatNullableMatchNumber(value) {
  return value === null ? null : formatMatchNumber(value);
}

function formatKdNumber(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) return '0.00';

  return number.toFixed(2);
}

function formatNullableKdNumber(value) {
  return value === null ? null : formatKdNumber(value);
}

function getMatchMetricValue(match, key) {
  return parseNumericValue(match?.[key], 0);
}

function getMatchKdValue(match) {
  const kills = getMatchMetricValue(match, 'kills');
  const deaths = getMatchMetricValue(match, 'deaths');

  return deaths ? kills / deaths : kills;
}

function getMatchMetricExists(match, key) {
  if (!match) return false;

  if (key === 'kd') {
    return getMatchMetricExists(match, 'kills') && getMatchMetricExists(match, 'deaths');
  }

  if (match.__has && Object.prototype.hasOwnProperty.call(match.__has, key)) {
    return Boolean(match.__has[key]);
  }

  const value = match[key];

  if (value === undefined || value === null || value === '') return false;

  return Number.isFinite(parseNumericValue(value, NaN));
}

function getMatchSortValue(match, key) {
  if (key === 'date') return String(match?.date || '');
  if (key === 'kd') return getMatchKdValue(match);

  return getMatchMetricValue(match, key);
}

function getAverageFromExistingMatches(matches, key, getValue) {
  const values = matches
    .filter((match) => getMatchMetricExists(match, key))
    .map((match) => Number(getValue(match)))
    .filter((value) => Number.isFinite(value));

  if (!values.length) return null;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatMatchCell(match, key) {
  if (!getMatchMetricExists(match, key)) return '—';

  return formatMatchNumber(getMatchMetricValue(match, key));
}

function formatMatchKdCell(match) {
  if (!getMatchMetricExists(match, 'kd')) return '—';

  return formatKdNumber(getMatchKdValue(match));
}

function buildMatchHistoryAverages(matches) {
  return {
    kills: getAverageFromExistingMatches(matches, 'kills', (match) =>
      getMatchMetricValue(match, 'kills'),
    ),
    deaths: getAverageFromExistingMatches(matches, 'deaths', (match) =>
      getMatchMetricValue(match, 'deaths'),
    ),
    kd: getAverageFromExistingMatches(matches, 'kd', getMatchKdValue),
    killstreak: getAverageFromExistingMatches(matches, 'killstreak', (match) =>
      getMatchMetricValue(match, 'killstreak'),
    ),
    killfeed: getAverageFromExistingMatches(matches, 'killfeed', (match) =>
      getMatchMetricValue(match, 'killfeed'),
    ),
    damageDealt: getAverageFromExistingMatches(matches, 'damageDealt', (match) =>
      getMatchMetricValue(match, 'damageDealt'),
    ),
    damageTaken: getAverageFromExistingMatches(matches, 'damageTaken', (match) =>
      getMatchMetricValue(match, 'damageTaken'),
    ),
    ccHits: getAverageFromExistingMatches(matches, 'ccHits', (match) =>
      getMatchMetricValue(match, 'ccHits'),
    ),
    damageToFort: getAverageFromExistingMatches(matches, 'damageToFort', (match) =>
      getMatchMetricValue(match, 'damageToFort'),
    ),
  };
}

function getSecondaryMatchStats(row) {
  return {
    kills: readNumber(row, SECONDARY_MATCH_METRIC_KEYS.kills),
    deaths: readNumber(row, SECONDARY_MATCH_METRIC_KEYS.deaths),
    killstreak: readNumber(row, SECONDARY_MATCH_METRIC_KEYS.killstreak),
    killfeed: readNumber(row, SECONDARY_MATCH_METRIC_KEYS.killfeed),
    damageDealt: readNumber(row, SECONDARY_MATCH_METRIC_KEYS.damageDealt),
    damageTaken: readNumber(row, SECONDARY_MATCH_METRIC_KEYS.damageTaken),
    ccHits: readNumber(row, SECONDARY_MATCH_METRIC_KEYS.ccHits),
    damageToFort: readNumber(row, SECONDARY_MATCH_METRIC_KEYS.damageToFort),
  };
}

function MatchHistoryHeaderCell({
  children,
  color,
  average = null,
  sortKey = '',
  sort,
  onSort,
  align = 'center',
}) {
  const active = sortKey && sort?.key === sortKey;
  const arrow = active ? (sort.dir === 'desc' ? '↓' : '↑') : '↕';
  const justify = align === 'left' ? 'items-start text-left' : 'items-center text-center';

  return (
    <button
      type="button"
      onClick={() => sortKey && onSort?.(sortKey)}
      className={`flex min-w-0 w-full flex-col ${justify} rounded-xl px-0.5 py-1 transition hover:bg-white/5`}
    >
      {average !== null && (
        <p
          className="mb-1 text-sm font-black leading-none tracking-tight"
          style={{ color }}
        >
          <span className="mr-1 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
            Avg
          </span>
          {average}
        </p>
      )}

      <p
        className="text-[10px] font-black uppercase leading-tight tracking-[0.1em]"
        style={{ color }}
      >
        {children} <span className={active ? 'text-blue-300' : 'text-slate-600'}>{arrow}</span>
      </p>
    </button>
  );
}

function MatchHistoryMetricIcon({ type, color }) {
  const commonProps = {
    width: 16,
    height: 16,
    viewBox: '-10 -10 20 20',
    className: 'shrink-0',
    style: {
      filter: `drop-shadow(0 0 5px ${color})`,
    },
    'aria-hidden': true,
  };

  const darkStroke = 'rgba(2,6,23,0.96)';

  if (type === 'kills') {
    return (
      <svg {...commonProps}>
        <path
          d="M -7.5 6.8 L -5.3 8.2 L 7.5 -5.9 L 5.9 -7.5 Z"
          fill={color}
          stroke={darkStroke}
          strokeWidth="1.15"
          strokeLinejoin="round"
        />
        <path
          d="M -7.8 -6.4 L -6.4 -7.8 L 7.8 6.4 L 6.4 7.8 Z"
          fill={color}
          opacity="0.75"
          stroke={darkStroke}
          strokeWidth="1.05"
          strokeLinejoin="round"
        />
        <path
          d="M -4.6 4.1 L -7.2 7.2 M 4.6 4.1 L 7.2 7.2"
          stroke={darkStroke}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === 'deaths') {
    return (
      <svg {...commonProps}>
        <g transform="scale(0.86)">
          <path
            d="M 0 -8.6
               C -5.2 -8.6 -8.2 -5.3 -8.2 -1.1
               C -8.2 2.2 -6.3 4.2 -3.8 5.1
               L -3.8 7.5
               L -2.1 7.5
               L -2.1 5.9
               L -0.7 5.9
               L -0.7 7.5
               L 0.7 7.5
               L 0.7 5.9
               L 2.1 5.9
               L 2.1 7.5
               L 3.8 7.5
               L 3.8 5.1
               C 6.3 4.2 8.2 2.2 8.2 -1.1
               C 8.2 -5.3 5.2 -8.6 0 -8.6 Z"
            fill={color}
            stroke={darkStroke}
            strokeWidth="1.25"
            strokeLinejoin="round"
          />
          <circle cx="-3" cy="-1.8" r="1.75" fill={darkStroke} />
          <circle cx="3" cy="-1.8" r="1.75" fill={darkStroke} />
          <path d="M 0 0.3 L -1.35 3 L 1.35 3 Z" fill={darkStroke} />
        </g>
      </svg>
    );
  }

  if (type === 'kd') {
    return (
      <svg {...commonProps}>
        <circle
          cx="0"
          cy="0"
          r="7.2"
          fill="rgba(2,6,23,0.88)"
          stroke={color}
          strokeWidth="2"
        />
        <circle cx="0" cy="0" r="3.7" fill={color} stroke={darkStroke} strokeWidth="1" />
        <path
          d="M 0 -9 L 0 -5.8 M 0 5.8 L 0 9 M -9 0 L -5.8 0 M 5.8 0 L 9 0"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (type === 'killstreak') {
    return (
      <svg {...commonProps}>
        <path
          d="M 1 -8.4 L -6.8 1.4 L -1.4 1.4 L -3.1 8.4 L 6.9 -2.6 L 1.3 -2.6 Z"
          fill={color}
          stroke={darkStroke}
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === 'killfeed') {
    return (
      <svg {...commonProps}>
        <g transform="scale(0.86)">
          <path
            d="M 0 8.4
               C -4.5 8.4 -7.4 5.3 -7.4 1.7
               C -7.4 -1.3 -5.7 -3.1 -3.8 -4.6
               C -3.5 -1.7 -1.7 -0.9 -1.2 -3.9
               C -0.8 -6.1 -1.4 -7.8 1.1 -9.1
               C 0.6 -5.4 4.6 -4.1 5.8 -1.2
               C 7.1 1.9 5.7 8.4 0 8.4 Z"
            fill={color}
            stroke={darkStroke}
            strokeWidth="1.25"
            strokeLinejoin="round"
          />
          <path
            d="M 0.3 6.9
               C -2.1 6.9 -3.8 5.2 -3.8 2.9
               C -3.8 1.2 -2.8 0.1 -1.5 -1.1
               C -1.2 1.2 0.8 1.4 1.1 -1.6
               C 2.8 0.1 3.9 1.9 3.6 4
               C 3.3 5.8 2.1 6.9 0.3 6.9 Z"
            fill={darkStroke}
            opacity="0.9"
          />
        </g>
      </svg>
    );
  }

  if (type === 'damageDealt') {
    return (
      <svg {...commonProps}>
        <g transform="translate(0.1 0.2) scale(0.92)">
          <path
            d="M -6.6 5.9
               L -6.6 0.3
               C -6.6 -0.2 -6.2 -0.6 -5.7 -0.6
               C -4.8 -0.6 -4.1 -0.3 -3.4 0.2
               C -2.6 0.8 -1.7 1 -0.7 0.8
               C 0.6 0.5 1.6 0.6 2.5 1.2
               L 3.2 1.6"
            fill="none"
            stroke={color}
            strokeWidth="1.95"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 5.6 -1.2
               C 6.5 0.2 7 1.8 7 3.3
               L 7 4.1
               C 7 5 6.4 5.9 5.4 6.2
               L 2.5 7.1
               C 1.1 7.5 -0.4 7.5 -1.8 7.1
               L -3 6.7
               C -3.9 6.4 -4.9 6.2 -5.8 6.2
               L -6.6 6.2"
            fill="none"
            stroke={color}
            strokeWidth="1.95"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 0.8 3.2
               C 1.8 2.8 2.8 2.7 3.9 2.9
               C 4.9 3.1 5.5 3.8 5.8 5"
            fill="none"
            stroke={darkStroke}
            strokeWidth="1.1"
            strokeLinecap="round"
            opacity="0.88"
          />
          <path
            d="M 0.7 0.8
               C 1.1 -1.3 1.2 -3.1 1.1 -4.4
               C 1 -5.6 1.5 -6.5 2.5 -7
               C 3.4 -7.5 4.4 -7.3 5.2 -6.7
               L 6.4 -5.7
               C 7.2 -5 7.3 -3.8 6.7 -3
               L 5.7 -1.9"
            fill="none"
            stroke={color}
            strokeWidth="1.95"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 5.5 -6.1
               L 4.4 -5.2
               C 3.7 -4.7 3.6 -3.8 4.2 -3.2
               L 5.1 -2.3
               C 5.8 -1.6 6.9 -1.7 7.4 -2.5
               L 7.8 -3.1
               C 8.3 -3.8 8.2 -4.7 7.6 -5.3
               L 6.8 -6"
            fill="none"
            stroke={color}
            strokeWidth="1.95"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 5.7 -5.4
               C 5 -5.2 4.5 -4.8 4.3 -4.1
               M 6.6 -4.6 L 5.4 -3.6
               M 6.3 -2.8 L 5.2 -1.9"
            fill="none"
            stroke={darkStroke}
            strokeWidth="1.05"
            strokeLinecap="round"
            opacity="0.88"
          />
        </g>
        <g transform="translate(6.2 -6.4) scale(0.72)">
          <path
            d="M 0 -3.8 L 0.9 -0.9 L 3.8 0 L 0.9 0.9 L 0 3.8 L -0.9 0.9 L -3.8 0 L -0.9 -0.9 Z"
            fill={color}
            stroke={darkStroke}
            strokeWidth="0.95"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    );
  }

  if (type === 'damageTaken') {
    return (
      <svg {...commonProps}>
        <path
          d="M 0 -8.4 L 7.1 -5.8 L 6.1 1.7 C 5.5 5.4 3.3 7.4 0 8.6 C -3.3 7.4 -5.5 5.4 -6.1 1.7 L -7.1 -5.8 Z"
          fill={color}
          stroke={darkStroke}
          strokeWidth="1.3"
          strokeLinejoin="round"
        />
        <path
          d="M 0 -5.9 L 0 5.7"
          stroke={darkStroke}
          strokeWidth="1.4"
          strokeLinecap="round"
          opacity="0.75"
        />
      </svg>
    );
  }

  if (type === 'ccHits') {
    return (
      <svg {...commonProps}>
        <g transform="rotate(-18)">
          <path
            d="M -7 2.8
               C -7 0.5 -5.4 -1.1 -3.1 -1.1
               L -0.8 -1.1
               C 0.8 -1.1 2 0.1 2 1.7
               C 2 3.4 0.8 4.6 -0.8 4.6
               L -2 4.6"
            fill="none"
            stroke={color}
            strokeWidth="2.15"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 7 -2.8
               C 7 -0.5 5.4 1.1 3.1 1.1
               L 0.8 1.1
               C -0.8 1.1 -2 -0.1 -2 -1.7
               C -2 -3.4 -0.8 -4.6 0.8 -4.6
               L 2 -4.6"
            fill="none"
            stroke={color}
            strokeWidth="2.15"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M -0.7 -0.8 L 0.7 0.8 M -0.7 0.8 L 0.7 -0.8"
            stroke={darkStroke}
            strokeWidth="1.35"
            strokeLinecap="round"
          />
          <path
            d="M -1.7 -2 L -2.7 -3.1 M 1.7 2 L 2.7 3.1"
            stroke={color}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </g>
      </svg>
    );
  }

  if (type === 'damageToFort') {
    return (
      <svg {...commonProps}>
        <path
          d="M -7.6 -5.2 L -5.2 -5.2 L -5.2 -7.5 L -2.8 -7.5 L -2.8 -5.2 L -1.2 -5.2 L -1.2 -7.5 L 1.2 -7.5 L 1.2 -5.2 L 2.8 -5.2 L 2.8 -7.5 L 5.2 -7.5 L 5.2 -5.2 L 7.6 -5.2 L 7.6 7.5 L 4.7 7.5 L 4.7 3.6 C 4.7 1 2.6 -1.2 0 -1.2 C -2.6 -1.2 -4.7 1 -4.7 3.6 L -4.7 7.5 L -7.6 7.5 Z"
          fill={color}
          stroke={darkStroke}
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
        <path
          d="M -1.6 7.5 L -1.6 3.8 C -1.6 2.8 -0.9 2.1 0 2.1 C 0.9 2.1 1.6 2.8 1.6 3.8 L 1.6 7.5"
          fill={darkStroke}
          opacity="0.85"
        />
      </svg>
    );
  }

  return null;
}

function MatchHistoryValue({ children, color, prefix = null, icon = null }) {
  return (
    <p
      className="flex min-w-0 items-center justify-center gap-1 text-center text-sm font-black"
      style={{ color }}
    >
      {icon && <MatchHistoryMetricIcon type={icon} color={color} />}
      {prefix && !icon && <span className="shrink-0 text-xs leading-none">{prefix}</span>}
      <span className="min-w-0 truncate">{children}</span>
    </p>
  );
}

function MatchHistoryList({ matches, onOpenMatchHistory }) {
  const [sort, setSort] = useState({
    key: 'date',
    dir: 'desc',
  });

  const safeMatches = matches || [];
  const averages = buildMatchHistoryAverages(safeMatches);

  const sortedMatches = useMemo(() => {
    return [...safeMatches].sort((a, b) => {
      const metricSort = sort.key !== 'date';
      const aExists = !metricSort || getMatchMetricExists(a, sort.key);
      const bExists = !metricSort || getMatchMetricExists(b, sort.key);

      if (aExists !== bExists) {
        return aExists ? -1 : 1;
      }

      const av = getMatchSortValue(a, sort.key);
      const bv = getMatchSortValue(b, sort.key);

      let result;

      if (typeof av === 'string' || typeof bv === 'string') {
        result = String(av).localeCompare(String(bv));
      } else if (av === bv) {
        result = String(b.date || '').localeCompare(String(a.date || ''));
      } else {
        result = av - bv;
      }

      if (!result) {
        result = String(a.warId || '').localeCompare(String(b.warId || ''));
      }

      return sort.dir === 'asc' ? result : -result;
    });
  }, [safeMatches, sort]);

  function toggleSort(key) {
    setSort((current) => ({
      key,
      dir: current.key === key && current.dir === 'desc' ? 'asc' : 'desc',
    }));
  }

  if (!safeMatches.length) return null;

  const gridCols =
    'grid-cols-[38px_minmax(190px,1.65fr)_minmax(82px,.72fr)_minmax(82px,.72fr)_minmax(88px,.76fr)_minmax(112px,.95fr)_minmax(104px,.9fr)_minmax(126px,1.06fr)_minmax(126px,1.06fr)_minmax(96px,.82fr)_minmax(132px,1.1fr)]';

  return (
    <Panel>
      <div className="mb-4">
        <h3 className="text-2xl font-black">Match History</h3>
        <p className="mt-0.5 text-xs font-bold text-slate-500">
          All matches for this player · {safeMatches.length} total
        </p>
      </div>

      <div className={`max-h-[420px] overflow-x-auto overflow-y-auto pr-2 ${scrollCls}`}>
        <div className="w-full min-w-[1240px] space-y-2">
          {/* Header */}
          <div
            className={`sticky top-0 z-10 grid ${gridCols} gap-3 rounded-2xl border border-slate-800 bg-slate-950/95 px-3 py-2.5 backdrop-blur`}
          >
            <div />
            <MatchHistoryHeaderCell
              color="#94a3b8"
              sortKey="date"
              sort={sort}
              onSort={toggleSort}
              align="left"
            >
              Date
            </MatchHistoryHeaderCell>
            <MatchHistoryHeaderCell
              color={MATCH_HISTORY_COLORS.kills}
              average={formatNullableMatchNumber(averages.kills)}
              sortKey="kills"
              sort={sort}
              onSort={toggleSort}
            >
              Kills
            </MatchHistoryHeaderCell>
            <MatchHistoryHeaderCell
              color={MATCH_HISTORY_COLORS.deaths}
              average={formatNullableMatchNumber(averages.deaths)}
              sortKey="deaths"
              sort={sort}
              onSort={toggleSort}
            >
              Deaths
            </MatchHistoryHeaderCell>
            <MatchHistoryHeaderCell
              color={MATCH_HISTORY_COLORS.kdPositive}
              average={formatNullableKdNumber(averages.kd)}
              sortKey="kd"
              sort={sort}
              onSort={toggleSort}
            >
              K/D
            </MatchHistoryHeaderCell>
            <MatchHistoryHeaderCell
              color={MATCH_HISTORY_COLORS.killstreak}
              average={formatNullableMatchNumber(averages.killstreak)}
              sortKey="killstreak"
              sort={sort}
              onSort={toggleSort}
            >
              Killstreak
            </MatchHistoryHeaderCell>
            <MatchHistoryHeaderCell
              color={MATCH_HISTORY_COLORS.killfeed}
              average={formatNullableMatchNumber(averages.killfeed)}
              sortKey="killfeed"
              sort={sort}
              onSort={toggleSort}
            >
              KillFeed
            </MatchHistoryHeaderCell>
            <MatchHistoryHeaderCell
              color={MATCH_HISTORY_COLORS.damageDealt}
              average={formatNullableMatchNumber(averages.damageDealt)}
              sortKey="damageDealt"
              sort={sort}
              onSort={toggleSort}
            >
              Damage Dealt
            </MatchHistoryHeaderCell>
            <MatchHistoryHeaderCell
              color={MATCH_HISTORY_COLORS.damageTaken}
              average={formatNullableMatchNumber(averages.damageTaken)}
              sortKey="damageTaken"
              sort={sort}
              onSort={toggleSort}
            >
              Damage Taken
            </MatchHistoryHeaderCell>
            <MatchHistoryHeaderCell
              color={MATCH_HISTORY_COLORS.ccHits}
              average={formatNullableMatchNumber(averages.ccHits)}
              sortKey="ccHits"
              sort={sort}
              onSort={toggleSort}
            >
              CC Hits
            </MatchHistoryHeaderCell>
            <MatchHistoryHeaderCell
              color={MATCH_HISTORY_COLORS.damageToFort}
              average={formatNullableMatchNumber(averages.damageToFort)}
              sortKey="damageToFort"
              sort={sort}
              onSort={toggleSort}
            >
              Damage to Fort
            </MatchHistoryHeaderCell>
          </div>

          {/* Rows */}
          {sortedMatches.map((match, index) => {
            const matchKills = getMatchMetricValue(match, 'kills');
            const matchDeaths = getMatchMetricValue(match, 'deaths');
            const positive = matchKills >= matchDeaths;
            const kdValue = formatMatchKdCell(match);

            return (
              <button
                type="button"
                key={`${match.warId}-${match.date}-${index}`}
                onClick={() => onOpenMatchHistory?.(match)}
                className={`grid ${gridCols} w-full cursor-pointer items-center gap-3 rounded-2xl border border-slate-800/90 bg-gradient-to-r from-slate-950/95 via-slate-900/70 to-slate-950/95 px-3 py-2.5 text-left shadow-[0_4px_14px_rgba(0,0,0,.18)] transition hover:border-slate-700`}
                title="Open this match in Overview"
              >
                {/* Index */}
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-[10px] font-black text-slate-400">
                  {index + 1}
                </span>

                {/* Date / war name */}
                <p className="truncate text-sm font-black text-slate-100">
                  {match.date || '—'}
                </p>

                {/* Kills */}
                <MatchHistoryValue color={MATCH_HISTORY_COLORS.kills} icon="kills">
                  {formatMatchCell(match, 'kills')}
                </MatchHistoryValue>

                {/* Deaths */}
                <MatchHistoryValue color={MATCH_HISTORY_COLORS.deaths} icon="deaths">
                  {formatMatchCell(match, 'deaths')}
                </MatchHistoryValue>

                {/* K/D */}
                <MatchHistoryValue
                  color={
                    positive
                      ? MATCH_HISTORY_COLORS.kdPositive
                      : MATCH_HISTORY_COLORS.kdNegative
                  }
                  icon="kd"
                >
                  {kdValue}
                </MatchHistoryValue>

                {/* Killstreak */}
                <MatchHistoryValue color={MATCH_HISTORY_COLORS.killstreak} icon="killstreak">
                  {formatMatchCell(match, 'killstreak')}
                </MatchHistoryValue>

                {/* KillFeed */}
                <MatchHistoryValue color={MATCH_HISTORY_COLORS.killfeed} icon="killfeed">
                  {formatMatchCell(match, 'killfeed')}
                </MatchHistoryValue>

                {/* Damage Dealt */}
                <MatchHistoryValue color={MATCH_HISTORY_COLORS.damageDealt} icon="damageDealt">
                  {formatMatchCell(match, 'damageDealt')}
                </MatchHistoryValue>

                {/* Damage Taken */}
                <MatchHistoryValue color={MATCH_HISTORY_COLORS.damageTaken} icon="damageTaken">
                  {formatMatchCell(match, 'damageTaken')}
                </MatchHistoryValue>

                {/* CC Hits */}
                <MatchHistoryValue color={MATCH_HISTORY_COLORS.ccHits} icon="ccHits">
                  {formatMatchCell(match, 'ccHits')}
                </MatchHistoryValue>

                {/* Damage to Fort */}
                <MatchHistoryValue color={MATCH_HISTORY_COLORS.damageToFort} icon="damageToFort">
                  {formatMatchCell(match, 'damageToFort')}
                </MatchHistoryValue>
              </button>
            );
          })}
        </div>
      </div>
    </Panel>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PlayerStats({ stats, onOpenMatchHistory }) {
  const [player, setPlayer] = useState('');

  const selectedStats = useMemo(() => {
    if (!player) return null;

    const victims = {};
    const killedBy = {};
    const days = {};
    const enemyGuilds = {};
    const involvedWarIds = new Set();
    const eventWarIdsForPlayer = new Set();
    const warMap = {};

    stats.ev.forEach((event) => {
      warMap[String(event.id)] ||= [];
      warMap[String(event.id)].push(event);

      const guildPlayer = getGuildPlayerFromEvent(event);
      const enemyPlayer = getEnemyPlayerFromEvent(event);
      const involved = samePlayerName(guildPlayer, player);

      if (!involved) return;

      involvedWarIds.add(String(event.id));
      eventWarIdsForPlayer.add(String(event.id));

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

      if (event.type === 'kill') {
        add(victims, enemyPlayer);
        days[event.date].kills += 1;
        enemyGuilds[event.guild].kills += 1;
      }

      if (event.type === 'death') {
        add(killedBy, enemyPlayer);
        days[event.date].deaths += 1;
        enemyGuilds[event.guild].deaths += 1;
      }
    });


    const secondaryRows = stats.secondary?.rows || [];
    const secondaryWarPresence = getSecondaryWarMetricPresence(secondaryRows);
    const secondaryRowsForPlayer = secondaryRows.filter((row) => samePlayerName(row.player, player));

    secondaryRowsForPlayer.forEach((row, index) => {
      const warId = secondaryWarId(row, index);

      if (eventWarIdsForPlayer.has(warId)) return;

      const dayKey = row.date || row.war || warId;
      involvedWarIds.add(warId);

      if (!days[dayKey]) {
        days[dayKey] = {
          time: dayKey,
          kills: 0,
          deaths: 0,
          wars: new Set(),
        };
      }

      days[dayKey].wars.add(warId);
      days[dayKey].kills += Number(row.kills) || 0;
      days[dayKey].deaths += Number(row.deaths) || 0;
    });

    const playerRow =
      stats.players.find((item) => samePlayerName(item.name, player)) || {
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

    // ── Build per-match list from warMap + secondary rows ─────────────────────
    const matchMap = {};

    Object.entries(warMap).forEach(([warId, events]) => {
      const playerEvents = events.filter(
        (event) => samePlayerName(getGuildPlayerFromEvent(event), player),
      );

      if (!playerEvents.length) return;

      const kills = playerEvents.filter((event) => event.type === 'kill').length;
      const deaths = playerEvents.filter((event) => event.type === 'death').length;
      const date = events[0]?.date || warId;

      matchMap[warId] = {
        warId,
        date,
        kills,
        deaths,
        killstreak: getBestKillstreakForWar(events, player),
        killfeed: getBestKillfeedForWar(events, player),
        damageDealt: 0,
        damageTaken: 0,
        ccHits: 0,
        damageToFort: 0,
        __has: {
          kills: true,
          deaths: true,
          killstreak: true,
          killfeed: true,
          damageDealt: false,
          damageTaken: false,
          ccHits: false,
          damageToFort: false,
        },
      };
    });

    secondaryRowsForPlayer.forEach((row, index) => {
      const warId = secondaryWarId(row, index);
      const statsFromRow = getSecondaryMatchStats(row);
      const existing = matchMap[warId];
      const existingHas = existing?.__has || {};
      const date = row.date || row.war || existing?.date || warId;

      const warPresence = secondaryWarPresence[warId] || {};
      const hasKills = getSecondaryMetricExists(row, 'kills', warPresence);
      const hasDeaths = getSecondaryMetricExists(row, 'deaths', warPresence);
      const hasKillstreak = getSecondaryMetricExists(row, 'killstreak', warPresence);
      const hasKillfeed = getSecondaryMetricExists(row, 'killfeed', warPresence);
      const hasDamageDealt = getSecondaryMetricExists(row, 'damageDealt', warPresence);
      const hasDamageTaken = getSecondaryMetricExists(row, 'damageTaken', warPresence);
      const hasCcHits = getSecondaryMetricExists(row, 'ccHits', warPresence);
      const hasDamageToFort = getSecondaryMetricExists(row, 'damageToFort', warPresence);

      matchMap[warId] = {
        warId,
        date,
        kills: hasKills ? statsFromRow.kills : existing?.kills || 0,
        deaths: hasDeaths ? statsFromRow.deaths : existing?.deaths || 0,
        killstreak: hasKillstreak
          ? statsFromRow.killstreak
          : existing?.killstreak || 0,
        killfeed: hasKillfeed ? statsFromRow.killfeed : existing?.killfeed || 0,
        damageDealt: hasDamageDealt
          ? statsFromRow.damageDealt
          : existing?.damageDealt || 0,
        damageTaken: hasDamageTaken
          ? statsFromRow.damageTaken
          : existing?.damageTaken || 0,
        ccHits: hasCcHits ? statsFromRow.ccHits : existing?.ccHits || 0,
        damageToFort: hasDamageToFort
          ? statsFromRow.damageToFort
          : existing?.damageToFort || 0,
        __has: {
          kills: hasKills || Boolean(existingHas.kills),
          deaths: hasDeaths || Boolean(existingHas.deaths),
          killstreak: hasKillstreak || Boolean(existingHas.killstreak),
          killfeed: hasKillfeed || Boolean(existingHas.killfeed),
          damageDealt: hasDamageDealt || Boolean(existingHas.damageDealt),
          damageTaken: hasDamageTaken || Boolean(existingHas.damageTaken),
          ccHits: hasCcHits || Boolean(existingHas.ccHits),
          damageToFort: hasDamageToFort || Boolean(existingHas.damageToFort),
        },
      };
    });

    const matchList = Object.values(matchMap).sort((a, b) =>
      String(b.date).localeCompare(String(a.date)),
    );

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
        const rows = getOurPlayerRowsForWar(events);

        if (!rows.some((row) => samePlayerName(row.name, player))) {
          return null;
        }

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
        const rows = getOurPlayerRowsForWar(events);

        if (!rows.some((row) => samePlayerName(row.name, player))) {
          return null;
        }

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
      matchList,
      enemyGuildRows,
      wars: involvedWarIds.size,
      averageRank: formatAverageRank([
        ...buildAverageRankValuesFromPlayedWars(stats.ev, player),
        ...buildSecondaryRankValues(secondaryRows, player, eventWarIdsForPlayer),
      ]),
      streakItems,
      feedItems,
    };
  }, [player, stats]);

  return (
    <Panel>
      <h2 className="mb-4 text-2xl font-black">Player Stats</h2>

      <PlayerSelect
        players={[...stats.players].sort((a, b) =>
          String(a.name || '').localeCompare(String(b.name || '')),
        )}
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
              className="border-emerald-400/25 from-emerald-500/20 text-emerald-300"
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
              className="border-blue-400/25 from-blue-500/20 text-blue-300"
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
              sub=""
              className="border-violet-400/25 from-violet-500/20 text-violet-300"
            />
          </div>

          <div className="player-stats-performance-no-summary">
            <style>
              {`.player-stats-performance-no-summary [class*="xl:justify-between"] > div:last-child {
                display: none !important;
              }`}
            </style>
            <AveragePerformanceChart
              data={selectedStats.averageLine}
              title="Performance"
            />
          </div>

          <div className="mt-4">
            <MatchHistoryList
              matches={selectedStats.matchList}
              onOpenMatchHistory={onOpenMatchHistory}
            />
          </div>

          <div className="mt-4 grid items-stretch gap-4 xl:grid-cols-[1.15fr_1fr]">
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

        </>
      )}
    </Panel>
  );
}
