import React, { useMemo } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Castle,
  Crosshair,
  Database,
  Flame,
  Gauge,
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
  const kdScore = (Math.min(3, Math.max(0, kdNumber)) / 3) * 45;
  const deathVolumeScore = (Math.min(400, Math.max(0, deaths)) / 400) * 25;
  const matchVolumeScore = (Math.min(30, Math.max(0, matches)) / 30) * 20;
  const pressureScore =
    (Math.max(0, deaths - kills) / Math.max(1, deaths, kills)) * 10;

  return (
    Math.round(
      (kdScore + deathVolumeScore + matchVolumeScore + pressureScore) * 10,
    ) / 10
  );
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

function getLogMetricSnapshot(log) {
  const summary = getSimpleSummary(log);
  const players = Array.isArray(summary?.players) ? summary.players : [];
  const secondaryTotals = summary?.secondary?.totals || {};

  const kills = num(summary?.kills);
  const deaths = num(summary?.deaths);
  const damageDealt =
    num(secondaryTotals.damageDealt) ||
    players.reduce((sum, player) => sum + num(player?.damageDealt), 0);
  const ccHits =
    num(secondaryTotals.ccHits) ||
    players.reduce((sum, player) => sum + num(player?.ccHits), 0);
  const fortDamage =
    num(secondaryTotals.fortDamage) ||
    players.reduce((sum, player) => sum + num(player?.fortDamage), 0);

  return {
    kills,
    deaths,
    kd: kd(kills, deaths),
    damageDealt,
    ccHits,
    fortDamage,
  };
}

function buildMetricHistory(logs = [], limit = 12) {
  return [...(logs || [])]
    .map((log, index) => ({
      log,
      index,
      time: getLogTime(log),
      metrics: getLogMetricSnapshot(log),
    }))
    .sort((a, b) => {
      if (a.time && b.time) return a.time - b.time;
      if (a.time) return 1;
      if (b.time) return -1;
      return a.index - b.index;
    })
    .filter((item) => {
      const values = Object.values(item.metrics || {});
      return values.some((value) => num(value) > 0);
    })
    .slice(-limit)
    .map((item) => item.metrics);
}

function getTrend(history = [], key) {
  const values = (history || [])
    .map((entry) => num(entry?.[key]))
    .filter((value) => Number.isFinite(value));

  if (values.length < 2) {
    return {
      direction: 0,
      delta: 0,
      previous: 0,
      current: values[values.length - 1] || 0,
    };
  }

  const previous = values[values.length - 2];
  const current = values[values.length - 1];
  const delta = current - previous;

  return {
    direction: delta > 0 ? 1 : delta < 0 ? -1 : 0,
    delta,
    previous,
    current,
  };
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
    const eventLatestTime = eventTimes.length
      ? Math.max(...eventTimes)
      : Date.now();
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
      byGuild[guildName].matchIds.add(
        String(event?.id || event?.date || guildName),
      );
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
  const secondaryMatches = uniqueSecondaryLogCount(logs, stats);
  const secondaryAverageMatches = secondaryMatches || matches;

  const kills = num(stats?.kills);
  const deaths = num(stats?.deaths);
  const ratio = kd(kills, deaths);

  const secondaryTotals = stats?.secondary?.totals || {};
  const playerDamageDealt = players.reduce(
    (sum, player) => sum + num(player.damageDealt),
    0,
  );
  const playerDamageTaken = players.reduce(
    (sum, player) => sum + num(player.damageTaken),
    0,
  );
  const playerCcHits = players.reduce(
    (sum, player) => sum + num(player.ccHits),
    0,
  );
  const playerFortDamage = players.reduce(
    (sum, player) => sum + num(player.fortDamage),
    0,
  );

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

  const history = buildMetricHistory(logs, 12);

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
    avgDamage: secondaryAverageMatches
      ? damageDealt / secondaryAverageMatches
      : 0,
    avgFortDamage: secondaryAverageMatches
      ? fortDamage / secondaryAverageMatches
      : 0,
    topKillers: topBy(enrichedPlayers, 'kills', 6),
    topDamagePlayers: topBy(enrichedPlayers, 'damageDealt', 6),
    enemyTierGroups: buildEnemyGuildTiers(stats, logs),
    history,
    trends: {
      kills: getTrend(history, 'kills'),
      deaths: getTrend(history, 'deaths'),
      kd: getTrend(history, 'kd'),
      damageDealt: getTrend(history, 'damageDealt'),
      ccHits: getTrend(history, 'ccHits'),
      fortDamage: getTrend(history, 'fortDamage'),
    },
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
        Save battle logs first, then this Guild tab will generate all-time
        statistics automatically.
      </p>
    </div>
  );
}

