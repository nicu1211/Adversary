import React, { useId, useMemo, useState } from 'react';
import {
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ComposedChart,
  Bar,
  Line as RechartsLine,
  Legend,
  ReferenceLine,
} from 'recharts';
import { Panel } from './UI';

const axisTick = {
  fill: '#94a3b8',
  fontSize: 11,
};

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function pick(obj, keys, fallback = null) {
  for (const key of keys) {
    if (obj && obj[key] != null) return obj[key];
  }

  return fallback;
}

function buildSmoothPath(points) {
  if (!points.length) return '';

  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return path;
}

function getLabelStep(length) {
  if (length <= 8) return 1;
  if (length <= 14) return 2;
  if (length <= 24) return 3;
  if (length <= 36) return 4;

  return Math.ceil(length / 8);
}

function normalizeTimelineData(data = []) {
  return data.map((item, index) => {
    const kills = toNumber(pick(item, ['kills', 'kill', 'k'], 0));
    const deaths = toNumber(pick(item, ['deaths', 'death', 'd'], 0));

    return {
      label:
        pick(
          item,
          ['label', 'time', 'minute', 'slot', 'name', 'x'],
          index + 1,
        ) ?? index + 1,
      kills,
      deaths,
    };
  });
}

function formatTickValue(value) {
  const rounded = Math.round(value);
  return `${rounded > 0 ? '+' : ''}${rounded}`;
}

function buildDynamicTicks(min, max) {
  const ticks = new Set([min, 0, max]);

  const start = Math.ceil(min / 10) * 10;
  const end = Math.floor(max / 10) * 10;

  for (let value = start; value <= end; value += 10) {
    ticks.add(value);
  }

  return [...ticks].sort((a, b) => a - b);
}

