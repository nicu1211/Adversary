import React, { useId, useMemo } from 'react';
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

    const value = toNumber(
      pick(item, ['net', 'diff', 'value', 'score'], kills - deaths),
    );

    return {
      label:
        pick(
          item,
          ['label', 'time', 'minute', 'slot', 'name', 'x'],
          index + 1,
        ) ?? index + 1,
      value,
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
  const rows = useMemo(() => normalizeTimelineData(data || []), [data]);

  const width = 1000;
  const height = 255;
  const pad = { top: 18, right: 16, bottom: 30, left: 40 };

  const chart = useMemo(() => {
    if (!rows.length) return null;

    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;

    const values = rows.map((row) => row.value);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);

    const range = Math.max(1, rawMax - rawMin);
    const extra = Math.max(1, range * 0.18);

    const min = rawMin - extra;
    const max = rawMax + extra;
    const safeRange = Math.max(1, max - min);

    const points = rows.map((row, index) => {
      const x =
        rows.length === 1
          ? pad.left + innerW / 2
          : pad.left + (index / (rows.length - 1)) * innerW;

      const y = pad.top + ((max - row.value) / safeRange) * innerH;

      return {
        x,
        y,
        label: row.label,
        value: row.value,
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
      points,
      ticks,
      innerW,
    };
  }, [rows]);

  if (!chart) {
    return (
      <Panel>
        <h3 className="mb-3 text-xl font-black">{title}</h3>

        <div className="flex h-[255px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/40 text-slate-500">
          No chart data.
        </div>
      </Panel>
    );
  }

  const { points, ticks, innerW } = chart;
  const linePath = buildSmoothPath(points);
  const labelStep = getLabelStep(rows.length);

  const topGlowArea = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${pad.top} L ${points[0].x} ${pad.top} Z`
    : '';

  return (
    <Panel cls="overflow-hidden">
      <div className="mb-3">
        <h3 className="text-xl font-black">{title}</h3>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[linear-gradient(180deg,rgba(32,35,78,0.96),rgba(26,28,66,0.98))]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block h-auto w-full"
          role="img"
          aria-label={title}
        >
          <defs>
            <linearGradient id={`${uid}-stroke`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#5B5CFF" />
              <stop offset="40%" stopColor="#8B5CF6" />
              <stop offset="72%" stopColor="#D946EF" />
              <stop offset="100%" stopColor="#FF62C7" />
            </linearGradient>

            <linearGradient id={`${uid}-topGlow`} x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="rgba(217,70,239,0.22)" />
              <stop offset="35%" stopColor="rgba(168,85,247,0.12)" />
              <stop offset="70%" stopColor="rgba(168,85,247,0.04)" />
              <stop offset="100%" stopColor="rgba(168,85,247,0)" />
            </linearGradient>

            <filter
              id={`${uid}-lineGlowBig`}
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
              id={`${uid}-lineGlowSoft`}
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
          </defs>

          {/* Glow care pornește din linie și se estompează în sus */}
          {topGlowArea && (
            <path
              d={topGlowArea}
              fill={`url(#${uid}-topGlow)`}
              opacity="0.95"
            />
          )}

          {/* Linii orizontale */}
          {ticks.map((tick, index) => (
            <g key={`h-${index}`}>
              <line
                x1={pad.left}
                y1={tick.y}
                x2={width - pad.right}
                y2={tick.y}
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="1"
              />
              <text
                x={pad.left - 8}
                y={tick.y + 4}
                textAnchor="end"
                fontSize="10"
                fill="rgba(255,255,255,0.35)"
              >
                {formatTickValue(tick.value)}
              </text>
            </g>
          ))}

          {/* Linii verticale + label-uri jos */}
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
                  stroke="rgba(255,255,255,0.14)"
                  strokeWidth="1"
                  strokeDasharray="2 4"
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

          {/* Glow exterior mare */}
          <path
            d={linePath}
            fill="none"
            stroke={`url(#${uid}-stroke)`}
            strokeWidth="16"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.14"
            filter={`url(#${uid}-lineGlowBig)`}
          />

          {/* Glow exterior mediu */}
          <path
            d={linePath}
            fill="none"
            stroke={`url(#${uid}-stroke)`}
            strokeWidth="9"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.28"
            filter={`url(#${uid}-lineGlowSoft)`}
          />

          {/* Linia principală */}
          <path
            d={linePath}
            fill="none"
            stroke={`url(#${uid}-stroke)`}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Punct final */}
          {points.length > 0 && (
            <>
              <circle
                cx={points[points.length - 1].x}
                cy={points[points.length - 1].y}
                r="12"
                fill="rgba(255,98,199,0.16)"
              />
              <circle
                cx={points[points.length - 1].x}
                cy={points[points.length - 1].y}
                r="5"
                fill="#FF62C7"
                stroke="#FFD3EF"
                strokeWidth="2"
              />
            </>
          )}
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