function MetricHistoryBars({ values = [], tone = 'blue' }) {
  const palette = {
    blue: {
      bar: 'from-blue-500 via-sky-400 to-cyan-300',
      glow: 'shadow-[0_0_18px_rgba(59,130,246,0.35)]',
      fade: 'from-blue-500/12 via-blue-400/8 to-transparent',
    },
    emerald: {
      bar: 'from-emerald-500 via-lime-400 to-emerald-200',
      glow: 'shadow-[0_0_18px_rgba(16,185,129,0.35)]',
      fade: 'from-emerald-500/12 via-emerald-400/8 to-transparent',
    },
    rose: {
      bar: 'from-rose-500 via-pink-400 to-rose-200',
      glow: 'shadow-[0_0_18px_rgba(244,63,94,0.35)]',
      fade: 'from-rose-500/12 via-rose-400/8 to-transparent',
    },
    violet: {
      bar: 'from-violet-500 via-fuchsia-400 to-violet-200',
      glow: 'shadow-[0_0_18px_rgba(139,92,246,0.35)]',
      fade: 'from-violet-500/12 via-violet-400/8 to-transparent',
    },
    amber: {
      bar: 'from-amber-500 via-yellow-400 to-amber-200',
      glow: 'shadow-[0_0_18px_rgba(245,158,11,0.35)]',
      fade: 'from-amber-500/12 via-amber-400/8 to-transparent',
    },
    cyan: {
      bar: 'from-cyan-500 via-sky-400 to-cyan-200',
      glow: 'shadow-[0_0_18px_rgba(6,182,212,0.35)]',
      fade: 'from-cyan-500/12 via-cyan-400/8 to-transparent',
    },
  };

  const currentPalette = palette[tone] || palette.blue;
  const bars = (values || []).map((value) => num(value));
  const maxValue = Math.max(1, ...bars.map((value) => Math.abs(value)));

  return (
    <div className="relative flex h-[90px] min-w-[118px] items-end justify-end gap-1 overflow-hidden rounded-2xl px-2 pb-2 pt-4">
      <div
        className={cls(
          'pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t',
          currentPalette.fade,
        )}
      />
      {bars.map((value, index) => {
        const percent = Math.abs(value) / maxValue;
        const height = Math.max(14, Math.round(percent * 62) + 8);
        const isLatest = index === bars.length - 1;

        return (
          <span
            key={`${tone}-${index}-${value}`}
            className={cls(
              'relative w-1.5 rounded-full bg-gradient-to-t opacity-95',
              currentPalette.bar,
              currentPalette.glow,
              isLatest && 'brightness-110',
            )}
            style={{ height }}
            title={nf.format(value)}
          />
        );
      })}
    </div>
  );
}

function MetricTrendBadge({ trend, formatter = compact }) {
  if (!trend || !trend.direction) return null;

  const isUp = trend.direction > 0;
  const Icon = isUp ? ArrowUpRight : ArrowDownRight;
  const colorClass = isUp
    ? 'border-emerald-400/25 bg-emerald-500/15 text-emerald-300'
    : 'border-rose-400/25 bg-rose-500/15 text-rose-300';
  const prefix = isUp ? '+' : '-';

  return (
    <div
      className={cls(
        'mt-2 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black',
        colorClass,
      )}
    >
      <Icon size={12} />
      <span>{`${prefix}${formatter(Math.abs(trend.delta))} vs prev`}</span>
    </div>
  );
}

