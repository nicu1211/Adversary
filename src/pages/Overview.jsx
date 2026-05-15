import React, { useMemo, useState } from 'react';
import { Panel, Metric, Popup } from '../components/UI';
import { KillDeathChart } from '../components/Charts';
import {
  add,
  scrollCls,
  calculateKillFeed,
  calculateStats,
} from '../lib/logUtils';

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function getArray(value) {
  return Array.isArray(value) ? value : [];
}

function timeToSecondsValue(time) {
  const raw = String(time || '').trim();
  if (!raw) return 0;

  const parts = raw.split(':').map((part) => Number(part) || 0);

  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60;

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

function shortText(value, start = 10, end = 3) {
  const text = String(value || '-');
  const limit = start + end + 1;
  if (text.length <= limit) return text;
  return `${text.slice(0, start)}…${text.slice(-end)}`;
}

function buildAxisTicks(min, max, count = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (max <= min) return [Math.round(min), Math.round(max + 1)];

  const values = Array.from({ length: count }, (_, index) => {
    const ratio = count === 1 ? 0 : index / (count - 1);
    return Math.round(min + (max - min) * ratio);
  });

  const unique = [...new Set(values)];
  if (unique.length === 1) return [unique[0], unique[0] + 1];

  return unique;
}

function majorityGuildFromEvents(events = []) {
  const guildCounts = {};

  getArray(events).forEach((event) => {
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

  getArray(events)
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

function RankList({ title, items, valueKey }) {
  const rows = getArray(items).slice(0, 5);
  const max = Math.max(1, ...rows.map((item) => toNumber(item[valueKey])));

  return (
    <Panel>
      <h3 className="mb-4 text-xl font-black">{title}</h3>

      {!rows.length ? (
        <p className="text-slate-500">No data yet.</p>
      ) : (
        rows.map((item, index) => {
          const value = toNumber(item[valueKey]);

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
  selectedLogs,
}) {
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const safePlayers = getArray(players);
    const byName = Object.fromEntries(safePlayers.map((player) => [player.name, player]));

    const names = [
      ...new Set([
        ...getArray(members).map((member) => member.name),
        ...safePlayers.map((player) => player.name),
      ]),
    ].filter(Boolean);

    const matchCounts = {};

    getArray(selectedLogs).forEach((log) => {
      const oneStats = calculateStats([log]);

      getArray(oneStats.players).forEach((player) => {
        if (!matchCounts[player.name]) matchCounts[player.name] = 0;
        matchCounts[player.name] += 1;
      });
    });

    return names
      .map((name) => {
        const player = byName[name] || {
          name,
          kills: 0,
          deaths: 0,
          kd: '0.00',
        };

        const kills = toNumber(player.kills);
        const deaths = toNumber(player.deaths);
        const kdNumber = Number.isFinite(Number(player.kd))
          ? Number(player.kd)
          : deaths > 0
            ? kills / deaths
            : kills;

        const streak = toNumber(streaks?.[name]);
        const feed = toNumber(feeds?.[name]);
        const matches = matchCounts[name] || 0;

        const score =
          kills * 1.35 +
          kdNumber * 18 +
          streak * 2.2 +
          feed * 2.8 -
          deaths * 0.9;

        return {
          ...player,
          kills,
          deaths,
          kdNumber,
          kd: kdNumber.toFixed(2),
          streak,
          feed,
          matches,
          score,
        };
      })
      .filter((player) => player.name.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }, [players, members, streaks, feeds, selectedLogs, query]);

  return (
    <Panel cls="h-[680px]">
      <div className="flex h-full flex-col">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-black">♛ Best Overall</h3>
            <p className="mt-1 text-sm text-slate-400">
              Composite rank based on kills, deaths, K/D, streak and killfeed.
            </p>
          </div>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search player..."
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-400 md:w-64"
          />
        </div>

        <div className={`min-h-0 flex-1 overflow-auto pr-1 ${scrollCls}`}>
          {!rows.length ? (
            <p className="text-slate-500">No players.</p>
          ) : (
            rows.slice(0, 30).map((player, index) => (
              <div
                key={player.name}
                className="mb-3 rounded-2xl border border-slate-800 bg-slate-950/45 p-4 transition hover:border-blue-400/35 hover:bg-slate-900/60"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black">
                      <span className="mr-2 text-blue-300">#{index + 1}</span>
                      {player.name}
                    </p>
                    <p className="text-xs font-bold text-slate-500">
                      {player.matches ? `${player.matches} selected wars` : 'All selected data'}
                    </p>
                  </div>

                  <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-black text-blue-200">
                    Score {player.score.toFixed(1)}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2 text-center text-xs font-black">
                  <span className="rounded-xl bg-blue-500/10 px-2 py-2 text-blue-300">
                    ⚔ {player.kills}
                  </span>
                  <span className="rounded-xl bg-pink-500/10 px-2 py-2 text-pink-300">
                    ☠ {player.deaths}
                  </span>
                  <span className="rounded-xl bg-emerald-500/10 px-2 py-2 text-emerald-300">
                    ✺ {player.kd}
                  </span>
                  <span className="rounded-xl bg-slate-800/80 px-2 py-2 text-slate-200">
                    🔥 {player.streak}
                  </span>
                  <span className="rounded-xl bg-orange-500/10 px-2 py-2 text-orange-300">
                    Feed {player.feed}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Panel>
  );
}

function PlayerOverview({ players, streaks, feeds, events }) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState(['kills', 'desc']);
  const [selected, setSelected] = useState(null);

  const [key, direction] = sort;

  const rows = useMemo(
    () =>
      getArray(players)
        .map((player) => ({
          ...player,
          kills: toNumber(player.kills),
          deaths: toNumber(player.deaths),
          kd: Number(player.kd || 0).toFixed(2),
          streak: toNumber(streaks?.[player.name]),
          feed: toNumber(feeds?.[player.name]),
        }))
        .filter((player) => player.name.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => {
          const av = key === 'name' ? a.name.toLowerCase() : Number(a[key]) || 0;
          const bv = key === 'name' ? b.name.toLowerCase() : Number(b[key]) || 0;

          if (av < bv) return direction === 'asc' ? -1 : 1;
          if (av > bv) return direction === 'asc' ? 1 : -1;
          return a.name.localeCompare(b.name);
        }),
    [players, streaks, feeds, query, key, direction],
  );

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
          type="button"
          onClick={() => flip(id)}
          className={key === id ? 'font-black text-blue-300' : 'font-black hover:text-blue-300'}
        >
          {children} {key === id ? (direction === 'desc' ? '↓' : '↑') : '↕'}
        </button>
      </th>
    );
  }

  const history = selected
    ? getArray(events)
        .filter((event) => event.killer === selected.name || event.victim === selected.name)
        .sort(
          (a, b) =>
            String(a.date || '').localeCompare(String(b.date || '')) ||
            toNumber(a.sec) - toNumber(b.sec),
        )
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
    <Panel cls="h-[680px]">
      <div className="flex h-full flex-col">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-xl font-black">♙ Player Overview</h3>
            <p className="mt-1 text-sm text-slate-400">
              Click a player name to view kill history.
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
                  <Header id="name" className="pl-4 text-left">Family</Header>
                  <Header id="kills" className="text-right">Kills</Header>
                  <Header id="deaths" className="text-right">Deaths</Header>
                  <Header id="kd" className="text-right">K/D</Header>
                  <Header id="streak" className="text-right">Killstreak</Header>
                  <Header id="feed" className="pr-4 text-right">KillFeed</Header>
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
                        type="button"
                        onClick={() => setSelected(player)}
                        className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1 font-bold text-cyan-300 hover:border-cyan-300 hover:bg-cyan-500/20"
                      >
                        {player.name}
                      </button>
                    </td>
                    <td className="py-3 text-right font-black text-blue-300">⚔ {player.kills}</td>
                    <td className="py-3 text-right font-black text-pink-300">☠ {player.deaths}</td>
                    <td className="py-3 text-right font-black text-emerald-300">✺ {player.kd}</td>
                    <td className="py-3 text-right font-black">{player.streak}</td>
                    <td className="py-3 pr-4 text-right font-black text-orange-300">
                      {player.feed}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {selected && (
          <Popup title={`${selected.name} highlights & history`} close={() => setSelected(null)}>
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
                Killstreak <b>{streaks?.[selected.name] || 0}</b>
              </span>
              <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1">
                Killfeed <b className="text-orange-300">{feeds?.[selected.name] || 0}</b>
              </span>
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Favorite victim</p>
                <p className="mt-1 font-black">{favourite[0]}</p>
                <p className="text-sm font-bold text-blue-300">{favourite[1]} kills</p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs font-bold uppercase text-slate-500">Nemesis</p>
                <p className="mt-1 font-black">{worst[0]}</p>
                <p className="text-sm font-bold text-pink-300">{worst[1]} deaths</p>
              </div>
            </div>

            <div className={`max-h-[48vh] overflow-auto rounded-2xl border border-slate-800 ${scrollCls}`}>
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
                    <tr key={index} className="border-t border-slate-800 bg-slate-950/30">
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
                        {event.killer === selected.name ? event.victim : event.killer}
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
      getArray(guilds)
        .map((guild) => {
          const kills = toNumber(guild.deaths);
          const deaths = toNumber(guild.kills);
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
        .filter((guild) => guild.totalInteractions > 30)
        .sort(
          (a, b) =>
            b.totalInteractions - a.totalInteractions ||
            b.kdNumber - a.kdNumber ||
            a.name.localeCompare(b.name),
        ),
    [guilds],
  );

  const width = 1100;
  const height = 430;
  const pad = { top: 36, right: 36, bottom: 54, left: 66 };

  const chart = useMemo(() => {
    if (!rows.length) return null;

    const visibleRows = rows.slice(0, 26);
    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;

    const killsValues = visibleRows.map((item) => item.kills);
    const deathsValues = visibleRows.map((item) => item.deaths);
    const totalValues = visibleRows.map((item) => item.totalInteractions);

    const minKillsRaw = Math.min(...killsValues);
    const maxKillsRaw = Math.max(...killsValues);
    const minDeathsRaw = Math.min(...deathsValues);
    const maxDeathsRaw = Math.max(...deathsValues);
    const maxTotalRaw = Math.max(1, ...totalValues);
    const maxKdRaw = Math.max(1, ...visibleRows.map((item) => item.kdNumber));

    const killsRange = Math.max(1, maxKillsRaw - minKillsRaw);
    const deathsRange = Math.max(1, maxDeathsRaw - minDeathsRaw);

    const xPadding = Math.max(8, killsRange * 0.08);
    const yPadding = Math.max(8, deathsRange * 0.1);

    const xMin = Math.max(0, Math.floor(minKillsRaw - xPadding));
    const xMax = Math.ceil(maxKillsRaw + xPadding);
    const yMin = Math.max(0, Math.floor(minDeathsRaw - yPadding));
    const yMax = Math.ceil(maxDeathsRaw + yPadding);

    const maxKd = Math.max(1, Math.min(14, maxKdRaw));

    function xScale(value) {
      const range = Math.max(1, xMax - xMin);
      return pad.left + ((Math.max(xMin, value) - xMin) / range) * innerW;
    }

    function yScale(value) {
      const range = Math.max(1, yMax - yMin);
      return pad.top + innerH - ((Math.max(yMin, value) - yMin) / range) * innerH;
    }

    function radiusScale(item) {
      const volumeRatio = Math.sqrt(Math.max(0, item.totalInteractions) / maxTotalRaw);
      const kdRatio = Math.sqrt(Math.max(0, Math.min(maxKd, item.kdNumber)) / maxKd);

      return 13 + volumeRatio * 18 + kdRatio * 7;
    }

    const duplicateGroups = visibleRows.reduce((acc, item) => {
      const duplicateKey = `${item.kills}|${item.deaths}`;
      if (!acc[duplicateKey]) acc[duplicateKey] = [];
      acc[duplicateKey].push(item.name);
      return acc;
    }, {});

    const points = visibleRows.map((item, index) => {
      const duplicateKey = `${item.kills}|${item.deaths}`;
      const group = duplicateGroups[duplicateKey] || [item.name];
      const dupTotal = group.length;
      const dupIndex = group.indexOf(item.name);

      const baseX = xScale(item.kills);
      const baseY = yScale(item.deaths);

      let cx = baseX;
      let cy = baseY;

      if (dupTotal > 1 && dupIndex >= 0) {
        const offsetRadius = Math.min(18, 7 + dupTotal * 2);
        const angle = (Math.PI * 2 * dupIndex) / dupTotal;
        cx += Math.cos(angle) * offsetRadius;
        cy += Math.sin(angle) * offsetRadius;
      }

      const radius = radiusScale(item);
      const isWinning = item.kdNumber >= 1;
      const isDominant = item.kdNumber >= 1.5;

      return {
        ...item,
        index,
        cx,
        cy,
        baseX,
        baseY,
        radius,
        isWinning,
        isDominant,
        tone: isDominant ? 'dominant' : isWinning ? 'winning' : 'danger',
      };
    });

    const bestKd = [...visibleRows].sort(
      (a, b) =>
        b.kdNumber - a.kdNumber ||
        b.totalInteractions - a.totalInteractions ||
        a.name.localeCompare(b.name),
    )[0];

    const busiest = [...visibleRows].sort(
      (a, b) =>
        b.totalInteractions - a.totalInteractions ||
        b.kills - a.kills ||
        a.name.localeCompare(b.name),
    )[0];

    return {
      xMin,
      xMax,
      yMin,
      yMax,
      points,
      bestKd,
      busiest,
      xScale,
      yScale,
      xTickValues: buildAxisTicks(xMin, xMax, 5),
      yTickValues: buildAxisTicks(yMin, yMax, 5),
      midX: xScale((xMin + xMax) / 2),
      midY: yScale((yMin + yMax) / 2),
    };
  }, [rows]);

  const log = selected
    ? getArray(events).filter((event) => event.guild === selected.name)
    : [];

  function bubbleFill(guild) {
    if (guild.tone === 'dominant') return 'url(#enemyGuildDominantGradient)';
    if (guild.tone === 'winning') return 'url(#enemyGuildWinningGradient)';
    return 'url(#enemyGuildDangerGradient)';
  }

  function bubbleStroke(guild) {
    if (guild.tone === 'dominant') return 'rgba(34, 211, 238, 0.92)';
    if (guild.tone === 'winning') return 'rgba(96, 165, 250, 0.82)';
    return 'rgba(251, 113, 133, 0.82)';
  }

  function bubbleGlow(guild) {
    if (guild.tone === 'dominant') return 'url(#enemyGuildGlowDominant)';
    if (guild.tone === 'winning') return 'url(#enemyGuildGlowWinning)';
    return 'url(#enemyGuildGlowDanger)';
  }

  const tooltipBelow = hovered ? hovered.cy < 112 : false;
  const tooltipHorizontalTransform = hovered
    ? hovered.cx < 190
      ? '-8%'
      : hovered.cx > width - 190
        ? '-92%'
        : '-50%'
    : '-50%';

  const tooltipVerticalTransform = tooltipBelow
    ? '18px'
    : 'calc(-100% - 18px)';

  return (
    <Panel cls="overflow-hidden">
      <div className="flex min-h-[560px] flex-col">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-xl font-black">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-blue-400/30 bg-blue-500/10 text-blue-300 shadow-[0_0_28px_rgba(59,130,246,0.25)]">
                ◆
              </span>
              Enemy Guilds
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Bubble size = fight volume. Blue/Cyan = favorable K/D. Rose = dangerous.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-bold">
            <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1 text-slate-300">
              {rows.length} guilds
            </span>

            {chart?.busiest && (
              <span className="rounded-full border border-blue-400/25 bg-blue-500/10 px-3 py-1 text-blue-200">
                Busiest: {shortText(chart.busiest.name)}
              </span>
            )}

            {chart?.bestKd && (
              <span className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1 text-cyan-200">
                Best K/D: {shortText(chart.bestKd.name)} · {chart.bestKd.kd}
              </span>
            )}
          </div>
        </div>

        {!chart ? (
          <div className="flex flex-1 items-center justify-center rounded-3xl border border-slate-800 bg-slate-950/50 text-slate-500">
            No guild data yet.
          </div>
        ) : (
          <>
            <div className="mb-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  Top volume
                </p>
                <p className="mt-1 truncate text-sm font-black text-slate-100">
                  {chart.busiest?.name || '-'}
                </p>
                <p className="text-xs font-bold text-blue-300">
                  {chart.busiest?.totalInteractions || 0} interactions
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  Best matchup
                </p>
                <p className="mt-1 truncate text-sm font-black text-slate-100">
                  {chart.bestKd?.name || '-'}
                </p>
                <p className="text-xs font-bold text-cyan-300">
                  K/D {chart.bestKd?.kd || '0.00'}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                  Visible
                </p>
                <p className="mt-1 text-sm font-black text-slate-100">
                  Top {chart.points.length}
                </p>
                <p className="text-xs font-bold text-slate-400">
                  Filter: 30+ interactions
                </p>
              </div>
            </div>

            <div
              className="relative flex-1 overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-950/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_28px_80px_rgba(2,6,23,0.45)]"
              onMouseLeave={() => setHovered(null)}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_18%,rgba(59,130,246,0.22),transparent_34%),radial-gradient(circle_at_82%_72%,rgba(236,72,153,0.16),transparent_30%),linear-gradient(135deg,rgba(15,23,42,0.35),rgba(2,6,23,0.72))]" />
              <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:34px_34px]" />

              {hovered && (
                <div
                  className="pointer-events-none absolute z-20 min-w-[210px] rounded-2xl border border-slate-700/80 bg-slate-950/95 p-3 text-sm shadow-2xl shadow-black/50 backdrop-blur-xl"
                  style={{
                    left: hovered.cx,
                    top: hovered.cy,
                    transform: `translate(${tooltipHorizontalTransform}, ${tooltipVerticalTransform})`,
                  }}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-black text-white">{hovered.name}</p>
                      <p className="text-xs font-bold text-slate-500">
                        {hovered.totalInteractions} interactions
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2 py-1 text-xs font-black ${
                        hovered.kdNumber >= 1
                          ? 'bg-cyan-500/15 text-cyan-300'
                          : 'bg-rose-500/15 text-rose-300'
                      }`}
                    >
                      K/D {hovered.kd}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-blue-400/15 bg-blue-500/10 p-2">
                      <p className="text-[10px] font-black uppercase text-blue-200/70">
                        Kills
                      </p>
                      <p className="text-lg font-black text-blue-200">{hovered.kills}</p>
                    </div>

                    <div className="rounded-xl border border-rose-400/15 bg-rose-500/10 p-2">
                      <p className="text-[10px] font-black uppercase text-rose-200/70">
                        Deaths
                      </p>
                      <p className="text-lg font-black text-rose-200">{hovered.deaths}</p>
                    </div>
                  </div>
                </div>
              )}

              <svg
                viewBox={`0 0 ${width} ${height}`}
                className="relative z-10 h-full min-h-[390px] w-full"
                role="img"
                aria-label="Enemy guild bubble chart"
              >
                <defs>
                  <linearGradient id="enemyGuildDominantGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="rgba(34,211,238,0.92)" />
                    <stop offset="48%" stopColor="rgba(59,130,246,0.78)" />
                    <stop offset="100%" stopColor="rgba(14,165,233,0.5)" />
                  </linearGradient>

                  <linearGradient id="enemyGuildWinningGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="rgba(96,165,250,0.86)" />
                    <stop offset="100%" stopColor="rgba(37,99,235,0.48)" />
                  </linearGradient>

                  <linearGradient id="enemyGuildDangerGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="rgba(251,113,133,0.86)" />
                    <stop offset="100%" stopColor="rgba(190,18,60,0.48)" />
                  </linearGradient>

                  <filter id="enemyGuildGlowDominant" x="-80%" y="-80%" width="260%" height="260%">
                    <feGaussianBlur stdDeviation="7" result="blur" />
                    <feColorMatrix
                      in="blur"
                      type="matrix"
                      values="0 0 0 0 0.10  0 0 0 0 0.78  0 0 0 0 0.95  0 0 0 0.75 0"
                    />
                    <feMerge>
                      <feMergeNode />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  <filter id="enemyGuildGlowWinning" x="-80%" y="-80%" width="260%" height="260%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feColorMatrix
                      in="blur"
                      type="matrix"
                      values="0 0 0 0 0.20  0 0 0 0 0.48  0 0 0 0 1.00  0 0 0 0.62 0"
                    />
                    <feMerge>
                      <feMergeNode />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  <filter id="enemyGuildGlowDanger" x="-80%" y="-80%" width="260%" height="260%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feColorMatrix
                      in="blur"
                      type="matrix"
                      values="0 0 0 0 0.96  0 0 0 0 0.20  0 0 0 0 0.34  0 0 0 0.58 0"
                    />
                    <feMerge>
                      <feMergeNode />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                <rect
                  x={pad.left}
                  y={pad.top}
                  width={width - pad.left - pad.right}
                  height={height - pad.top - pad.bottom}
                  rx="24"
                  fill="rgba(15,23,42,0.22)"
                  stroke="rgba(148,163,184,0.12)"
                />

                <line
                  x1={chart.midX}
                  x2={chart.midX}
                  y1={pad.top}
                  y2={height - pad.bottom}
                  stroke="rgba(59,130,246,0.16)"
                  strokeWidth="1"
                  strokeDasharray="7 8"
                />

                <line
                  x1={pad.left}
                  x2={width - pad.right}
                  y1={chart.midY}
                  y2={chart.midY}
                  stroke="rgba(59,130,246,0.16)"
                  strokeWidth="1"
                  strokeDasharray="7 8"
                />

                {chart.yTickValues.map((tick) => {
                  const y = chart.yScale(tick);

                  return (
                    <g key={`y-${tick}`}>
                      <line
                        x1={pad.left}
                        x2={width - pad.right}
                        y1={y}
                        y2={y}
                        stroke="rgba(148,163,184,0.1)"
                      />
                      <text
                        x={pad.left - 14}
                        y={y + 4}
                        textAnchor="end"
                        className="fill-slate-500 text-[11px] font-bold"
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
                        x2={x}
                        y1={pad.top}
                        y2={height - pad.bottom}
                        stroke="rgba(148,163,184,0.08)"
                      />
                      <text
                        x={x}
                        y={height - pad.bottom + 24}
                        textAnchor="middle"
                        className="fill-slate-500 text-[11px] font-bold"
                      >
                        {tick}
                      </text>
                    </g>
                  );
                })}

                <text
                  x={pad.left + (width - pad.left - pad.right) / 2}
                  y={height - 14}
                  textAnchor="middle"
                  className="fill-slate-400 text-[12px] font-black uppercase tracking-[0.18em]"
                >
                  Kills
                </text>

                <text
                  x="20"
                  y={pad.top + (height - pad.top - pad.bottom) / 2}
                  textAnchor="middle"
                  transform={`rotate(-90 20 ${pad.top + (height - pad.top - pad.bottom) / 2})`}
                  className="fill-slate-400 text-[12px] font-black uppercase tracking-[0.18em]"
                >
                  Deaths
                </text>

                {hovered && (
                  <g pointerEvents="none">
                    <line
                      x1={hovered.cx}
                      x2={hovered.cx}
                      y1={pad.top}
                      y2={height - pad.bottom}
                      stroke="rgba(226,232,240,0.22)"
                      strokeDasharray="5 7"
                    />
                    <line
                      x1={pad.left}
                      x2={width - pad.right}
                      y1={hovered.cy}
                      y2={hovered.cy}
                      stroke="rgba(226,232,240,0.22)"
                      strokeDasharray="5 7"
                    />
                  </g>
                )}

                {chart.points.map((guild) => {
                  const labelSize = guild.radius >= 30 ? 12 : guild.radius >= 22 ? 11 : 10;
                  const showKd = guild.radius >= 25;

                  return (
                    <g
                      key={guild.name}
                      role="button"
                      tabIndex={0}
                      className="cursor-pointer outline-none transition"
                      onMouseEnter={() => setHovered(guild)}
                      onFocus={() => setHovered(guild)}
                      onClick={() => setSelected(guild)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          setSelected(guild);
                        }
                      }}
                    >
                      <circle
                        cx={guild.cx}
                        cy={guild.cy}
                        r={guild.radius + 7}
                        fill={bubbleStroke(guild)}
                        opacity={hovered?.name === guild.name ? 0.22 : 0.1}
                      />

                      <circle
                        cx={guild.cx}
                        cy={guild.cy}
                        r={guild.radius}
                        fill={bubbleFill(guild)}
                        stroke={bubbleStroke(guild)}
                        strokeWidth={hovered?.name === guild.name ? 2.4 : 1.4}
                        filter={bubbleGlow(guild)}
                        opacity={hovered && hovered.name !== guild.name ? 0.48 : 0.94}
                      />

                      <circle
                        cx={guild.cx - guild.radius * 0.28}
                        cy={guild.cy - guild.radius * 0.32}
                        r={Math.max(3, guild.radius * 0.22)}
                        fill="rgba(255,255,255,0.28)"
                      />

                      <text
                        x={guild.cx}
                        y={guild.cy - (showKd ? 3 : -4)}
                        textAnchor="middle"
                        className="pointer-events-none fill-white font-black drop-shadow"
                        style={{ fontSize: labelSize }}
                      >
                        {shortText(guild.name, 9, 3)}
                      </text>

                      {showKd && (
                        <text
                          x={guild.cx}
                          y={guild.cy + 13}
                          textAnchor="middle"
                          className="pointer-events-none fill-slate-100/90 text-[10px] font-black"
                        >
                          KD {guild.kd}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              <div className="pointer-events-none absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-400">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-cyan-200">
                    Favorable K/D
                  </span>
                  <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-blue-200">
                    High volume
                  </span>
                  <span className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1 text-rose-200">
                    Negative K/D
                  </span>
                </div>

                <span className="rounded-full border border-slate-700 bg-slate-950/70 px-3 py-1">
                  Click a bubble for kill log
                </span>
              </div>
            </div>
          </>
        )}

        {selected && (
          <Popup title={`${selected.name} kill log`} close={() => setSelected(null)}>
            {!log.length ? (
              <p className="text-slate-500">No kill log found for this guild.</p>
            ) : (
              <div className={`max-h-[55vh] overflow-auto rounded-2xl border border-slate-800 ${scrollCls}`}>
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-900 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="py-3 pl-4 text-left">Time</th>
                      <th className="py-3 text-left">Date</th>
                      <th className="py-3 text-left">Event</th>
                      <th className="py-3 pr-4 text-right">Type</th>
                    </tr>
                  </thead>

                  <tbody>
                    {log.map((event, index) => (
                      <tr key={index} className="border-t border-slate-800 bg-slate-950/30">
                        <td className="py-3 pl-4 font-black">{event.time}</td>
                        <td className="py-3 text-slate-400">{event.date}</td>
                        <td className="py-3 font-bold">
                          {event.type === 'kill' ? event.killer : event.victim}{' '}
                          {event.type === 'kill' ? 'killed' : 'died to'}{' '}
                          <span className="text-slate-300">
                            {event.type === 'kill' ? event.victim : event.killer}
                          </span>
                        </td>
                        <td className="py-3 pr-4 text-right">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black ${
                              event.type === 'kill'
                                ? 'bg-blue-500/15 text-blue-300'
                                : 'bg-pink-500/15 text-pink-300'
                            }`}
                          >
                            {event.type === 'kill' ? 'OUR KILL' : 'OUR DEATH'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Popup>
        )}
      </div>
    </Panel>
  );
}

function KillFeedPanel({ killFeeds, events }) {
  const rows = getArray(killFeeds).slice(0, 5);

  return (
    <Panel>
      <h3 className="mb-4 text-xl font-black">▣ Kill Feed</h3>

      {!rows.length ? (
        <p className="text-slate-500">No kill feeds yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((feed, index) => {
            const guild = majorityGuildForKillFeed(feed, events);

            return (
              <div
                key={`${feed.name}-${feed.start}-${index}`}
                className="rounded-2xl border border-slate-800 bg-slate-950/50 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate font-black">
                    <span className="mr-2 text-orange-300">#{index + 1}</span>
                    {feed.name}
                  </p>
                  <span className="rounded-full bg-orange-500/15 px-3 py-1 text-xs font-black text-orange-300">
                    {feed.count}
                  </span>
                </div>

                <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold text-slate-400">
                  <span>{feed.start}-{feed.end}</span>
                  <span>·</span>
                  <span>{guild}</span>
                </div>
              </div>
            );
          })}
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
  const safeStats = stats || {};
  const players = getArray(safeStats.players);
  const guilds = getArray(safeStats.guilds);
  const events = getArray(safeStats.ev);
  const streaks = safeStats.st || {};
  const feeds = safeStats.fd || {};
  const timeline = getArray(safeStats.timeline || safeStats.tl);

  const killFeeds = calculateKillFeed(events, 10, true);
  const showTimelineMarkers = getArray(selectedLogs).length === 1;

  function eventSortValue(event) {
    return [
      String(event?.date || ''),
      String(timeToSecondsValue(event?.time)).padStart(8, '0'),
      String(Number(event?.i) || 0).padStart(6, '0'),
    ].join(' ');
  }

  function buildConsecutiveFlowMarkers(flowEvents) {
    const markers = [];
    let currentType = null;
    let run = [];
    let markerAddedForRun = false;

    getArray(flowEvents)
      .filter((event) => event.type === 'kill' || event.type === 'death')
      .sort((a, b) => eventSortValue(a).localeCompare(eventSortValue(b)))
      .forEach((event) => {
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
        const guild = majorityGuildForKillFeed(feed, events);

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

  const flowMarkers = showTimelineMarkers ? buildConsecutiveFlowMarkers(events) : [];
  const killFeedMarkers = [...topKillFeedMarkers, ...flowMarkers];

  const totalKills = players.reduce((sum, player) => sum + toNumber(player.kills), 0);
  const totalDeaths = players.reduce((sum, player) => sum + toNumber(player.deaths), 0);
  const globalKd = totalDeaths ? (totalKills / totalDeaths).toFixed(2) : totalKills.toFixed(2);
  const totalGuildInteractions = guilds.reduce(
    (sum, guild) => sum + toNumber(guild.kills) + toNumber(guild.deaths),
    0,
  );

  const topKills = [...players].sort(
    (a, b) => toNumber(b.kills) - toNumber(a.kills) || a.name.localeCompare(b.name),
  );

  const topDeaths = [...players].sort(
    (a, b) => toNumber(b.deaths) - toNumber(a.deaths) || a.name.localeCompare(b.name),
  );

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Battle Analytics</h2>
          <p className="mt-1 text-sm font-bold text-slate-400">{label}</p>
        </div>

        <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-2 text-sm font-black text-blue-200">
          {players.length} players · {guilds.length} guilds
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon="⚔" label="Total Kills" value={totalKills} sub="Selected logs" />
        <Metric icon="☠" label="Total Deaths" value={totalDeaths} sub="Selected logs" />
        <Metric icon="✺" label="Global K/D" value={globalKd} sub="Kills / deaths" />
        <Metric
          icon="◆"
          label="Guild Interactions"
          value={totalGuildInteractions}
          sub="Enemy guild volume"
        />
      </div>

      <div className="mb-6">
        <KillDeathChart
          data={timeline}
          title="▧ Global Kill/Death Timeline"
          killFeedMarkers={killFeedMarkers}
        />
      </div>

      <div className="mb-6 grid gap-6 xl:grid-cols-2">
        <BestOverall
          players={players}
          members={members}
          streaks={streaks}
          feeds={feeds}
          events={events}
          selectedLogs={selectedLogs}
        />

        <PlayerOverview
          players={players}
          streaks={streaks}
          feeds={feeds}
          events={events}
        />
      </div>

      <div className="mb-6">
        <EnemyGuilds guilds={guilds} events={events} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <RankList title="Top Kills" items={topKills} valueKey="kills" />
        <RankList title="Top Deaths" items={topDeaths} valueKey="deaths" />
        <KillFeedPanel killFeeds={killFeeds} events={events} />
      </div>
    </>
  );
}
