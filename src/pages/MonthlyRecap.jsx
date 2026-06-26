import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CalendarDays,
  Castle,
  ChevronRight,
  Crosshair,
  Download,
  Flag,
  Flame,
  Gauge,
  Medal,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Users,
  Zap,
} from 'lucide-react';

import {
  buildNodeWarRow,
  calculateKillFeed,
  calculateStats,
  calculateStreaks,
  dateOf,
  scrollCls,
} from '../lib/logUtils';

const MIN_MONTH = '2026-05';
const KILL_FEED_WINDOW_SECONDS = 10;

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compact(value, digits = 1) {
  const number = num(value);
  const absolute = Math.abs(number);

  if (absolute >= 1_000_000_000_000) {
    return `${(number / 1_000_000_000_000)
      .toFixed(digits)
      .replace(/\.0$/, '')}T`;
  }

  if (absolute >= 1_000_000_000) {
    return `${(number / 1_000_000_000)
      .toFixed(digits)
      .replace(/\.0$/, '')}B`;
  }

  if (absolute >= 1_000_000) {
    return `${(number / 1_000_000)
      .toFixed(digits)
      .replace(/\.0$/, '')}M`;
  }

  if (absolute >= 1_000) {
    return `${(number / 1_000)
      .toFixed(digits)
      .replace(/\.0$/, '')}K`;
  }

  return Math.round(number).toLocaleString('en-US');
}

function ratio(kills, deaths) {
  return num(deaths) ? num(kills) / num(deaths) : num(kills);
}

function monthFromDate(value) {
  const text = String(value || '');
  return /^\d{4}-\d{2}/.test(text) ? text.slice(0, 7) : '';
}

function monthLabel(monthId) {
  if (!/^\d{4}-\d{2}$/.test(String(monthId || ''))) return 'Unknown month';

  const [year, month] = monthId.split('-').map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
}

