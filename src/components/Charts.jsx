import React, { useMemo, useId } from 'react';
import { Panel } from './UI';

const CHART_HEIGHT = 230;
const PAD = { top: 18, right: 14, bottom: 30, left: 42 };

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

function formatValue(value) {
  const n = Number(value) || 0;
  if (Math.abs(n) >= 1000) {
    return `${n > 0 ? '+' : ''}${(n / 1000).toFixed(Math.abs(n) >= 10000 ? 0 : 1)}k`;
  }
  return `${n > 0 ? '+' : ''}${n}`;
}

function normalizeChartData(data = []) {
  return data.map((item, index) => {
    const kills = toNumber(pick(item, ['kills', 'kill', 'k', 'valueA', 'a'], 0));
    const deaths = toNumber(pick(item, ['deaths', 'death', 'd', 'valueB', 'b'], 0));
    const net = kills - deaths;

    return {
      raw: item,
      label:
        pick(item, ['label', 'time', 'minute', 'slot', 'name', 'x'], index + 1) ??
        index + 1,
      kills,
      deaths,
      net,
    };
  });
}

function getLabelStep(length) {
  if (length <= 8) return 1;
  if (length <= 14) return 2;
  if (length <= 24) return 3;
  if (length <= 36) return 4;
  if (length <= 48) return 5;
  return Math.ceil(length / 8);
}

function getChartGeometry(rows, width, height) {
  const innerW = width - PAD.left - PAD.right;
  const innerH = height - PAD.top - PAD.bottom;
  const zeroY = PAD.top + innerH / 2;

  const maxAbs = Math.max(1, ...rows.map((row) => Math.abs(row.net)));

  const points = rows.map((row, index) => {
    const x =
      rows.length === 1
        ? PAD.left + innerW / 2
        : PAD.left + (index / (rows.length - 1)) * innerW;

    const y = zeroY - (row.net / maxAbs) * (innerH / 2);

    return {
      x,
      y,
      label: row.label,
      value: row.net,
      kills: row.kills,
      deaths: row.deaths,
    };
  });

  const ticks = [
    { value: maxAbs, y: PAD.top },
    { value: Math.round(maxAbs / 2), y: PAD.top + innerH * 0.25 },
    { value: 0, y: zeroY },
    { value: -Math.round(maxAbs / 2), y: PAD.top + innerH * 0.75 },
    { value: -maxAbs, y: PAD.top + innerH },
  ];

  return {
    points,
    ticks,
    innerW,
    innerH,
    zeroY,
    maxAbs,
  };
}

function segmentAtZero(a, b, zeroY) {
  if ((a.value >= 0 && b.value >= 0) || (a.value <= 0 && b.value <= 0)) {
    return null;
  }

  const ratio = (0 - a.value) / (b.value - a.value);
  const x = a.x + (b.x - a.x) * ratio;
  const y = zeroY;

  return { x, y, value: 0 };
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
      <div className="flex items-center gap-2">
        <span className="h-2 w-7 rounded-full bg-gradient-to-r from-emerald-700 via-emerald-400 to-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.35)]" />
        <span>Positive</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="h-2 w-7 rounded-full bg-gradient-to-r from-rose-700 via-rose-400 to-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.35)]" />
        <span>Negative</span>
      </div>
    </div>
  );
}

