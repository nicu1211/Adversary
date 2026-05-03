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

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
      <div className="flex items-center gap-2">
        <span className="h-[2px] w-7 rounded-full bg-gradient-to-r from-emerald-700 via-emerald-400 to-emerald-200 shadow-[0_0_10px_rgba(16,185,129,0.55)]" />
        <span>Kills</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="h-[2px] w-7 rounded-full bg-gradient-to-r from-rose-700 via-rose-400 to-rose-200 shadow-[0_0_10px_rgba(244,63,94,0.55)]" />
        <span>Deaths</span>
      </div>
    </div>
  );
}

function DualLineTimelineChart({
  data,
  title = '▧ Global Kill/Death Timeline',
}) {
  const uid = useId();
  const rows = useMemo(() => normalizeTimelineData(data || []), [data]);

  const width = 1000;
  const height = 235;
  const pad = { top: 14, right: 12, bottom: 28, left: 36 };

  const chart = useMemo(() => {
    if (!rows.length) return null;

    const innerW = width - pad.left - pad.right;
    const innerH = height - pad.top - pad.bottom;

    const allValues = rows.flatMap((row) => [row.kills, row.deaths]);
    const rawMax = Math.max(1, ...allValues);
    const max = Math.max(1, rawMax * 1.08);

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

    const yTicks = 5;
    const ticks = Array.from({ length: yTicks }, (_, i) => {
      const value = max - (max * i) / (yTicks - 1);
      const y = pad.top + (innerH * i) / (yTicks - 1);

      return { value, y };
    });

    return {
      innerW,
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

        <div className="flex h-[235px] items-center justify-center rounded-2xl border border-slate-800/70 text-slate-500">
          No chart data.
        </div>
      </Panel>
    );
  }

  const { innerW, pointsKills, pointsDeaths, ticks } = chart;

  const killPath = buildSmoothPath(pointsKills);
  const deathPath = buildSmoothPath(pointsDeaths);
  const labelStep = getLabelStep(rows.length);

  return (
    <Panel cls="overflow-hidden">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h3 className="text-xl font-black">{title}</h3>
        <Legend />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800/70 bg-transparent">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="block h-auto w-full"
          role="img"
          aria-label={title}
        >
          <defs>
            <linearGradient id={`${uid}-killStroke`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#065f46" />
              <stop offset="45%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#a7f3d0" />
            </linearGradient>

            <linearGradient id={`${uid}-deathStroke`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#7f1d1d" />
              <stop offset="45%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#fecdd3" />
            </linearGradient>

            <filter
              id={`${uid}-killGlowBig`}
              x="-70%"
              y="-70%"
              width="240%"
              height="240%"
            >
              <feGaussianBlur stdDeviation="9" result="blur1" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter
              id={`${uid}-killGlowSoft`}
              x="-70%"
              y="-70%"
              width="240%"
              height="240%"
            >
              <feGaussianBlur stdDeviation="4.5" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter
              id={`${uid}-deathGlowBig`}
              x="-70%"
              y="-70%"
              width="240%"
              height="240%"
            >
              <feGaussianBlur stdDeviation="9" result="blur3" />
              <feMerge>
                <feMergeNode in="blur3" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter
              id={`${uid}-deathGlowSoft`}
              x="-70%"
              y="-70%"
              width="240%"
              height="240%"
            >
              <feGaussianBlur stdDeviation="4.5" result="blur4" />
              <feMerge>
                <feMergeNode in="blur4" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* grid orizontal foarte subtil */}
          {ticks.map((tick, index) => (
            <g key={`h-${index}`}>
              <line
                x1={pad.left}
                y1={tick.y}
                x2={width - pad.right}
                y2={tick.y}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth="1"
              />
              <text
                x={pad.left - 7}
                y={tick.y + 4}
                textAnchor="end"
                fontSize="10"
                fill="rgba(255,255,255,0.20)"
              >
                {formatTickValue(tick.value)}
              </text>
            </g>
          ))}

          {/* grid vertical foarte subtil */}
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
                  stroke="rgba(255,255,255,0.05)"
                  strokeWidth="1"
                  strokeDasharray="2 5"
                />

                {showLabel && (
                  <text
                    x={x}
                    y={height - 9}
                    textAnchor="middle"
                    fontSize="10"
                    fill="rgba(255,255,255,0.22)"
                  >
                    {String(row.label)}
                  </text>
                )}
              </g>
            );
          })}

          {/* KILLS glow exterior mare */}
          <path
            d={killPath}
            fill="none"
            stroke={`url(#${uid}-killStroke)`}
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.10"
            filter={`url(#${uid}-killGlowBig)`}
          />

          {/* KILLS glow exterior mediu */}
          <path
            d={killPath}
            fill="none"
            stroke={`url(#${uid}-killStroke)`}
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.22"
            filter={`url(#${uid}-killGlowSoft)`}
          />

          {/* DEATHS glow exterior mare */}
          <path
            d={deathPath}
            fill="none"
            stroke={`url(#${uid}-deathStroke)`}
            strokeWidth="14"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.10"
            filter={`url(#${uid}-deathGlowBig)`}
          />

          {/* DEATHS glow exterior mediu */}
          <path
            d={deathPath}
            fill="none"
            stroke={`url(#${uid}-deathStroke)`}
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.22"
            filter={`url(#${uid}-deathGlowSoft)`}
          />

          {/* linia kills delicată */}
          <path
            d={killPath}
            fill="none"
            stroke={`url(#${uid}-killStroke)`}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* linia deaths delicată */}
          <path
            d={deathPath}
            fill="none"
            stroke={`url(#${uid}-deathStroke)`}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* puncte kills */}
          {pointsKills.map((point, index) => (
            <g key={`kill-point-${index}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r="5.5"
                fill="rgba(16,185,129,0.10)"
              />
              <circle
                cx={point.x}
                cy={point.y}
                r="2.2"
                fill="#d1fae5"
                stroke="#10b981"
                strokeWidth="1.5"
              />
            </g>
          ))}

          {/* puncte deaths */}
          {pointsDeaths.map((point, index) => (
            <g key={`death-point-${index}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r="5.5"
                fill="rgba(244,63,94,0.10)"
              />
              <circle
                cx={point.x}
                cy={point.y}
                r="2.2"
                fill="#ffe4e6"
                stroke="#ef4444"
                strokeWidth="1.5"
              />
            </g>
          ))}

          {/* accent ultim punct kills */}
          {pointsKills.length > 0 && (
            <>
              <circle
                cx={pointsKills[pointsKills.length - 1].x}
                cy={pointsKills[pointsKills.length - 1].y}
                r="10"
                fill="rgba(16,185,129,0.14)"
              />
              <circle
                cx={pointsKills[pointsKills.length - 1].x}
                cy={pointsKills[pointsKills.length - 1].y}
                r="3.2"
                fill="#d1fae5"
                stroke="#10b981"
                strokeWidth="1.8"
              />
            </>
          )}

          {/* accent ultim punct deaths */}
          {pointsDeaths.length > 0 && (
            <>
              <circle
                cx={pointsDeaths[pointsDeaths.length - 1].x}
                cy={pointsDeaths[pointsDeaths.length - 1].y}
                r="10"
                fill="rgba(244,63,94,0.14)"
              />
              <circle
                cx={pointsDeaths[pointsDeaths.length - 1].x}
                cy={pointsDeaths[pointsDeaths.length - 1].y}
                r="3.2"
                fill="#ffe4e6"
                stroke="#ef4444"
                strokeWidth="1.8"
              />
            </>
          )}
        </svg>
      </div>
    </Panel>
  );
}

export function KillDeathChart(props) {
  return <DualLineTimelineChart {...props} />;
}

export function AveragePerformanceChart(props) {
  return <DualLineTimelineChart {...props} />;
}

export function PlayerStatsChart(props) {
  return <DualLineTimelineChart {...props} />;
}
