import React, { useId, useMemo } from 'react';
import { Panel } from './UI';

const CHART_HEIGHT = 320;
const PAD = { top: 20, right: 18, bottom: 34, left: 44 };

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function pick(obj, keys, fallback = 0) {
  for (const key of keys) {
    if (obj && obj[key] != null) return obj[key];
  }
  return fallback;
}

function formatCompact(value) {
  const n = Number(value) || 0;
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return String(n);
}

function normalizeChartData(data = []) {
  return data.map((item, index) => ({
    raw: item,
    label:
      pick(item, ['label', 'time', 'minute', 'slot', 'name', 'x'], index + 1) ??
      index + 1,
    kills: toNumber(pick(item, ['kills', 'kill', 'k', 'valueA', 'a'], 0)),
    deaths: toNumber(pick(item, ['deaths', 'death', 'd', 'valueB', 'b'], 0)),
  }));
}

function getCoords(rows, width, height) {
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const maxValue = Math.max(
    1,
    ...rows.flatMap((row) => [row.kills, row.deaths]),
  );

  const yTicks = 5;
  const grid = Array.from({ length: yTicks }, (_, i) => {
    const value = (maxValue / (yTicks - 1)) * i;
    const y = PAD.top + innerH - (value / maxValue) * innerH;

    return {
      value: Math.round(value),
      y,
    };
  });

  const kills = rows.map((row, index) => {
    const x =
      rows.length === 1
        ? PAD.left + innerW / 2
        : PAD.left + (index / (rows.length - 1)) * innerW;

    const y = PAD.top + innerH - (row.kills / maxValue) * innerH;

    return {
      x,
      y,
      value: row.kills,
      label: row.label,
    };
  });

  const deaths = rows.map((row, index) => {
    const x =
      rows.length === 1
        ? PAD.left + innerW / 2
        : PAD.left + (index / (rows.length - 1)) * innerW;

    const y = PAD.top + innerH - (row.deaths / maxValue) * innerH;

    return {
      x,
      y,
      value: row.deaths,
      label: row.label,
    };
  });

  return {
    kills,
    deaths,
    grid,
    maxValue,
    innerW,
    innerH,
  };
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

function buildAreaPath(points, height) {
  if (!points.length) return '';

  const line = buildSmoothPath(points);
  const last = points[points.length - 1];
  const first = points[0];
  const bottom = height - PAD.bottom;

  return `${line} L ${last.x} ${bottom} L ${first.x} ${bottom} Z`;
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-8 rounded-full bg-gradient-to-r from-emerald-700 via-emerald-400 to-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.45)]" />
        <span>Kills</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="h-2.5 w-8 rounded-full bg-gradient-to-r from-rose-700 via-rose-400 to-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.45)]" />
        <span>Deaths</span>
      </div>
    </div>
  );
}

