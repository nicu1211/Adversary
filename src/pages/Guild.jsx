import React, { useMemo } from 'react';
import {
  Activity,
  Castle,
  Crosshair,
  Gauge,
  Skull,
  Swords,
  Trophy,
  Zap,
} from 'lucide-react';
import { calculateStats, dateOf } from '../lib/logUtils';

const nf = new Intl.NumberFormat('en-US');

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

function safeDateOf(log) {
  try {
    return dateOf(log);
  } catch {
    return (
      log?.date ||
      log?.warDate ||
      log?.war_date ||
      log?.createdAt ||
      log?.created_at ||
      ''
    );
  }
}

function uniqueLogCount(logs = [], stats = {}) {
  const fromLogs = new Set(
    (logs || [])
      .map((log) => String(log?.id || safeDateOf(log) || log?.name || ''))
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
  const secondaryRows = Array.isArray(stats?.secondary?.rows) ? stats.secondary.rows : [];

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
      .map((log) => String(log?.id || safeDateOf(log) || log?.name || ''))
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

function getTierByScore(value) {
  const score = num(value);

  if (score >= 50) return 'S';
  if (score >= 40) return 'A';
  if (score >= 30) return 'B';
  if (score >= 20) return 'C';
  if (score >= 15) return 'D';

  return 'Trash';
}

function enemyGuildScore({ kills, deaths, matches, kdNumber }) {
  const kdScore = (Math.min(3, Math.max(0, kdNumber)) / 3) * 65;
  const deathVolumeScore = (Math.min(400, Math.max(0, deaths)) / 400) * 15;
  const matchVolumeScore = (Math.min(30, Math.max(0, matches)) / 30) * 15;
  const pressureScore = (Math.max(0, deaths - kills) / Math.max(1, deaths, kills)) * 5;

  return Math.round((kdScore + deathVolumeScore + matchVolumeScore + pressureScore) * 10) / 10;
}

const enemyTierMeta = {
  S: {
    label: 'S',
    range: '50+ score',
    className:
      'border-amber-300/35 bg-amber-500/15 text-amber-100 shadow-amber-500/10',
    badge: 'border-amber-300/40 bg-amber-400/20 text-amber-100',
    tone: 'amber',
  },
  A: {
    label: 'A',
    range: '40 - 50 score',
    className:
      'border-emerald-300/30 bg-emerald-500/12 text-emerald-100 shadow-emerald-500/10',
    badge: 'border-emerald-300/35 bg-emerald-400/18 text-emerald-100',
    tone: 'emerald',
  },
  B: {
    label: 'B',
    range: '30 - 40 score',
    className:
      'border-blue-300/25 bg-blue-500/10 text-blue-100 shadow-blue-500/10',
    badge: 'border-blue-300/35 bg-blue-400/15 text-blue-100',
    tone: 'blue',
  },
  C: {
    label: 'C',
    range: '20 - 30 score',
    className:
      'border-violet-300/25 bg-violet-500/10 text-violet-100 shadow-violet-500/10',
    badge: 'border-violet-300/35 bg-violet-400/15 text-violet-100',
    tone: 'violet',
  },
  D: {
    label: 'D',
    range: '15 - 20 score',
    className:
      'border-rose-300/25 bg-rose-500/10 text-rose-100 shadow-rose-500/10',
    badge: 'border-rose-300/35 bg-rose-400/15 text-rose-100',
    tone: 'rose',
  },
  Trash: {
    label: 'T',
    range: 'Under 15 score',
    className:
      'border-slate-600/40 bg-slate-800/35 text-slate-200 shadow-slate-950/20',
    badge: 'border-slate-500/40 bg-slate-700/60 text-slate-200',
    tone: 'slate',
  },
};

function getLogTime(log) {
  const raw =
    safeDateOf(log) ||
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

function getParsedSingleLogStats(log) {
  const raw = String(log?.raw || '').trim();

  if (!raw) return null;

  try {
    return calculateStats([
      {
        ...log,
        date: safeDateOf(log),
      },
    ]);
  } catch {
    return null;
  }
}

function getLogMetricValue(log, key) {
  const parsedStats = getParsedSingleLogStats(log);
  const summary = getSimpleSummary(log);
  const players = Array.isArray(parsedStats?.players)
    ? parsedStats.players
    : Array.isArray(summary?.players)
      ? summary.players
      : [];

  const secondaryTotals = parsedStats?.secondary?.totals || summary?.secondary?.totals || {};

  if (key === 'matches') return 1;

  if (key === 'kills') {
    return parsedStats ? num(parsedStats.kills) : num(summary?.kills);
  }

  if (key === 'deaths') {
    return parsedStats ? num(parsedStats.deaths) : num(summary?.deaths);
  }

  if (key === 'kd') {
    const kills = parsedStats ? num(parsedStats.kills) : num(summary?.kills);
    const deaths = parsedStats ? num(parsedStats.deaths) : num(summary?.deaths);
    return kd(kills, deaths);
  }

  if (key === 'damageDealt') {
    return num(secondaryTotals.damageDealt) || sumPlayerMetric(players, 'damageDealt');
  }

  if (key === 'damageTaken') {
    return num(secondaryTotals.damageTaken) || sumPlayerMetric(players, 'damageTaken');
  }

  if (key === 'ccHits') {
    return num(secondaryTotals.ccHits) || sumPlayerMetric(players, 'ccHits');
  }

  if (key === 'fortDamage') {
    return num(secondaryTotals.fortDamage) || sumPlayerMetric(players, 'fortDamage');
  }

  return 0;
}

function getLogLabel(log, index) {
  const raw = String(
    safeDateOf(log) ||
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

function buildAverageMatchRows(logs = []) {
  return [...(logs || [])]
    .map((log, index) => {
      const kills = getLogMetricValue(log, 'kills');
      const deaths = getLogMetricValue(log, 'deaths');
      const damageDealt = getLogMetricValue(log, 'damageDealt');

      return {
        label: getLogLabel(log, index),
        time: getLogTime(log),
        kills,
        deaths,
        kd: kd(kills, deaths),
        damageDealt,
      };
    })
    .filter((row) => row.kills > 0 || row.deaths > 0 || row.damageDealt > 0 || row.time > 0);
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

function buildAverageTrendRows(logs = []) {
  const sortedLogs = [...(logs || [])]
    .filter((log) => getLogTime(log) > 0)
    .sort((a, b) => getLogTime(a) - getLogTime(b));

  let matches = 0;
  let kills = 0;
  let deaths = 0;
  let kdTotal = 0;
  let damageDealt = 0;

  return sortedLogs.map((log, index) => {
    const matchKills = getLogMetricValue(log, 'kills');
    const matchDeaths = getLogMetricValue(log, 'deaths');
    const matchKd = kd(matchKills, matchDeaths);
    const matchDamage = getLogMetricValue(log, 'damageDealt');

    matches += 1;
    kills += matchKills;
    deaths += matchDeaths;
    kdTotal += matchKd;
    damageDealt += matchDamage;

    return {
      label: getLogLabel(log, index),
      avgKills: matches ? kills / matches : 0,
      avgDeaths: matches ? deaths / matches : 0,
      avgKd: matches ? kdTotal / matches : 0,
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

function buildEnemyGuildTiers(stats = {}, logs = []) {
  const latestTime = getLatestLogTime(logs);
  const cutoffTime = latestTime - 45 * 24 * 60 * 60 * 1000;
  const byGuild = {};

  (logs || []).forEach((log) => {
    const logTime = getLogTime(log);
    if (!logTime || logTime < cutoffTime) return;

    const summary = getSimpleSummary(log);
    const guilds = Array.isArray(summary?.guilds) ? summary.guilds : [];
    const matchId = String(log?.id || safeDateOf(log) || log?.name || logTime);

    guilds.forEach((guild) => {
      const name = cleanGuildName(guild?.name);
      if (!name) return;

      byGuild[name] ||= { name, kills: 0, deaths: 0, matchIds: new Set() };
      byGuild[name].kills += num(guild?.kills);
      byGuild[name].deaths += num(guild?.deaths);
      byGuild[name].matchIds.add(matchId);
    });
  });

  if (!Object.keys(byGuild).length) {
    const events = Array.isArray(stats?.ev) ? stats.ev : [];
    const eventTimes = events
      .map((event) => new Date(event?.date || '').getTime())
      .filter((time) => time > 0);

    const eventLatestTime = eventTimes.length ? Math.max(...eventTimes) : Date.now();
    const eventCutoffTime = eventLatestTime - 45 * 24 * 60 * 60 * 1000;

    events.forEach((event) => {
      const guildName = cleanGuildName(event?.guild);
      const eventTime = new Date(event?.date || '').getTime();

      if (!guildName || !eventTime || eventTime < eventCutoffTime) return;

      byGuild[guildName] ||= { name: guildName, kills: 0, deaths: 0, matchIds: new Set() };

      if (event.type === 'kill') byGuild[guildName].kills += 1;
      if (event.type === 'death') byGuild[guildName].deaths += 1;

      byGuild[guildName].matchIds.add(String(event?.id || event?.date || guildName));
    });
  }

  const rows = Object.values(byGuild)
    .map((guild) => {
      const kills = num(guild.kills);
      const deaths = num(guild.deaths);
      const matches = guild.matchIds?.size || 0;
      const totalInteractions = kills + deaths;
      const kdNumber = kills > 0 ? deaths / kills : deaths > 0 ? deaths : 0;
      const score = enemyGuildScore({ kills, deaths, matches, kdNumber });

      return {
        name: guild.name,
        kills,
        deaths,
        totalInteractions,
        kdNumber,
        matches,
        score,
        tier: 'D',
      };
    })
    .filter((guild) => guild.name && guild.totalInteractions >= 30)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.kdNumber - a.kdNumber ||
        b.matches - a.matches ||
        b.deaths - a.deaths ||
        a.name.localeCompare(b.name),
    );

  const tieredRows = rows.map((guild) => ({
    ...guild,
    tier: getTierByScore(guild.score),
  }));

  return ['S', 'A', 'B', 'C', 'D', 'Trash']
    .map((tier) => ({
      tier,
      meta: enemyTierMeta[tier],
      guilds: tieredRows.filter((guild) => guild.tier === tier),
    }))
    .filter((group) => group.guilds.length > 0);
}

function topBy(rows, key, limit = 6) {
  return [...(rows || [])]
    .filter((row) => num(row?.[key]) > 0)
    .sort(
      (a, b) =>
        num(b[key]) - num(a[key]) ||
        String(a.name).localeCompare(String(b.name)),
    )
    .slice(0, limit);
}

function buildGuildData(stats, logs) {
  const players = Array.isArray(stats?.players) ? stats.players : [];
  const matches = uniqueLogCount(logs, stats);
  const averageRows = buildAverageMatchRows(logs);

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

  const averageMatches = averageRows.length || matches;
  const averageKillsTotal = averageRows.length
    ? averageRows.reduce((sum, row) => sum + num(row.kills), 0)
    : kills;
  const averageDeathsTotal = averageRows.length
    ? averageRows.reduce((sum, row) => sum + num(row.deaths), 0)
    : deaths;
  const averageDamageTotal = averageRows.length
    ? averageRows.reduce((sum, row) => sum + num(row.damageDealt), 0)
    : damageDealt;
  const averageKdTotal = averageRows.reduce((sum, row) => sum + num(row.kd), 0);

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

  return {
    matches,
    kills,
    deaths,
    kd: ratio,
    damageDealt,
    damageTaken,
    ccHits,
    fortDamage,

    avgKills: averageMatches ? averageKillsTotal / averageMatches : 0,
    avgDeaths: averageMatches ? averageDeathsTotal / averageMatches : 0,
    avgKd: averageRows.length
      ? averageKdTotal / averageRows.length
      : matches
        ? kd(kills / matches, deaths / matches)
        : ratio,
    avgDamage: averageMatches ? averageDamageTotal / averageMatches : 0,
    avgFortDamage: matches ? fortDamage / matches : 0,
    avgSecondaryDamage: uniqueSecondaryLogCount(logs, stats)
      ? damageDealt / uniqueSecondaryLogCount(logs, stats)
      : 0,

    topKillers: topBy(enrichedPlayers, 'kills', 6),
    topDamagePlayers: topBy(enrichedPlayers, 'damageDealt', 6),
    enemyTierGroups: buildEnemyGuildTiers(stats, logs),

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

    // Raw per-match values for sparkline trend charts
    rawTrendRows,
  };
}

// ─── Sparkline trend chart (line + gradient fill, raw per-match values) ───────
const sparklineToneColors = {
  emerald: {
    line: '#34d399',
    gradFrom: 'rgba(52,211,153,0.30)',
    gradTo: 'rgba(52,211,153,0)',
    trendUp: '#34d399',
    trendDown: '#fb7185',
  },
  rose: {
    line: '#fb7185',
    gradFrom: 'rgba(251,113,133,0.30)',
    gradTo: 'rgba(251,113,133,0)',
    trendUp: '#fb7185',
    trendDown: '#fb7185',
  },
  blue: {
    line: '#60a5fa',
    gradFrom: 'rgba(96,165,250,0.30)',
    gradTo: 'rgba(96,165,250,0)',
    trendUp: '#60a5fa',
    trendDown: '#60a5fa',
  },
  amber: {
    line: '#f59e0b',
    gradFrom: 'rgba(245,158,11,0.30)',
    gradTo: 'rgba(245,158,11,0)',
    trendUp: '#f59e0b',
    trendDown: '#f59e0b',
  },
  violet: {
    line: '#a78bfa',
    gradFrom: 'rgba(167,139,250,0.30)',
    gradTo: 'rgba(167,139,250,0)',
    trendUp: '#a78bfa',
    trendDown: '#a78bfa',
  },
  cyan: {
    line: '#22d3ee',
    gradFrom: 'rgba(34,211,238,0.30)',
    gradTo: 'rgba(34,211,238,0)',
    trendUp: '#22d3ee',
    trendDown: '#22d3ee',
  },
  slate: {
    line: '#94a3b8',
    gradFrom: 'rgba(148,163,184,0.30)',
    gradTo: 'rgba(148,163,184,0)',
    trendUp: '#94a3b8',
    trendDown: '#94a3b8',
  },
};

function smoothPath(points) {
  if (points.length < 2) return '';

  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

  for (let i = 1; i < points.length; i += 1) {
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
      <svg viewBox={`0 0 ${W} ${H}`} className="h-14 w-full overflow-visible">
        <defs>
          <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={colors.gradFrom} />
            <stop offset="100%" stopColor={colors.gradTo} />
          </linearGradient>
        </defs>
        <circle cx={W / 2} cy={mid} r="3.5" fill={colors.line} />
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
    <svg viewBox={`0 0 ${W} ${H}`} className="h-14 w-full overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={colors.gradFrom} />
          <stop offset="100%" stopColor={colors.gradTo} />
        </linearGradient>
        <clipPath id={clipId}>
          <rect x="0" y="0" width={W} height={H} rx="8" />
        </clipPath>
      </defs>

      {[0.25, 0.5, 0.75].map((r) => (
        <line
          key={r}
          x1={padX}
          x2={W - padX}
          y1={padY + innerH * r}
          y2={padY + innerH * r}
          stroke="rgba(148,163,184,0.12)"
          strokeWidth="1"
        />
      ))}

      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={colors.line}
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last.x} cy={last.y} r="3.5" fill={colors.line} />
    </svg>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-8 text-center shadow-2xl shadow-black/20">
      <h3 className="text-lg font-black text-white">No guild data yet</h3>
      <p className="mt-2 text-sm font-semibold text-slate-500">
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
    blue: 'border-blue-400/20 bg-blue-500/10 text-blue-200 shadow-blue-500/10',
    emerald:
      'border-emerald-400/20 bg-emerald-500/10 text-emerald-200 shadow-emerald-500/10',
    rose: 'border-rose-400/20 bg-rose-500/10 text-rose-200 shadow-rose-500/10',
    violet:
      'border-violet-400/20 bg-violet-500/10 text-violet-200 shadow-violet-500/10',
    amber:
      'border-amber-400/20 bg-amber-500/10 text-amber-200 shadow-amber-500/10',
    cyan: 'border-cyan-400/20 bg-cyan-500/10 text-cyan-200 shadow-cyan-500/10',
  };

  const accentBars = {
    blue: 'from-blue-500 to-sky-300',
    emerald: 'from-emerald-500 to-lime-300',
    rose: 'from-rose-500 to-red-300',
    violet: 'from-violet-500 to-fuchsia-300',
    amber: 'from-amber-500 to-yellow-300',
    cyan: 'from-cyan-500 to-cyan-200',
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
        'relative overflow-hidden rounded-3xl border p-4 shadow-xl',
        tones[tone] || tones.blue,
        compactCard ? 'min-h-[130px]' : 'min-h-[172px]',
      )}
    >
      {accentBar && !hasSparkline && (
        <div className="absolute inset-x-3 bottom-3 flex h-[92px] items-end gap-1 opacity-70">
          {filledBars.map((bar, index) => {
            const valueNumber = Math.abs(num(bar));
            const height = valueNumber ? Math.max(7, (valueNumber / maxBar) * chartHeight) : 3;

            return (
              <div
                key={index}
                className={cls(
                  'flex-1 rounded-t-full bg-gradient-to-t',
                  accentBars[tone] || accentBars.blue,
                )}
                style={{ height }}
              />
            );
          })}
        </div>
      )}

      <div className="relative z-10">
        <div className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
          {label}
        </div>

        <div className="mt-2 text-3xl font-black text-white">{value}</div>

        {sub && <div className="mt-1 text-xs font-bold text-slate-500">{sub}</div>}

        {!accentBar && showIcon && Icon && (
          <div className="absolute right-0 top-0 rounded-2xl border border-white/10 bg-white/5 p-2">
            <Icon size={20} />
          </div>
        )}

        {hasSparkline && (
          <div className="mt-3">
            <TrendSparkline values={sparklineValues} tone={tone} uid={sparklineUid} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Panel / SectionTitle ──────────────────────────────────────────────────────
function Panel({ children, className = '' }) {
  return (
    <div
      className={cls(
        'rounded-3xl border border-slate-800 bg-slate-950/70 shadow-2xl shadow-black/20',
        className,
      )}
    >
      {children}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, sub }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 p-2 text-blue-200">
        <Icon size={18} />
      </div>

      <div>
        <h3 className="text-lg font-black text-white">{title}</h3>
        {sub && <p className="text-xs font-bold text-slate-500">{sub}</p>}
      </div>
    </div>
  );
}

// ─── GuildTierProgressRow ──────────────────────────────────────────────────────
function GuildTierProgressRow({ guild, maxScore, tone = 'blue' }) {
  const width = maxScore
    ? Math.max(5, Math.min(100, (num(guild.score) / maxScore) * 100))
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
    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/55 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0 truncate text-sm font-black text-white">{guild.name}</div>

        <div className="text-xs font-black text-slate-300">{decimal(guild.score, 1)}</div>
      </div>

      <div className="mb-2 h-2 overflow-hidden rounded-full bg-slate-900">
        <div
          className={cls('h-full rounded-full bg-gradient-to-r', colors[tone] || colors.blue)}
          style={{ width: `${width}%` }}
        />
      </div>

      <div className="grid grid-cols-4 gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        <div>
          M
          <div className="text-xs text-slate-200">{compact(guild.matches, 0)}</div>
        </div>

        <div>
          K
          <div className="text-xs text-emerald-200">{compact(guild.deaths)}</div>
        </div>

        <div>
          D
          <div className="text-xs text-rose-200">{compact(guild.kills)}</div>
        </div>

        <div>
          K/D
          <div className="text-xs text-blue-200">{decimal(guild.kdNumber)}</div>
        </div>
      </div>
    </div>
  );
}

// ─── EnemyGuildTierList ───────────────────────────────────────────────────────
function EnemyGuildTierList({ groups }) {
  const scrollClass =
    '[scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700/80';

  const hasGuilds = groups.some((group) => group.guilds.length > 0);
  const maxScore = Math.max(
    1,
    ...groups.flatMap((group) => group.guilds.map((guild) => num(guild.score))),
  );

  return (
    <Panel className="p-4">
      <SectionTitle
        icon={Trophy}
        title="Enemy Guild Tier List"
        sub="Last 45 days · minimum 30 K+D"
      />

      {!hasGuilds ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/45 p-5 text-sm font-bold text-slate-500">
          No enemy guild reached 30 K+D in the last 45 days.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-3">
          {groups.map((group) => (
            <div
              key={group.tier}
              className={cls(
                'rounded-3xl border p-4 shadow-xl',
                group.meta.className,
              )}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={cls(
                      'flex h-9 w-9 items-center justify-center rounded-2xl border text-lg font-black',
                      group.meta.badge,
                    )}
                  >
                    {group.meta.label}
                  </span>

                  {group.tier !== 'Trash' && (
                    <span className="text-sm font-black uppercase tracking-[0.14em]">
                      Tier
                    </span>
                  )}
                </div>

                <span className="text-xs font-black text-slate-400">
                  {group.meta.range}
                </span>
              </div>

              {group.guilds.length ? (
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
              ) : (
                <div className="flex min-h-[48px] items-center rounded-xl border border-slate-800 bg-slate-950/45 px-3 text-xs font-bold text-slate-500">
                  No guilds in this tier.
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

// ─── Arsenal ──────────────────────────────────────────────────────────────────
function Arsenal({ data }) {
  const rawRows = data.rawTrendRows || [];

  const sparkKills = rawRows.map((row) => num(row.kills));
  const sparkDeaths = rawRows.map((row) => num(row.deaths));
  const sparkKd = rawRows.map((row) => num(row.kd));
  const sparkDamage = rawRows.map((row) => num(row.damageDealt));

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

            <p className="mt-0.5 text-[11px] font-bold text-slate-500">
              Per saved match
            </p>
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

      <EnemyGuildTierList groups={data.enemyTierGroups} />
    </div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function Guild({ stats, logs }) {
  const data = useMemo(() => buildGuildData(stats || {}, logs || []), [stats, logs]);
  const hasData = data.kills > 0 || data.deaths > 0 || data.matches > 0;

  return <div>{hasData ? <Arsenal data={data} /> : <EmptyState />}</div>;
}
