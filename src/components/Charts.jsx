import React, { useId, useMemo, useState } from 'react';
import { Panel } from './UI';

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

function OverviewLineChart({
  data,
  title = '▧ Global Kill/Death Timeline',
}) {
  const uid = useId();
  const [hoveredIndex, setHoveredIndex] = useState(null);

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

    const min = rawMin - extra;
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

    return {
      pointsKills,
      pointsDeaths,
      ticks,
      innerW,
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

  const { pointsKills, pointsDeaths, ticks, innerW } = chart;
  const linePathKills = buildSmoothPath(pointsKills);
  const linePathDeaths = buildSmoothPath(pointsDeaths);
  const labelStep = getLabelStep(rows.length);

  const hovered =
    hoveredIndex == null
      ? null
      : {
          x: pointsKills[hoveredIndex].x,
          y: Math.min(pointsKills[hoveredIndex].y, pointsDeaths[hoveredIndex].y),
          label: rows[hoveredIndex].label,
          kills: rows[hoveredIndex].kills,
          deaths: rows[hoveredIndex].deaths,
        };

  const topGlowAreaKills = pointsKills.length
    ? `${linePathKills} L ${pointsKills[pointsKills.length - 1].x} ${pad.top} L ${pointsKills[0].x} ${pad.top} Z`
    : '';

  const topGlowAreaDeaths = pointsDeaths.length
    ? `${linePathDeaths} L ${pointsDeaths[pointsDeaths.length - 1].x} ${height - pad.bottom} L ${pointsDeaths[0].x} ${height - pad.bottom} Z`
    : '';

  return (
    <Panel cls="overflow-hidden">
      <div className="mb-3">
        <h3 className="text-xl font-black">{title}</h3>
      </div>

      <div
        className="relative overflow-hidden rounded-2xl border border-slate-800/60 bg-transparent"
        onMouseLeave={() => setHoveredIndex(null)}
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
            <p className="text-emerald-300">Kills: {hovered.kills}</p>
            <p className="text-rose-300">Deaths: {hovered.deaths}</p>
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block h-auto w-full"
          role="img"
          aria-label={title}
        >
          <defs>
            <linearGradient id={`${uid}-stroke-kills`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>

            <linearGradient id={`${uid}-stroke-deaths`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>

            <linearGradient id={`${uid}-topGlow-kills`} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="rgba(16,185,129,0.42)" />
              <stop offset="35%" stopColor="rgba(16,185,129,0.24)" />
              <stop offset="70%" stopColor="rgba(16,185,129,0.10)" />
              <stop offset="100%" stopColor="rgba(16,185,129,0)" />
            </linearGradient>

            <linearGradient id={`${uid}-topGlow-deaths`} x1="0" y1="0" x2="0" y2="1">
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
              <feGaussianBlur stdDeviation="10" result="blur1" />
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
              <feGaussianBlur stdDeviation="5" result="blur2" />
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
              <feGaussianBlur stdDeviation="10" result="blur3" />
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
              <feGaussianBlur stdDeviation="5" result="blur4" />
              <feMerge>
                <feMergeNode in="blur4" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Glow verde care pornește din linie și se estompează în sus */}
          {topGlowAreaKills && (
            <path
              d={topGlowAreaKills}
              fill={`url(#${uid}-topGlow-kills)`}
              opacity="1"
            />
          )}

          {/* Glow roșu care pornește din linie și se estompează în jos */}
          {topGlowAreaDeaths && (
            <path
              d={topGlowAreaDeaths}
              fill={`url(#${uid}-topGlow-deaths)`}
              opacity="1"
            />
          )}

          {/* Linii orizontale fine */}
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

          {/* Linii verticale fine + label-uri jos */}
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

          {/* Glow exterior mare kills */}
          <path
            d={linePathKills}
            fill="none"
            stroke={`url(#${uid}-stroke-kills)`}
            strokeWidth="16"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.18"
            filter={`url(#${uid}-lineGlowBig-kills)`}
          />

          {/* Glow exterior mediu kills */}
          <path
            d={linePathKills}
            fill="none"
            stroke={`url(#${uid}-stroke-kills)`}
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.34"
            filter={`url(#${uid}-lineGlowSoft-kills)`}
          />

          {/* Linia principală kills */}
          <path
            d={linePathKills}
            fill="none"
            stroke={`url(#${uid}-stroke-kills)`}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Glow exterior mare deaths */}
          <path
            d={linePathDeaths}
            fill="none"
            stroke={`url(#${uid}-stroke-deaths)`}
            strokeWidth="16"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.18"
            filter={`url(#${uid}-lineGlowBig-deaths)`}
          />

          {/* Glow exterior mediu deaths */}
          <path
            d={linePathDeaths}
            fill="none"
            stroke={`url(#${uid}-stroke-deaths)`}
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.34"
            filter={`url(#${uid}-lineGlowSoft-deaths)`}
          />

          {/* Linia principală deaths */}
          <path
            d={linePathDeaths}
            fill="none"
            stroke={`url(#${uid}-stroke-deaths)`}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Ghidaj hover */}
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

          {/* Zone hover invizibile */}
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
                onMouseEnter={() => setHoveredIndex(index)}
              />
            );
          })}
        </svg>
      </div>
    </Panel>
  );
}

export function KillDeathChart(props) {
  return <OverviewLineChart {...props} />;
}

export function AveragePerformanceChart(props) {
  return <OverviewLineChart {...props} />;
}

export function PlayerStatsChart(props) {
  return <OverviewLineChart {...props} />;
}