function previousMonthId(monthId) {
  if (!/^\d{4}-\d{2}$/.test(String(monthId || ''))) return '';

  const [year, month] = monthId.split('-').map(Number);
  const previous = new Date(year, month - 2, 1);

  return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(
    2,
    '0',
  )}`;
}

function shortMonthLabel(monthId) {
  if (!/^\d{4}-\d{2}$/.test(String(monthId || ''))) return 'previous month';

  const [year, month] = monthId.split('-').map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
  });
}

function formatDate(value) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return String(value || '-');

  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getGuildPlayer(event) {
  return (
    event?.guildPlayer ||
    (event?.type === 'kill' ? event?.killer : event?.victim) ||
    ''
  );
}

function cleanGuild(value) {
  const text = String(value || '').trim();

  if (!text || /^\d{4}-\d{2}-\d{2}$/.test(text)) return '';

  return text;
}

function topObjectEntry(object = {}) {
  return (
    Object.entries(object)
      .map(([name, value]) => ({
        name,
        value: num(value),
      }))
      .filter((item) => item.value > 0)
      .sort(
        (a, b) =>
          b.value - a.value ||
          String(a.name).localeCompare(String(b.name)),
      )[0] || null
  );
}

function buildPlayerWarCounts(stats) {
  const map = new Map();

  function add(name, warId) {
    const cleanName = String(name || '').trim();
    const cleanWar = String(warId || '').trim();

    if (!cleanName || !cleanWar) return;

    if (!map.has(cleanName)) {
      map.set(cleanName, new Set());
    }

    map.get(cleanName).add(cleanWar);
  }

  (stats?.ev || []).forEach((event, index) => {
    add(
      getGuildPlayer(event),
      event?.id || event?.war || event?.date || `event-${index}`,
    );
  });

  (stats?.secondary?.rows || []).forEach((row, index) => {
    add(
      row?.player || row?.name,
      row?.id || row?.war || row?.date || `secondary-${index}`,
    );
  });

  return Object.fromEntries(
    [...map.entries()].map(([name, wars]) => [name, wars.size]),
  );
}

// A guild encounter qualifies only when that exact Node War contains
// at least 30 combined kills + deaths against the guild.
function getWarGuildBreakdown(log) {
  const summary = log?.summary || log?.stats || log?.analytics || {};
  const guilds = Array.isArray(summary?.guilds) ? summary.guilds : [];

  return guilds
    .map((guild) => ({
      name: cleanGuild(guild?.name),
      kills: num(guild?.kills),
      deaths: num(guild?.deaths),
    }))
    .filter(
      (guild) =>
        guild.name &&
        guild.kills + guild.deaths >= 30,
    )
    .sort(
      (a, b) =>
        b.kills + b.deaths - (a.kills + a.deaths) ||
        b.kills - a.kills ||
        a.name.localeCompare(b.name),
    );
}

function getFeaturedWarGuild(log) {
  return getWarGuildBreakdown(log)[0] || null;
}

function buildEnemyRows(logs, stats) {
  const byGuild = {};

  function add(name, kills, deaths, warId) {
    const guildName = cleanGuild(name);

    if (!guildName) return;

    byGuild[guildName] ||= {
      name: guildName,
      kills: 0,
      deaths: 0,
      wars: new Set(),
      warRows: [],
    };

    byGuild[guildName].kills += num(kills);
    byGuild[guildName].deaths += num(deaths);

    if (warId) {
      byGuild[guildName].wars.add(String(warId));
    }
  }

  (logs || []).forEach((log, index) => {
    const summary = log?.summary || {};
    const guilds = Array.isArray(summary?.guilds) ? summary.guilds : [];
    const warId = log?.id || dateOf(log) || `log-${index}`;

    guilds.forEach((guild) => {
      const guildKills = num(guild?.kills);
      const guildDeaths = num(guild?.deaths);

      if (guildKills + guildDeaths < 30) return;

      add(guild?.name, guildKills, guildDeaths, warId);
    });
  });

  if (!Object.keys(byGuild).length) {
    (stats?.ev || []).forEach((event, index) => {
      const guild = cleanGuild(event?.guild);
      const warId = event?.id || event?.war || event?.date || `event-${index}`;

      if (event?.type === 'kill') add(guild, 1, 0, warId);
      if (event?.type === 'death') add(guild, 0, 1, warId);
    });
  }

  return Object.values(byGuild)
    .map((guild) => ({
      name: guild.name,
      wars: guild.wars.size,
      kills: guild.kills,
      deaths: guild.deaths,
      kd: ratio(guild.kills, guild.deaths),
    }))
    .filter((guild) => guild.wars > 0)
    .sort(
      (a, b) =>
        b.wars - a.wars ||
        b.kills + b.deaths - (a.kills + a.deaths) ||
        a.name.localeCompare(b.name),
    );
}

function percentageChange(current, previous) {
  if (!num(previous)) {
    return num(current) ? null : 0;
  }

  return ((num(current) - num(previous)) / Math.abs(num(previous))) * 100;
}

function comparisonInfo(
  current,
  previous,
  previousMonth,
  lowerIsBetter = false,
) {
  const change = percentageChange(current, previous);

  if (change == null) {
    return {
      text: `No ${shortMonthLabel(previousMonth)} baseline`,
      tone: 'neutral',
    };
  }

  if (change === 0) {
    return {
      text: `• 0% vs ${shortMonthLabel(previousMonth)}`,
      tone: 'neutral',
    };
  }

  const improved = lowerIsBetter ? change < 0 : change > 0;

  return {
    text: `${change > 0 ? '↑' : '↓'} ${Math.abs(change).toFixed(
      0,
    )}% vs ${shortMonthLabel(previousMonth)}`,
    tone: improved ? 'positive' : 'negative',
  };
}

function buildReview(logs, selectedMonth) {
  const monthLogs = (logs || [])
    .filter((log) => monthFromDate(dateOf(log)) === selectedMonth)
    .map((log) => ({
      ...log,
      date: dateOf(log),
    }));

  const previousMonth = previousMonthId(selectedMonth);

  const previousLogs = (logs || [])
    .filter((log) => monthFromDate(dateOf(log)) === previousMonth)
    .map((log) => ({
      ...log,
      date: dateOf(log),
    }));

  const rows = monthLogs.map(buildNodeWarRow);
  const previousRows = previousLogs.map(buildNodeWarRow);

  const sourceLogById = new Map(
    monthLogs.map((log) => [String(log?.id || ''), log]),
  );

  const sourceLogByDate = new Map();

  monthLogs.forEach((log) => {
    const date = String(dateOf(log) || '');

    if (date && !sourceLogByDate.has(date)) {
      sourceLogByDate.set(date, log);
    }
  });

  function sourceLogForRow(row) {
    return (
      sourceLogById.get(String(row?.id || '')) ||
      sourceLogByDate.get(String(row?.date || '')) ||
      null
    );
  }

  function featuredGuildForRow(row) {
    return getFeaturedWarGuild(sourceLogForRow(row));
  }

  const stats = calculateStats(monthLogs);
  const warCounts = buildPlayerWarCounts(stats);

  const totals = {
    wars: rows.length,
    kills: rows.reduce((sum, row) => sum + num(row.kills), 0),
    deaths: rows.reduce((sum, row) => sum + num(row.deaths), 0),
    damage: rows.reduce((sum, row) => sum + num(row.damageDealt), 0),
    fortDamage: rows.reduce((sum, row) => sum + num(row.fortDamage), 0),
  };

  totals.kd = ratio(totals.kills, totals.deaths);
  totals.avgKills = totals.wars ? totals.kills / totals.wars : 0;
  totals.avgDeaths = totals.wars ? totals.deaths / totals.wars : 0;
  totals.avgDamage = totals.wars ? totals.damage / totals.wars : 0;
  totals.avgFortDamage = totals.wars
    ? totals.fortDamage / totals.wars
    : 0;
  totals.avgWarKd = rows.length
    ? rows.reduce(
        (sum, row) =>
          sum + num(row.kdNumber ?? row.kd),
        0,
      ) / rows.length
    : 0;

  const monthParts = String(selectedMonth || '')
    .split('-')
    .map(Number);
  const daysInMonth =
    monthParts.length === 2
      ? new Date(monthParts[0], monthParts[1], 0).getDate()
      : 30;
  totals.avgWarsPerWeek = daysInMonth
    ? totals.wars / (daysInMonth / 7)
    : 0;

  const previousTotals = {
    wars: previousRows.length,
    kills: previousRows.reduce((sum, row) => sum + num(row.kills), 0),
    deaths: previousRows.reduce((sum, row) => sum + num(row.deaths), 0),
    damage: previousRows.reduce((sum, row) => sum + num(row.damageDealt), 0),
    fortDamage: previousRows.reduce(
      (sum, row) => sum + num(row.fortDamage),
      0,
    ),
  };

  previousTotals.kd = ratio(
    previousTotals.kills,
    previousTotals.deaths,
  );

  const players = (stats?.players || [])
    .map((player) => ({
      name: player?.name || '-',
      wars: num(warCounts[player?.name]),
      kills: num(player?.kills),
      deaths: num(player?.deaths),
      kd: ratio(player?.kills, player?.deaths),
      damage: num(player?.damageDealt),
      fortDamage: num(player?.fortDamage),
    }))
    .sort(
      (a, b) =>
        b.kills - a.kills ||
        b.kd - a.kd ||
        a.name.localeCompare(b.name),
    );

  const minWars = Math.min(3, Math.max(1, totals.wars));

  const topFragger = players[0] || null;

  const bestKd =
    [...players]
      .filter((player) => player.wars >= minWars && player.kills > 0)
      .sort(
        (a, b) =>
          b.kd - a.kd ||
          b.kills - a.kills ||
          a.deaths - b.deaths,
      )[0] || null;

  const damageLeader =
    [...players]
      .filter((player) => player.damage > 0)
      .sort((a, b) => b.damage - a.damage)[0] || null;

  const fortBreaker =
    [...players]
      .filter((player) => player.fortDamage > 0)
      .sort((a, b) => b.fortDamage - a.fortDamage)[0] || null;

  const longestStreak = topObjectEntry(calculateStreaks(stats?.ev || []));

  const bestFeed = topObjectEntry(
    calculateKillFeed(
      stats?.ev || [],
      KILL_FEED_WINDOW_SECONDS,
    ),
  );

  const enemies = buildEnemyRows(monthLogs, stats).map((enemy) => {
    const matchingRows = rows
      .filter((row) => {
        const guild = featuredGuildForRow(row);
        return guild?.name === enemy.name;
      })
      .sort(
        (a, b) =>
          String(b.date || '').localeCompare(String(a.date || '')),
      );

    return {
      ...enemy,
      latestWar: matchingRows[0] || null,
    };
  });

  const mostFought = enemies[0] || null;

  // Inverted by request:
  // Best Matchup uses the lowest K/D result.
  // Toughest Opponent uses the highest K/D result.
  const bestMatchup =
    [...enemies]
      .filter((enemy) => enemy.kills + enemy.deaths > 0)
      .sort(
        (a, b) =>
          a.kd - b.kd ||
          b.wars - a.wars ||
          b.deaths - a.deaths,
      )[0] || null;

  const toughestMatchup =
    [...enemies]
      .filter((enemy) => enemy.kills + enemy.deaths > 0)
      .sort(
        (a, b) =>
          b.kd - a.kd ||
          b.wars - a.wars ||
          b.kills - a.kills,
      )[0] || null;

  const highestKillsWar =
    [...rows].sort(
      (a, b) =>
        num(b.kills) - num(a.kills) ||
        String(b.date).localeCompare(String(a.date)),
    )[0] || null;

  const bestKdWar =
    [...rows].sort(
      (a, b) =>
        num(b.kdNumber ?? b.kd) - num(a.kdNumber ?? a.kd) ||
        num(b.kills) - num(a.kills),
    )[0] || null;

  const highestDamageWar =
    [...rows]
      .filter((row) => num(row.damageDealt) > 0)
      .sort(
        (a, b) =>
          num(b.damageDealt) - num(a.damageDealt),
      )[0] || null;

  return {
    previousMonth,
    totals,
    previousTotals,
    players,
    topFragger,
    bestKd,
    damageLeader,
    fortBreaker,
    longestStreak,
    bestFeed,
    enemies,
    mostFought,
    bestMatchup,
    toughestMatchup,
    featuredWars: [
      highestKillsWar && {
        id: 'kills',
        label: 'Highest Kill Total',
        value: `${compact(highestKillsWar.kills)} Kills`,
        date: highestKillsWar.date,
        guild: featuredGuildForRow(highestKillsWar),
        row: highestKillsWar,
        accent: 'blue',
      },
      bestKdWar && {
        id: 'kd',
        label: 'Best K/D War',
        value: `${num(bestKdWar.kdNumber ?? bestKdWar.kd).toFixed(
          2,
        )} K/D`,
        date: bestKdWar.date,
        guild: featuredGuildForRow(bestKdWar),
        row: bestKdWar,
        accent: 'violet',
      },
      highestDamageWar && {
        id: 'damage',
        label: 'Highest Damage War',
        value: compact(highestDamageWar.damageDealt),
        date: highestDamageWar.date,
        guild: featuredGuildForRow(highestDamageWar),
        row: highestDamageWar,
        accent: 'cyan',
      },
    ].filter(Boolean),
  };
}

function SectionShell({ icon: Icon, title, children }) {
  return (
    <section className="overflow-hidden rounded-[10px] border border-[#13243a] bg-[#020813] shadow-[0_14px_40px_rgba(0,0,0,.32)]">
      <div className="flex h-8 items-center gap-2 border-b border-[#13243a] bg-[#06111f] px-3">
        <Icon size={14} className="text-[#5fa8ff]" />
        <h2 className="text-[12px] font-black uppercase tracking-[0.08em] text-[#d8e5f7]">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  averageLabel,
  averageValue,
  comparison,
  accent,
}) {
  const theme = {
    blue: {
      icon: 'text-[#4ea1ff]',
      shadow: 'shadow-[inset_0_0_32px_rgba(59,130,246,.08)]',
    },
    violet: {
      icon: 'text-[#a66cff]',
      shadow: 'shadow-[inset_0_0_32px_rgba(139,92,246,.08)]',
    },
    rose: {
      icon: 'text-[#ff657a]',
      shadow: 'shadow-[inset_0_0_32px_rgba(244,63,94,.08)]',
    },
    cyan: {
      icon: 'text-[#37d9ff]',
      shadow: 'shadow-[inset_0_0_32px_rgba(34,211,238,.08)]',
    },
    green: {
      icon: 'text-[#74ff37]',
      shadow: 'shadow-[inset_0_0_32px_rgba(132,204,22,.08)]',
    },
    amber: {
      icon: 'text-[#ffc54d]',
      shadow: 'shadow-[inset_0_0_32px_rgba(245,158,11,.08)]',
    },
  }[accent];

  return (
    <div
      className={`min-h-[86px] rounded-[10px] border border-[#13243a] bg-gradient-to-br from-[#071322] to-[#020813] p-3 ${theme.shadow}`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[10px] border border-white/[.04] bg-black/20 ${theme.icon}`}
        >
          <Icon size={28} strokeWidth={2.1} />
        </div>

        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.1em] text-[#8090a8]">
            {label}
          </p>
          <div className="mt-1 flex items-end gap-2">
            <p className="text-[26px] font-black leading-none text-white">
              {value}
            </p>
            {averageLabel && (
              <div className="mb-0.5 border-l border-white/10 pl-2">
                <p className="text-[8px] font-black uppercase tracking-[0.08em] text-[#6f7d90]">
                  {averageLabel}
                </p>
                <p className="text-[12px] font-black leading-none text-[#c8d6e8]">
                  {averageValue}
                </p>
              </div>
            )}
          </div>

          <p
            className={`mt-2 truncate text-[10px] font-black ${
              comparison?.tone === 'positive'
                ? 'text-[#75e34f]'
                : comparison?.tone === 'negative'
                  ? 'text-[#ff6077]'
                  : 'text-[#7f8da2]'
            }`}
          >
            {comparison?.text}
          </p>
        </div>
      </div>
    </div>
  );
}

