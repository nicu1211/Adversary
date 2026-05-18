import React, { useMemo } from 'react';
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
  const kdScore = Math.min(3, Math.max(0, kdNumber)) / 3 * 45;
  const deathVolumeScore = Math.min(400, Math.max(0, deaths)) / 400 * 25;
  const matchVolumeScore = Math.min(30, Math.max(0, matches)) / 30 * 20;
  const pressureScore = Math.max(0, deaths - kills) / Math.max(1, deaths, kills) * 10;

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

function buildEnemyGuildTiers(stats = {}, logs = []) {
  const latestTime = getLatestLogTime(logs);
  const cutoffTime = latestTime - 45 * 24 * 60 * 60 * 1000;
  const byGuild = {};

  (logs || []).forEach((log) => {
    const logTime = getLogTime(log);

    if (!logTime || logTime < cutoffTime) return;

    const summary = getSimpleSummary(log);
    const guilds = Array.isArray(summary?.guilds) ? summary.guilds : [];
    const matchId = String(log?.id || log?.date || log?.name || logTime);

    guilds.forEach((guild) => {
      const name = cleanGuildName(guild?.name);

      if (!name) return;

      byGuild[name] ||= {
        name,
        kills: 0,
        deaths: 0,
        matchIds: new Set(),
      };

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

      byGuild[guildName] ||= {
        name: guildName,
        kills: 0,
        deaths: 0,
        matchIds: new Set(),
      };

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
      const score = enemyGuildScore({
        kills,
        deaths,
        matches,
        kdNumber,
      });

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
    .sort((a, b) => num(b[key]) - num(a[key]) || String(a.name).localeCompare(String(b.name)))
    .slice(0, limit);
}


function getHistoryLabel(log, index) {
  const raw =
    log?.date ||
    log?.warDate ||
    log?.war_date ||
    log?.createdAt ||
    log?.created_at ||
    log?.name ||
    '';

  const parsed = new Date(raw);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  }

  return String(raw || `Match ${index + 1}`);
}

function buildMetricHistory(logs = []) {
  return [...(logs || [])]
    .map((log, index) => {
      const summary = getSimpleSummary(log);
      const players = Array.isArray(summary?.players) ? summary.players : [];
      const secondaryTotals = summary?.secondary?.totals || {};

      const playerKills = players.reduce((sum, player) => sum + num(player.kills), 0);
      const playerDeaths = players.reduce((sum, player) => sum + num(player.deaths), 0);
      const playerDamageDealt = players.reduce((sum, player) => sum + num(player.damageDealt), 0);
      const playerDamageTaken = players.reduce((sum, player) => sum + num(player.damageTaken), 0);
      const playerCcHits = players.reduce((sum, player) => sum + num(player.ccHits), 0);
      const playerFortDamage = players.reduce((sum, player) => sum + num(player.fortDamage), 0);

      const kills = num(summary?.kills) || num(log?.kills) || playerKills;
      const deaths = num(summary?.deaths) || num(log?.deaths) || playerDeaths;
      const damageDealt =
        num(secondaryTotals.damageDealt) ||
        num(summary?.damageDealt) ||
        num(log?.damageDealt) ||
        playerDamageDealt;
      const damageTaken =
        num(secondaryTotals.damageTaken) ||
        num(summary?.damageTaken) ||
        num(log?.damageTaken) ||
        playerDamageTaken;
      const ccHits =
        num(secondaryTotals.ccHits) ||
        num(summary?.ccHits) ||
        num(log?.ccHits) ||
        playerCcHits;
      const fortDamage =
        num(secondaryTotals.fortDamage) ||
        num(summary?.fortDamage) ||
        num(log?.fortDamage) ||
        playerFortDamage;

      return {
        index,
        time: getLogTime(log),
        label: getHistoryLabel(log, index),
        kills,
        deaths,
        kd: kd(kills, deaths),
        damageDealt,
        damageTaken,
        ccHits,
        fortDamage,
      };
    })
    .filter(
      (item) =>
        item.kills > 0 ||
        item.deaths > 0 ||
        item.damageDealt > 0 ||
        item.damageTaken > 0 ||
        item.ccHits > 0 ||
        item.fortDamage > 0,
    )
    .sort((a, b) => {
      if (a.time && b.time) return a.time - b.time;
      if (a.time) return -1;
      if (b.time) return 1;
      return a.index - b.index;
    })
    .slice(-18);
}

function buildGuildData(stats, logs) {
  const players = Array.isArray(stats?.players) ? stats.players : [];
  const matches = uniqueLogCount(logs, stats);
  const secondaryMatches = uniqueSecondaryLogCount(logs, stats);
  const secondaryAverageMatches = secondaryMatches || matches;

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

  return {
    matches,
    kills,
    deaths,
    kd: ratio,
    damageDealt,
    damageTaken,
    ccHits,
    fortDamage,
    avgKills: matches ? kills / matches : 0,
    avgDeaths: matches ? deaths / matches : 0,
    avgKd: matches ? kd(kills / matches, deaths / matches) : ratio,
    avgDamage: secondaryAverageMatches ? damageDealt / secondaryAverageMatches : 0,
    avgFortDamage: secondaryAverageMatches ? fortDamage / secondaryAverageMatches : 0,
    metricHistory: buildMetricHistory(logs),
    topKillers: topBy(enrichedPlayers, 'kills', 6),
    topDamagePlayers: topBy(enrichedPlayers, 'damageDealt', 6),
    enemyTierGroups: buildEnemyGuildTiers(stats, logs),
  };
}

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


function MetricHistoryBars({ history = [], metricKey, label, tone = 'blue' }) {
  if (!metricKey || !Array.isArray(history) || history.length === 0) return null;

  const bars = history
    .map((item) => ({
      label: item.label,
      value: num(item?.[metricKey]),
    }))
    .filter((item) => Number.isFinite(item.value))
    .slice(-14);

  if (!bars.length) return null;

  const maxValue = Math.max(1, ...bars.map((item) => Math.abs(item.value)));

  // Per-tone color config: [darkBase, mid, bright, tip, glowRgba]
  const toneColors = {
    emerald: ['#052e16', '#16a34a', '#4ade80', '#bbf7d0', 'rgba(74,222,128,0.7)'],
    rose:    ['#4c0519', '#e11d48', '#fb7185', '#fecdd3', 'rgba(251,113,133,0.7)'],
    blue:    ['#172554', '#2563eb', '#60a5fa', '#bfdbfe', 'rgba(96,165,250,0.7)'],
    amber:   ['#451a03', '#d97706', '#fbbf24', '#fef3c7', 'rgba(251,191,36,0.7)'],
    cyan:    ['#083344', '#0891b2', '#22d3ee', '#cffafe', 'rgba(34,211,238,0.7)'],
    violet:  ['#2e1065', '#7c3aed', '#a78bfa', '#ede9fe', 'rgba(167,139,250,0.7)'],
  };

  const [dark, mid, bright, tip, glow] = toneColors[tone] || toneColors.blue;

  return (
    <div
      aria-label={`${label} history`}
      style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '100%', width: '100%' }}
    >
      {bars.map((item, index) => {
        const percent = maxValue ? Math.round((Math.abs(item.value) / maxValue) * 100) : 0;
        const height = item.value > 0 ? Math.max(12, percent) : 6;
        return (
          <div
            key={`${label}-${item.label}-${index}`}
            title={`${item.label} · ${label}: ${compact(item.value)}`}
            style={{ flex: 1, height: `${height}%`, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}
          >
            {/* Bar body with fade + glow */}
            <div style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(to top, transparent 0%, transparent 25%, ${mid} 60%, ${bright} 85%, ${tip} 100%)`,
              boxShadow: `0 0 6px 1px ${glow}, 0 0 12px 2px ${glow.replace('0.7', '0.3')}`,
              borderRadius: '1px 1px 0 0',
            }} />
          </div>
        );
      })}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, tone = 'blue', history = [], historyKey }) {
  const hasBars = historyKey && history.length > 0;

  // Per-tone accent colors for border, icon, label, top line
  const toneAccent = {
    emerald: { color: '#4ade80', border: 'rgba(74,222,128,0.18)', bg: 'rgba(74,222,128,0.04)', topLine: 'rgba(74,222,128,0.3)', shadow: 'rgba(74,222,128,0.08)' },
    rose:    { color: '#fb7185', border: 'rgba(251,113,133,0.18)', bg: 'rgba(251,113,133,0.04)', topLine: 'rgba(251,113,133,0.3)', shadow: 'rgba(251,113,133,0.08)' },
    blue:    { color: '#60a5fa', border: 'rgba(96,165,250,0.18)',  bg: 'rgba(96,165,250,0.04)',  topLine: 'rgba(96,165,250,0.3)',  shadow: 'rgba(96,165,250,0.08)'  },
    amber:   { color: '#fbbf24', border: 'rgba(251,191,36,0.18)',  bg: 'rgba(251,191,36,0.04)',  topLine: 'rgba(251,191,36,0.3)',  shadow: 'rgba(251,191,36,0.08)'  },
    cyan:    { color: '#22d3ee', border: 'rgba(34,211,238,0.18)',  bg: 'rgba(34,211,238,0.04)',  topLine: 'rgba(34,211,238,0.3)',  shadow: 'rgba(34,211,238,0.08)'  },
    violet:  { color: '#a78bfa', border: 'rgba(167,139,250,0.18)', bg: 'rgba(167,139,250,0.04)', topLine: 'rgba(167,139,250,0.3)', shadow: 'rgba(167,139,250,0.08)' },
  };
  const accent = toneAccent[tone] || toneAccent.blue;

  return (
    <div
      style={{
        background: `linear-gradient(135deg, #0a0a0a 0%, #111111 60%, ${accent.bg} 100%)`,
        border: `1px solid ${accent.border}`,
        borderRadius: '16px',
        padding: '0',
        boxShadow: `0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px ${accent.shadow} inset`,
        position: 'relative',
        overflow: 'hidden',
        minHeight: '130px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top accent line */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '1px',
        background: `linear-gradient(90deg, transparent 0%, ${accent.topLine} 50%, transparent 100%)`,
      }} />

      <div style={{ display: 'flex', flex: 1, padding: '14px 16px 14px 16px', gap: 0 }}>
        {/* Left side: label + value + sub */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon size={13} style={{ color: accent.color, flexShrink: 0 }} />
            <p style={{
              fontSize: '10px',
              fontWeight: 900,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: accent.color,
              margin: 0,
              whiteSpace: 'nowrap',
            }}>
              {label}
            </p>
          </div>

          <div style={{ marginTop: 'auto', paddingTop: '10px' }}>
            <p style={{
              fontSize: '2.2rem',
              fontWeight: 900,
              color: '#ffffff',
              lineHeight: 1,
              margin: 0,
              letterSpacing: '-0.02em',
            }}>
              {value}
            </p>
            {sub && (
              <p style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#475569',
                margin: '5px 0 0 0',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}>
                {sub}
              </p>
            )}
          </div>
        </div>

        {/* Right side: flame bars */}
        {hasBars && (
          <div style={{
            width: '50%',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'flex-end',
            paddingLeft: '10px',
            paddingBottom: '2px',
            height: '52px',
          }}>
            <MetricHistoryBars
              history={history}
              metricKey={historyKey}
              label={label}
              tone={tone}
            />
          </div>
        )}
      </div>
    </div>
  );
}


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
    <div className="relative z-0 rounded-xl border border-slate-800 bg-slate-950/70 p-2 shadow-lg hover:z-[999]">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-black text-white" title={guild.name}>
          {guild.name}
        </p>
        <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-black text-slate-300">
          {decimal(guild.score, 1)}
        </span>
      </div>

      <div className="group/bar relative h-2.5 rounded-full bg-slate-900/90">
        <div
          className={cls('h-2.5 rounded-full bg-gradient-to-r', colors[tone] || colors.blue)}
          style={{ width: `${width}%` }}
        />

        <div className="pointer-events-none absolute left-1/2 top-full z-[9999] mt-3 w-max max-w-[380px] -translate-x-1/2 rounded-2xl border border-slate-700 bg-slate-950/95 px-4 py-3 text-xs font-black text-slate-200 opacity-0 shadow-2xl backdrop-blur-xl transition group-hover/bar:opacity-100">
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-blue-300/80">M</p>
              <p>{compact(guild.matches, 0)}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-emerald-300/80">K</p>
              <p>{compact(guild.deaths)}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-rose-300/80">D</p>
              <p>{compact(guild.kills)}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-cyan-300/80">K/D</p>
              <p>{decimal(guild.kdNumber)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EnemyGuildTierList({ groups }) {
  const scrollClass = '[scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700/80';
  const hasGuilds = groups.some((group) => group.guilds.length > 0);
  const maxScore = Math.max(
    1,
    ...groups.flatMap((group) => group.guilds.map((guild) => num(guild.score))),
  );

  return (
    <Panel className="p-3">
      <SectionTitle
        icon={Trophy}
        title="Enemy Guild Tier List"
        sub="Last 45 days · minimum 30 K+D · S 50+ · A 40-50 · B 30-40 · C 20-30 · D 15-20 · Trash <15"
      />

      {!hasGuilds ? (
        <p className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-4 text-sm font-bold text-slate-500">
          No enemy guild reached 30 K+D in the last 45 days.
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
                <div className={cls('flex h-11 w-11 items-center justify-center rounded-xl border text-2xl font-black', group.meta.badge)}>
                  {group.meta.label}
                </div>
                <div className="min-w-0 lg:text-center">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-400">
                    {group.tier === 'Trash' ? 'Trash Tier' : 'Tier'}
                  </p>
                  <p className="truncate text-[10px] font-bold text-slate-300">{group.meta.range}</p>
                </div>
              </div>

              {group.guilds.length ? (
                <div
                  className={cls(
                    'grid gap-2 sm:grid-cols-2 xl:grid-cols-4',
                    group.guilds.length > 16 && `max-h-[330px] overflow-y-auto pr-1 ${scrollClass}`,
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

function Arsenal({ data }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          icon={Swords}
          label="Kills"
          value={compact(data.kills)}
          sub="All-time"
          tone="emerald"
          history={data.metricHistory}
          historyKey="kills"
        />
        <MetricCard
          icon={Skull}
          label="Deaths"
          value={compact(data.deaths)}
          sub="All-time"
          tone="rose"
          history={data.metricHistory}
          historyKey="deaths"
        />
        <MetricCard
          icon={Gauge}
          label="K/D"
          value={decimal(data.kd)}
          sub="Ratio"
          tone="blue"
          history={data.metricHistory}
          historyKey="kd"
        />
        <MetricCard
          icon={Zap}
          label="Damage"
          value={compact(data.damageDealt)}
          sub="Dealt"
          tone="amber"
          history={data.metricHistory}
          historyKey="damageDealt"
        />
        <MetricCard
          icon={Crosshair}
          label="CC"
          value={compact(data.ccHits)}
          sub="Hits"
          tone="cyan"
          history={data.metricHistory}
          historyKey="ccHits"
        />
        <MetricCard
          icon={Castle}
          label="Fort"
          value={compact(data.fortDamage)}
          sub="Damage"
          tone="violet"
          history={data.metricHistory}
          historyKey="fortDamage"
        />
      </div>

      <Panel>
        <SectionTitle icon={Activity} title="Averages" sub="Per saved match" />
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard icon={Swords} label="Avg Kills" value={compact(data.avgKills)} sub="Per match" tone="emerald" />
          <MetricCard icon={Skull} label="Avg Deaths" value={compact(data.avgDeaths)} sub="Per match" tone="rose" />
          <MetricCard icon={Gauge} label="Avg K/D" value={decimal(data.avgKd)} sub="Per match" tone="blue" />
          <MetricCard icon={Zap} label="Avg Damage" value={compact(data.avgDamage)} sub="Per match" tone="amber" />
        </div>
      </Panel>

      <EnemyGuildTierList groups={data.enemyTierGroups} />
    </div>
  );
}

export default function Guild({ stats, logs }) {
  const data = useMemo(() => buildGuildData(stats || {}, logs || []), [stats, logs]);

  const hasData = data.kills > 0 || data.deaths > 0 || data.matches > 0;

  return <div>{hasData ? <Arsenal data={data} /> : <EmptyState />}</div>;
}
