import React, { useMemo, useState } from 'react';
import {
  Activity,
  Castle,
  Crosshair,
  Database,
  Gauge,
  Shield,
  Skull,
  Swords,
  Trophy,
  Zap,
} from 'lucide-react';

const nf = new Intl.NumberFormat('en-US');
const DEFAULT_ENEMY_DAYS_AGO = 45;
const DEFAULT_MIN_ENEMY_WARS = 1;
const DEFAULT_MIN_ENEMY_INTERACTIONS = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compact(value, digits = 1) {
  const valueNumber = num(value);
  const abs = Math.abs(valueNumber);

  if (abs >= 1_000_000_000_000) {
    return `${(valueNumber / 1_000_000_000_000).toFixed(digits).replace(/\.0$/, '')}T`;
  }

  if (abs >= 1_000_000_000) {
    return `${(valueNumber / 1_000_000_000).toFixed(digits).replace(/\.0$/, '')}B`;
  }

  if (abs >= 1_000_000) {
    return `${(valueNumber / 1_000_000).toFixed(digits).replace(/\.0$/, '')}M`;
  }

  if (abs >= 1_000) {
    return `${(valueNumber / 1_000).toFixed(digits).replace(/\.0$/, '')}K`;
  }

  return nf.format(Math.round(valueNumber));
}

function decimal(value, digits = 2) {
  return num(value).toFixed(digits);
}

function cls(...items) {
  return items.filter(Boolean).join(' ');
}

function kd(kills, deaths) {
  const deathsNumber = num(deaths);
  if (!deathsNumber) return num(kills);
  return num(kills) / deathsNumber;
}

function uniqueLogCount(logs = [], stats = {}) {
  const fromLogs = new Set(
    (logs || [])
      .map((log) => String(log?.id || log?.date || log?.name || ''))
      .filter(Boolean),
  );

  if (fromLogs.size) return fromLogs.size;

  const fromEvents = new Set(
    (stats?.ev || [])
      .map((event) => String(event?.id || event?.date || ''))
      .filter(Boolean),
  );

  return fromEvents.size;
}

function hasSecondaryTotals(stats = {}) {
  const totals = stats?.secondary?.totals || {};

  return (
    num(totals.damageDealt) > 0 ||
    num(totals.damageTaken) > 0 ||
    num(totals.ccHits) > 0 ||
    num(totals.fortDamage) > 0
  );
}

function uniqueSecondaryLogCount(logs = [], stats = {}) {
  const secondaryRows = Array.isArray(stats?.secondary?.rows)
    ? stats.secondary.rows
    : [];

  const fromRows = new Set(
    secondaryRows
      .map((row, index) =>
        String(row?.id || row?.date || row?.war || row?.logId || index),
      )
      .filter(Boolean),
  );

  if (fromRows.size) return fromRows.size;

  const fromLogs = new Set(
    (logs || [])
      .filter((log) => {
        const raw = String(log?.raw || '');
        const summary = log?.summary || log?.stats || log?.analytics || {};
        const summaryTotals = summary?.secondary?.totals || {};

        return (
          raw.includes('ADVERSARY_SECONDARY_LOG_START') ||
          num(summaryTotals.damageDealt) > 0 ||
          num(summaryTotals.damageTaken) > 0 ||
          num(summaryTotals.ccHits) > 0 ||
          num(summaryTotals.fortDamage) > 0
        );
      })
      .map((log) => String(log?.id || log?.date || log?.name || ''))
      .filter(Boolean),
  );

  if (fromLogs.size) return fromLogs.size;

  return hasSecondaryTotals(stats) ? 1 : 0;
}

function cleanGuildName(value) {
  const text = String(value || '').trim();
  if (!text || /^\d{4}-\d{2}-\d{2}$/.test(text)) return '';
  return text;
}

function getTierByKd(value) {
  const ratio = num(value);
  if (ratio >= 1.7) return 'S';
  if (ratio >= 1.4) return 'A';
  if (ratio >= 1.15) return 'B';
  if (ratio >= 0.95) return 'C';
  if (ratio >= 0.75) return 'D';
  return 'Trash';
}