function MatchupCard({
  icon: Icon,
  label,
  name,
  wars,
  value,
  accent,
  onClick,
}) {
  const classes = {
    violet:
      'border-violet-500/40 bg-gradient-to-r from-violet-950/55 to-[#020813] text-violet-300',
    cyan:
      'border-cyan-500/40 bg-gradient-to-r from-cyan-950/45 to-[#020813] text-cyan-300',
    rose:
      'border-rose-500/40 bg-gradient-to-r from-rose-950/45 to-[#020813] text-rose-300',
  }[accent];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`group flex min-h-[86px] w-full items-center gap-3 rounded-[10px] border p-3 text-left transition ${
        onClick
          ? 'cursor-pointer hover:-translate-y-0.5 hover:brightness-110'
          : 'cursor-default'
      } ${classes}`}
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[10px] border border-current/30 bg-black/25">
        <Icon size={30} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[9px] font-black uppercase tracking-[0.1em]">
          {label}
        </p>

        <div className="mt-1 flex min-w-0 items-center gap-2">
          <p className="truncate text-[14px] font-black text-white">
            {name || '-'}
          </p>

          {wars > 0 && (
            <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-black text-slate-300">
              {wars} war{wars === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <p className="mt-1 text-[10px] font-black text-slate-400">
          {value || 'No data'}
        </p>

        {onClick && (
          <p className="mt-1 flex items-center gap-1 text-[9px] font-black text-slate-500 group-hover:text-white">
            Open latest node war
            <ChevronRight size={11} />
          </p>
        )}
      </div>
    </button>
  );
}

function PlayerHighlight({ icon: Icon, label, name, value, unit, accent }) {
  const classes = {
    blue: 'border-blue-500/30 text-blue-300',
    violet: 'border-violet-500/30 text-violet-300',
    cyan: 'border-cyan-500/30 text-cyan-300',
    green: 'border-emerald-500/30 text-emerald-300',
    amber: 'border-amber-500/30 text-amber-300',
    pink: 'border-fuchsia-500/30 text-fuchsia-300',
  }[accent];

  return (
    <div className={`min-h-[96px] rounded-[10px] border bg-gradient-to-br from-[#071322] to-[#020813] p-3 ${classes}`}>
      <div className="flex h-full items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[12px] border border-current/25 bg-black/25">
          <Icon size={34} />
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.08em]">
            {label}
          </p>
          <p className="mt-1 truncate text-[13px] font-black text-white">
            {name || '-'}
          </p>
          <p className="mt-1 text-[21px] font-black leading-none text-white">
            {value || '-'}
          </p>
          <p className="mt-1 text-[10px] font-medium text-[#8c9bb0]">
            {unit}
          </p>
        </div>
      </div>
    </div>
  );
}

