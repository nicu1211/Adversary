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

function buildAreaPath(points, baselineY) {
  if (!points.length) return '';

  const linePath = buildSmoothPath(points);
  const first = points[0];
  const last = points[points.length - 1];

  return `${linePath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
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
    const kills = toNumber(
      pick(item, ['kills', 'kill', 'k', 'valueA', 'a'], 0),
    );

    const deaths = toNumber(
      pick(item, ['deaths', 'death', 'd', 'valueB', 'b'], 0),
    );

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

  if (rounded >= 1000) {
    return `${(rounded / 1000).toFixed(rounded >= 10000 ? 0 : 1)}k`;
  }

  return String(rounded);
}

function ChartLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
      <div className="flex items-center gap-2">
        <span className="h-[2px] w-8 rounded-full bg-gradient-to-r from-emerald-800 via-emerald-400 to-emerald-200 shadow-[0_0_14px_rgba(16,185,129,0.75)]" />
        <span>Kills</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="h-[2px] w-8 rounded-full bg-gradient-to-r from-rose-900 via-rose-500 to-rose-200 shadow-[0_0_14px_rgba(244,63,94,0.75)]" />
        <span>Deaths</span>
      </div>
    </div>
  );
}

function BattleTimelineChart({
  data,
  title = '▧ Global Kill/Death Timeline',
}) {
  const uid = useId();
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const rows = useMemo(() => normalizeTimelineData(data || []), [data]);

  const width = 1000;
  const height = 255;
  const pad = { top: 18, right: 18, bottom: 30, left: 42 };

  const chart = useMemo(() => {
    if (!rows.length) return null;

    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;
    const baselineY = height - pad.bottom;

    const allValues = rows.flatMap((row) => [row.kills, row.deaths]);
    const rawMax = Math.max(1, ...allValues);
    const max = rawMax * 1.12;

    const pointsKills = rows.map((row, index) => {
      const x =
        rows.length === 1
          ? pad.left + innerW / 2
          : pad.left + (index / (rows.length - 1)) * innerW;

      const y = pad.top + innerH - (row.kills / max) * innerH;

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

      const y = pad.top + innerH - (row.deaths / max) * innerH;

      return {
        x,
        y,
        label: row.label,
        value: row.deaths,
      };
    });

    const yTicks = 4;
    const ticks = Array.from({ length: yTicks }, (_, i) => {
      const value = max - (max * i) / (yTicks - 1);
      const y = pad.top + (innerH * i) / (yTicks - 1);

      return {
        value,
        y,
      };
    });

    return {
      innerW,
      innerH,
      baselineY,
      pointsKills,
      pointsDeaths,
      ticks,
    };
  }, [rows]);

  if (!chart) {
    return (
      <Panel>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-xl font-black">{title}</h3>
        </div>

        <div className="flex h-[255px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/40 text-slate-500">
          No chart data.
        </div>
      </Panel>
    );
  }

  const { innerW, baselineY, pointsKills, pointsDeaths, ticks } = chart;

  const killPath = buildSmoothPath(pointsKills);
  const deathPath = buildSmoothPath(pointsDeaths);

  const killAreaPath = buildAreaPath(pointsKills, baselineY);
  const deathAreaPath = buildAreaPath(pointsDeaths, baselineY);

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

  return (
    <Panel cls="overflow-hidden">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h3 className="text-xl font-black">{title}</h3>
        <ChartLegend />
      </div>

      <div
        className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#221b4e]"
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
            <radialGradient
              id={`${uid}-bgGlow`}
              cx="0"
              cy="0"
              r="1"
              gradientUnits="userSpaceOnUse"
              gradientTransform="translate(820 52) rotate(142) scale(760 260)"
            >
              <stop stopColor="#7442A5" stopOpacity="0.55" />
              <stop offset="0.45" stopColor="#342868" stopOpacity="0.75" />
              <stop offset="1" stopColor="#17143B" />
            </radialGradient>

            <linearGradient id={`${uid}-killStroke`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#064e3b" />
              <stop offset="0.35" stopColor="#10b981" />
              <stop offset="0.7" stopColor="#34d399" />
              <stop offset="1" stopColor="#d1fae5" />
            </linearGradient>

            <linearGradient id={`${uid}-deathStroke`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7f1d1d" />
              <stop offset="0.35" stopColor="#ef4444" />
              <stop offset="0.7" stopColor="#fb7185" />
              <stop offset="1" stopColor="#ffe4e6" />
            </linearGradient>

            <linearGradient id={`${uid}-killArea`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.34" />
              <stop offset="0.45" stopColor="#10b981" stopOpacity="0.15" />
              <stop offset="1" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>

            <linearGradient id={`${uid}-deathArea`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.30" />
              <stop offset="0.45" stopColor="#ef4444" stopOpacity="0.13" />
              <stop offset="1" stopColor="#ef4444" stopOpacity="0" />
            </linearGradient>

            <filter
              id={`${uid}-killGlow`}
              x="-40%"
              y="-40%"
              width="180%"
              height="180%"
            >
              <feGaussianBlur stdDeviation="7" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="
                  0 0 0 0 0.05
                  0 1 0 0 0.85
                  0 0 1 0 0.45
                  0 0 0 0.95 0
                "
              />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter
              id={`${uid}-deathGlow`}
              x="-40%"
              y="-40%"
              width="180%"
              height="180%"
            >
              <feGaussianBlur stdDeviation="7" result="blur" />
              <feColorMatrix
                in="blur"
                type="matrix"
                values="
                  1 0 0 0 0.9
                  0 0 0 0 0.15
                  0 0 1 0 0.22
                  0 0 0 0.95 0
                "
              />
              <feMerge>
                <feMergeNode />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter
              id={`${uid}-wideKillGlow`}
              x="-60%"
              y="-60%"
              width="220%"
              height="220%"
            >
              <feGaussianBlur stdDeviation="15" />
            </filter>

            <filter
              id={`${uid}-wideDeathGlow`}
              x="-60%"
              y="-60%"
              width="220%"
              height="220%"
            >
              <feGaussianBlur stdDeviation="15" />
            </filter>
          </defs>

          {/* Background exact stock-like */}
          <rect width={width} height={height} fill={`url(#${uid}-bgGlow)`} />
          <rect width={width} height={height} fill="#1A1644" opacity="0.18" />

          {/* Grid orizontal subtil */}
          {ticks.map((tick, index) => (
            <g key={`h-${index}`}>
              <line
                x1="0"
                y1={tick.y}
                x2={width}
                y2={tick.y}
                stroke="white"
                strokeOpacity="0.13"
                strokeWidth="1"
              />

              <text
                x={pad.left - 8}
                y={tick.y + 4}
                textAnchor="end"
                fontSize="10"
                fill="rgba(255,255,255,0.28)"
              >
                {formatTickValue(tick.value)}
              </text>
            </g>
          ))}

          {/* Grid vertical dotted subtil */}
          {rows.map((row, index) => {
            const x =
              rows.length === 1
                ? pad.left + innerW / 2
                : pad.left + (index / (rows.length - 1)) * innerW;

            const showGrid =
              index === 0 ||
              index === rows.length - 1 ||
              index % labelStep === 0;

            const showLabel = showGrid;

            return (
              <g key={`v-${index}`}>
                {showGrid && (
                  <line
                    x1={x}
                    y1="0"
                    x2={x}
                    y2={height}
                    stroke="white"
                    strokeOpacity="0.10"
                    strokeWidth="1"
                    strokeDasharray="2 4"
                  />
                )}

                {showLabel && (
                  <text
                    x={x}
                    y={height - 9}
                    textAnchor="middle"
                    fontSize="10"
                    fill="rgba(255,255,255,0.32)"
                  >
                    {String(row.label)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Fill sub kills */}
          <path d={killAreaPath} fill={`url(#${uid}-killArea)`} />

          {/* Fill sub deaths */}
          <path d={deathAreaPath} fill={`url(#${uid}-deathArea)`} />

          {/* Glow larg kills */}
          <path
            d={killPath}
            stroke="#10b981"
            strokeOpacity="0.26"
            strokeWidth="18"
            strokeLinecap="round"
            fill="none"
            filter={`url(#${uid}-wideKillGlow)`}
          />

          {/* Glow larg deaths */}
          <path
            d={deathPath}
            stroke="#ef4444"
            strokeOpacity="0.24"
            strokeWidth="18"
            strokeLinecap="round"
            fill="none"
            filter={`url(#${uid}-wideDeathGlow)`}
          />

          {/* Glow apropiat kills */}
          <path
            d={killPath}
            stroke="#10b981"
            strokeOpacity="0.58"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            filter={`url(#${uid}-killGlow)`}
          />

          {/* Glow apropiat deaths */}
          <path
            d={deathPath}
            stroke="#ef4444"
            strokeOpacity="0.56"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            filter={`url(#${uid}-deathGlow)`}
          />

          {/* Linia principală kills */}
          <path
            d={killPath}
            stroke={`url(#${uid}-killStroke)`}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Linia principală deaths */}
          <path
            d={deathPath}
            stroke={`url(#${uid}-deathStroke)`}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Ghidaj hover */}
          {hovered && (
            <line
              x1={hovered.x}
              y1={pad.top}
              x2={hovered.x}
              y2={height - pad.bottom}
              stroke="rgba(255,255,255,0.18)"
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
  return <BattleTimelineChart {...props} />;
}

export function AveragePerformanceChart(props) {
  return <BattleTimelineChart {...props} />;
}

export function PlayerStatsChart(props) {
  return <BattleTimelineChart {...props} />;
}