function BattleCurveChart({
  data = [],
  title = 'Kill / Death Timeline',
  subtitle = 'Smooth battle flow',
}) {
  const gradientId = useId();
  const rows = useMemo(() => normalizeChartData(data), [data]);

  const width = 1000;
  const height = CHART_HEIGHT;

  const { kills, deaths, grid, innerW, innerH } = useMemo(
    () => getCoords(rows, width, height),
    [rows],
  );

  const killPath = useMemo(() => buildSmoothPath(kills), [kills]);
  const deathPath = useMemo(() => buildSmoothPath(deaths), [deaths]);

  const killArea = useMemo(() => buildAreaPath(kills, height), [kills]);
  const deathArea = useMemo(() => buildAreaPath(deaths, height), [deaths]);

  const bottom = height - PAD.bottom;

  return (
    <Panel cls="overflow-hidden">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-xl font-black">{title}</h3>
          <p className="text-xs text-slate-400">{subtitle}</p>
        </div>

        <Legend />
      </div>

      {!rows.length ? (
        <div className="flex h-[320px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/50 text-slate-500">
          No chart data.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,rgba(40,30,83,0.92),rgba(17,19,47,0.98))] shadow-[inset_0_0_80px_rgba(168,85,247,0.08)]">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="block h-auto w-full"
            role="img"
            aria-label={title}
          >
            <defs>
              <linearGradient id={`${gradientId}-bgGlow`} x1="0" x2="1">
                <stop offset="0%" stopColor="rgba(52,211,153,0.04)" />
                <stop offset="50%" stopColor="rgba(168,85,247,0.08)" />
                <stop offset="100%" stopColor="rgba(244,63,94,0.04)" />
              </linearGradient>

              <linearGradient id={`${gradientId}-killStroke`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#166534" />
                <stop offset="35%" stopColor="#10b981" />
                <stop offset="70%" stopColor="#34d399" />
                <stop offset="100%" stopColor="#a7f3d0" />
              </linearGradient>

              <linearGradient id={`${gradientId}-deathStroke`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#7f1d1d" />
                <stop offset="35%" stopColor="#ef4444" />
                <stop offset="70%" stopColor="#fb7185" />
                <stop offset="100%" stopColor="#fecdd3" />
              </linearGradient>

              <linearGradient id={`${gradientId}-killArea`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(16,185,129,0.22)" />
                <stop offset="70%" stopColor="rgba(16,185,129,0.06)" />
                <stop offset="100%" stopColor="rgba(16,185,129,0)" />
              </linearGradient>

              <linearGradient id={`${gradientId}-deathArea`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(244,63,94,0.18)" />
                <stop offset="70%" stopColor="rgba(244,63,94,0.05)" />
                <stop offset="100%" stopColor="rgba(244,63,94,0)" />
              </linearGradient>

              <filter id={`${gradientId}-killGlow`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <filter id={`${gradientId}-deathGlow`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect
              x="0"
              y="0"
              width={width}
              height={height}
              fill={`url(#${gradientId}-bgGlow)`}
            />

            {/* Horizontal grid */}
            {grid.map((tick, index) => (
              <g key={`h-${index}`}>
                <line
                  x1={PAD.left}
                  y1={tick.y}
                  x2={width - PAD.right}
                  y2={tick.y}
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth="1"
                />
                <text
                  x={PAD.left - 10}
                  y={tick.y + 4}
                  textAnchor="end"
                  fontSize="12"
                  fill="rgba(255,255,255,0.55)"
                >
                  {formatCompact(tick.value)}
                </text>
              </g>
            ))}

            {/* Vertical grid */}
            {rows.map((row, index) => {
              const x =
                rows.length === 1
                  ? PAD.left + innerW / 2
                  : PAD.left + (index / (rows.length - 1)) * innerW;

              return (
                <g key={`v-${index}`}>
                  <line
                    x1={x}
                    y1={PAD.top}
                    x2={x}
                    y2={bottom}
                    stroke="rgba(255,255,255,0.16)"
                    strokeWidth="1"
                    strokeDasharray="2 5"
                  />
                  <text
                    x={x}
                    y={height - 12}
                    textAnchor="middle"
                    fontSize="12"
                    fill="rgba(255,255,255,0.5)"
                  >
                    {String(row.label)}
                  </text>
                </g>
              );
            })}

            {/* Areas */}
            <path d={killArea} fill={`url(#${gradientId}-killArea)`} />
            <path d={deathArea} fill={`url(#${gradientId}-deathArea)`} />

            {/* Glow lines */}
            <path
              d={killPath}
              fill="none"
              stroke={`url(#${gradientId}-killStroke)`}
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.18"
              filter={`url(#${gradientId}-killGlow)`}
            />
            <path
              d={deathPath}
              fill="none"
              stroke={`url(#${gradientId}-deathStroke)`}
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.18"
              filter={`url(#${gradientId}-deathGlow)`}
            />

            {/* Main lines */}
            <path
              d={killPath}
              fill="none"
              stroke={`url(#${gradientId}-killStroke)`}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={deathPath}
              fill="none"
              stroke={`url(#${gradientId}-deathStroke)`}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Dots */}
            {kills.map((point, index) => (
              <g key={`kill-${index}`}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="3.2"
                  fill="#d1fae5"
                  stroke="#10b981"
                  strokeWidth="2"
                />
              </g>
            ))}

            {deaths.map((point, index) => (
              <g key={`death-${index}`}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="3.2"
                  fill="#ffe4e6"
                  stroke="#fb7185"
                  strokeWidth="2"
                />
              </g>
            ))}

            {/* Last-point emphasis */}
            {kills.length > 0 && (
              <>
                <circle
                  cx={kills[kills.length - 1].x}
                  cy={kills[kills.length - 1].y}
                  r="12"
                  fill="rgba(16,185,129,0.18)"
                />
                <circle
                  cx={kills[kills.length - 1].x}
                  cy={kills[kills.length - 1].y}
                  r="5"
                  fill="#d1fae5"
                  stroke="#10b981"
                  strokeWidth="2.5"
                />
              </>
            )}

            {deaths.length > 0 && (
              <>
                <circle
                  cx={deaths[deaths.length - 1].x}
                  cy={deaths[deaths.length - 1].y}
                  r="12"
                  fill="rgba(244,63,94,0.16)"
                />
                <circle
                  cx={deaths[deaths.length - 1].x}
                  cy={deaths[deaths.length - 1].y}
                  r="5"
                  fill="#ffe4e6"
                  stroke="#fb7185"
                  strokeWidth="2.5"
                />
              </>
            )}
          </svg>
        </div>
      )}
    </Panel>
  );
}

export function KillDeathChart({ data, title = '▧ Global Kill/Death Timeline' }) {
  return (
    <BattleCurveChart
      data={data}
      title={title}
      subtitle="Green = kills · Red = deaths"
    />
  );
}

/**
 * Alias util dacă în alte pagini ai alte importuri din Charts.jsx.
 * Dacă PlayerStats folosește unul dintre numele astea, nu mai trebuie să schimbi importurile.
 */
export function AveragePerformanceChart({ data, title = 'Player Stats Timeline' }) {
  return (
    <BattleCurveChart
      data={data}
      title={title}
      subtitle="Green = kills · Red = deaths"
    />
  );
}

export function PlayerStatsChart({ data, title = 'Player Stats Timeline' }) {
  return (
    <BattleCurveChart
      data={data}
      title={title}
      subtitle="Green = kills · Red = deaths"
    />
  );
}