function normalizeTimeKey(value) {
  const raw = String(value ?? '').trim();

  if (!raw) return '';

  const parts = raw.split(':').map((part) => part.padStart(2, '0'));

  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]}:${parts[1]}`;

  return `${parts[0]}:${parts[1]}:${parts[2]}`;
}

function toSecondsFromLabel(value) {
  const raw = String(value ?? '').trim();

  if (!raw) return NaN;

  const parts = raw.split(':').map((part) => Number(part) || 0);

  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length >= 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];

  const numeric = Number(raw);

  return Number.isFinite(numeric) ? numeric : NaN;
}

function interpolateMarkerPosition(rows, pointsKills, pointsDeaths, markerSeconds) {
  if (!Number.isFinite(markerSeconds)) return null;

  const timedRows = rows
    .map((row, index) => ({
      index,
      seconds: toSecondsFromLabel(row.label),
    }))
    .filter((row) => Number.isFinite(row.seconds))
    .sort((a, b) => a.seconds - b.seconds);

  if (!timedRows.length) return null;

  if (markerSeconds <= timedRows[0].seconds) {
    const index = timedRows[0].index;

    return {
      index,
      x: pointsKills[index].x,
    };
  }

  if (markerSeconds >= timedRows[timedRows.length - 1].seconds) {
    const index = timedRows[timedRows.length - 1].index;

    return {
      index,
      x: pointsKills[index].x,
    };
  }

  for (let i = 0; i < timedRows.length - 1; i += 1) {
    const current = timedRows[i];
    const next = timedRows[i + 1];

    if (markerSeconds >= current.seconds && markerSeconds <= next.seconds) {
      const range = Math.max(1, next.seconds - current.seconds);
      const ratio = (markerSeconds - current.seconds) / range;

      const currentPoint = pointsKills[current.index];
      const nextPoint = pointsKills[next.index];

      const x = currentPoint.x + (nextPoint.x - currentPoint.x) * ratio;

      const nearestIndex =
        Math.abs(markerSeconds - current.seconds) <=
        Math.abs(markerSeconds - next.seconds)
          ? current.index
          : next.index;

      return {
        index: nearestIndex,
        x,
      };
    }
  }

  return null;
}

export function KillDeathChart({
  data,
  title = '▧ Global Kill/Death Timeline',
  killFeedMarkers = [],
}) {
  const uid = useId();
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [hoveredMarker, setHoveredMarker] = useState(null);

  const rows = useMemo(() => normalizeTimelineData(data || []), [data]);

  const width = 1000;
  const height = 255;
  const pad = { top: 18, right: 16, bottom: 30, left: 40 };

  const chart = useMemo(() => {
    if (!rows.length) return null;

    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;

    const values = rows.flatMap((row) => [row.kills, row.deaths]);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);

    const range = Math.max(1, rawMax - rawMin);
    const extra = Math.max(1, range * 0.18);

    const min = Math.min(0, rawMin - extra);
    const max = rawMax + extra;
    const safeRange = Math.max(1, max - min);

    const pointsKills = rows.map((row, index) => {
      const x =
        rows.length === 1
          ? pad.left + innerW / 2
          : pad.left + (index / (rows.length - 1)) * innerW;

      const y = pad.top + ((max - row.kills) / safeRange) * innerH;

      return {
        x,
        y,
        label: row.label,
        value: row.kills,
      };
    });

    const pointsDeaths = rows.map((row, index) => {
      const x =
        rows.length === 1
          ? pad.left + innerW / 2
          : pad.left + (index / (rows.length - 1)) * innerW;

      const y = pad.top + ((max - row.deaths) / safeRange) * innerH;

      return {
        x,
        y,
        label: row.label,
        value: row.deaths,
      };
    });

    const yTicks = 5;
    const ticks = Array.from({ length: yTicks }, (_, i) => {
      const value = max - ((max - min) * i) / (yTicks - 1);
      const y = pad.top + (innerH * i) / (yTicks - 1);

      return {
        value,
        y,
      };
    });

    const zeroY = pad.top + ((max - 0) / safeRange) * innerH;

    return {
      pointsKills,
      pointsDeaths,
      ticks,
      innerW,
      zeroY,
    };
  }, [rows]);

  if (!chart) {
    return (
      <Panel>
        <h3 className="mb-3 text-xl font-black">{title}</h3>

        <div className="flex h-[255px] items-center justify-center rounded-2xl border border-slate-800 bg-transparent text-slate-500">
          No chart data.
        </div>
      </Panel>
    );
  }

  const { pointsKills, pointsDeaths, ticks, innerW, zeroY } = chart;

  const linePathKills = buildSmoothPath(pointsKills);
  const linePathDeaths = buildSmoothPath(pointsDeaths);
  const labelStep = getLabelStep(rows.length);

  const markerPoints = (killFeedMarkers || [])
    .map((marker, markerIndex) => {
      const markerTime = normalizeTimeKey(marker.time ?? marker.label ?? marker.start);
      const markerSeconds = Number.isFinite(Number(marker.seconds))
        ? Number(marker.seconds)
        : toSecondsFromLabel(markerTime);

      const position = interpolateMarkerPosition(
        rows,
        pointsKills,
        pointsDeaths,
        markerSeconds,
      );

      if (!position || !pointsKills[position.index] || !pointsDeaths[position.index]) {
        return null;
      }

      const pointKill = pointsKills[position.index];
      const pointDeath = pointsDeaths[position.index];

      return {
        ...marker,
        markerIndex,
        isKillFeed: true,
        x: position.x,
        baseY: Math.max(pad.top + 8, Math.min(pointKill.y, pointDeath.y) - 10),
        label: markerTime || rows[position.index].label,
        guild: marker.guild || marker.war || '-',
      };
    })
    .filter(Boolean)
    .map((marker, index, markers) => {
      const closeMarkers = markers.filter(
        (other) => Math.abs(other.x - marker.x) < 10,
      );

      if (closeMarkers.length <= 1) {
        return {
          ...marker,
          y: marker.baseY,
        };
      }

      const localIndex = closeMarkers.findIndex(
        (other) => other.markerIndex === marker.markerIndex,
      );

      const offsets = [0, -14, 14, -28, 28];

      return {
        ...marker,
        y: Math.max(
          pad.top + 8,
          Math.min(
            height - pad.bottom - 8,
            marker.baseY + offsets[localIndex % offsets.length],
          ),
        ),
      };
    });

  const hovered =
    hoveredMarker ||
    (hoveredIndex == null
      ? null
      : {
          x: pointsKills[hoveredIndex].x,
          y: Math.min(
            pointsKills[hoveredIndex].y,
            pointsDeaths[hoveredIndex].y,
          ),
          label: rows[hoveredIndex].label,
          kills: rows[hoveredIndex].kills,
          deaths: rows[hoveredIndex].deaths,
        });

  const topGlowAreaKills = pointsKills.length
    ? `${linePathKills} L ${
        pointsKills[pointsKills.length - 1].x
      } ${height - pad.bottom} L ${pointsKills[0].x} ${
        height - pad.bottom
      } Z`
    : '';

  const topGlowAreaDeaths = pointsDeaths.length
    ? `${linePathDeaths} L ${
        pointsDeaths[pointsDeaths.length - 1].x
      } ${height - pad.bottom} L ${pointsDeaths[0].x} ${
        height - pad.bottom
      } Z`
    : '';

  return (
    <Panel cls="overflow-hidden">
      <div className="mb-3">
        <h3 className="text-xl font-black">{title}</h3>
      </div>

      <div
        className="relative overflow-hidden rounded-2xl border border-slate-800/60 bg-transparent"
        onMouseLeave={() => {
          setHoveredIndex(null);
          setHoveredMarker(null);
        }}
      >
        {hovered && (
          <div
            className="pointer-events-none absolute z-20 rounded-xl border border-slate-700 bg-slate-950/95 px-3 py-2 text-xs shadow-2xl backdrop-blur"
            style={{
              left: `${(hovered.x / width) * 100}%`,
              top: `${(hovered.y / height) * 100}%`,
              transform: 'translate(-50%, calc(-100% - 12px))',
            }}
          >
            <p className="mb-1 font-bold text-slate-200">
              Ora: {hovered.label}
            </p>

            {hovered.isKillFeed ? (
              <p className="text-yellow-300">Guild: {hovered.guild}</p>
            ) : (
              <>
                <p className="text-emerald-300">Kills: {hovered.kills}</p>
                <p className="text-rose-300">Deaths: {hovered.deaths}</p>
              </>
            )}
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block h-auto w-full"
          role="img"
          aria-label={title}
        >
          <defs>
            <linearGradient
              id={`${uid}-stroke-kills`}
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>

            <linearGradient
              id={`${uid}-stroke-deaths`}
              x1="0"
              y1="0"
              x2="1"
              y2="0"
            >
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            <linearGradient
              id={`${uid}-topGlow-kills`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="rgba(16,185,129,0.42)" />
              <stop offset="35%" stopColor="rgba(16,185,129,0.24)" />
              <stop offset="70%" stopColor="rgba(16,185,129,0.10)" />
              <stop offset="100%" stopColor="rgba(16,185,129,0)" />
            </linearGradient>

            <linearGradient
              id={`${uid}-topGlow-deaths`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="rgba(239,68,68,0.42)" />
              <stop offset="35%" stopColor="rgba(239,68,68,0.24)" />
              <stop offset="70%" stopColor="rgba(239,68,68,0.10)" />
              <stop offset="100%" stopColor="rgba(239,68,68,0)" />
            </linearGradient>

            <filter
              id={`${uid}-lineGlowBig-kills`}
              x="-60%"
              y="-60%"
              width="220%"
              height="220%"
            >
              <feGaussianBlur stdDeviation="8" result="blur1" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter
              id={`${uid}-lineGlowSoft-kills`}
              x="-60%"
              y="-60%"
              width="220%"
              height="220%"
            >
              <feGaussianBlur stdDeviation="4" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter
              id={`${uid}-lineGlowBig-deaths`}
              x="-60%"
              y="-60%"
              width="220%"
              height="220%"
            >
              <feGaussianBlur stdDeviation="8" result="blur3" />
              <feMerge>
                <feMergeNode in="blur3" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter
              id={`${uid}-lineGlowSoft-deaths`}
              x="-60%"
              y="-60%"
              width="220%"
              height="220%"
            >
              <feGaussianBlur stdDeviation="4" result="blur4" />
              <feMerge>
                <feMergeNode in="blur4" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {topGlowAreaKills && (
            <path
              d={topGlowAreaKills}
              fill={`url(#${uid}-topGlow-kills)`}
              opacity="1"
            />
          )}

          {topGlowAreaDeaths && (
            <path
              d={topGlowAreaDeaths}
              fill={`url(#${uid}-topGlow-deaths)`}
              opacity="1"
            />
          )}

          <line
            x1={pad.left}
            y1={zeroY}
            x2={width - pad.right}
            y2={zeroY}
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="1.4"
          />

          {ticks.map((tick, index) => (
            <g key={`h-${index}`}>
              <line
                x1={pad.left}
                y1={tick.y}
                x2={width - pad.right}
                y2={tick.y}
                stroke="rgba(255,255,255,0.055)"
                strokeWidth="1"
              />
              <text
                x={pad.left - 8}
                y={tick.y + 4}
                textAnchor="end"
                fontSize="10"
                fill="rgba(255,255,255,0.20)"
              >
                {formatTickValue(tick.value)}
              </text>
            </g>
          ))}

          {rows.map((row, index) => {
            const x =
              rows.length === 1
                ? pad.left + innerW / 2
                : pad.left + (index / (rows.length - 1)) * innerW;

            const showLabel =
              index === 0 ||
              index === rows.length - 1 ||
              index % labelStep === 0;

            return (
              <g key={`v-${index}`}>
                <line
                  x1={x}
                  y1={pad.top}
                  x2={x}
                  y2={height - pad.bottom}
                  stroke="rgba(255,255,255,0.04)"
                  strokeWidth="1"
                  strokeDasharray="2 5"
                />

                {showLabel && (
                  <text
                    x={x}
                    y={height - 10}
                    textAnchor="middle"
                    fontSize="10"
                    fill="rgba(255,255,255,0.24)"
                  >
                    {String(row.label)}
                  </text>
                )}
              </g>
            );
          })}

          <path
            d={linePathKills}
            fill="none"
            stroke={`url(#${uid}-stroke-kills)`}
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.16"
            filter={`url(#${uid}-lineGlowBig-kills)`}
          />

          <path
            d={linePathKills}
            fill="none"
            stroke={`url(#${uid}-stroke-kills)`}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.28"
            filter={`url(#${uid}-lineGlowSoft-kills)`}
          />

          <path
            d={linePathKills}
            fill="none"
            stroke={`url(#${uid}-stroke-kills)`}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d={linePathDeaths}
            fill="none"
            stroke={`url(#${uid}-stroke-deaths)`}
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.16"
            filter={`url(#${uid}-lineGlowBig-deaths)`}
          />

          <path
            d={linePathDeaths}
            fill="none"
            stroke={`url(#${uid}-stroke-deaths)`}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.28"
            filter={`url(#${uid}-lineGlowSoft-deaths)`}
          />

          <path
            d={linePathDeaths}
            fill="none"
            stroke={`url(#${uid}-stroke-deaths)`}
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {hovered && (
            <line
              x1={hovered.x}
              y1={pad.top}
              x2={hovered.x}
              y2={height - pad.bottom}
              stroke="rgba(255,255,255,0.12)"
              strokeWidth="1"
              strokeDasharray="3 5"
            />
          )}

          {rows.map((row, index) => {
            const currentX =
              rows.length === 1
                ? pad.left + innerW / 2
                : pad.left + (index / (rows.length - 1)) * innerW;

            const prevX =
              index === 0
                ? pad.left
                : rows.length === 1
                  ? pad.left
                  : pad.left + ((index - 1) / (rows.length - 1)) * innerW;

            const nextX =
              index === rows.length - 1
                ? width - pad.right
                : rows.length === 1
                  ? width - pad.right
                  : pad.left + ((index + 1) / (rows.length - 1)) * innerW;

            const startX = index === 0 ? pad.left : (prevX + currentX) / 2;
            const endX =
              index === rows.length - 1
                ? width - pad.right
                : (currentX + nextX) / 2;

            return (
              <rect
                key={`hover-${index}`}
                x={startX}
                y={pad.top}
                width={Math.max(12, endX - startX)}
                height={height - pad.top - pad.bottom}
                fill="transparent"
                onMouseEnter={() => {
                  setHoveredIndex(index);
                  setHoveredMarker(null);
                }}
              />
            );
          })}

          {markerPoints.map((marker) => (
            <circle
              key={marker.id || `killfeed-marker-${marker.markerIndex}`}
              cx={marker.x}
              cy={marker.y}
              r="4"
              fill="#facc15"
              stroke="rgba(15,23,42,0.95)"
              strokeWidth="1.5"
              onMouseEnter={() => {
                setHoveredMarker(marker);
                setHoveredIndex(null);
              }}
            />
          ))}
        </svg>
      </div>
    </Panel>
  );
}

