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
  return ['damageDealt', 'damageTaken', 'ccHits', 'fortDamage'].some(
    (metric) =>
      explicitMetricAvailability(
        stats?.secondary,
        metric,
      ) === true,
  );
}

function uniqueSecondaryLogCount(logs = [], stats = {}) {
  const availableLogs = new Set(
    (logs || [])
      .filter((log) =>
        ['damageDealt', 'damageTaken', 'ccHits', 'fortDamage'].some(
          (metric) =>
            getLogMetricRecord(log, metric).available,
        ),
      )
      .map((log) =>
        String(
          log?.id ||
            log?.date ||
            log?.name ||
            '',
        ),
      )
      .filter(Boolean),
  );

  if (availableLogs.size) {
    return availableLogs.size;
  }

  const secondaryRows = Array.isArray(
    stats?.secondary?.rows,
  )
    ? stats.secondary.rows
    : [];

  const availableRows = new Set(
    secondaryRows
      .filter((row) =>
        ['damageDealt', 'damageTaken', 'ccHits', 'fortDamage'].some(
          (metric) =>
            explicitMetricAvailability(
              row,
              metric,
            ) === true,
        ),
      )
      .map((row, index) =>
        String(
          row?.id ||
            row?.date ||
            row?.war ||
            row?.logId ||
            index,
        ),
      ),
  );

  if (availableRows.size) {
    return availableRows.size;
  }

  return hasSecondaryTotals(stats) ? 1 : 0;
}

function cleanGuildName(value) {
  const text = String(value || '').trim();
  if (!text || /^\d{4}-\d{2}-\d{2}$/.test(text)) return '';
  return text;
}

function getTierByKd(value) {
  const ratio = num(value);
  if (ratio >= 1.51) return 'S';
  if (ratio >= 1.31) return 'A';
  if (ratio >= 1.11) return 'B';
  if (ratio >= 0.9) return 'C';
  if (ratio >= 0.7) return 'D';
  if (ratio >= 0.5) return 'F';
  return 'T';
}