const enemyTierMeta = {
  S: {
    label: 'S',
    range: '1.70+ K/D',
    className: 'border-amber-300/35 bg-amber-500/15 text-amber-100 shadow-amber-500/10',
    badge: 'border-amber-300/40 bg-amber-400/20 text-amber-100',
    tone: 'amber',
  },
  A: {
    label: 'A',
    range: '1.40 - 1.69 K/D',
    className: 'border-emerald-300/30 bg-emerald-500/12 text-emerald-100 shadow-emerald-500/10',
    badge: 'border-emerald-300/35 bg-emerald-400/18 text-emerald-100',
    tone: 'emerald',
  },
  B: {
    label: 'B',
    range: '1.15 - 1.39 K/D',
    className: 'border-blue-300/25 bg-blue-500/10 text-blue-100 shadow-blue-500/10',
    badge: 'border-blue-300/35 bg-blue-400/15 text-blue-100',
    tone: 'blue',
  },
  C: {
    label: 'C',
    range: '0.95 - 1.14 K/D',
    className: 'border-violet-300/25 bg-violet-500/10 text-violet-100 shadow-violet-500/10',
    badge: 'border-violet-300/35 bg-violet-400/15 text-violet-100',
    tone: 'violet',
  },
  D: {
    label: 'D',
    range: '0.75 - 0.94 K/D',
    className: 'border-rose-300/25 bg-rose-500/10 text-rose-100 shadow-rose-500/10',
    badge: 'border-rose-300/35 bg-rose-400/15 text-rose-100',
    tone: 'rose',
  },
  Trash: {
    label: 'T',
    range: 'Under 0.75 K/D',
    className: 'border-slate-600/40 bg-slate-800/35 text-slate-200 shadow-slate-950/20',
    badge: 'border-slate-500/40 bg-slate-700/60 text-slate-200',
    tone: 'slate',
  },
};

function getLogTime(log) {
  const raw =
    log?.date ||
    log?.warDate ||
    log?.war_date ||
    log?.createdAt ||
    log?.created_at ||
    log?.created ||
    '';
  const parsed = new Date(raw).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function getLatestLogTime(logs = []) {
  const times = logs.map(getLogTime).filter((time) => time > 0);
  return times.length ? Math.max(...times) : Date.now();
}

function getSimpleSummary(log) {
  return log?.summary || log?.stats || log?.analytics || {};
}

function sumPlayerMetric(players = [], key) {
  return (players || []).reduce((sum, player) => sum + num(player?.[key]), 0);
}

function getLogMetricValue(log, key) {
  const summary = getSimpleSummary(log);
  const players = Array.isArray(summary?.players) ? summary.players : [];
  const secondaryTotals = summary?.secondary?.totals || {};

  if (key === 'matches') return 1;
  if (key === 'kills') return num(summary?.kills);
  if (key === 'deaths') return num(summary?.deaths);
  if (key === 'kd') return kd(summary?.kills, summary?.deaths);
  if (key === 'damageDealt') {
    return num(secondaryTotals.damageDealt) || sumPlayerMetric(players, 'damageDealt');
  }
  if (key === 'ccHits') {
    return num(secondaryTotals.ccHits) || sumPlayerMetric(players, 'ccHits');
  }
  if (key === 'fortDamage') {
    return num(secondaryTotals.fortDamage) || sumPlayerMetric(players, 'fortDamage');
  }

  return 0;
}

function buildMetricBars(logs = [], key) {
  const rows = [...(logs || [])]
    .filter((log) => getLogTime(log) > 0)
    .sort((a, b) => getLogTime(a) - getLogTime(b))
    .slice(-10)
    .map((log) => getLogMetricValue(log, key));

  return [
    ...Array.from({ length: Math.max(0, 10 - rows.length) }, () => 0),
    ...rows.slice(-10),
  ];
}

function getLogLabel(log, index) {
  const raw = String(
    log?.date ||
      log?.warDate ||
      log?.war_date ||
      log?.createdAt ||
      log?.created_at ||
      '',
  );
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(5, 10);
  }
  return `#${index + 1}`;
}

function buildAverageTrendRows(logs = []) {
  const sortedLogs = [...(logs || [])]
    .filter((log) => getLogTime(log) > 0)
    .sort((a, b) => getLogTime(a) - getLogTime(b));

  let matches = 0;
  let kills = 0;
  let deaths = 0;
  let damageDealt = 0;

  return sortedLogs.map((log, index) => {
    matches += 1;
    kills += getLogMetricValue(log, 'kills');
    deaths += getLogMetricValue(log, 'deaths');
    damageDealt += getLogMetricValue(log, 'damageDealt');

    const avgKills = matches ? kills / matches : 0;
    const avgDeaths = matches ? deaths / matches : 0;

    return {
      label: getLogLabel(log, index),
      avgKills,
      avgDeaths,
      avgKd: kd(avgKills, avgDeaths),
      avgDamage: matches ? damageDealt / matches : 0,
    };
  });
}

// Builds raw per-match values for sparkline trend (not cumulative average)
function buildRawTrendRows(logs = []) {
  return [...(logs || [])]
    .filter((log) => getLogTime(log) > 0)
    .sort((a, b) => getLogTime(a) - getLogTime(b))
    .map((log, index) => {
      const kills = getLogMetricValue(log, 'kills');
      const deaths = getLogMetricValue(log, 'deaths');
      return {
        label: getLogLabel(log, index),
        kills,
        deaths,
        kd: kd(kills, deaths),
        damageDealt: getLogMetricValue(log, 'damageDealt'),
      };
    });
}