function SummaryChip({ label, value, colorClass }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 shadow-lg backdrop-blur-xl">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className={`text-sm font-black ${colorClass}`}>{value}</p>
    </div>
  );
}

function PerformanceTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const map = Object.fromEntries(
    payload.map((item) => [item.dataKey, item.value]),
  );

  const deaths =
    map.deathsNegative != null
      ? Math.abs(Number(map.deathsNegative) || 0)
      : map.deaths ?? 0;

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
      <p className="mb-2 text-sm font-black text-white">{label}</p>

      <div className="space-y-1.5 text-sm">
        <p className="font-bold text-emerald-300">Kills : {map.kills ?? 0}</p>
        <p className="font-bold text-rose-300">Deaths : {deaths}</p>
        <p className="font-bold text-blue-300">K/D : {map.avgKd ?? 0}</p>
      </div>
    </div>
  );
}

export function PerformanceChart({ data }) {
  const summary = useMemo(() => {
    if (!data?.length) {
      return {
        avgKills: '0.00',
        avgDeaths: '0.00',
        avgKd: '0.00',
      };
    }

    const avgKills =
      data.reduce((sum, item) => sum + (Number(item.avgKills) || 0), 0) /
      data.length;

    const avgDeaths =
      data.reduce((sum, item) => sum + (Number(item.avgDeaths) || 0), 0) /
      data.length;

    const avgKd =
      data.reduce((sum, item) => sum + (Number(item.avgKd) || 0), 0) /
      data.length;

    return {
      avgKills: avgKills.toFixed(2),
      avgDeaths: avgDeaths.toFixed(2),
      avgKd: avgKd.toFixed(2),
    };
  }, [data]);

  const performanceData = useMemo(
    () =>
      (data || []).map((item) => ({
        ...item,
        kills: Number(item.kills) || 0,
        deathsNegative: -Math.min(50, Number(item.deaths) || 0),
        avgKd: Number(item.avgKd) || 0,
      })),
    [data],
  );

  const battleDomain = useMemo(() => {
    const maxKills = Math.max(
      1,
      ...performanceData.map((item) => Number(item.kills) || 0),
    );

    const maxDeaths = Math.max(
      1,
      ...performanceData.map((item) =>
        Math.abs(Number(item.deathsNegative) || 0),
      ),
    );

    return {
      min: -Math.min(50, maxDeaths),
      max: maxKills,
    };
  }, [performanceData]);

  const battleTicks = useMemo(
    () => buildDynamicTicks(battleDomain.min, battleDomain.max),
    [battleDomain],
  );

  const avgKdDomain = useMemo(() => {
    const leftMin = battleDomain.min;
    const leftMax = battleDomain.max;
    const leftRange = Math.max(1, leftMax - leftMin);

    const zeroPosition = Math.min(
      0.95,
      Math.max(0.05, (0 - leftMin) / leftRange),
    );

    const values = performanceData.map((item) => Number(item.avgKd) || 0);

    const lowerDeviation = Math.max(
      0.25,
      ...values.map((value) => Math.max(0, 1 - value)),
    );

    const upperDeviation = Math.max(
      0.25,
      ...values.map((value) => Math.max(0, value - 1)),
    );

    const scale = Math.max(
      lowerDeviation / zeroPosition,
      upperDeviation / (1 - zeroPosition),
      0.5,
    );

    const lower = zeroPosition * scale;
    const upper = (1 - zeroPosition) * scale;

    return [1 - lower, 1 + upper];
  }, [battleDomain, performanceData]);

  return (
    <Panel>
      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-2xl font-black">Performance</h2>
          <p className="text-sm text-slate-400">
            Daily performance with kills, deaths and average K/D
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <SummaryChip
            label="Average Kills"
            value={summary.avgKills}
            colorClass="text-emerald-300"
          />

          <SummaryChip
            label="Average Deaths"
            value={summary.avgDeaths}
            colorClass="text-rose-300"
          />

          <SummaryChip
            label="Average K/D"
            value={summary.avgKd}
            colorClass="text-blue-300"
          />
        </div>
      </div>

      <div className="h-[320px] sm:h-[360px] [&_*:focus]:outline-none">
        <ResponsiveContainer>
          <ComposedChart
            data={performanceData}
            stackOffset="sign"
            barCategoryGap="48%"
            barGap={0}
            barSize={19}
            margin={{ top: 6, right: 10, left: 4, bottom: 14 }}
          >
            <defs>
              <linearGradient id="perfBarKills" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6ee7b7" stopOpacity={0.98} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.82} />
              </linearGradient>

              <linearGradient id="perfBarDeaths" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fca5a5" stopOpacity={0.98} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0.82} />
              </linearGradient>

              <linearGradient id="avgKdFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(96,165,250,0.92)" />
                <stop offset="22%" stopColor="rgba(96,165,250,0.72)" />
                <stop offset="45%" stopColor="rgba(96,165,250,0.48)" />
                <stop offset="70%" stopColor="rgba(96,165,250,0.24)" />
                <stop offset="100%" stopColor="rgba(96,165,250,0.02)" />
              </linearGradient>

              <filter
                id="avgKdGlowBig"
                x="-80%"
                y="-80%"
                width="260%"
                height="260%"
              >
                <feGaussianBlur stdDeviation="12" result="blur1" />
                <feMerge>
                  <feMergeNode in="blur1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter
                id="avgKdGlowSoft"
                x="-70%"
                y="-70%"
                width="240%"
                height="240%"
              >
                <feGaussianBlur stdDeviation="6" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur2" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <CartesianGrid stroke="rgba(148,163,184,.12)" vertical={false} />

            <XAxis
              dataKey="time"
              tick={axisTick}
              angle={-35}
              textAnchor="end"
              height={55}
            />

            <YAxis
              yAxisId="left"
              tick={axisTick}
              allowDecimals={false}
              domain={[battleDomain.min, battleDomain.max]}
              ticks={battleTicks}
              tickFormatter={(value) => value}
            />

            <YAxis
              yAxisId="right"
              orientation="right"
              tick={false}
              axisLine={false}
              tickLine={false}
              width={0}
              allowDecimals
              domain={avgKdDomain}
            />

            <Tooltip content={<PerformanceTooltip />} cursor={false} />
            <Legend />

            <ReferenceLine
              yAxisId="left"
              y={0}
              stroke="rgba(255,255,255,.24)"
              strokeWidth={1.5}
            />

            <ReferenceLine yAxisId="right" y={1} stroke="transparent" />

            <Bar
              yAxisId="left"
              dataKey="kills"
              name="Kills"
              stackId="battle"
              fill="url(#perfBarKills)"
              radius={[0, 0, 0, 0]}
              activeBar={false}
            />

            <Area
              yAxisId="right"
              type="monotone"
              dataKey="avgKd"
              name=""
              stroke="none"
              fill="url(#avgKdFill)"
              legendType="none"
              activeDot={false}
              isAnimationActive
              baseValue={1}
            />

            <RechartsLine
              yAxisId="right"
              type="monotone"
              dataKey="avgKd"
              name=""
              stroke="#60a5fa"
              strokeWidth={12}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.24}
              filter="url(#avgKdGlowBig)"
              dot={false}
              activeDot={false}
              legendType="none"
              isAnimationActive
            />

            <RechartsLine
              yAxisId="right"
              type="monotone"
              dataKey="avgKd"
              name=""
              stroke="#60a5fa"
              strokeWidth={6}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={0.36}
              filter="url(#avgKdGlowSoft)"
              dot={false}
              activeDot={false}
              legendType="none"
              isAnimationActive
            />

            <RechartsLine
              yAxisId="right"
              type="monotone"
              dataKey="avgKd"
              name="K/D"
              stroke="#60a5fa"
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={{
                r: 4,
                fill: '#60a5fa',
                stroke: '#dbeafe',
                strokeWidth: 1.5,
              }}
              isAnimationActive
            />

            <Bar
              yAxisId="left"
              dataKey="deathsNegative"
              name="Deaths"
              stackId="battle"
              fill="url(#perfBarDeaths)"
              radius={[0, 0, 0, 0]}
              activeBar={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

export const AveragePerformanceChart = PerformanceChart;