const metricKeyMap = {
  Kills: 'kills',
  Deaths: 'deaths',
  'K/D': 'kd',
  Damage: 'damageDealt',
  CC: 'ccHits',
  Fort: 'fortDamage',
};

function GuildHeroMetricCard({
  label,
  value,
  sub,
  tone = 'blue',
  history = [],
  trend,
  formatter = compact,
}) {
  const tones = {
    blue: {
      shell:
        'border-blue-500/20 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_42%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(2,6,23,0.88))] shadow-[0_18px_42px_rgba(2,8,23,0.55)]',
      title: 'text-blue-300',
    },
    emerald: {
      shell:
        'border-emerald-500/20 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_42%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(2,6,23,0.88))] shadow-[0_18px_42px_rgba(2,8,23,0.55)]',
      title: 'text-emerald-300',
    },
    rose: {
      shell:
        'border-rose-500/20 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.16),transparent_42%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(2,6,23,0.88))] shadow-[0_18px_42px_rgba(2,8,23,0.55)]',
      title: 'text-rose-300',
    },
    violet: {
      shell:
        'border-violet-500/20 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.16),transparent_42%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(2,6,23,0.88))] shadow-[0_18px_42px_rgba(2,8,23,0.55)]',
      title: 'text-violet-300',
    },
    amber: {
      shell:
        'border-amber-500/20 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.16),transparent_42%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(2,6,23,0.88))] shadow-[0_18px_42px_rgba(2,8,23,0.55)]',
      title: 'text-amber-300',
    },
    cyan: {
      shell:
        'border-cyan-500/20 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_42%),linear-gradient(180deg,rgba(2,6,23,0.96),rgba(2,6,23,0.88))] shadow-[0_18px_42px_rgba(2,8,23,0.55)]',
      title: 'text-cyan-300',
    },
  };

  const theme = tones[tone] || tones.blue;
  const trendUp = trend?.direction > 0;
  const trendDown = trend?.direction < 0;

  return (
    <div
      className={cls(
        'relative overflow-hidden rounded-[24px] border px-4 py-3 sm:px-5 sm:py-4',
        theme.shell,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.05),transparent_28%)]" />

      <div className="relative flex min-h-[136px] items-end justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col justify-between">
          <div>
            <div
              className={cls(
                'flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em]',
                theme.title,
              )}
            >
              <Flame size={13} />
              <span>{label}</span>
            </div>

            <div className="mt-3 flex items-end gap-2">
              <p className="text-4xl font-black leading-none text-white">
                {value}
              </p>
              {trendUp && (
                <ArrowUpRight size={20} className="mb-1 text-emerald-400" />
              )}
              {trendDown && (
                <ArrowDownRight size={20} className="mb-1 text-rose-400" />
              )}
            </div>

            <p className="mt-1 text-sm font-bold text-slate-300">{sub}</p>
            <MetricTrendBadge trend={trend} formatter={formatter} />
          </div>
        </div>

        <MetricHistoryBars
          values={(history || []).map((entry) =>
            num(entry?.[metricKeyMap[label] || '']),
          )}
          tone={tone}
        />
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, sub, tone = 'blue' }) {
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

  return (
    <div className={cls('rounded-[26px] border p-4 shadow-2xl', tones[tone])}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-3xl font-black text-white">{value}</p>
          {sub && <p className="mt-1 text-xs font-bold text-slate-400">{sub}</p>}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 p-3">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function Panel({ children, className = '' }) {
  return (
    <section
      className={cls(
        'rounded-[30px] border border-slate-800 bg-slate-950/70 p-5 shadow-2xl',
        className,
      )}
    >
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
          className={cls(
            'h-2.5 rounded-full bg-gradient-to-r',
            colors[tone] || colors.blue,
          )}
          style={{ width: `${width}%` }}
        />

        <div className="pointer-events-none absolute left-1/2 top-full z-[9999] mt-3 w-max max-w-[380px] -translate-x-1/2 rounded-2xl border border-slate-700 bg-slate-950/95 px-4 py-3 text-xs font-black text-slate-200 opacity-0 shadow-2xl backdrop-blur-xl transition group-hover/bar:opacity-100">
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-blue-300/80">
                M
              </p>
              <p>{compact(guild.matches, 0)}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-emerald-300/80">
                K
              </p>
              <p>{compact(guild.deaths)}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-rose-300/80">
                D
              </p>
              <p>{compact(guild.kills)}</p>
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

function EnemyGuildTierList({ groups }) {
  const scrollClass =
    '[scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700/80';
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
                    {group.tier === 'Trash' ? 'Trash Tier' : 'Tier'}
                  </p>
                  <p className="truncate text-[10px] font-bold text-slate-300">
                    {group.meta.range}
                  </p>
                </div>
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

function Arsenal({ data }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <GuildHeroMetricCard
          label="Kills"
          value={compact(data.kills)}
          sub="All-time"
          tone="emerald"
          history={data.history}
          trend={data.trends.kills}
          formatter={compact}
        />

        <GuildHeroMetricCard
          label="Deaths"
          value={compact(data.deaths)}
          sub="All-time"
          tone="rose"
          history={data.history}
          trend={data.trends.deaths}
          formatter={compact}
        />

        <GuildHeroMetricCard
          label="K/D"
          value={decimal(data.kd)}
          sub="Ratio"
          tone="blue"
          history={data.history}
          trend={data.trends.kd}
          formatter={(value) => decimal(value)}
        />

        <GuildHeroMetricCard
          label="Damage"
          value={compact(data.damageDealt)}
          sub="Dealt"
          tone="amber"
          history={data.history}
          trend={data.trends.damageDealt}
          formatter={compact}
        />

        <GuildHeroMetricCard
          label="CC"
          value={compact(data.ccHits)}
          sub="Hits"
          tone="cyan"
          history={data.history}
          trend={data.trends.ccHits}
          formatter={compact}
        />

        <GuildHeroMetricCard
          label="Fort"
          value={compact(data.fortDamage)}
          sub="Damage"
          tone="violet"
          history={data.history}
          trend={data.trends.fortDamage}
          formatter={compact}
        />
      </div>

      <Panel>
        <SectionTitle icon={Activity} title="Averages" sub="Per saved match" />
        <div className="grid gap-3 md:grid-cols-4">
          <MetricCard
            icon={Swords}
            label="Avg Kills"
            value={compact(data.avgKills)}
            sub="Per match"
            tone="emerald"
          />
          <MetricCard
            icon={Skull}
            label="Avg Deaths"
            value={compact(data.avgDeaths)}
            sub="Per match"
            tone="rose"
          />
          <MetricCard
            icon={Gauge}
            label="Avg K/D"
            value={decimal(data.avgKd)}
            sub="Per match"
            tone="blue"
          />
          <MetricCard
            icon={Zap}
            label="Avg Damage"
            value={compact(data.avgDamage)}
            sub="Per match"
            tone="amber"
          />
        </div>
      </Panel>

      <EnemyGuildTierList groups={data.enemyTierGroups} />
    </div>
  );
}

export default function Guild({ stats, logs }) {
  const data = useMemo(
    () => buildGuildData(stats || {}, logs || []),
    [stats, logs],
  );

  const hasData = data.kills > 0 || data.deaths > 0 || data.matches > 0;

  return <div>{hasData ? <Arsenal data={data} /> : <EmptyState />}</div>;
}