function buildEnemyGuildWarRows(
  stats = {},
  logs = [],
  daysAgo = DEFAULT_ENEMY_DAYS_AGO,
) {
  const safeDaysAgo = Math.max(0, num(daysAgo));
  const cutoffTime = safeDaysAgo
    ? Date.now() - safeDaysAgo * DAY_MS
    : 0;
  const warsByGuild = {};

  function addWar(name, kills, deaths, matchId) {
    const cleanName = cleanGuildName(name);
    if (!cleanName || !matchId) return;

    const key = `${cleanName}::${String(matchId)}`;

    warsByGuild[key] ||= {
      name: cleanName,
      matchId: String(matchId),
      kills: 0,
      deaths: 0,
    };

    warsByGuild[key].kills += Math.max(0, num(kills));
    warsByGuild[key].deaths += Math.max(0, num(deaths));
  }

  (logs || []).forEach((log) => {
    const logTime = getLogTime(log);
    if (!logTime || (cutoffTime && logTime < cutoffTime)) {
      return;
    }

    const summary = getSimpleSummary(log);
    const guilds = Array.isArray(summary?.guilds)
      ? summary.guilds
      : [];
    const matchId = String(
      log?.id || log?.date || log?.name || logTime,
    );

    guilds.forEach((guild) => {
      const name = cleanGuildName(guild?.name);
      if (!name) return;

      /*
       * Stored guild summaries use the opposite perspective:
       * guild.deaths = kills made by that enemy guild
       * guild.kills  = deaths suffered by that enemy guild
       */
      addWar(
        name,
        num(guild?.deaths),
        num(guild?.kills),
        matchId,
      );
    });
  });

  // Fallback for older data containing raw kill/death events only.
  if (!Object.keys(warsByGuild).length) {
    const events = Array.isArray(stats?.ev) ? stats.ev : [];

    events.forEach((event) => {
      const guildName = cleanGuildName(event?.guild);
      const eventTime = new Date(event?.date || '').getTime();

      if (
        !guildName ||
        !eventTime ||
        (cutoffTime && eventTime < cutoffTime)
      ) {
        return;
      }

      const matchId = String(
        event?.logId ||
          event?.warId ||
          event?.matchId ||
          event?.war ||
          event?.date ||
          '',
      );

      if (!matchId) return;

      if (event.type === 'death') {
        addWar(guildName, 1, 0, matchId);
      }

      if (event.type === 'kill') {
        addWar(guildName, 0, 1, matchId);
      }
    });
  }

  return Object.values(warsByGuild)
    .map((war) => ({
      ...war,
      totalInteractions:
        num(war.kills) + num(war.deaths),
    }))
    .filter(
      (war) =>
        war.name &&
        war.matchId &&
        num(war.totalInteractions) >= 0,
    );
}

function buildEnemyGuildRows(
  warRows = [],
  minInteractionsPerWar =
    DEFAULT_MIN_ENEMY_INTERACTIONS,
) {
  const threshold = Math.max(
    0,
    num(minInteractionsPerWar),
  );
  const byGuild = {};

  (warRows || [])
    .filter(
      (war) =>
        num(war.totalInteractions) >= threshold,
    )
    .forEach((war) => {
      const name = cleanGuildName(war.name);
      if (!name) return;

      byGuild[name] ||= {
        name,
        kills: 0,
        deaths: 0,
        matchIds: new Set(),
      };

      byGuild[name].kills += num(war.kills);
      byGuild[name].deaths += num(war.deaths);
      byGuild[name].matchIds.add(
        String(war.matchId),
      );
    });

  return Object.values(byGuild)
    .map((guild) => {
      const kills = num(guild.kills);
      const deaths = num(guild.deaths);
      const matches = guild.matchIds?.size || 0;
      const totalInteractions = kills + deaths;
      const kdNumber = kd(kills, deaths);

      return {
        name: guild.name,
        kills,
        deaths,
        totalInteractions,
        kdNumber,
        matches,
        score: kdNumber,
        tier: getTierByKd(kdNumber),
      };
    })
    .filter((guild) => guild.name && guild.matches > 0)
    .sort(
      (a, b) =>
        b.kdNumber - a.kdNumber ||
        b.totalInteractions - a.totalInteractions ||
        b.matches - a.matches ||
        a.name.localeCompare(b.name),
    );
}

function groupEnemyGuildRows(
  rows = [],
  minWars = DEFAULT_MIN_ENEMY_WARS,
) {
  const qualifiedRows = (rows || []).filter(
    (guild) =>
      num(guild.matches) >=
        Math.max(0, num(minWars)),
  );

  return ['S', 'A', 'B', 'C', 'D', 'Trash']
    .map((tier) => ({
      tier,
      meta: enemyTierMeta[tier],
      guilds: qualifiedRows.filter(
        (guild) => guild.tier === tier,
      ),
    }))
    .filter((group) => group.guilds.length > 0);
}

function topBy(rows, key, limit = 6) {
  return [...(rows || [])]
    .filter((row) => num(row?.[key]) > 0)
    .sort((a, b) => num(b[key]) - num(a[key]) || String(a.name).localeCompare(String(b.name)))
    .slice(0, limit);
}