function FeaturedWar({ item, onOpen }) {
  const accent = {
    blue: 'border-blue-500/55 from-blue-950/90 via-[#07162b]',
    violet: 'border-violet-500/55 from-violet-950/90 via-[#1a0d31]',
    cyan: 'border-cyan-500/55 from-cyan-950/85 via-[#06242c]',
  }[item.accent];

  return (
    <button
      type="button"
      onClick={() => onOpen(item.row)}
      className={`group relative min-h-[108px] overflow-hidden rounded-[10px] border bg-gradient-to-r ${accent} to-[#020813] p-4 text-left transition hover:-translate-y-0.5 hover:brightness-110`}
    >
      <div className="absolute inset-y-0 right-0 w-[58%] opacity-75">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_65%_45%,rgba(255,255,255,.14),transparent_30%)]" />
        <div className="absolute bottom-0 right-0 h-20 w-full bg-[linear-gradient(150deg,transparent_0%,transparent_32%,rgba(255,255,255,.06)_32%,rgba(255,255,255,.06)_36%,transparent_36%,transparent_48%,rgba(255,255,255,.05)_48%,rgba(255,255,255,.05)_52%,transparent_52%)]" />
      </div>

      <div className="relative z-10 flex h-full items-center gap-4">
        <div className="flex h-16 w-14 shrink-0 items-center justify-center rounded-[8px] border border-current/40 bg-black/30 text-current">
          <Shield size={30} />
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.08em] text-current">
            {item.label}
          </p>
          <p className="mt-2 text-[25px] font-black leading-none text-white">
            {item.value}
          </p>
          <p className="mt-2 text-[11px] font-black text-[#dbe8f8]">
            {formatDate(item.date)}
          </p>

          <p className="mt-1 truncate text-[11px] font-bold text-[#9fb0c6]">
            vs {item.guild?.name || 'Enemy guild unavailable'}
          </p>

          <p className="mt-1 text-[10px] font-black text-[#6f7d90]">
            {item.guild
              ? `${compact(item.guild.kills)} kills · ${compact(
                  item.guild.deaths,
                )} deaths against this guild`
              : `${compact(item.row?.kills)} total kills · ${compact(
                  item.row?.deaths,
                )} total deaths`}
          </p>
        </div>
      </div>
    </button>
  );
}