function CompactNetChart({
  data = [],
  title = 'Battle Timeline',
  subtitle = 'Net kills - deaths',
}) {
  const uid = useId();
  const rows = useMemo(() => normalizeChartData(data), [data]);

  const width = 1000;
  const height = CHART_HEIGHT;

  const { points, ticks, innerW, zeroY } = useMemo(
    () => getChartGeometry(rows, width, height),
    [rows],
  );

  const labelStep = getLabelStep(rows.length);

  const segments = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const crossing = segmentAtZero(a, b, zeroY);

    if (!crossing) {
      segments.push({
        from: a,
        to: b,
        positive: a.value >= 0 && b.value >= 0,
      });
    } else {
      segments.push({
        from: a,
        to: crossing,
        positive: a.value >= 0,
      });
      segments.push({
        from: crossing,
        to: b,
        positive: b.value >= 0,
      });
    }
  }

  const areaSegments = segments.map((segment, index) => ({
    ...segment,
    d: [
      `M ${segment.from.x} ${zeroY}`,
      `L ${segment.from.x} ${segment.from.y}`,
      `L ${segment.to.x} ${segment.to.y}`,
      `L ${segment.to.x} ${zeroY}`,
      'Z',
    ].join(' '),
    key: `${index}-${segment.from.x}-${segment.to.x}`,
  }));

  return (
    <Panel cls="overflow-hidden">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-lg font-black">{title}</h3>
          <p className="text-[11px] text-slate-400">{subtitle}</p>
        </div>

        <Legend />
      </div>

      {!rows.length ? (
        <div className="flex h-[230px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/40 text-slate-500">
          No chart data.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,rgba(4,8,18,0.98),rgba(7,12,22,0.98))]">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="block h-auto w-full"
            role="img"
            aria-label={title}
          >
            <defs>
              <linearGradient id={`${uid}-posStroke`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#166534" />
                <stop offset="50%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#86efac" />
              </linearGradient>

              <linearGradient id={`${uid}-negStroke`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#7f1d1d" />
                <stop offset="50%" stopColor="#ef4444" />
                <stop offset="100%" stopColor="#fda4af" />
              </linearGradient>

              <linearGradient id={`${uid}-topGlow`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
                <stop offset="35%" stopColor="rgba(255,255,255,0.02)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>

              <filter id={`${uid}-lineGlow`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* top glow like screenshot */}
            <rect
              x="0"
              y="0"
              width={width}
              height={70}
              fill={`url(#${uid}-topGlow)`}
            />

            {/* horizontal grid */}
            {ticks.map((tick, index) => (
              <g key={`tick-${index}`}>
                <line
                  x1={PAD.left}
                  y1={tick.y}
                  x2={width - PAD.right}
                  y2={tick.y}
                  stroke={tick.value === 0 ? 'rgba(255,255,255,0.22)' : 'rgba(255,255,255,0.12)'}
                  strokeWidth={tick.value === 0 ? '1.3' : '1'}
                />
                <text
                  x={PAD.left - 8}
                  y={tick.y + 4}
                  textAnchor="end"
                  fontSize="11"
                  fill="rgba(255,255,255,0.45)"
                >
                  {formatValue(tick.value)}
                </text>
              </g>
            ))}

            {/* vertical grid + compact labels */}
            {rows.map((row, index) => {
              const x =
                rows.length === 1
                  ? PAD.left + innerW / 2
                  : PAD.left + (index / (rows.length - 1)) * innerW;

              const showLabel =
                index === 0 ||
                index === rows.length - 1 ||
                index % labelStep === 0;

              return (
                <g key={`vx-${index}`}>
                  <line
                    x1={x}
                    y1={PAD.top}
                    x2={x}
                    y2={height - PAD.bottom}
                    stroke="rgba(255,255,255,0.10)"
                    strokeWidth="1"
                    strokeDasharray="2 5"
                  />
                  {showLabel && (
                    <text
                      x={x}
                      y={height - 10}
                      textAnchor="middle"
                      fontSize="10"
                      fill="rgba(255,255,255,0.42)"
                    >
                      {String(row.label)}
                    </text>
                  )}
                </g>
              );
            })}

            {/* area fill */}
            {areaSegments.map((segment) => (
              <path
                key={`area-${segment.key}`}
                d={segment.d}
                fill={segment.positive ? 'rgba(16,185,129,0.10)' : 'rgba(244,63,94,0.08)'}
              />
            ))}

            {/* line glow */}
            {segments.map((segment) => (
              <line
                key={`glow-${segment.from.x}-${segment.to.x}`}
                x1={segment.from.x}
                y1={segment.from.y}
                x2={segment.to.x}
                y2={segment.to.y}
                stroke={segment.positive ? `url(#${uid}-posStroke)` : `url(#${uid}-negStroke)`}
                strokeWidth="8"
                strokeLinecap="round"
                opacity="0.20"
                filter={`url(#${uid}-lineGlow)`}
              />
            ))}

            {/* main line */}
            {segments.map((segment) => (
              <line
                key={`seg-${segment.from.x}-${segment.to.x}`}
                x1={segment.from.x}
                y1={segment.from.y}
                x2={segment.to.x}
                y2={segment.to.y}
                stroke={segment.positive ? `url(#${uid}-posStroke)` : `url(#${uid}-negStroke)`}
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            ))}

            {/* points */}
            {points.map((point, index) => {
              const positive = point.value >= 0;

              return (
                <g key={`point-${index}`}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="7"
                    fill={positive ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.10)'}
                  />
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r="3.5"
                    fill={positive ? '#d1fae5' : '#ffe4e6'}
                    stroke={positive ? '#10b981' : '#fb7185'}
                    strokeWidth="2"
                  />
                </g>
              );
            })}

            {/* last point emphasis */}
            {points.length > 0 && (
              <>
                <circle
                  cx={points[points.length - 1].x}
                  cy={points[points.length - 1].y}
                  r="12"
                  fill={
                    points[points.length - 1].value >= 0
                      ? 'rgba(16,185,129,0.16)'
                      : 'rgba(244,63,94,0.14)'
                  }
                />
                <circle
                  cx={points[points.length - 1].x}
                  cy={points[points.length - 1].y}
                  r="4.6"
                  fill={
                    points[points.length - 1].value >= 0 ? '#d1fae5' : '#ffe4e6'
                  }
                  stroke={
                    points[points.length - 1].value >= 0 ? '#10b981' : '#fb7185'
                  }
                  strokeWidth="2.2"
                />
              </>
            )}
          </svg>
        </div>
      )}
    </Panel>
  );
}

export function KillDeathChart({
  data,
  title = '▧ Global Kill/Death Timeline',
}) {
  return (
    <CompactNetChart
      data={data}
      title={title}
      subtitle="Net result · positive = kills lead · negative = deaths lead"
    />
  );
}

export function AveragePerformanceChart({
  data,
  title = 'Player Stats Timeline',
}) {
  return (
    <CompactNetChart
      data={data}
      title={title}
      subtitle="Net result · positive = kills lead · negative = deaths lead"
    />
  );
}

export function PlayerStatsChart({
  data,
  title = 'Player Stats Timeline',
}) {
  return (
    <CompactNetChart
      data={data}
      title={title}
      subtitle="Net result · positive = kills lead · negative = deaths lead"
    />
  );
}
