import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CalendarDays,
  Castle,
  ChevronRight,
  Crosshair,
  Download,
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

import { Panel } from '../components/UI';
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
  const deathCount = num(deaths);
  return deathCount ? num(kills) / deathCount : num(kills);
}

function monthFromDate(value) {
  const text = String(value || '');
  return /^\d{4}-\d{2}/.test(text) ? text.slice(0, 7) : '';
}

function monthLabel(monthId) {
  if (!/^\d{4}-\d{2}$/.test(String(monthId || ''))) {
    return 'Unknown month';
  }

  const [year, month] = monthId.split('-').map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
}

function shortMonthLabel(monthId) {
  if (!/^\d{4}-\d{2}$/.test(String(monthId || ''))) return 'previous month';

  const [year, month] = monthId.split('-').map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString('en-GB', {
    month: 'short',
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

function formatDate(value) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) return String(value || '-');

  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function cleanGuild(value) {
  const text = String(value || '').trim();

  if (!text || /^\d{4}-\d{2}-\d{2}$/.test(text)) return '';

  return text;
}

function getSummary(log) {
  return log?.summary || log?.stats || log?.analytics || {};
}

function getGuildPlayer(event) {
  return (
    event?.guildPlayer ||
    (event?.type === 'kill' ? event?.killer : event?.victim) ||
    ''
  );
}

function percentChange(current, previous) {
  const currentNumber = num(current);
  const previousNumber = num(previous);

  if (!previousNumber) {
    return currentNumber ? null : 0;
  }

  return ((currentNumber - previousNumber) / Math.abs(previousNumber)) * 100;
}

function comparisonText(current, previous, previousMonth, lowerIsBetter = false) {
  const change = percentChange(current, previous);

  if (change == null) {
    return `No ${shortMonthLabel(previousMonth)} baseline`;
  }

  const positive = lowerIsBetter ? change < 0 : change > 0;
  const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '•';

  return `${arrow} ${Math.abs(change).toFixed(0)}% vs ${shortMonthLabel(
    previousMonth,
  )}${change === 0 ? '' : positive ? ' · improved' : ''}`;
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
  const warsByPlayer = new Map();

  function addWar(name, warId) {
    const cleanName = String(name || '').trim();
    const cleanWarId = String(warId || '').trim();

    if (!cleanName || !cleanWarId) return;

    if (!warsByPlayer.has(cleanName)) {
      warsByPlayer.set(cleanName, new Set());
    }

    warsByPlayer.get(cleanName).add(cleanWarId);
  }

  (stats?.ev || []).forEach((event, index) => {
    addWar(
      getGuildPlayer(event),
      event?.id || event?.war || event?.date || `event-${index}`,
    );
  });

  (stats?.secondary?.rows || []).forEach((row, index) => {
    addWar(
      row?.player || row?.name,
      row?.id || row?.war || row?.date || `secondary-${index}`,
    );
  });

  return Object.fromEntries(
    [...warsByPlayer.entries()].map(([name, wars]) => [name, wars.size]),
  );
}

function buildEnemyRows(logs, monthlyStats) {
  const byGuild = {};

  function add(name, ourKills, ourDeaths, warId) {
    const guildName = cleanGuild(name);

    if (!guildName) return;

    byGuild[guildName] ||= {
      name: guildName,
      kills: 0,
      deaths: 0,
      wars: new Set(),
    };

    byGuild[guildName].kills += num(ourKills);
    byGuild[guildName].deaths += num(ourDeaths);

    if (warId) {
      byGuild[guildName].wars.add(String(warId));
    }
  }

  (logs || []).forEach((log, logIndex) => {
    const summary = getSummary(log);
    const guilds = Array.isArray(summary?.guilds) ? summary.guilds : [];
    const warId = String(log?.id || dateOf(log) || `log-${logIndex}`);

    guilds.forEach((guild) => {
      add(guild?.name, guild?.kills, guild?.deaths, warId);
    });
  });

  if (!Object.keys(byGuild).length) {
    (monthlyStats?.ev || []).forEach((event, index) => {
      const guild = cleanGuild(event?.guild);
      const warId =
        event?.id || event?.war || event?.date || `event-${index}`;

      if (event?.type === 'kill') add(guild, 1, 0, warId);
      if (event?.type === 'death') add(guild, 0, 1, warId);
    });
  }

  return Object.values(byGuild)
    .map((guild) => ({
      name: guild.name,
      kills: guild.kills,
      deaths: guild.deaths,
      wars: guild.wars.size,
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

function buildMonthlyReview(logs, selectedMonth) {
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

  const rows = monthLogs
    .map(buildNodeWarRow)
    .sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

  const previousRows = previousLogs.map(buildNodeWarRow);
  const stats = calculateStats(monthLogs);

  const totals = {
    wars: rows.length,
    kills: rows.reduce((sum, row) => sum + num(row.kills), 0),
    deaths: rows.reduce((sum, row) => sum + num(row.deaths), 0),
    damage: rows.reduce((sum, row) => sum + num(row.damageDealt), 0),
    fortDamage: rows.reduce((sum, row) => sum + num(row.fortDamage), 0),
  };

  totals.kd = ratio(totals.kills, totals.deaths);

  const previousTotals = {
    wars: previousRows.length,
    kills: previousRows.reduce((sum, row) => sum + num(row.kills), 0),
    deaths: previousRows.reduce(
      (sum, row) => sum + num(row.deaths),
      0,
    ),
    damage: previousRows.reduce(
      (sum, row) => sum + num(row.damageDealt),
      0,
    ),
    fortDamage: previousRows.reduce(
      (sum, row) => sum + num(row.fortDamage),
      0,
    ),
  };

  previousTotals.kd = ratio(
    previousTotals.kills,
    previousTotals.deaths,
  );

  const warCounts = buildPlayerWarCounts(stats);

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

  const topFragger = players[0] || null;

  const minWars = Math.min(3, Math.max(1, totals.wars));

  const bestKd =
    [...players]
      .filter((player) => player.wars >= minWars && player.kills > 0)
      .sort(
        (a, b) =>
          b.kd - a.kd ||
          b.kills - a.kills ||
          a.deaths - b.deaths ||
          a.name.localeCompare(b.name),
      )[0] || null;

  const damageLeader =
    [...players]
      .filter((player) => player.damage > 0)
      .sort(
        (a, b) =>
          b.damage - a.damage ||
          a.name.localeCompare(b.name),
      )[0] || null;

  const fortBreaker =
    [...players]
      .filter((player) => player.fortDamage > 0)
      .sort(
        (a, b) =>
          b.fortDamage - a.fortDamage ||
          a.name.localeCompare(b.name),
      )[0] || null;

  const longestStreak = topObjectEntry(
    calculateStreaks(stats?.ev || []),
  );

  const bestFeed = topObjectEntry(
    calculateKillFeed(
      stats?.ev || [],
      KILL_FEED_WINDOW_SECONDS,
    ),
  );

  const enemies = buildEnemyRows(monthLogs, stats);

  const mostFought = enemies[0] || null;

  const bestMatchup =
    [...enemies]
      .filter((enemy) => enemy.kills + enemy.deaths > 0)
      .sort(
        (a, b) =>
          b.kd - a.kd ||
          b.wars - a.wars ||
          b.kills - a.kills ||
          a.name.localeCompare(b.name),
      )[0] || null;

  const toughestMatchup =
    [...enemies]
      .filter((enemy) => enemy.kills + enemy.deaths > 0)
      .sort(
        (a, b) =>
          a.kd - b.kd ||
          b.wars - a.wars ||
          b.deaths - a.deaths ||
          a.name.localeCompare(b.name),
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
        num(b.kills) - num(a.kills) ||
        String(b.date).localeCompare(String(a.date)),
    )[0] || null;

  const highestDamageWar =
    [...rows]
      .filter((row) => num(row.damageDealt) > 0)
      .sort(
        (a, b) =>
          num(b.damageDealt) - num(a.damageDealt) ||
          String(b.date).localeCompare(String(a.date)),
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
        title: 'Highest Kill Total',
        value: `${compact(highestKillsWar.kills)} Kills`,
        subtitle: `${compact(highestKillsWar.deaths)} deaths · ${num(
          highestKillsWar.kdNumber ?? highestKillsWar.kd,
        ).toFixed(2)} K/D`,
        row: highestKillsWar,
        tone: 'blue',
      },
      bestKdWar && {
        id: 'kd',
        title: 'Best K/D War',
        value: `${num(bestKdWar.kdNumber ?? bestKdWar.kd).toFixed(
          2,
        )} K/D`,
        subtitle: `${compact(bestKdWar.kills)} kills · ${compact(
          bestKdWar.deaths,
        )} deaths`,
        row: bestKdWar,
        tone: 'violet',
      },
      highestDamageWar && {
        id: 'damage',
        title: 'Highest Damage War',
        value: compact(highestDamageWar.damageDealt),
        subtitle: `${compact(highestDamageWar.kills)} kills · ${num(
          highestDamageWar.kdNumber ?? highestDamageWar.kd,
        ).toFixed(2)} K/D`,
        row: highestDamageWar,
        tone: 'cyan',
      },
    ].filter(Boolean),
  };
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}) {
  const themes = {
    blue: 'border-blue-400/20 bg-blue-500/8 text-blue-300',
    violet:
      'border-violet-400/20 bg-violet-500/8 text-violet-300',
    rose: 'border-rose-400/20 bg-rose-500/8 text-rose-300',
    cyan: 'border-cyan-400/20 bg-cyan-500/8 text-cyan-300',
    emerald:
      'border-emerald-400/20 bg-emerald-500/8 text-emerald-300',
    amber: 'border-amber-400/20 bg-amber-500/8 text-amber-300',
  };

  return (
    <div
      className={`rounded-2xl border p-4 shadow-xl ${
        themes[tone] || themes.blue
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
            {label}
          </p>
          <p className="mt-1 text-2xl font-black text-white">{value}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-2">
          <Icon size={20} />
        </div>
      </div>

      <p className="text-[11px] font-black text-emerald-400">{sub}</p>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon size={17} className="text-blue-300" />
      <h2 className="text-sm font-black uppercase tracking-[0.12em] text-slate-200">
        {title}
      </h2>
    </div>
  );
}

function HighlightTile({
  icon: Icon,
  label,
  name,
  value,
  tone,
}) {
  const themes = {
    violet:
      'border-violet-400/25 bg-violet-500/8 text-violet-300',
    emerald:
      'border-emerald-400/25 bg-emerald-500/8 text-emerald-300',
    rose: 'border-rose-400/25 bg-rose-500/8 text-rose-300',
  };

  return (
    <div
      className={`rounded-xl border p-4 ${
        themes[tone] || themes.violet
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-2">
          <Icon size={22} />
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.12em]">
            {label}
          </p>
          <p className="mt-1 truncate text-sm font-black text-white">
            {name || '-'}
          </p>
          <p className="mt-1 text-xs font-black text-slate-400">
            {value || 'No data'}
          </p>
        </div>
      </div>
    </div>
  );
}

function PlayerHighlightCard({
  icon: Icon,
  label,
  name,
  value,
  detail,
  tone,
}) {
  const themes = {
    blue: 'border-blue-400/20 text-blue-300',
    violet: 'border-violet-400/20 text-violet-300',
    cyan: 'border-cyan-400/20 text-cyan-300',
    emerald: 'border-emerald-400/20 text-emerald-300',
    amber: 'border-amber-400/20 text-amber-300',
    rose: 'border-rose-400/20 text-rose-300',
  };

  return (
    <div
      className={`rounded-xl border bg-slate-950/70 p-3 ${
        themes[tone] || themes.blue
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-[9px] font-black uppercase tracking-[0.12em]">
          {label}
        </p>
        <Icon size={15} />
      </div>

      <p className="truncate text-sm font-black text-white" title={name}>
        {name || '-'}
      </p>
      <p className="mt-1 text-xl font-black">{value || '-'}</p>
      <p className="mt-0.5 text-[10px] font-bold text-slate-500">
        {detail}
      </p>
    </div>
  );
}

function FeaturedWarCard({ item, onOpen }) {
  const themes = {
    blue: 'border-blue-400/30 from-blue-500/20 via-blue-950/75',
    violet:
      'border-violet-400/30 from-violet-500/20 via-violet-950/75',
    cyan: 'border-cyan-400/30 from-cyan-500/20 via-cyan-950/75',
  };

  return (
    <button
      type="button"
      onClick={() => onOpen(item.row)}
      className={`group relative overflow-hidden rounded-2xl border bg-gradient-to-r ${
        themes[item.tone] || themes.blue
      } to-slate-950 p-4 text-left transition hover:-translate-y-0.5 hover:border-white/30`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_50%,rgba(255,255,255,.08),transparent_35%)]" />

      <div className="relative">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-300">
          {item.title}
        </p>
        <p className="mt-2 text-2xl font-black text-white">{item.value}</p>
        <p className="mt-1 text-xs font-bold text-slate-400">
          {item.subtitle}
        </p>
        <p className="mt-2 text-[10px] font-black text-slate-500">
          {formatDate(item.row.date)}
        </p>

        <div className="mt-3 flex items-center gap-1 text-xs font-black text-slate-400 group-hover:text-white">
          Open match overview
          <ChevronRight size={14} />
        </div>
      </div>
    </button>
  );
}

function PerformanceBar({ value, max, tone }) {
  const width = value > 0 ? Math.max(4, (value / Math.max(1, max)) * 100) : 0;

  const themes = {
    blue: 'from-blue-500 to-indigo-400',
    rose: 'from-rose-500 to-pink-400',
    cyan: 'from-cyan-500 to-sky-300',
    amber: 'from-amber-500 to-yellow-300',
  };

  return (
    <div className="flex items-center gap-2">
      <span className="min-w-[48px] text-right text-xs font-black text-slate-200">
        {compact(value)}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-900">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${
            themes[tone] || themes.blue
          }`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function PlayerPerformanceTable({ players }) {
  const rows = players.slice(0, 10);

  const maxKills = Math.max(1, ...rows.map((player) => player.kills));
  const maxDeaths = Math.max(1, ...rows.map((player) => player.deaths));
  const maxDamage = Math.max(1, ...rows.map((player) => player.damage));
  const maxFort = Math.max(1, ...rows.map((player) => player.fortDamage));

  if (!rows.length) {
    return (
      <p className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 text-sm font-bold text-slate-500">
        No player performance data for this month.
      </p>
    );
  }

  return (
    <div className={`overflow-x-auto ${scrollCls}`}>
      <div className="min-w-[920px]">
        <div className="grid grid-cols-[44px_minmax(150px,1.3fr)_64px_170px_170px_80px_170px_170px] gap-2 border-b border-slate-800 px-3 pb-2 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
          <span>#</span>
          <span>Player</span>
          <span className="text-center">Wars</span>
          <span>Kills</span>
          <span>Deaths</span>
          <span className="text-center">K/D</span>
          <span>Damage</span>
          <span>Fort Dmg</span>
        </div>

        <div className="divide-y divide-slate-900">
          {rows.map((player, index) => (
            <div
              key={player.name}
              className="grid grid-cols-[44px_minmax(150px,1.3fr)_64px_170px_170px_80px_170px_170px] items-center gap-2 px-3 py-2.5 text-sm"
            >
              <span className="text-xs font-black text-slate-600">
                {index + 1}
              </span>
              <span className="truncate font-black text-white">
                {player.name}
              </span>
              <span className="text-center font-black text-slate-300">
                {player.wars}
              </span>
              <PerformanceBar
                value={player.kills}
                max={maxKills}
                tone="blue"
              />
              <PerformanceBar
                value={player.deaths}
                max={maxDeaths}
                tone="rose"
              />
              <span
                className={`text-center font-black ${
                  player.kd >= 1 ? 'text-lime-300' : 'text-rose-300'
                }`}
              >
                {player.kd.toFixed(2)}
              </span>
              <PerformanceBar
                value={player.damage}
                max={maxDamage}
                tone="cyan"
              />
              <PerformanceBar
                value={player.fortDamage}
                max={maxFort}
                tone="amber"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EnemyGuildTable({ enemies }) {
  const rows = enemies.slice(0, 12);

  if (!rows.length) {
    return (
      <p className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 text-sm font-bold text-slate-500">
        No enemy guild data for this month.
      </p>
    );
  }

  return (
    <div className={`overflow-x-auto ${scrollCls}`}>
      <div className="min-w-[760px]">
        <div className="grid grid-cols-[44px_minmax(180px,1.4fr)_70px_100px_100px_90px] gap-2 border-b border-slate-800 px-3 pb-2 text-[9px] font-black uppercase tracking-[0.12em] text-slate-500">
          <span>#</span>
          <span>Guild</span>
          <span className="text-center">Wars</span>
          <span className="text-center">Kills</span>
          <span className="text-center">Deaths</span>
          <span className="text-center">K/D</span>
        </div>

        <div className="divide-y divide-slate-900">
          {rows.map((enemy, index) => (
            <div
              key={enemy.name}
              className="grid grid-cols-[44px_minmax(180px,1.4fr)_70px_100px_100px_90px] items-center gap-2 px-3 py-2.5 text-sm"
            >
              <span className="text-xs font-black text-slate-600">
                {index + 1}
              </span>
              <span className="truncate font-black text-white">
                {enemy.name}
              </span>
              <span className="text-center font-black text-slate-300">
                {enemy.wars}
              </span>
              <span className="text-center font-black text-blue-300">
                {compact(enemy.kills)}
              </span>
              <span className="text-center font-black text-rose-300">
                {compact(enemy.deaths)}
              </span>
              <span
                className={`text-center font-black ${
                  enemy.kd >= 1 ? 'text-lime-300' : 'text-rose-300'
                }`}
              >
                {enemy.kd.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
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
    () => buildMonthlyReview(logs, selectedMonth),
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

  const recapText = totals.wars
    ? `Another strong month for Adversary. Across ${totals.wars} node wars, the guild produced ${compact(
        totals.kills,
      )} kills with a ${totals.kd.toFixed(
        2,
      )} overall K/D. The strongest matchup was ${
        bestMatchup?.name || 'not yet available'
      }, while ${mostFought?.name || 'no single guild'} was faced most often.`
    : `No saved node wars were found for ${monthLabel(
        selectedMonth,
      )}. Add logs for this month and the recap will populate automatically.`;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Monthly Recap</h1>
          <p className="mt-1 text-sm font-bold text-slate-400">
            Node Wars Performance Overview —{' '}
            <span className="text-blue-300">{monthLabel(selectedMonth)}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <label className="relative">
            <CalendarDays
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
            />
            <select
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-9 text-sm font-black text-slate-200 outline-none focus:border-blue-400"
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
            className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-black text-slate-300 transition hover:border-slate-500 hover:text-white"
          >
            <Download size={15} />
            Export Report
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard
          icon={Swords}
          label="Total Wars"
          value={compact(totals.wars, 0)}
          sub={comparisonText(
            totals.wars,
            previousTotals.wars,
            previousMonth,
          )}
          tone="blue"
        />
        <KpiCard
          icon={Skull}
          label="Total Kills"
          value={compact(totals.kills)}
          sub={comparisonText(
            totals.kills,
            previousTotals.kills,
            previousMonth,
          )}
          tone="violet"
        />
        <KpiCard
          icon={Skull}
          label="Total Deaths"
          value={compact(totals.deaths)}
          sub={comparisonText(
            totals.deaths,
            previousTotals.deaths,
            previousMonth,
            true,
          )}
          tone="rose"
        />
        <KpiCard
          icon={Crosshair}
          label="Overall K/D"
          value={totals.kd.toFixed(2)}
          sub={comparisonText(
            totals.kd,
            previousTotals.kd,
            previousMonth,
          )}
          tone="cyan"
        />
        <KpiCard
          icon={Zap}
          label="Damage"
          value={compact(totals.damage)}
          sub={comparisonText(
            totals.damage,
            previousTotals.damage,
            previousMonth,
          )}
          tone="emerald"
        />
        <KpiCard
          icon={Castle}
          label="Fort Damage"
          value={compact(totals.fortDamage)}
          sub={comparisonText(
            totals.fortDamage,
            previousTotals.fortDamage,
            previousMonth,
          )}
          tone="amber"
        />
      </div>

      <Panel cls="p-3">
        <SectionHeader icon={Sparkles} title="Monthly Highlights" />

        <div className="grid gap-3 xl:grid-cols-[1.1fr_repeat(3,minmax(0,.72fr))]">
          <div className="rounded-xl border border-blue-400/15 bg-gradient-to-r from-blue-500/10 via-slate-950/80 to-slate-950 p-4">
            <div className="mb-3 flex items-start gap-3">
              <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-3 text-blue-300">
                <Shield size={30} />
              </div>
              <p className="text-sm font-bold leading-6 text-slate-300">
                {recapText}
              </p>
            </div>
          </div>

          <HighlightTile
            icon={Swords}
            label="Most Fought Guild"
            name={mostFought?.name}
            value={
              mostFought
                ? `${mostFought.wars} war${
                    mostFought.wars === 1 ? '' : 's'
                  }`
                : null
            }
            tone="violet"
          />

          <HighlightTile
            icon={Trophy}
            label="Best Matchup"
            name={bestMatchup?.name}
            value={bestMatchup ? `${bestMatchup.kd.toFixed(2)} K/D` : null}
            tone="emerald"
          />

          <HighlightTile
            icon={Target}
            label="Toughest Matchup"
            name={toughestMatchup?.name}
            value={
              toughestMatchup
                ? `${toughestMatchup.kd.toFixed(2)} K/D`
                : null
            }
            tone="rose"
          />
        </div>
      </Panel>

      <Panel cls="p-3">
        <SectionHeader icon={Users} title="Player Highlights" />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <PlayerHighlightCard
            icon={Crosshair}
            label="Top Fragger"
            name={topFragger?.name}
            value={topFragger ? compact(topFragger.kills) : '-'}
            detail="Kills"
            tone="blue"
          />
          <PlayerHighlightCard
            icon={Gauge}
            label="Best K/D"
            name={bestKd?.name}
            value={bestKd ? bestKd.kd.toFixed(2) : '-'}
            detail="K/D Ratio"
            tone="violet"
          />
          <PlayerHighlightCard
            icon={Zap}
            label="Damage Leader"
            name={damageLeader?.name}
            value={damageLeader ? compact(damageLeader.damage) : '-'}
            detail="Damage"
            tone="cyan"
          />
          <PlayerHighlightCard
            icon={Castle}
            label="Fort Breaker"
            name={fortBreaker?.name}
            value={fortBreaker ? compact(fortBreaker.fortDamage) : '-'}
            detail="Fort Damage"
            tone="emerald"
          />
          <PlayerHighlightCard
            icon={Medal}
            label="Longest Killstreak"
            name={longestStreak?.name}
            value={longestStreak ? compact(longestStreak.value, 0) : '-'}
            detail="Kills"
            tone="amber"
          />
          <PlayerHighlightCard
            icon={Flame}
            label="Best Kill Feed"
            name={bestFeed?.name}
            value={bestFeed ? compact(bestFeed.value, 0) : '-'}
            detail="10-second window"
            tone="rose"
          />
        </div>
      </Panel>

      <Panel cls="p-3">
        <SectionHeader icon={Swords} title="Featured Wars" />

        {!featuredWars.length ? (
          <p className="rounded-xl border border-slate-800 bg-slate-950/60 p-5 text-sm font-bold text-slate-500">
            No featured wars for this month.
          </p>
        ) : (
          <div className="grid gap-3 xl:grid-cols-3">
            {featuredWars.map((item) => (
              <FeaturedWarCard
                key={item.id}
                item={item}
                onOpen={onOpenMatchOverview}
              />
            ))}
          </div>
        )}
      </Panel>

      <Panel cls="p-3">
        <SectionHeader icon={Activity} title="Players Performance" />
        <PlayerPerformanceTable players={players} />
      </Panel>

      <Panel cls="p-3">
        <SectionHeader icon={Shield} title="Enemy Guild Report" />
        <EnemyGuildTable enemies={enemies} />
      </Panel>
    </div>
  );
}