function buildGuildData(stats, logs) {
  const players = Array.isArray(stats?.players) ? stats.players : [];
  const matches = uniqueLogCount(logs, stats);

  const kills = num(stats?.kills);
  const deaths = num(stats?.deaths);
  const ratio = kd(kills, deaths);

  const secondaryTotals = stats?.secondary?.totals || {};
  const playerDamageDealt = players.reduce((sum, player) => sum + num(player.damageDealt), 0);
  const playerDamageTaken = players.reduce((sum, player) => sum + num(player.damageTaken), 0);
  const playerCcHits = players.reduce((sum, player) => sum + num(player.ccHits), 0);
  const playerFortDamage = players.reduce((sum, player) => sum + num(player.fortDamage), 0);

  const damageDealt = num(secondaryTotals.damageDealt) || playerDamageDealt;
  const damageTaken = num(secondaryTotals.damageTaken) || playerDamageTaken;
  const ccHits = num(secondaryTotals.ccHits) || playerCcHits;
  const fortDamage = num(secondaryTotals.fortDamage) || playerFortDamage;

  const enrichedPlayers = players.map((player) => {
    const killsNumber = num(player.kills);
    const deathsNumber = num(player.deaths);
    return {
      ...player,
      kills: killsNumber,
      deaths: deathsNumber,
      kd: kd(killsNumber, deathsNumber),
      damageDealt: num(player.damageDealt),
      damageTaken: num(player.damageTaken),
      ccHits: num(player.ccHits),
      fortDamage: num(player.fortDamage),
    };
  });

  const rawTrendRows = buildRawTrendRows(logs);
  const rawCount = rawTrendRows.length;

  const avgKills = rawCount
    ? rawTrendRows.reduce((s, r) => s + num(r.kills), 0) / rawCount
    : 0;
  const avgDeaths = rawCount
    ? rawTrendRows.reduce((s, r) => s + num(r.deaths), 0) / rawCount
    : 0;
  const avgKd = rawCount
    ? rawTrendRows.reduce((s, r) => s + num(r.kd), 0) / rawCount
    : 0;
  const avgDamage = rawCount
    ? rawTrendRows.reduce((s, r) => s + num(r.damageDealt), 0) / rawCount
    : 0;

  return {
    matches,
    kills,
    deaths,
    kd: ratio,
    damageDealt,
    damageTaken,
    ccHits,
    fortDamage,
    avgKills,
    avgDeaths,
    avgKd,
    avgDamage,
    avgFortDamage: matches ? fortDamage / matches : 0,
    topKillers: topBy(enrichedPlayers, 'kills', 6),
    topDamagePlayers: topBy(enrichedPlayers, 'damageDealt', 6),
    metricBars: {
      matches: buildMetricBars(logs, 'matches'),
      kills: buildMetricBars(logs, 'kills'),
      deaths: buildMetricBars(logs, 'deaths'),
      kd: buildMetricBars(logs, 'kd'),
      damageDealt: buildMetricBars(logs, 'damageDealt'),
      ccHits: buildMetricBars(logs, 'ccHits'),
      fortDamage: buildMetricBars(logs, 'fortDamage'),
    },
    averageTrendRows: buildAverageTrendRows(logs),
    rawTrendRows,
  };
}

// ─── Sparkline trend chart (line + gradient fill, raw per-match values) ───────

const sparklineToneColors = {
  emerald: { line: '#34d399', gradFrom: 'rgba(52,211,153,0.30)',  gradTo: 'rgba(52,211,153,0)',  trendUp: '#34d399', trendDown: '#fb7185' },
  rose:    { line: '#fb7185', gradFrom: 'rgba(251,113,133,0.30)', gradTo: 'rgba(251,113,133,0)', trendUp: '#fb7185', trendDown: '#fb7185' },
  blue:    { line: '#60a5fa', gradFrom: 'rgba(96,165,250,0.30)',  gradTo: 'rgba(96,165,250,0)',  trendUp: '#60a5fa', trendDown: '#60a5fa' },
  amber:   { line: '#f59e0b', gradFrom: 'rgba(245,158,11,0.30)',  gradTo: 'rgba(245,158,11,0)',  trendUp: '#f59e0b', trendDown: '#f59e0b' },
  violet:  { line: '#a78bfa', gradFrom: 'rgba(167,139,250,0.30)', gradTo: 'rgba(167,139,250,0)', trendUp: '#a78bfa', trendDown: '#a78bfa' },
  cyan:    { line: '#22d3ee', gradFrom: 'rgba(34,211,238,0.30)',  gradTo: 'rgba(34,211,238,0)',  trendUp: '#22d3ee', trendDown: '#22d3ee' },
  slate:   { line: '#94a3b8', gradFrom: 'rgba(148,163,184,0.30)', gradTo: 'rgba(148,163,184,0)', trendUp: '#94a3b8', trendDown: '#94a3b8' },
};