function BarCell({ value, max, color }) {
  const width = value > 0 ? Math.max(3, (value / Math.max(1, max)) * 100) : 0;

  return (
    <div className="flex items-center gap-2">
      <span className="w-[48px] text-right text-[11px] font-black text-[#d8e5f7]">
        {compact(value)}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#0b1728]">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function PlayersTable({ players }) {
  const rows = players.slice(0, 8);
  const maxKills = Math.max(1, ...rows.map((row) => row.kills));
  const maxDeaths = Math.max(1, ...rows.map((row) => row.deaths));
  const maxDamage = Math.max(1, ...rows.map((row) => row.damage));
  const maxFort = Math.max(1, ...rows.map((row) => row.fortDamage));

  if (!rows.length) {
    return <p className="p-5 text-sm text-slate-500">No player data.</p>;
  }

  return (
    <div className={`overflow-x-auto ${scrollCls}`}>
      <div className="min-w-[1050px]">
        <div className="grid grid-cols-[40px_minmax(180px,1.4fr)_70px_180px_180px_90px_180px_180px] gap-2 bg-[#071422] px-3 py-2 text-[9px] font-black uppercase tracking-[0.08em] text-[#7f8da2]">
          <span>#</span>
          <span>Player</span>
          <span className="text-center">Wars</span>
          <span>Kills</span>
          <span>Deaths</span>
          <span className="text-center">K/D</span>
          <span>Damage</span>
          <span>Fort Dmg</span>
        </div>

        <div className="divide-y divide-[#102038]">
          {rows.map((player, index) => (
            <div
              key={player.name}
              className="grid grid-cols-[40px_minmax(180px,1.4fr)_70px_180px_180px_90px_180px_180px] items-center gap-2 px-3 py-2 text-[12px] hover:bg-white/[.02]"
            >
              <span className="font-black text-[#64748b]">{index + 1}</span>

              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#31557d] bg-[#0a1830] text-[10px] font-black text-[#8fc4ff]">
                  {String(player.name || '?').slice(0, 1).toUpperCase()}
                </div>
                <span className="truncate font-black text-white">
                  {player.name}
                </span>
              </div>

              <span className="text-center font-black text-[#cbd5e1]">
                {player.wars}
              </span>

              <BarCell value={player.kills} max={maxKills} color="bg-[#315dff]" />
              <BarCell value={player.deaths} max={maxDeaths} color="bg-[#d8334f]" />

              <span
                className={`text-center font-black ${
                  player.kd >= 1 ? 'text-[#75e34f]' : 'text-[#ff6b7e]'
                }`}
              >
                {player.kd.toFixed(2)}
              </span>

              <BarCell value={player.damage} max={maxDamage} color="bg-[#42c4c8]" />
              <BarCell value={player.fortDamage} max={maxFort} color="bg-[#d59a32]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EnemyGuildReport({ enemies }) {
  const rows = enemies;

  if (!rows.length) {
    return (
      <div className="flex min-h-[280px] items-center justify-center p-5 text-sm font-bold text-slate-500">
        No guild reached 30 combined kills + deaths in a Node War.
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#102038]">
      {rows.map((enemy, index) => {
        const positive = enemy.kd >= 1;

        return (
          <div
            key={enemy.name}
            className="group grid grid-cols-[30px_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 transition hover:bg-white/[.025]"
          >
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-lg border text-[10px] font-black ${
                index === 0
                  ? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
                  : index === 1
                    ? 'border-slate-300/20 bg-slate-300/5 text-slate-300'
                    : index === 2
                      ? 'border-orange-400/25 bg-orange-400/10 text-orange-300'
                      : 'border-[#263c59] bg-[#081626] text-[#7589a3]'
              }`}
            >
              {index + 1}
            </div>

            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-violet-500/20 bg-violet-950/30 text-violet-300">
                  <Shield size={15} />
                </div>

                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <p className="truncate text-[12px] font-black text-white">
                      {enemy.name}
                    </p>
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.05em] text-slate-400">
                      {enemy.wars} war{enemy.wars === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center gap-3 text-[9px] font-black">
                    <span className="text-blue-300">
                      {compact(enemy.kills)} K
                    </span>
                    <span className="text-rose-300">
                      {compact(enemy.deaths)} D
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-right">
              <p
                className={`text-[15px] font-black ${
                  positive ? 'text-[#75e34f]' : 'text-[#ff6077]'
                }`}
              >
                {enemy.kd.toFixed(2)}
              </p>
              <p className="text-[8px] font-black uppercase tracking-[0.08em] text-slate-500">
                K/D
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function MonthlyRecap({
  logs = [],
  onOpenMatchOverview = () => {},
}) {
  const months = useMemo(() => {
    const available = [
      ...new Set(
        (logs || [])
          .map((log) => monthFromDate(dateOf(log)))
          .filter((month) => month && month >= MIN_MONTH),
      ),
    ].sort((a, b) => b.localeCompare(a));

    if (!available.includes(MIN_MONTH)) {
      available.push(MIN_MONTH);
      available.sort((a, b) => b.localeCompare(a));
    }

    return available;
  }, [logs]);

  const [selectedMonth, setSelectedMonth] = useState(
    months[0] || MIN_MONTH,
  );

  useEffect(() => {
    if (!months.includes(selectedMonth)) {
      setSelectedMonth(months[0] || MIN_MONTH);
    }
  }, [months, selectedMonth]);

  const review = useMemo(
    () => buildReview(logs, selectedMonth),
    [logs, selectedMonth],
  );

  const {
    previousMonth,
    totals,
    previousTotals,
    players,
    topFragger,
    bestKd,
    damageLeader,
    fortBreaker,
    longestStreak,
    bestFeed,
    enemies,
    mostFought,
    bestMatchup,
    toughestMatchup,
    featuredWars,
  } = review;

  return (
    <div className="space-y-2.5 bg-[#020611] text-white">
      <div className="flex flex-col gap-3 pb-1 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[32px] font-black leading-none tracking-[-0.02em] text-white">
            Monthly Recap
          </h1>
          <p className="mt-1 text-[13px] font-medium text-[#8d9bb0]">
            Node Wars Performance Overview —{' '}
            <span className="font-bold text-[#4ea1ff]">
              {monthLabel(selectedMonth)}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <CalendarDays
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7f8da2]"
            />
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="h-10 rounded-[8px] border border-[#23364f] bg-[#020813] py-2 pl-9 pr-9 text-[12px] font-bold text-[#d8e5f7] outline-none focus:border-[#4ea1ff]"
            >
              {months.map((month) => (
                <option key={month} value={month}>
                  {monthLabel(month)}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex h-10 items-center gap-2 rounded-[8px] border border-[#23364f] bg-[#020813] px-4 text-[12px] font-bold text-[#d8e5f7] transition hover:border-[#4ea1ff]"
          >
            <Download size={14} />
            Export Report
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard
          icon={Flag}
          label="Total Wars"
          value={compact(totals.wars, 0)}
          comparison={comparisonInfo(
            totals.wars,
            previousTotals.wars,
            previousMonth,
          )}
          accent="blue"
        />
        <KpiCard
          icon={Swords}
          label="Total Kills"
          value={compact(totals.kills)}
          averageLabel="Avg / War"
          averageValue={totals.avgKills.toFixed(1)}
          comparison={comparisonInfo(
            totals.kills,
            previousTotals.kills,
            previousMonth,
          )}
          accent="violet"
        />
        <KpiCard
          icon={Skull}
          label="Total Deaths"
          value={compact(totals.deaths)}
          averageLabel="Avg / War"
          averageValue={totals.avgDeaths.toFixed(1)}
          comparison={comparisonInfo(
            totals.deaths,
            previousTotals.deaths,
            previousMonth,
            true,
          )}
          accent="rose"
        />
        <KpiCard
          icon={Crosshair}
          label="Overall K/D"
          value={totals.kd.toFixed(2)}
          averageLabel="Avg War K/D"
          averageValue={totals.avgWarKd.toFixed(2)}
          comparison={comparisonInfo(
            totals.kd,
            previousTotals.kd,
            previousMonth,
          )}
          accent="cyan"
        />
        <KpiCard
          icon={Zap}
          label="Damage"
          value={compact(totals.damage)}
          averageLabel="Avg / War"
          averageValue={compact(totals.avgDamage)}
          comparison={comparisonInfo(
            totals.damage,
            previousTotals.damage,
            previousMonth,
          )}
          accent="green"
        />
        <KpiCard
          icon={Castle}
          label="Fort Damage"
          value={compact(totals.fortDamage)}
          averageLabel="Avg / War"
          averageValue={compact(totals.avgFortDamage)}
          comparison={comparisonInfo(
            totals.fortDamage,
            previousTotals.fortDamage,
            previousMonth,
          )}
          accent="amber"
        />
      </div>

      <SectionShell icon={Swords} title="Featured Wars">
        <div className="grid gap-2 p-2 xl:grid-cols-3">
          {featuredWars.length ? (
            featuredWars.map((item) => (
              <FeaturedWar
                key={item.id}
                item={item}
                onOpen={onOpenMatchOverview}
              />
            ))
          ) : (
            <p className="col-span-full p-5 text-sm text-slate-500">
              No featured wars for this month.
            </p>
          )}
        </div>
      </SectionShell>

      <div className="grid gap-2 xl:grid-cols-[minmax(0,1.55fr)_minmax(340px,.85fr)]">
        <SectionShell icon={Sparkles} title="Monthly Highlights">
          <div className="grid h-full grid-cols-1 gap-2 p-2">
            <MatchupCard
              icon={Swords}
              label="Most Fought Guild"
              name={mostFought?.name}
              wars={mostFought?.wars}
              value={
                mostFought
                  ? `${compact(mostFought.kills)} K · ${compact(
                      mostFought.deaths,
                    )} D`
                  : null
              }
              accent="violet"
              onClick={
                mostFought?.latestWar
                  ? () => onOpenMatchOverview(mostFought.latestWar)
                  : undefined
              }
            />

            <MatchupCard
              icon={Trophy}
              label="Best Matchup"
              name={bestMatchup?.name}
              wars={bestMatchup?.wars}
              value={
                bestMatchup
                  ? `${bestMatchup.kd.toFixed(2)} K/D`
                  : null
              }
              accent="cyan"
              onClick={
                bestMatchup?.latestWar
                  ? () => onOpenMatchOverview(bestMatchup.latestWar)
                  : undefined
              }
            />

            <MatchupCard
              icon={Target}
              label="Toughest Opponent"
              name={toughestMatchup?.name}
              wars={toughestMatchup?.wars}
              value={
                toughestMatchup
                  ? `${toughestMatchup.kd.toFixed(2)} K/D`
                  : null
              }
              accent="rose"
              onClick={
                toughestMatchup?.latestWar
                  ? () => onOpenMatchOverview(toughestMatchup.latestWar)
                  : undefined
              }
            />
          </div>
        </SectionShell>

        <SectionShell icon={Shield} title="Enemy Guild Report">
          <EnemyGuildReport enemies={enemies} />
        </SectionShell>
      </div>

      <SectionShell icon={Users} title="Player Highlights">
        <div className="grid gap-2 p-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <PlayerHighlight
            icon={Crosshair}
            label="Top Fragger"
            name={topFragger?.name}
            value={topFragger ? compact(topFragger.kills) : '-'}
            unit="Kills"
            accent="blue"
          />
          <PlayerHighlight
            icon={Gauge}
            label="Best K/D"
            name={bestKd?.name}
            value={bestKd ? bestKd.kd.toFixed(2) : '-'}
            unit="K/D Ratio"
            accent="violet"
          />
          <PlayerHighlight
            icon={Zap}
            label="Damage Leader"
            name={damageLeader?.name}
            value={damageLeader ? compact(damageLeader.damage) : '-'}
            unit="Damage"
            accent="cyan"
          />
          <PlayerHighlight
            icon={Castle}
            label="Fort Breaker"
            name={fortBreaker?.name}
            value={fortBreaker ? compact(fortBreaker.fortDamage) : '-'}
            unit="Fort Damage"
            accent="green"
          />
          <PlayerHighlight
            icon={Medal}
            label="Longest Killstreak"
            name={longestStreak?.name}
            value={longestStreak ? compact(longestStreak.value, 0) : '-'}
            unit="Kills"
            accent="amber"
          />
          <PlayerHighlight
            icon={Flame}
            label="Best Kill Feed"
            name={bestFeed?.name}
            value={bestFeed ? compact(bestFeed.value, 0) : '-'}
            unit="10-second window"
            accent="pink"
          />
        </div>
      </SectionShell>

      <SectionShell icon={Activity} title="Players Performance">
        <PlayersTable players={players} />
      </SectionShell>

    </div>
  );
}
