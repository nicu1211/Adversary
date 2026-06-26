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
  calculateStreaks,
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

function MetricGlyph({ type, color }) {
  const commonProps = {
    width: '1em',
    height: '1em',
    viewBox: '-10 -10 20 20',
    style: {
      display: 'inline-block',
      verticalAlign: '-0.12em',
      filter: `drop-shadow(0 0 0.22em ${color})`,
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

  if (type === 'players') {
    return (
      <svg {...commonProps}>
        <circle cx="-2.8" cy="-2.2" r="2.2" fill={color} stroke={darkStroke} strokeWidth="1" />
        <circle cx="3.3" cy="-1.2" r="1.9" fill={color} opacity="0.92" stroke={darkStroke} strokeWidth="1" />
        <path
          d="M -6.4 7.2 C -6.4 4.4 -4.3 2.2 -1.7 2.2 H 0.2 C 2.9 2.2 5 4.4 5 7.2"
          fill={color}
          stroke={darkStroke}
          strokeWidth="1.1"
          strokeLinejoin="round"
        />
        <path
          d="M 0.6 6.7 C 0.9 5 2.3 3.6 4 3.6 H 5.5 C 7 3.6 8.2 4.8 8.4 6.3"
          fill={color}
          opacity="0.9"
          stroke={darkStroke}
          strokeWidth="1"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === 'damageDealt') {
    return (
      <svg {...commonProps}>
        <g transform="translate(0.1 0.15) scale(0.94)">
          <path
            d="M -9.1 7.5
               C -9.1 4.2 -8.4 1.7 -7.1 -0.1
               L -5.8 -1.9
               C -5 -3 -3.9 -3.8 -2.6 -4.4
               L 1.6 -6.4
               C 3.8 -7.5 5.9 -7.7 7.7 -7.1
               L 9 -6.6
               C 9.8 -6.3 10.2 -5.3 9.8 -4.5
               L 8.9 -2.9
               C 8.5 -2.2 7.8 -1.8 7 -1.8
               L 5.7 -1.8
               C 4.2 -1.8 3 -1.3 2.1 -0.4
               L 0.3 1.4
               L -1 2.7
               C -1.7 3.4 -1.6 4.7 -0.7 5.3
               L 0.1 5.9
               C 0.9 6.5 1.9 6.8 2.9 6.7
               L 4 6.5
               C 5.8 6.3 7.4 6.8 8.8 7.9
               L 10 8.9
               C 10.5 9.3 10.6 10.1 10.2 10.6
               L 8.9 12.2
               C 8.4 12.7 7.6 12.8 7.1 12.3
               L 5.4 10.8
               C 4.1 9.6 2.4 9 0.6 9
               L -1.5 9
               C -4.4 9 -6.8 8.6 -9.1 7.5 Z"
            fill={color}
            stroke={darkStroke}
            strokeWidth="1.05"
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
            d="M -7 2.8 C -7 0.5 -5.4 -1.1 -3.1 -1.1 L -0.8 -1.1 C 0.8 -1.1 2 0.1 2 1.7 C 2 3.4 0.8 4.6 -0.8 4.6 L -2 4.6"
            fill="none"
            stroke={color}
            strokeWidth="2.15"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 7 -2.8 C 7 -0.5 5.4 1.1 3.1 1.1 L 0.8 1.1 C -0.8 1.1 -2 -0.1 -2 -1.7 C -2 -3.4 -0.8 -4.6 0.8 -4.6 L 2 -4.6"
            fill="none"
            stroke={color}
            strokeWidth="2.15"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M -0.7 -0.8 L 0.7 0.8 M -0.7 0.8 L 0.7 -0.8" stroke={darkStroke} strokeWidth="1.35" strokeLinecap="round" />
          <path d="M -1.7 -2 L -2.7 -3.1 M 1.7 2 L 2.7 3.1" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
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

function normalizePlayerName(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, '')
    .trim()
    .toLowerCase();
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
      if (!samePlayerName(event.killer, feed.name)) return false;

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

  function eventTimeKey(event) {
    return [
      event?.date || '9999-99-99',
      String(
        Number(event?.sec) || timeToSecondsValue(event?.time),
      ).padStart(8, '0'),
      String(Number(event?.i) || 0).padStart(8, '0'),
    ].join(' ');
  }

  function feedTimeKey(feed) {
    return [
      feed?.date || '9999-99-99',
      String(timeToSecondsValue(feed?.start)).padStart(8, '0'),
      String(feed?.id || ''),
      normalizePlayerName(feed?.name),
    ].join(' ');
  }

  function statsHasTimeline(oneStats) {
    if (oneStats?.hasTimeline) return true;

    return (oneStats?.ev || []).some(
      (event) =>
        event?.hasTimestamp !== false &&
        event?.source !== 'summary' &&
        event?.time != null,
    );
  }

  function guildPlayerFromEvent(event) {
    return (
      event?.guildPlayer ||
      (event?.type === 'kill' ? event?.killer : event?.victim) ||
      ''
    );
  }

  function hasOwnMetric(source, aliases) {
    return Boolean(
      source &&
        aliases.some(
          (alias) =>
            Object.prototype.hasOwnProperty.call(source, alias) &&
            source[alias] !== undefined &&
            source[alias] !== null &&
            source[alias] !== '',
        ),
    );
  }

  function readMetric(source, aliases, fallback = 0) {
    if (!source) return fallback;

    const alias = aliases.find(
      (key) =>
        Object.prototype.hasOwnProperty.call(source, key) &&
        source[key] !== undefined &&
        source[key] !== null &&
        source[key] !== '',
    );

    return alias == null ? fallback : Number(source[alias]) || 0;
  }

  const metricAliases = {
    feed: ['killFeed', 'feed', 'killStreak'],
    damageDealt: [
      'damageDealt',
      'damage_dealt',
      'damage dealt',
      'damageDone',
      'damage',
    ],
    damageTaken: [
      'damageTaken',
      'damage_taken',
      'damage taken',
      'Damage Taken',
    ],
    ccHits: [
      'ccHits',
      'cc_hits',
      'cc hits',
      'CC Hits',
      'cc',
      'CC',
    ],
    fortDamage: [
      'fortDamage',
      'damageToFort',
      'damage_to_fort',
      'damage to fort',
      'Fort Damage',
    ],
  };

  function buildRowsFromStats(oneStats) {
    const hasTimeline = statsHasTimeline(oneStats);
    const timelineStreaks = hasTimeline
      ? calculateStreaks(oneStats?.ev || [])
      : {};
    const timelineFeeds = hasTimeline
      ? calculateKillFeed(oneStats?.ev || [], 30)
      : {};

    const playerByKey = new Map();
    const secondaryByKey = new Map();
    const displayNameByKey = new Map();
    const combatPlayerKeys = new Set();
    const orderedKeys = [];

    function registerName(value) {
      const name = String(value || '').trim();
      const key = normalizePlayerName(name);

      if (!key) return '';

      if (!displayNameByKey.has(key)) {
        displayNameByKey.set(key, name);
        orderedKeys.push(key);
      }

      return key;
    }

    (oneStats?.players || []).forEach((player) => {
      const key = registerName(player?.name);

      if (key) playerByKey.set(key, player);
    });

    const secondaryRows = Array.isArray(oneStats?.secondary?.rows)
      ? oneStats.secondary.rows
      : [];

    secondaryRows.forEach((row) => {
      const key = registerName(row?.player || row?.name);

      if (!key) return;

      const current = secondaryByKey.get(key);

      // A normal Stats Log has one row per player. If duplicate rows exist,
      // retain the row with the largest K+D total instead of double-counting.
      if (
        !current ||
        (Number(row?.kills) || 0) + (Number(row?.deaths) || 0) >
          (Number(current?.kills) || 0) +
            (Number(current?.deaths) || 0)
      ) {
        secondaryByKey.set(key, row);
      }
    });

    (oneStats?.ev || []).forEach((event) => {
      if (event?.type !== 'kill' && event?.type !== 'death') return;

      const key = registerName(guildPlayerFromEvent(event));

      if (key) combatPlayerKeys.add(key);
    });

    return orderedKeys.map((key) => {
      const combatPlayer = playerByKey.get(key) || {};
      const secondaryRow = secondaryByKey.get(key) || null;
      const name =
        combatPlayer?.name ||
        secondaryRow?.player ||
        secondaryRow?.name ||
        displayNameByKey.get(key) ||
        key;
      const hasCombatEvents = combatPlayerKeys.has(key);

      const kills =
        hasTimeline && hasCombatEvents
          ? Number(combatPlayer?.kills) || 0
          : secondaryRow
            ? Number(secondaryRow?.kills) || 0
            : Number(combatPlayer?.kills) || 0;

      const deaths =
        hasTimeline && hasCombatEvents
          ? Number(combatPlayer?.deaths) || 0
          : secondaryRow
            ? Number(secondaryRow?.deaths) || 0
            : Number(combatPlayer?.deaths) || 0;

      const kdNumber = deaths
        ? Number((kills / deaths).toFixed(2))
        : Number(kills.toFixed(2));

      const savedFeedSource =
        secondaryRow && hasOwnMetric(secondaryRow, metricAliases.feed)
          ? secondaryRow
          : combatPlayer;

      const savedFeed = readMetric(
        savedFeedSource,
        metricAliases.feed,
        getPlayerObjectValue(oneStats?.fd, name, 0),
      );

      const feed =
        hasTimeline && hasCombatEvents
          ? Number(getPlayerObjectValue(timelineFeeds, name, 0)) || 0
          : savedFeed;

      const readOptionalMetric = (metric) => {
        const aliases = metricAliases[metric];

        if (hasOwnMetric(secondaryRow, aliases)) {
          return readMetric(secondaryRow, aliases, 0);
        }

        return readMetric(combatPlayer, aliases, 0);
      };

      const optionalMetricExists = (metric) => {
        const aliases = metricAliases[metric];

        return (
          hasOwnMetric(secondaryRow, aliases) ||
          hasOwnMetric(combatPlayer, aliases)
        );
      };

      return {
        ...combatPlayer,
        name,
        playerKey: key,
        kills,
        deaths,
        kdNumber,
        streak:
          hasTimeline && hasCombatEvents
            ? Number(getPlayerObjectValue(timelineStreaks, name, 0)) || 0
            : null,
        feed,
        damageDealt: readOptionalMetric('damageDealt'),
        damageTaken: readOptionalMetric('damageTaken'),
        ccHits: readOptionalMetric('ccHits'),
        fortDamage: readOptionalMetric('fortDamage'),
        available: {
          kills: true,
          deaths: true,
          kd: true,
          streak: hasTimeline && hasCombatEvents,
          feed:
            (hasTimeline && hasCombatEvents) ||
            hasOwnMetric(savedFeedSource, metricAliases.feed),
          damageDealt: optionalMetricExists('damageDealt'),
          damageTaken: optionalMetricExists('damageTaken'),
          ccHits: optionalMetricExists('ccHits'),
          fortDamage: optionalMetricExists('fortDamage'),
        },
      };
    });
  }

  function rankRows(rows, key, desc = true, chronology = {}) {
    return Object.fromEntries(
      [...rows]
        .map((player, originalIndex) => ({
          ...player,
          originalIndex,
        }))
        .sort((a, b) => {
          const av = Number(a[key]) || 0;
          const bv = Number(b[key]) || 0;

          if (av !== bv) {
            return desc ? bv - av : av - bv;
          }

          const aTime =
            chronology[a.playerKey] ||
            chronology[a.name] ||
            `9999-99-99 99999999 ${String(a.originalIndex).padStart(
              8,
              '0',
            )}`;
          const bTime =
            chronology[b.playerKey] ||
            chronology[b.name] ||
            `9999-99-99 99999999 ${String(b.originalIndex).padStart(
              8,
              '0',
            )}`;

          return (
            String(aTime).localeCompare(String(bTime)) ||
            a.originalIndex - b.originalIndex ||
            a.name.localeCompare(b.name)
          );
        })
        .map((player, index) => [player.playerKey, index + 1]),
    );
  }

  function buildCombatChronology(oneStats, rows) {
    const rowByKey = new Map(
      rows.map((player) => [player.playerKey, player]),
    );
    const firstAppearance = {};
    const lastActivity = {};
    const finalKill = {};
    const finalDeath = {};

    [...(oneStats?.ev || [])]
      .filter(
        (event) =>
          event?.hasTimestamp !== false &&
          event?.source !== 'summary' &&
          (event?.type === 'kill' || event?.type === 'death'),
      )
      .sort(
        (a, b) =>
          eventTimeKey(a).localeCompare(eventTimeKey(b)) ||
          Number(a?.i || 0) - Number(b?.i || 0),
      )
      .forEach((event) => {
        const playerKey = normalizePlayerName(
          guildPlayerFromEvent(event),
        );

        if (!playerKey || !rowByKey.has(playerKey)) return;

        const key = eventTimeKey(event);

        firstAppearance[playerKey] ||= key;
        lastActivity[playerKey] = key;

        if (event.type === 'kill') {
          finalKill[playerKey] = key;
        }

        if (event.type === 'death') {
          finalDeath[playerKey] = key;
        }
      });

    return {
      firstAppearance,
      lastActivity,
      finalKill,
      finalDeath,
    };
  }

  function chronologyWithFallback(rows, primary, fallback) {
    return Object.fromEntries(
      rows.map((player, index) => [
        player.playerKey,
        primary[player.playerKey] ||
          fallback[player.playerKey] ||
          `9999-99-99 99999999 ${String(index).padStart(8, '0')}`,
      ]),
    );
  }

  function rankKillsForStats(oneStats, rows, chronology) {
    if (!statsHasTimeline(oneStats)) {
      return rankRows(rows, 'kills', true);
    }

    return rankRows(
      rows,
      'kills',
      true,
      chronologyWithFallback(
        rows,
        chronology.finalKill,
        chronology.firstAppearance,
      ),
    );
  }

  function rankDeathsForStats(oneStats, rows, chronology) {
    if (!statsHasTimeline(oneStats)) {
      return rankRows(rows, 'deaths', false);
    }

    return rankRows(
      rows,
      'deaths',
      false,
      chronologyWithFallback(
        rows,
        chronology.finalDeath,
        chronology.firstAppearance,
      ),
    );
  }

  function rankKdForStats(oneStats, rows, chronology) {
    if (!statsHasTimeline(oneStats)) {
      return rankRows(rows, 'kdNumber', true);
    }

    return rankRows(
      rows,
      'kdNumber',
      true,
      chronologyWithFallback(
        rows,
        chronology.lastActivity,
        chronology.firstAppearance,
      ),
    );
  }

  function rankStreakForStats(oneStats, rows) {
    const streakRows = rows.filter(
      (player) => player.available.streak,
    );

    if (!streakRows.length) return {};

    const current = {};
    const best = {};
    const firstBestKey = {};
    const validKeys = new Set(
      streakRows.map((player) => player.playerKey),
    );

    [...(oneStats?.ev || [])]
      .filter(
        (event) =>
          event?.hasTimestamp !== false &&
          event?.source !== 'summary' &&
          (event?.type === 'kill' || event?.type === 'death'),
      )
      .sort(
        (a, b) =>
          eventTimeKey(a).localeCompare(eventTimeKey(b)) ||
          Number(a?.i || 0) - Number(b?.i || 0),
      )
      .forEach((event) => {
        const playerKey = normalizePlayerName(
          guildPlayerFromEvent(event),
        );

        if (!playerKey || !validKeys.has(playerKey)) return;

        if (event.type === 'death') {
          current[playerKey] = 0;
          return;
        }

        current[playerKey] = (current[playerKey] || 0) + 1;

        if (current[playerKey] > (best[playerKey] || 0)) {
          best[playerKey] = current[playerKey];
          firstBestKey[playerKey] = eventTimeKey(event);
        }
      });

    return rankRows(
      streakRows,
      'streak',
      true,
      chronologyWithFallback(streakRows, firstBestKey, {}),
    );
  }

  function rankFeedForStats(oneStats, rows) {
    const feedRows = rows.filter((player) => player.available.feed);

    if (!feedRows.length) return {};

    if (!statsHasTimeline(oneStats)) {
      return rankRows(feedRows, 'feed', true);
    }

    const feedDetails = calculateKillFeed(
      oneStats?.ev || [],
      30,
      true,
    );
    const bestFeedByPlayer = {};

    feedDetails.forEach((feed) => {
      const playerKey = normalizePlayerName(feed?.name);

      if (!playerKey) return;

      const next = {
        count: Number(feed?.count) || 0,
        firstKey: feedTimeKey(feed),
      };
      const current = bestFeedByPlayer[playerKey];

      if (
        !current ||
        next.count > current.count ||
        (next.count === current.count &&
          next.firstKey < current.firstKey)
      ) {
        bestFeedByPlayer[playerKey] = next;
      }
    });

    const chronology = Object.fromEntries(
      feedRows.map((player, index) => [
        player.playerKey,
        bestFeedByPlayer[player.playerKey]?.firstKey ||
          `9999-99-99 ${String(index).padStart(8, '0')}`,
      ]),
    );

    return rankRows(feedRows, 'feed', true, chronology);
  }

  function rankOptionalMetric(
    rows,
    key,
    desc,
    combatChronology,
  ) {
    const metricRows = rows.filter(
      (player) => player.available[key],
    );

    if (!metricRows.length) return {};

    return rankRows(
      metricRows,
      key,
      desc,
      chronologyWithFallback(
        metricRows,
        combatChronology.firstAppearance,
        combatChronology.lastActivity,
      ),
    );
  }

  const byPlayerKey = useMemo(
    () =>
      Object.fromEntries(
        (players || []).map((player) => [
          normalizePlayerName(player?.name),
          player,
        ]),
      ),
    [players],
  );

  const {
    averageRanks,
    overallCombatChronology,
  } = useMemo(() => {
    const result = {};
    const chronology = {};

    [...(events || [])]
      .filter(
        (event) =>
          event?.hasTimestamp !== false &&
          event?.source !== 'summary' &&
          (event?.type === 'kill' || event?.type === 'death'),
      )
      .sort(
        (a, b) =>
          eventTimeKey(a).localeCompare(eventTimeKey(b)) ||
          Number(a?.i || 0) - Number(b?.i || 0),
      )
      .forEach((event) => {
        const playerKey = normalizePlayerName(
          guildPlayerFromEvent(event),
        );

        if (playerKey && !chronology[playerKey]) {
          chronology[playerKey] = eventTimeKey(event);
        }
      });

    function ensurePlayer(player) {
      const playerKey = player.playerKey;

      if (!result[playerKey]) {
        result[playerKey] = {
          displayName: player.name,
          matches: 0,
          warAverageTotal: 0,
          metricTotals: {
            kills: 0,
            deaths: 0,
            kd: 0,
            streak: 0,
            feed: 0,
            damageDealt: 0,
            damageTaken: 0,
            ccHits: 0,
            fortDamage: 0,
          },
          metricMatches: {
            kills: 0,
            deaths: 0,
            kd: 0,
            streak: 0,
            feed: 0,
            damageDealt: 0,
            damageTaken: 0,
            ccHits: 0,
            fortDamage: 0,
          },
        };
      }

      return result[playerKey];
    }

    (selectedLogs || []).forEach((log) => {
      const oneStats = calculateStats([log]);
      const rows = buildRowsFromStats(oneStats);

      if (!rows.length) return;

      const combatChronology = buildCombatChronology(
        oneStats,
        rows,
      );

      const ranks = {
        kills: rankKillsForStats(
          oneStats,
          rows,
          combatChronology,
        ),
        deaths: rankDeathsForStats(
          oneStats,
          rows,
          combatChronology,
        ),
        kd: rankKdForStats(oneStats, rows, combatChronology),
        streak: rankStreakForStats(oneStats, rows),
        feed: rankFeedForStats(oneStats, rows),
        damageDealt: rankOptionalMetric(
          rows,
          'damageDealt',
          true,
          combatChronology,
        ),
        damageTaken: rankOptionalMetric(
          rows,
          'damageTaken',
          false,
          combatChronology,
        ),
        ccHits: rankOptionalMetric(
          rows,
          'ccHits',
          true,
          combatChronology,
        ),
        fortDamage: rankOptionalMetric(
          rows,
          'fortDamage',
          true,
          combatChronology,
        ),
      };

      rows.forEach((player) => {
        const entry = ensurePlayer(player);
        const warRanks = [];

        Object.entries(ranks).forEach(([metric, rankMap]) => {
          const rank = Number(rankMap[player.playerKey]);

          // Never count a missing lookup as rank zero. A metric contributes
          // only when this player was eligible for that metric in this war.
          if (!Number.isFinite(rank) || rank <= 0) return;

          entry.metricTotals[metric] += rank;
          entry.metricMatches[metric] += 1;
          warRanks.push(rank);
        });

        if (!warRanks.length) return;

        // Each war has equal weight, regardless of whether it contains only
        // Combat Log metrics or the complete Stats Log metric set.
        entry.matches += 1;
        entry.warAverageTotal +=
          warRanks.reduce((sum, rank) => sum + rank, 0) /
          warRanks.length;
      });
    });

    const calculatedRanks = Object.fromEntries(
      Object.entries(result).map(([playerKey, data]) => {
        const ranks = Object.fromEntries(
          Object.keys(data.metricTotals).map((metric) => [
            metric,
            data.metricMatches[metric]
              ? data.metricTotals[metric] /
                data.metricMatches[metric]
              : null,
          ]),
        );

        return [
          playerKey,
          {
            displayName: data.displayName,
            matches: data.matches,
            ranks,
            average: data.matches
              ? data.warAverageTotal / data.matches
              : 9999,
          },
        ];
      }),
    );

    return {
      averageRanks: calculatedRanks,
      overallCombatChronology: chronology,
    };
  }, [events, selectedLogs]);

  const names = useMemo(() => {
    const namesByKey = new Map();

    function addName(value) {
      const name = String(value || '').trim();
      const key = normalizePlayerName(name);

      if (key && !namesByKey.has(key)) {
        namesByKey.set(key, name);
      }
    }

    (members || []).forEach((member) => addName(member?.name));
    (players || []).forEach((player) => addName(player?.name));

    Object.values(averageRanks).forEach((data) =>
      addName(data?.displayName),
    );

    return [...namesByKey.entries()].map(([playerKey, name]) => ({
      playerKey,
      name,
    }));
  }, [members, players, averageRanks]);

  const rows = names.map(({ playerKey, name }) => {
    const player = byPlayerKey[playerKey] || {
      name,
      kills: 0,
      deaths: 0,
      kd: '0.00',
    };
    const rankData = averageRanks[playerKey];

    return {
      ...player,
      name,
      kdNumber: Number(player?.kd) || 0,
      streak:
        rankData?.ranks?.streak == null
          ? null
          : Number(getPlayerObjectValue(streaks, name, 0)) || 0,
      feed:
        rankData?.ranks?.feed == null
          ? null
          : Number(getPlayerObjectValue(feeds, name, 0)) || 0,
      average: rankData?.average ?? 9999,
      matches: rankData?.matches ?? 0,
      averageRankKills: rankData?.ranks?.kills ?? null,
      averageRankDeaths: rankData?.ranks?.deaths ?? null,
      averageRankKd: rankData?.ranks?.kd ?? null,
      averageRankStreak: rankData?.ranks?.streak ?? null,
      averageRankFeed: rankData?.ranks?.feed ?? null,
      averageRankDamageDealt:
        rankData?.ranks?.damageDealt ?? null,
      averageRankDamageTaken:
        rankData?.ranks?.damageTaken ?? null,
      averageRankCcHits: rankData?.ranks?.ccHits ?? null,
      averageRankFortDamage:
        rankData?.ranks?.fortDamage ?? null,
      chronologyKey:
        overallCombatChronology[playerKey] ||
        '9999-99-99 99999999',
    };
  });

  const final = rows
    .filter((player) =>
      normalizePlayerName(player.name).includes(
        normalizePlayerName(query),
      ),
    )
    .sort(
      (a, b) =>
        a.average - b.average ||
        a.chronologyKey.localeCompare(b.chronologyKey) ||
        a.name.localeCompare(b.name),
    );

  function formatAverageRank(value) {
    return value == null ? '-' : Number(value).toFixed(2);
  }

  return (
    <Panel cls="h-[680px]">
      <div className="flex h-full flex-col">
        <h3 className="text-xl font-black">♛ Best Overall</h3>

        <p className="mb-3 text-xs text-slate-400">
          Equal-weight average of each selected war&apos;s available
          metric ranks
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
                    <span className="mr-2 text-slate-500">
                      {index + 1}
                    </span>
                    {player.name}

                    <span className="ml-2 text-xs font-bold text-slate-500">
                      {player.matches} wars
                    </span>
                  </b>

                  <span className="rounded-md border border-blue-400/20 bg-blue-500/5 px-2 py-1 text-sm font-black text-blue-300">
                    <small className="mr-1 text-[9px] uppercase text-blue-200/80">
                      Avg
                    </small>

                    {player.average === 9999
                      ? '-'
                      : player.average.toFixed(2)}
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
                      formatAverageRank(
                        player.averageRankDamageDealt,
                      ),
                      'text-cyan-300',
                    ],
                    [
                      'Taken',
                      formatAverageRank(
                        player.averageRankDamageTaken,
                      ),
                      'text-rose-300',
                    ],
                    [
                      'CC',
                      formatAverageRank(player.averageRankCcHits),
                      'text-violet-300',
                    ],
                    [
                      'Fort',
                      formatAverageRank(
                        player.averageRankFortDamage,
                      ),
                      'text-amber-300',
                    ],
                  ].map((item) => (
                    <div
                      key={item[0]}
                      className="rounded-md bg-slate-950/70 p-1"
                    >
                      <p className="text-slate-500">{item[0]}</p>
                      <b className={item[2]}>
                        {item[1] === '-'
                          ? '-'
                          : `#${item[1]}`}
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
    .filter((player) => normalizePlayerName(player.name).includes(normalizePlayerName(query)))
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
      <div className={`mx-auto flex w-full min-w-0 flex-col items-center ${className}`}>
        <span className="whitespace-nowrap text-center leading-none">{children}</span>

        <span className="mt-1.5 block h-[2px] w-[58%] overflow-hidden rounded-full bg-slate-800/55">
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
              ? 'w-full font-black text-blue-300'
              : 'w-full font-black hover:text-blue-300'
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
            samePlayerName(event.killer, selected.name) ||
            samePlayerName(event.victim, selected.name),
        )
        .sort((a, b) => a.date.localeCompare(b.date) || a.sec - b.sec)
    : [];

  const kills = history.filter(
    (event) => samePlayerName(event.killer, selected?.name),
  ).length;

  const deaths = history.filter(
    (event) => samePlayerName(event.victim, selected?.name),
  ).length;

  const kd = deaths ? (kills / deaths).toFixed(2) : kills.toFixed(2);

  const victims = {};
  const nemesis = {};

  history.forEach((event) => {
    if (samePlayerName(event.killer, selected?.name)) add(victims, event.victim);
    if (samePlayerName(event.victim, selected?.name)) add(nemesis, event.killer);
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
            <table className="w-full table-fixed text-xs">
              <colgroup>
                <col className="w-[13%]" />
                <col className="w-[9.666%]" />
                <col className="w-[9.666%]" />
                <col className="w-[9.666%]" />
                <col className="w-[9.666%]" />
                <col className="w-[9.666%]" />
                <col className="w-[9.666%]" />
                <col className="w-[9.666%]" />
                <col className="w-[9.666%]" />
                <col className="w-[9.666%]" />
              </colgroup>
              <thead className="sticky top-0 z-10 bg-slate-900 text-xs uppercase text-slate-400">
                <tr>
                  <Header id="name" className="pl-4 text-left">
                    Family
                  </Header>
                  <Header id="kills" className="text-center">
                    Kills
                  </Header>
                  <Header id="deaths" className="text-center">
                    Deaths
                  </Header>
                  <Header id="kd" className="text-center">
                    K/D
                  </Header>
                  <Header id="streak" className="text-center">
                    Killstreak
                  </Header>
                  <Header id="feed" className="text-center">
                    KillFeed
                  </Header>
                  <Header id="damageDealt" className="text-center">
                    DMG Dealt
                  </Header>
                  <Header id="damageTaken" className="text-center">
                    DMG Taken
                  </Header>
                  <Header id="ccHits" className="text-center">
                    CC Hits
                  </Header>
                  <Header id="fortDamage" className="text-center">
                    DMG to Fort
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

                    <td className="py-2 text-center font-black text-blue-300">
                      <ProgressValue id="kills" value={player.kills}>
                        <MetricGlyph type="kills" color="#60a5fa" /> {formatNumber(player.kills)}
                      </ProgressValue>
                    </td>

                    <td className="py-2 text-center font-black text-pink-300">
                      <ProgressValue id="deaths" value={player.deaths}>
                        <MetricGlyph type="deaths" color="#dc2626" /> {formatNumber(player.deaths)}
                      </ProgressValue>
                    </td>

                    <td
                      className={`py-2 text-center font-black ${
                        Number(player.kd) < 1 ? 'text-red-400' : 'text-emerald-300'
                      }`}
                    >
                      <ProgressValue id="kd" value={player.kd}>
                        <MetricGlyph type="kd" color={Number(player.kd) < 1 ? "#ef4444" : "#22c55e"} /> {player.kd}
                      </ProgressValue>
                    </td>

                    <td className="py-2 text-center font-black">
                      <ProgressValue id="streak" value={player.streak}>
                        {formatNumber(player.streak)}
                      </ProgressValue>
                    </td>

                    <td className="py-2 text-center font-black text-orange-300">
                      <ProgressValue id="feed" value={player.feed}>
                        🔥 {formatNumber(player.feed)}
                      </ProgressValue>
                    </td>

                    <td className="py-2 text-center font-black text-cyan-300">
                      <ProgressValue id="damageDealt" value={player.damageDealt}>
                        {formatNumber(player.damageDealt)}
                      </ProgressValue>
                    </td>

                    <td className="py-2 text-center font-black text-rose-300">
                      <ProgressValue id="damageTaken" value={player.damageTaken}>
                        {formatNumber(player.damageTaken)}
                      </ProgressValue>
                    </td>

                    <td className="py-2 text-center font-black text-violet-300">
                      <ProgressValue id="ccHits" value={player.ccHits}>
                        {formatNumber(player.ccHits)}
                      </ProgressValue>
                    </td>

                    <td className="py-2 text-center font-black text-amber-300">
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
                            samePlayerName(event.killer, selected.name)
                              ? 'bg-blue-500/15 text-blue-300'
                              : 'bg-pink-500/15 text-pink-300'
                          }`}
                        >
                          {samePlayerName(event.killer, selected.name) ? 'KILL' : 'DEATH'}
                        </span>
                      </td>

                      <td className="py-3 font-bold">
                        {samePlayerName(event.killer, selected.name)
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
    if (kd > 1.5) {
      return [59, 130, 246];
    }

    if (kd >= 1.3) {
      return [34, 197, 94];
    }

    if (kd >= 1.1) {
      return [250, 204, 21];
    }

    if (kd >= 1) {
      return [249, 115, 22];
    }

    return [239, 68, 68];
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
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-700/80 bg-white/[0.035] backdrop-blur-sm">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(239,68,68,0.045)_0%,rgba(255,255,255,0.018)_46%,rgba(255,255,255,0.018)_54%,rgba(34,197,94,0.045)_100%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_left_center,rgba(239,68,68,0.05),transparent_42%),radial-gradient(circle_at_right_center,rgba(34,197,94,0.05),transparent_42%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.008))]" />
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

function buildKillFeedPanelRows(selectedLogs, fallbackEvents) {
  const records = [];

  (selectedLogs || []).forEach((log, logIndex) => {
    const oneStats = calculateStats([log]);

    const fallbackDate = String(
      log?.date ||
        log?.warDate ||
        log?.war_date ||
        log?.createdAt ||
        log?.created_at ||
        '',
    ).slice(0, 10);

    const fallbackWar = String(
      log?.name ||
        log?.title ||
        fallbackDate ||
        'Battle log',
    );

    calculateKillFeed(oneStats?.ev || [], 30, true).forEach(
      (feed, feedIndex) => {
        records.push({
          ...feed,
          source: 'combat',
          sourceOrder: logIndex,
          rowOrder: feedIndex,
          war: feed.war || fallbackWar,
          date: String(feed.date || fallbackDate || '').slice(0, 10),
        });
      },
    );
  });

  if (records.length) return records;

  return calculateKillFeed(fallbackEvents || [], 30, true).map(
    (feed, index) => ({
      ...feed,
      source: 'combat',
      sourceOrder: index,
      rowOrder: index,
    }),
  );
}

function KillFeedPanel({ killFeeds, events }) {
  const rows = [...(killFeeds || [])]
    .sort(
      (a, b) =>
        (Number(b.count) || 0) - (Number(a.count) || 0) ||
        String(a.date || '9999-99-99').localeCompare(
          String(b.date || '9999-99-99'),
        ) ||
        timeToSecondsValue(a.start) - timeToSecondsValue(b.start) ||
        (Number(a.sourceOrder) || 0) - (Number(b.sourceOrder) || 0) ||
        (Number(a.rowOrder) || 0) - (Number(b.rowOrder) || 0) ||
        String(a.name || '').localeCompare(String(b.name || '')),
    )
    .slice(0, 5);

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
              const detail = `${feed.date ? `${feed.date} · ` : ''}${
                feed.start || '-'
              }-${feed.end || '-'}`;

              return (
                <div
                  key={`${feed.source || 'feed'}-${feed.date || ''}-${feed.name || ''}-${feed.sourceOrder || 0}-${feed.rowOrder || index}`}
                  className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <b className="truncate text-sm">
                      {index + 1}. {feed.name}
                    </b>

                    <b className="shrink-0 text-sm text-orange-300">
                      🔥 {Number(feed.count) || 0}
                    </b>
                  </div>

                  <p className="truncate text-[11px] text-slate-400">
                    {detail}
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
  const timelineKillFeeds = calculateKillFeed(stats.ev, 30, true);
  const panelKillFeeds = useMemo(
    () => buildKillFeedPanelRows(selectedLogs, stats.ev),
    [selectedLogs, stats.ev],
  );
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
    ? timelineKillFeeds.slice(0, 5).map((feed, index) => {
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
            icon={<MetricGlyph type="kills" color="#1d4ed8" />}
            label="Total Kills"
            value={stats.kills}
            sub="Eliminations"
            className="border-blue-800/30 from-blue-900/20 text-blue-700"
          />

          <Metric
            icon={<MetricGlyph type="deaths" color="#dc2626" />}
            label="Total Deaths"
            value={stats.deaths}
            sub="Deaths"
            className="border-red-800/30 from-red-900/20 text-red-700"
          />

          <Metric
            icon={<MetricGlyph type="kd" color={Number(stats.kd) < 1 ? "#ef4444" : "#22c55e"} />}
            label="K/D"
            value={stats.kd}
            sub="Ratio"
            className={
              Number(stats.kd) < 1
                ? "border-red-500/30 from-red-900/20 text-red-400"
                : "border-emerald-500/30 from-emerald-900/20 text-emerald-400"
            }
          />

          <Metric
            icon={<MetricGlyph type="players" color="#a855f7" />}
            label="Players"
            value={stats.players.length}
            sub="Active"
            className="border-purple-500/30 from-purple-900/20 text-purple-400"
          />

          <Metric
            icon={<MetricGlyph type="damageDealt" color="#38bdf8" />}
            label="Damage"
            value={compactNumber(damageDealt)}
            sub="Dealt"
            className="border-sky-400/30 from-sky-900/20 text-sky-300"
          />

          <Metric
            icon={<MetricGlyph type="damageTaken" color="#f97316" />}
            label="Damage Taken"
            value={compactNumber(damageTaken)}
            sub="Taken"
            className="border-orange-500/30 from-orange-900/20 text-orange-400"
          />

          <Metric
            icon={<MetricGlyph type="ccHits" color="#facc15" />}
            label="CC Hits"
            value={compactNumber(ccHits)}
            sub="Control"
            className="border-yellow-400/30 from-yellow-900/20 text-yellow-300"
          />

          <Metric
            icon={<MetricGlyph type="damageToFort" color="#92400e" />}
            label="Fort Damage"
            value={compactNumber(fortDamage)}
            sub="Structure"
            className="border-amber-900/40 from-amber-950/25 text-amber-800"
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

        <KillFeedPanel killFeeds={panelKillFeeds} events={stats.ev} />
      </section>
    </>
  );
}