const enemyTierMeta = {
  S: {
    label: 'S',
    range: '1.51+ K/D',
    className: 'border-amber-300/35 bg-amber-500/15 text-amber-100 shadow-amber-500/10',
    badge: 'border-amber-300/40 bg-amber-400/20 text-amber-100',
    tone: 'amber',
  },
  A: {
    label: 'A',
    range: '1.31 - 1.50 K/D',
    className: 'border-emerald-300/30 bg-emerald-500/12 text-emerald-100 shadow-emerald-500/10',
    badge: 'border-emerald-300/35 bg-emerald-400/18 text-emerald-100',
    tone: 'emerald',
  },
  B: {
    label: 'B',
    range: '1.11 - 1.30 K/D',
    className: 'border-blue-300/25 bg-blue-500/10 text-blue-100 shadow-blue-500/10',
    badge: 'border-blue-300/35 bg-blue-400/15 text-blue-100',
    tone: 'blue',
  },
  C: {
    label: 'C',
    range: '0.90 - 1.10 K/D',
    className: 'border-violet-300/25 bg-violet-500/10 text-violet-100 shadow-violet-500/10',
    badge: 'border-violet-300/35 bg-violet-400/15 text-violet-100',
    tone: 'violet',
  },
  D: {
    label: 'D',
    range: '0.70 - 0.89 K/D',
    className: 'border-rose-300/25 bg-rose-500/10 text-rose-100 shadow-rose-500/10',
    badge: 'border-rose-300/35 bg-rose-400/15 text-rose-100',
    tone: 'rose',
  },
  F: {
    label: 'F',
    range: '0.50 - 0.69 K/D',
    className: 'border-orange-300/25 bg-orange-500/10 text-orange-100 shadow-orange-500/10',
    badge: 'border-orange-300/35 bg-orange-400/15 text-orange-100',
    tone: 'amber',
  },
  T: {
    label: 'T',
    range: 'Below 0.50 K/D',
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
  return (players || []).reduce(
    (sum, player) => sum + num(player?.[key]),
    0,
  );
}

const GUILD_DETAIL_METRICS = Object.freeze({
  damageDealt: {
    valueKeys: [
      'damageDealt',
      'damage_dealt',
      'damage dealt',
      'damageDone',
      'damage',
      'Damage Dealt',
      'DamageDealt',
    ],
    flagKeys: [
      'has_damage_dealt',
      'hasDamageDealt',
      'damage_dealt_available',
      'damageDealtAvailable',
    ],
    rawPattern: /\bdamage dealt\b|\bdmg dealt\b/,
  },
  damageTaken: {
    valueKeys: [
      'damageTaken',
      'damage_taken',
      'damage taken',
      'Damage Taken',
      'DamageTaken',
    ],
    flagKeys: [
      'has_damage_taken',
      'hasDamageTaken',
      'damage_taken_available',
      'damageTakenAvailable',
    ],
    rawPattern: /\bdamage taken\b|\bdmg taken\b/,
  },
  ccHits: {
    valueKeys: [
      'ccHits',
      'cc_hits',
      'cc hits',
      'CC Hits',
      'CCHits',
      'cc',
      'CC',
    ],
    flagKeys: [
      'has_cc_hits',
      'hasCcHits',
      'cc_hits_available',
      'ccHitsAvailable',
    ],
    rawPattern: /\bcc hits?\b|\bcrowd control\b/,
  },
  fortDamage: {
    valueKeys: [
      'fortDamage',
      'damageToFort',
      'damage_to_fort',
      'damage to fort',
      'Fort Damage',
      'Damage to Fort',
      'DamageToFort',
    ],
    flagKeys: [
      'has_fort_damage',
      'hasFortDamage',
      'fort_damage_available',
      'fortDamageAvailable',
    ],
    rawPattern:
      /\bfort damage\b|\bdamage (?:to|on) fort\b|\bdmg to fort\b/,
  },
});

function hasOwnUsableValue(source, key) {
  return Boolean(
    source &&
      Object.prototype.hasOwnProperty.call(source, key) &&
      source[key] !== undefined &&
      source[key] !== null &&
      source[key] !== '',
  );
}

function firstRecordedNumber(source, keys) {
  if (!source) {
    return {
      found: false,
      value: 0,
    };
  }

  for (const key of keys) {
    if (!hasOwnUsableValue(source, key)) continue;

    const value = Number(source[key]);

    if (Number.isFinite(value)) {
      return {
        found: true,
        value,
      };
    }
  }

  return {
    found: false,
    value: 0,
  };
}

function explicitMetricAvailability(source, key) {
  if (!source) return null;

  const definition = GUILD_DETAIL_METRICS[key];

  if (!definition) return null;

  const availabilityMaps = [
    source.available,
    source.availability,
    source.presence,
    source.metricAvailability,
    source.metricsAvailable,
  ];

  for (const map of availabilityMaps) {
    if (
      map &&
      Object.prototype.hasOwnProperty.call(map, key)
    ) {
      return Boolean(map[key]);
    }
  }

  for (const flagKey of definition.flagKeys) {
    if (
      Object.prototype.hasOwnProperty.call(
        source,
        flagKey,
      )
    ) {
      return Boolean(source[flagKey]);
    }
  }

  /*
   * Legacy summaries did not preserve availability flags.
   * A non-zero value proves that the column existed. A zero without
   * an explicit flag stays unknown, because older summaries also
   * filled missing columns with zero.
   */
  for (const valueKey of definition.valueKeys) {
    if (!hasOwnUsableValue(source, valueKey)) continue;

    const value = Number(source[valueKey]);

    if (Number.isFinite(value) && value !== 0) {
      return true;
    }
  }

  return null;
}

function combineAvailabilitySignals(signals) {
  if (signals.some((value) => value === true)) {
    return true;
  }

  if (signals.some((value) => value === false)) {
    return false;
  }

  return null;
}

function rawMetricAvailability(log, key) {
  const definition = GUILD_DETAIL_METRICS[key];

  if (!definition) return null;

  const raw = String(
    log?.raw ??
      log?.rawLog ??
      log?.raw_log ??
      log?.log ??
      log?.content ??
      log?._src?.raw ??
      log?._src?.rawLog ??
      log?._src?.raw_log ??
      log?._src?.log ??
      log?._src?.content ??
      '',
  );

  if (!raw) return null;

  const startMarker =
    '===== ADVERSARY_SECONDARY_LOG_START =====';
  const endMarker =
    '===== ADVERSARY_SECONDARY_LOG_END =====';

  const secondaryRaw =
    raw.includes(startMarker) && raw.includes(endMarker)
      ? raw.split(startMarker)[1]?.split(endMarker)[0] || ''
      : '';

  if (!secondaryRaw) return null;

  const normalized = String(secondaryRaw)
    .toLowerCase()
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return definition.rawPattern.test(normalized)
    ? true
    : null;
}

function getLogMetricRecord(log, key) {
  const summary = getSimpleSummary(log);
  const players = Array.isArray(summary?.players)
    ? summary.players
    : [];
  const secondary =
    summary?.secondary ||
    summary?.secondaryStats ||
    {};
  const secondaryRows = Array.isArray(secondary?.rows)
    ? secondary.rows
    : [];

  if (key === 'matches') {
    return {
      available: Boolean(log),
      value: log ? 1 : 0,
    };
  }

  if (key === 'kills' || key === 'deaths') {
    const direct = firstRecordedNumber(summary, [key]);

    if (direct.found) {
      return {
        available: true,
        value: direct.value,
      };
    }

    const playerValues = players
      .map((player) =>
        firstRecordedNumber(player, [key]),
      )
      .filter((result) => result.found);

    return {
      available: playerValues.length > 0,
      value: playerValues.reduce(
        (sum, result) => sum + result.value,
        0,
      ),
    };
  }

  if (key === 'kd') {
    const killsRecord = getLogMetricRecord(log, 'kills');
    const deathsRecord = getLogMetricRecord(log, 'deaths');
    const available =
      killsRecord.available && deathsRecord.available;

    return {
      available,
      value: available
        ? kd(killsRecord.value, deathsRecord.value)
        : 0,
    };
  }

  const definition = GUILD_DETAIL_METRICS[key];

  if (!definition) {
    return {
      available: false,
      value: 0,
    };
  }

  const signals = [
    explicitMetricAvailability(summary, key),
    explicitMetricAvailability(secondary, key),
    explicitMetricAvailability(
      secondary?.totals,
      key,
    ),
    rawMetricAvailability(log, key),
    ...secondaryRows.map((row) =>
      explicitMetricAvailability(row, key),
    ),
    ...players.map((player) =>
      explicitMetricAvailability(player, key),
    ),
  ];

  const available =
    combineAvailabilitySignals(signals) === true;

  if (!available) {
    return {
      available: false,
      value: 0,
    };
  }

  const total = firstRecordedNumber(
    secondary?.totals,
    definition.valueKeys,
  );

  if (total.found) {
    return {
      available: true,
      value: total.value,
    };
  }

  const rowSources = secondaryRows.length
    ? secondaryRows
    : players;

  const value = rowSources.reduce((sum, row) => {
    const recorded = firstRecordedNumber(
      row,
      definition.valueKeys,
    );

    return sum + (recorded.found ? recorded.value : 0);
  }, 0);

  return {
    available: true,
    value,
  };
}

function getStatsMetricRecord(stats, logs, key) {
  const logRecords = (logs || []).map((log) =>
    getLogMetricRecord(log, key),
  );

  if (
    key === 'matches' ||
    key === 'kills' ||
    key === 'deaths' ||
    key === 'kd'
  ) {
    if (key === 'matches') {
      const matches = uniqueLogCount(logs, stats);

      return {
        available: matches > 0,
        value: matches,
      };
    }

    if (key === 'kills' || key === 'deaths') {
      const direct = firstRecordedNumber(stats, [key]);
      const available =
        direct.found ||
        logRecords.some((record) => record.available);

      return {
        available,
        value: direct.found
          ? direct.value
          : logRecords
              .filter((record) => record.available)
              .reduce(
                (sum, record) => sum + record.value,
                0,
              ),
      };
    }

    const killsRecord = getStatsMetricRecord(
      stats,
      logs,
      'kills',
    );
    const deathsRecord = getStatsMetricRecord(
      stats,
      logs,
      'deaths',
    );
    const available =
      killsRecord.available && deathsRecord.available;

    return {
      available,
      value: available
        ? kd(killsRecord.value, deathsRecord.value)
        : 0,
    };
  }

  const definition = GUILD_DETAIL_METRICS[key];

  if (!definition) {
    return {
      available: false,
      value: 0,
    };
  }

  const secondary =
    stats?.secondary ||
    stats?.secondaryStats ||
    {};
  const secondaryRows = Array.isArray(secondary?.rows)
    ? secondary.rows
    : [];
  const players = Array.isArray(stats?.players)
    ? stats.players
    : [];

  const signals = [
    explicitMetricAvailability(stats, key),
    explicitMetricAvailability(secondary, key),
    explicitMetricAvailability(
      secondary?.totals,
      key,
    ),
    ...secondaryRows.map((row) =>
      explicitMetricAvailability(row, key),
    ),
    ...players.map((player) =>
      explicitMetricAvailability(player, key),
    ),
    ...logRecords.map((record) =>
      record.available ? true : null,
    ),
  ];

  const available =
    combineAvailabilitySignals(signals) === true;

  if (!available) {
    return {
      available: false,
      value: 0,
    };
  }

  const total = firstRecordedNumber(
    secondary?.totals,
    definition.valueKeys,
  );

  if (total.found) {
    return {
      available: true,
      value: total.value,
    };
  }

  const availableLogRecords = logRecords.filter(
    (record) => record.available,
  );

  if (availableLogRecords.length) {
    return {
      available: true,
      value: availableLogRecords.reduce(
        (sum, record) => sum + record.value,
        0,
      ),
    };
  }

  const rowSources = secondaryRows.length
    ? secondaryRows
    : players;

  return {
    available: true,
    value: rowSources.reduce((sum, row) => {
      const recorded = firstRecordedNumber(
        row,
        definition.valueKeys,
      );

      return sum + (recorded.found ? recorded.value : 0);
    }, 0),
  };
}

function getLogMetricValue(log, key) {
  return getLogMetricRecord(log, key).value;
}

function buildMetricBars(logs = [], key) {
  return [...(logs || [])]
    .filter((log) => getLogTime(log) > 0)
    .sort((a, b) => getLogTime(a) - getLogTime(b))
    .map((log) => getLogMetricRecord(log, key))
    .filter((record) => record.available)
    .slice(-10)
    .map((record) => record.value);
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

  const totals = {
    kills: 0,
    deaths: 0,
    kd: 0,
    damageDealt: 0,
  };
  const counts = {
    kills: 0,
    deaths: 0,
    kd: 0,
    damageDealt: 0,
  };

  return sortedLogs.map((log, index) => {
    const records = {
      kills: getLogMetricRecord(log, 'kills'),
      deaths: getLogMetricRecord(log, 'deaths'),
      kd: getLogMetricRecord(log, 'kd'),
      damageDealt: getLogMetricRecord(
        log,
        'damageDealt',
      ),
    };

    Object.entries(records).forEach(
      ([metric, record]) => {
        if (!record.available) return;

        totals[metric] += record.value;
        counts[metric] += 1;
      },
    );

    return {
      label: getLogLabel(log, index),
      avgKills: counts.kills
        ? totals.kills / counts.kills
        : null,
      avgDeaths: counts.deaths
        ? totals.deaths / counts.deaths
        : null,
      avgKd: counts.kd
        ? totals.kd / counts.kd
        : null,
      avgDamage: counts.damageDealt
        ? totals.damageDealt / counts.damageDealt
        : null,
      available: {
        kills: counts.kills > 0,
        deaths: counts.deaths > 0,
        kd: counts.kd > 0,
        damageDealt: counts.damageDealt > 0,
      },
    };
  });
}

// Builds raw per-match values for sparkline trend (not cumulative average)
function buildRawTrendRows(logs = []) {
  return [...(logs || [])]
    .filter((log) => getLogTime(log) > 0)
    .sort((a, b) => getLogTime(a) - getLogTime(b))
    .map((log, index) => {
      const kills = getLogMetricRecord(log, 'kills');
      const deaths = getLogMetricRecord(log, 'deaths');
      const ratio = getLogMetricRecord(log, 'kd');
      const damageDealt = getLogMetricRecord(
        log,
        'damageDealt',
      );

      return {
        label: getLogLabel(log, index),
        kills: kills.value,
        deaths: deaths.value,
        kd: ratio.value,
        damageDealt: damageDealt.value,
        available: {
          kills: kills.available,
          deaths: deaths.available,
          kd: ratio.available,
          damageDealt: damageDealt.available,
        },
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

  return ['S', 'A', 'B', 'C', 'D', 'F', 'T']
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
  const players = Array.isArray(stats?.players)
    ? stats.players
    : [];

  const records = {
    matches: getStatsMetricRecord(
      stats,
      logs,
      'matches',
    ),
    kills: getStatsMetricRecord(stats, logs, 'kills'),
    deaths: getStatsMetricRecord(
      stats,
      logs,
      'deaths',
    ),
    kd: getStatsMetricRecord(stats, logs, 'kd'),
    damageDealt: getStatsMetricRecord(
      stats,
      logs,
      'damageDealt',
    ),
    damageTaken: getStatsMetricRecord(
      stats,
      logs,
      'damageTaken',
    ),
    ccHits: getStatsMetricRecord(
      stats,
      logs,
      'ccHits',
    ),
    fortDamage: getStatsMetricRecord(
      stats,
      logs,
      'fortDamage',
    ),
  };

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

  function availableValues(metric) {
    return rawTrendRows
      .filter(
        (row) => Boolean(row?.available?.[metric]),
      )
      .map((row) => num(row?.[metric]));
  }

  function average(values) {
    return values.length
      ? values.reduce(
          (sum, value) => sum + value,
          0,
        ) / values.length
      : 0;
  }

  const killsValues = availableValues('kills');
  const deathsValues = availableValues('deaths');
  const kdValues = availableValues('kd');
  const damageValues = availableValues(
    'damageDealt',
  );

  const availability = {
    matches: records.matches.available,
    kills: records.kills.available,
    deaths: records.deaths.available,
    kd: records.kd.available,
    damageDealt: records.damageDealt.available,
    damageTaken: records.damageTaken.available,
    ccHits: records.ccHits.available,
    fortDamage: records.fortDamage.available,
    avgKills: killsValues.length > 0,
    avgDeaths: deathsValues.length > 0,
    avgKd: kdValues.length > 0,
    avgDamage: damageValues.length > 0,
  };

  return {
    matches: records.matches.value,
    kills: records.kills.value,
    deaths: records.deaths.value,
    kd: records.kd.value,
    damageDealt: records.damageDealt.value,
    damageTaken: records.damageTaken.value,
    ccHits: records.ccHits.value,
    fortDamage: records.fortDamage.value,
    avgKills: average(killsValues),
    avgDeaths: average(deathsValues),
    avgKd: average(kdValues),
    avgDamage: average(damageValues),
    avgFortDamage: records.fortDamage.available
      ? average(
          (logs || [])
            .map((log) =>
              getLogMetricRecord(
                log,
                'fortDamage',
              ),
            )
            .filter((record) => record.available)
            .map((record) => record.value),
        )
      : 0,
    availability,
    topKillers: topBy(
      enrichedPlayers,
      'kills',
      6,
    ),
    topDamagePlayers: topBy(
      enrichedPlayers.filter(
        (player) =>
          explicitMetricAvailability(
            player,
            'damageDealt',
          ) === true,
      ),
      'damageDealt',
      6,
    ),
    metricBars: {
      matches: buildMetricBars(logs, 'matches'),
      kills: buildMetricBars(logs, 'kills'),
      deaths: buildMetricBars(logs, 'deaths'),
      kd: buildMetricBars(logs, 'kd'),
      damageDealt: buildMetricBars(
        logs,
        'damageDealt',
      ),
      ccHits: buildMetricBars(logs, 'ccHits'),
      fortDamage: buildMetricBars(
        logs,
        'fortDamage',
      ),
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
  centerSub = false,
  tone = 'blue',
  accentBar = false,
  bars = [],
  compactCard = false,
  showIcon = true,
  sparklineValues = null,
  sparklineUid = '',
  available = true,
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

  const hasSparkline =
    available &&
    Array.isArray(sparklineValues) &&
    sparklineValues.length > 0;

  return (
    <div
      className={cls(
        'relative rounded-[26px] border shadow-2xl',
        compactCard ? 'min-h-[82px] p-2.5' : 'min-h-[124px] p-3.5',
        accentBar && !hasSparkline && 'overflow-hidden pr-28',
        tones[tone],
      )}
    >
      {accentBar && available && !hasSparkline && (
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
          <p
            className={cls(
              'font-black text-white',
              compactCard
                ? 'mt-0.5 text-xl'
                : 'mt-1 text-2xl',
            )}
          >
            {available ? value : '—'}
          </p>
          {sub && !centerSub && (
            <p className="mt-0.5 text-[11px] font-bold text-slate-400">
              {sub}
            </p>
          )}
        </div>
        {!accentBar && showIcon && Icon && (
          <div className="rounded-2xl border border-white/10 bg-white/10 p-2.5">
            <Icon size={compactCard ? 18 : 22} />
          </div>
        )}
      </div>

      {sub && centerSub && (
        <p className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-center text-[15px] font-black uppercase tracking-[0.13em] text-blue-200">
          {sub}
        </p>
      )}

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

function getKdBadgeStyle(value) {
  const ratio = num(value);
  const normalized = Math.max(
    0,
    Math.min(1, (ratio - 0.49) / 1.02),
  );
  const hue = Math.round(normalized * 120);
  const secondHue = Math.min(120, hue + 18);

  return {
    background: `linear-gradient(90deg, hsla(${hue}, 88%, 45%, .28), hsla(${secondHue}, 88%, 48%, .48))`,
    borderColor: `hsla(${hue}, 88%, 62%, .62)`,
    color: `hsl(${hue}, 92%, 82%)`,
    boxShadow: `0 0 14px hsla(${hue}, 88%, 50%, .14)`,
  };
}

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

        <span
          className="rounded-full border px-2 py-0.5 text-[9px] font-black"
          style={getKdBadgeStyle(guild.kdNumber)}
        >
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
          <div className="grid grid-cols-4 gap-4 text-center">
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
                    Tier
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

  function sparkValues(metric) {
    return rawRows
      .filter(
        (row) => Boolean(row?.available?.[metric]),
      )
      .map((row) => num(row?.[metric]));
  }

  const sparkKills = sparkValues('kills');
  const sparkDeaths = sparkValues('deaths');
  const sparkKd = sparkValues('kd');
  const sparkDamage = sparkValues('damageDealt');

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <MetricCard
          label="Node Wars"
          value={compact(data.matches)}
          available={data.availability.matches}
          sub="Adversary"
          centerSub
          tone="blue"
          showIcon={false}
        />
        <MetricCard
          icon={Swords}
          label="Kills"
          value={compact(data.kills)}
          available={data.availability.kills}
          sub="All-time"
          tone="emerald"
          accentBar
          bars={data.metricBars.kills}
        />
        <MetricCard
          icon={Skull}
          label="Deaths"
          value={compact(data.deaths)}
          available={data.availability.deaths}
          sub="All-time"
          tone="rose"
          accentBar
          bars={data.metricBars.deaths}
        />
        <MetricCard
          icon={Gauge}
          label="K/D"
          value={decimal(data.kd)}
          available={data.availability.kd}
          sub="Ratio"
          tone="blue"
          accentBar
          bars={data.metricBars.kd}
        />
        <MetricCard
          icon={Zap}
          label="Damage"
          value={compact(data.damageDealt)}
          available={data.availability.damageDealt}
          sub="Dealt"
          tone="amber"
          accentBar
          bars={data.metricBars.damageDealt}
        />
        <MetricCard
          icon={Crosshair}
          label="CC"
          value={compact(data.ccHits)}
          available={data.availability.ccHits}
          sub="Hits"
          tone="cyan"
          accentBar
          bars={data.metricBars.ccHits}
        />
        <MetricCard
          icon={Castle}
          label="Fort"
          value={compact(data.fortDamage)}
          available={data.availability.fortDamage}
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
            available={data.availability.avgKills}
            sub="Per recorded match"
            tone="emerald"
            compactCard
            showIcon={false}
            sparklineValues={sparkKills}
            sparklineUid="kills"
          />
          <MetricCard
            label="Avg Deaths"
            value={compact(data.avgDeaths)}
            available={data.availability.avgDeaths}
            sub="Per recorded match"
            tone="rose"
            compactCard
            showIcon={false}
            sparklineValues={sparkDeaths}
            sparklineUid="deaths"
          />
          <MetricCard
            label="Avg K/D"
            value={decimal(data.avgKd)}
            available={data.availability.avgKd}
            sub="Per recorded match"
            tone="blue"
            compactCard
            showIcon={false}
            sparklineValues={sparkKd}
            sparklineUid="kd"
          />
          <MetricCard
            label="Avg Damage"
            value={compact(data.avgDamage)}
            available={data.availability.avgDamage}
            sub="Per recorded match"
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