// Smooth cubic bezier path through points
function smoothPath(points) {
  if (points.length < 2) return '';
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpX = (prev.x + curr.x) / 2;
    d += ` C ${cpX.toFixed(2)} ${prev.y.toFixed(2)}, ${cpX.toFixed(2)} ${curr.y.toFixed(2)}, ${curr.x.toFixed(2)} ${curr.y.toFixed(2)}`;
  }
  return d;
}

function TrendSparkline({ values = [], tone = 'blue', uid = '' }) {
  const colors = sparklineToneColors[tone] || sparklineToneColors.blue;
  const pts = values.map((v) => num(v));
  const gradId = `tspk-${tone}-${uid}`;
  const clipId = `tclip-${tone}-${uid}`;

  const W = 240;
  const H = 52;
  const padX = 6;
  const padY = 6;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  if (pts.length < 2) {
    const mid = H / 2;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: `${H}px` }} preserveAspectRatio="none">
        <line x1={padX} y1={mid} x2={W - padX} y2={mid} stroke={colors.line} strokeWidth="1.5" strokeOpacity="0.2" strokeDasharray="3 4" />
      </svg>
    );
  }

  const minVal = Math.min(...pts);
  const maxVal = Math.max(...pts);
  const range = Math.max(1, maxVal - minVal);

  const points = pts.map((v, i) => ({
    x: padX + (i / (pts.length - 1)) * innerW,
    y: padY + ((maxVal - v) / range) * innerH,
    v,
  }));

  const linePath = smoothPath(points);

  const last = points[points.length - 1];

  const areaPath =
    linePath +
    ` L ${last.x.toFixed(2)} ${(padY + innerH).toFixed(2)}` +
    ` L ${points[0].x.toFixed(2)} ${(padY + innerH).toFixed(2)} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: `${H}px` }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={colors.gradFrom} />
          <stop offset="100%" stopColor={colors.gradTo} />
        </linearGradient>
        <clipPath id={clipId}>
          <rect x={padX} y={padY} width={innerW} height={innerH} />
        </clipPath>
      </defs>

      {[0.25, 0.5, 0.75].map((r) => (
        <line
          key={r}
          x1={padX} x2={W - padX}
          y1={padY + r * innerH} y2={padY + r * innerH}
          stroke="rgba(148,163,184,0.07)"
          strokeWidth="1"
        />
      ))}

      <path d={areaPath} fill={`url(#${gradId})`} clipPath={`url(#${clipId})`} />

      <path
        d={linePath}
        fill="none"
        stroke={colors.line}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.95"
        style={{ pointerEvents: 'none' }}
      />

    </svg>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="rounded-[32px] border border-slate-800 bg-slate-950/70 p-8 text-center shadow-2xl">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-blue-400/20 bg-blue-500/10 text-blue-200">
        <Database size={30} />
      </div>
      <h3 className="text-2xl font-black text-white">No guild data yet</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-slate-400">
        Save battle logs first, then this Guild tab will generate all-time statistics automatically.
      </p>
    </div>
  );
}

// ─── MetricCard ───────────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'blue',
  accentBar = false,
  bars = [],
  compactCard = false,
  showIcon = true,
  sparklineValues = null,
  sparklineUid = '',
}) {
  const tones = {
    blue:    'border-blue-400/20 bg-blue-500/10 text-blue-200 shadow-blue-500/10',
    emerald: 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200 shadow-emerald-500/10',
    rose:    'border-rose-400/20 bg-rose-500/10 text-rose-200 shadow-rose-500/10',
    violet:  'border-violet-400/20 bg-violet-500/10 text-violet-200 shadow-violet-500/10',
    amber:   'border-amber-400/20 bg-amber-500/10 text-amber-200 shadow-amber-500/10',
    cyan:    'border-cyan-400/20 bg-cyan-500/10 text-cyan-200 shadow-cyan-500/10',
  };

  const accentBars = {
    blue:    'from-blue-500 to-sky-300',
    emerald: 'from-emerald-500 to-lime-300',
    rose:    'from-rose-500 to-red-300',
    violet:  'from-violet-500 to-fuchsia-300',
    amber:   'from-amber-500 to-yellow-300',
    cyan:    'from-cyan-500 to-cyan-200',
  };

  const chartBars = (Array.isArray(bars) ? bars : []).slice(-10);
  const filledBars = [
    ...Array.from({ length: Math.max(0, 10 - chartBars.length) }, () => 0),
    ...chartBars,
  ].slice(-10);
  const maxBar = Math.max(1, ...filledBars.map((bar) => Math.abs(num(bar))));
  const chartHeight = compactCard ? 54 : 88;

  const hasSparkline = Array.isArray(sparklineValues) && sparklineValues.length > 0;

  return (
    <div
      className={cls(
        'relative rounded-[26px] border shadow-2xl',
        compactCard ? 'min-h-[82px] p-2.5' : 'min-h-[124px] p-3.5',
        accentBar && !hasSparkline && 'overflow-hidden pr-28',
        tones[tone],
      )}
    >
      {accentBar && !hasSparkline && (
        <div
          className="absolute bottom-2 right-3 flex w-24 items-end justify-end gap-1"
          style={{ height: `${chartHeight}px` }}
        >
          {filledBars.map((bar, index) => {
            const valueNumber = Math.abs(num(bar));
            const height = valueNumber ? Math.max(7, (valueNumber / maxBar) * chartHeight) : 3;
            return (
              <span
                key={`${index}-${valueNumber}`}
                title={compact(bar)}
                className={cls(
                  'w-1.5 rounded-full bg-gradient-to-t shadow-lg transition-all duration-200 hover:z-10 hover:-translate-y-1 hover:scale-x-125 hover:scale-y-110 hover:opacity-100 hover:shadow-[0_0_22px_rgba(255,255,255,0.55)]',
                  accentBars[tone] || accentBars.blue,
                )}
                style={{
                  height: `${height}px`,
                  opacity: valueNumber ? 0.58 + index * 0.035 : 0.18,
                }}
              />
            );
          })}
        </div>
      )}

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
          <p className={cls('font-black text-white', compactCard ? 'mt-0.5 text-xl' : 'mt-1 text-2xl')}>{value}</p>
          {sub && <p className="mt-0.5 text-[11px] font-bold text-slate-400">{sub}</p>}
        </div>
        {!accentBar && showIcon && Icon && (
          <div className="rounded-2xl border border-white/10 bg-white/10 p-2.5">
            <Icon size={compactCard ? 18 : 22} />
          </div>
        )}
      </div>

      {/* ── Trend sparkline ── */}
      {hasSparkline && (
        <div className="mt-2 -mx-0.5">
          <TrendSparkline
            values={sparklineValues}
            tone={tone}
            uid={sparklineUid}
          />
        </div>
      )}
    </div>
  );
}

// ─── Panel / SectionTitle ──────────────────────────────────────────────────────

function Panel({ children, className = '' }) {
  return (
    <section className={cls('rounded-[30px] border border-slate-800 bg-slate-950/70 p-5 shadow-2xl', className)}>
      {children}
    </section>
  );
}

function SectionTitle({ icon: Icon, title, sub }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <h3 className="flex items-center gap-2 text-xl font-black text-white">
          <Icon size={20} className="text-blue-300" />
          {title}
        </h3>
        {sub && <p className="mt-1 text-xs font-bold text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

// ─── GuildTierProgressRow ──────────────────────────────────────────────────────

function GuildTierProgressRow({
  guild,
  maxScore,
  tone = 'blue',
}) {
  const width = maxScore
    ? Math.max(
        5,
        Math.min(
          100,
          (num(guild.kdNumber) / maxScore) * 100,
        ),
      )
    : 0;

  const colors = {
    blue: 'from-blue-500 to-sky-300',
    emerald: 'from-emerald-500 to-lime-300',
    amber: 'from-amber-500 to-yellow-300',
    rose: 'from-rose-500 to-red-300',
    violet: 'from-violet-500 to-fuchsia-300',
    slate: 'from-slate-500 to-slate-300',
  };

  return (
    <div className="relative z-0 rounded-xl border border-slate-800 bg-slate-950/70 p-2 shadow-lg hover:z-[999]">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p
          className="min-w-0 truncate text-xs font-black text-white"
          title={guild.name}
        >
          {guild.name}
        </p>

        <span className="rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2 py-0.5 text-[9px] font-black text-cyan-200">
          K/D {decimal(guild.kdNumber, 2)}
        </span>
      </div>

      <div className="group/bar relative h-2.5 rounded-full bg-slate-900/90">
        <div
          className={cls(
            'h-2.5 rounded-full bg-gradient-to-r',
            colors[tone] || colors.blue,
          )}
          style={{ width: `${width}%` }}
        />

        <div className="pointer-events-none absolute left-1/2 top-full z-[9999] mt-3 w-max max-w-[360px] -translate-x-1/2 rounded-2xl border border-slate-700 bg-slate-950/95 px-4 py-3 text-xs font-black text-slate-200 opacity-0 shadow-2xl backdrop-blur-xl transition group-hover/bar:opacity-100">
          <div className="grid grid-cols-5 gap-4 text-center">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-blue-300/80">
                Wars
              </p>
              <p>{compact(guild.matches, 0)}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-emerald-300/80">
                K
              </p>
              <p>{compact(guild.kills)}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-rose-300/80">
                D
              </p>
              <p>{compact(guild.deaths)}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-violet-300/80">
                K+D
              </p>
              <p>{compact(guild.totalInteractions)}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-cyan-300/80">
                K/D
              </p>
              <p>{decimal(guild.kdNumber)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── EnemyGuildTierList ───────────────────────────────────────────────────────

function EnemyGuildTierList({ stats, logs }) {
  const [minWars, setMinWars] = useState(
    DEFAULT_MIN_ENEMY_WARS,
  );
  const [minInteractions, setMinInteractions] = useState(
    DEFAULT_MIN_ENEMY_INTERACTIONS,
  );
  const [daysAgo, setDaysAgo] = useState(
    DEFAULT_ENEMY_DAYS_AGO,
  );

  const warRows = useMemo(
    () =>
      buildEnemyGuildWarRows(
        stats || {},
        logs || [],
        daysAgo,
      ),
    [stats, logs, daysAgo],
  );

  const rows = useMemo(
    () =>
      buildEnemyGuildRows(
        warRows,
        minInteractions,
      ),
    [warRows, minInteractions],
  );

  const groups = useMemo(
    () =>
      groupEnemyGuildRows(
        rows,
        minWars,
      ),
    [rows, minWars],
  );

  const qualifiedGuilds = groups.flatMap(
    (group) => group.guilds,
  );
  const hasGuilds = qualifiedGuilds.length > 0;
  const maxScore = Math.max(
    1,
    ...qualifiedGuilds.map((guild) =>
      num(guild.kdNumber),
    ),
  );
  const rawWarCounts = warRows.reduce(
    (counts, war) => {
      const name = cleanGuildName(war.name);
      if (name) {
        counts[name] = (counts[name] || 0) + 1;
      }
      return counts;
    },
    {},
  );

  const maxWars = Math.max(
    1,
    ...Object.values(rawWarCounts).map((value) =>
      num(value),
    ),
  );

  const largestSingleWarInteractions = Math.max(
    DEFAULT_MIN_ENEMY_INTERACTIONS,
    ...warRows.map((war) =>
      num(war.totalInteractions),
    ),
  );

  const maxInteractions = Math.max(
    100,
    Math.ceil(
      largestSingleWarInteractions / 50,
    ) * 50,
  );

  const scrollClass =
    '[scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700/80';

  function resetFilters() {
    setMinWars(DEFAULT_MIN_ENEMY_WARS);
    setMinInteractions(
      DEFAULT_MIN_ENEMY_INTERACTIONS,
    );
    setDaysAgo(DEFAULT_ENEMY_DAYS_AGO);
  }

  return (
    <Panel className="p-3">
      <SectionTitle
        icon={Trophy}
        title="Enemy Guild Tier List"
        sub="Per-war activity filter • Guild totals use qualifying wars only • Ranked by aggregate enemy K/D"
      />

      <div className="mb-3 rounded-2xl border border-slate-800 bg-slate-950/55 p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.1em] text-white">
              Tier List Filters
            </p>
            <p className="mt-1 text-[9px] font-bold text-slate-500">
              Kills + Deaths is checked on every Node War before guild totals and K/D are calculated.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-black text-slate-300">
              {qualifiedGuilds.length} guilds
            </span>

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.08em] text-slate-300 transition hover:border-blue-400/50 hover:text-white"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_1.35fr_190px]">
          <label className="rounded-xl border border-slate-800 bg-slate-950/65 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[9px] font-black uppercase tracking-[0.07em] text-blue-300">
                Minimum Node Wars
              </span>
              <span className="text-sm font-black tabular-nums text-white">
                {minWars}
              </span>
            </div>

            <input
              type="range"
              min="1"
              max={maxWars}
              step="1"
              value={Math.min(minWars, maxWars)}
              onChange={(event) =>
                setMinWars(
                  Math.max(1, num(event.target.value)),
                )
              }
              className="h-1.5 w-full cursor-pointer"
              style={{ accentColor: '#60a5fa' }}
            />
          </label>

          <label className="rounded-xl border border-slate-800 bg-slate-950/65 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[9px] font-black uppercase tracking-[0.07em] text-violet-300">
                Minimum Kills + Deaths / Node War
              </span>
              <span className="text-sm font-black tabular-nums text-white">
                {compact(minInteractions, 0)}
              </span>
            </div>

            <input
              type="range"
              min="0"
              max={maxInteractions}
              step="10"
              value={Math.min(
                minInteractions,
                maxInteractions,
              )}
              onChange={(event) =>
                setMinInteractions(
                  Math.max(0, num(event.target.value)),
                )
              }
              className="h-1.5 w-full cursor-pointer"
              style={{ accentColor: '#a78bfa' }}
            />
          </label>

          <label className="rounded-xl border border-slate-800 bg-slate-950/65 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-[9px] font-black uppercase tracking-[0.07em] text-cyan-300">
                Days Ago
              </span>
              <span className="text-[9px] font-bold text-slate-500">
                0 = all time
              </span>
            </div>

            <input
              type="number"
              min="0"
              max="3650"
              step="1"
              value={daysAgo}
              onChange={(event) =>
                setDaysAgo(
                  Math.max(
                    0,
                    Math.min(
                      3650,
                      num(event.target.value),
                    ),
                  ),
                )
              }
              className="h-8 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm font-black tabular-nums text-white outline-none transition focus:border-cyan-400"
            />
          </label>
        </div>
      </div>

      {!hasGuilds ? (
        <p className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-4 text-sm font-bold text-slate-500">
          No enemy guild has enough qualifying Node Wars
          after applying the per-war Kills + Deaths and date requirements.
        </p>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <div
              key={group.tier}
              className={cls(
                'grid gap-2 rounded-[20px] border p-2 shadow-xl lg:grid-cols-[62px_1fr]',
                group.meta.className,
              )}
            >
              <div className="flex items-center gap-2 lg:flex-col lg:items-center lg:justify-center">
                <div
                  className={cls(
                    'flex h-11 w-11 items-center justify-center rounded-xl border text-2xl font-black',
                    group.meta.badge,
                  )}
                >
                  {group.meta.label}
                </div>

                <div className="min-w-0 lg:text-center">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                    {group.tier === 'Trash'
                      ? 'Trash'
                      : 'Tier'}
                  </p>
                  <p className="mt-0.5 text-[8px] font-bold text-slate-500">
                    {group.meta.range}
                  </p>
                </div>
              </div>

              <div
                className={cls(
                  'grid gap-2 sm:grid-cols-2 xl:grid-cols-4',
                  group.guilds.length > 16 &&
                    `max-h-[330px] overflow-y-auto pr-1 ${scrollClass}`,
                )}
              >
                {group.guilds.map((guild) => (
                  <GuildTierProgressRow
                    key={guild.name}
                    guild={guild}
                    maxScore={maxScore}
                    tone={group.meta.tone}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

// ─── Arsenal ──────────────────────────────────────────────────────────────────

function Arsenal({ data, stats, logs }) {
  const rawRows = data.rawTrendRows || [];

  // Raw per-match values for each sparkline
  const sparkKills  = rawRows.map((r) => num(r.kills));
  const sparkDeaths = rawRows.map((r) => num(r.deaths));
  const sparkKd     = rawRows.map((r) => num(r.kd));
  const sparkDamage = rawRows.map((r) => num(r.damageDealt));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <MetricCard
          label="Node Wars"
          value={compact(data.matches)}
          tone="blue"
          showIcon={false}
        />
        <MetricCard
          icon={Swords}
          label="Kills"
          value={compact(data.kills)}
          sub="All-time"
          tone="emerald"
          accentBar
          bars={data.metricBars.kills}
        />
        <MetricCard
          icon={Skull}
          label="Deaths"
          value={compact(data.deaths)}
          sub="All-time"
          tone="rose"
          accentBar
          bars={data.metricBars.deaths}
        />
        <MetricCard
          icon={Gauge}
          label="K/D"
          value={decimal(data.kd)}
          sub="Ratio"
          tone="blue"
          accentBar
          bars={data.metricBars.kd}
        />
        <MetricCard
          icon={Zap}
          label="Damage"
          value={compact(data.damageDealt)}
          sub="Dealt"
          tone="amber"
          accentBar
          bars={data.metricBars.damageDealt}
        />
        <MetricCard
          icon={Crosshair}
          label="CC"
          value={compact(data.ccHits)}
          sub="Hits"
          tone="cyan"
          accentBar
          bars={data.metricBars.ccHits}
        />
        <MetricCard
          icon={Castle}
          label="Fort"
          value={compact(data.fortDamage)}
          sub="Damage"
          tone="violet"
          accentBar
          bars={data.metricBars.fortDamage}
        />
      </div>

      <Panel className="p-3">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-black text-white">
              <Activity size={18} className="text-blue-300" />
              Averages
            </h3>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard
            label="Avg Kills"
            value={compact(data.avgKills)}
            sub="Per match"
            tone="emerald"
            compactCard
            showIcon={false}
            sparklineValues={sparkKills}
            sparklineUid="kills"
          />
          <MetricCard
            label="Avg Deaths"
            value={compact(data.avgDeaths)}
            sub="Per match"
            tone="rose"
            compactCard
            showIcon={false}
            sparklineValues={sparkDeaths}
            sparklineUid="deaths"
          />
          <MetricCard
            label="Avg K/D"
            value={decimal(data.avgKd)}
            sub="Per match"
            tone="blue"
            compactCard
            showIcon={false}
            sparklineValues={sparkKd}
            sparklineUid="kd"
          />
          <MetricCard
            label="Avg Damage"
            value={compact(data.avgDamage)}
            sub="Per match"
            tone="amber"
            compactCard
            showIcon={false}
            sparklineValues={sparkDamage}
            sparklineUid="damage"
          />
        </div>
      </Panel>

      <EnemyGuildTierList stats={stats} logs={logs} />
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function Guild({ stats, logs }) {
  const data = useMemo(() => buildGuildData(stats || {}, logs || []), [stats, logs]);
  const hasData = data.kills > 0 || data.deaths > 0 || data.matches > 0;
  return (
    <div>
      {hasData ? (
        <Arsenal
          data={data}
          stats={stats || {}}
          logs={logs || []}
        />
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
