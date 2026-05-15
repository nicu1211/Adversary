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
        pick(item, ['label', 'time', 'minute', 'slot', 'name', 'x'], index + 1) ??
        index + 1,
      kills,
      deaths,
    };
  });
}

function timeToSeconds(value) {
  const text = String(value || '');

  if (!text.includes(':')) return Number(value) || 0;

  const parts = text.split(':').map((part) => Number(part) || 0);

  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return parts[0] * 3600 + parts[1] * 60 + parts[2];
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

export function KillDeathChart({
  data,
  title = '▧ Global Kill/Death Timeline',
  killFeedMarkers = [],
}) {
  const uid = useId();
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [hoveredMarkerId, setHoveredMarkerId] = useState(null);

  const rows = useMemo(() => normalizeTimelineData(data || []), [data]);
  const markers = useMemo(
    () => (Array.isArray(killFeedMarkers) ? killFeedMarkers : []),
    [killFeedMarkers],
  );

  const width = 1000;
  const height = 255;
  const pad = {
    top: 18,
    right: 16,
    bottom: 30,
    left: 40,
  };

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

    const minTime = Math.min(...rows.map((row) => timeToSeconds(row.label)));
    const maxTime = Math.max(...rows.map((row) => timeToSeconds(row.label)));
    const timeRange = Math.max(1, maxTime - minTime);

    const markerPoints = markers.map((marker, index) => {
      const markerSeconds =
        marker.sec != null ? Number(marker.sec) || 0 : timeToSeconds(marker.time);
      const ratio =
        maxTime === minTime
          ? 0.5
          : Math.min(1, Math.max(0, (markerSeconds - minTime) / timeRange));
      const x = pad.left + ratio * innerW;

      const nearestIndex = rows.reduce((bestIndex, row, rowIndex) => {
        const currentDiff = Math.abs(timeToSeconds(row.label) - markerSeconds);
        const bestDiff = Math.abs(timeToSeconds(rows[bestIndex].label) - markerSeconds);

        return currentDiff < bestDiff ? rowIndex : bestIndex;
      }, 0);

      const nearestKillPoint = pointsKills[nearestIndex];
      const nearestDeathPoint = pointsDeaths[nearestIndex];
      const y = Math.max(
        pad.top + 10,
        Math.min(nearestKillPoint?.y ?? pad.top, nearestDeathPoint?.y ?? pad.top) - 16,
      );

      return {
        ...marker,
        id: marker.id || `killfeed-marker-${index}`,
        x,
        y,
      };
    });

    return {
      pointsKills,
      pointsDeaths,
      markerPoints,
      ticks,
      innerW,
      zeroY,
    };
  }, [rows, markers]);

  if (!chart) {
    return (
      <Panel>
        <h3 className="mb-4 text-xl font-black">{title}</h3>
        <p className="text-slate-500">No chart data.</p>
      </Panel>
    );
  }

  const {
    pointsKills,
    pointsDeaths,
    markerPoints,
    ticks,
    innerW,
    zeroY,
  } = chart;

  const linePathKills = buildSmoothPath(pointsKills);
  const linePathDeaths = buildSmoothPath(pointsDeaths);
  const labelStep = getLabelStep(rows.length);

  const hoveredMarker = markerPoints.find(
    (marker) => marker.id === hoveredMarkerId,
  );

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
    ? `${linePathKills} L ${pointsKills[pointsKills.length - 1].x} ${
        height - pad.bottom
      } L ${pointsKills[0].x} ${height - pad.bottom} Z`
    : '';

  const topGlowAreaDeaths = pointsDeaths.length
    ? `${linePathDeaths} L ${pointsDeaths[pointsDeaths.length - 1].x} ${
        height - pad.bottom
      } L ${pointsDeaths[0].x} ${height - pad.bottom} Z`
    : '';

  return (
    <Panel>
      <h3 className="mb-4 text-xl font-black">{title}</h3>

      <div
        className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/80 p-3"
        onMouseLeave={() => {
          setHoveredIndex(null);
          setHoveredMarkerId(null);
        }}
      >
        {hovered && !hoveredMarker && (
          <div
            className="pointer-events-none absolute z-10 rounded-xl border border-slate-700 bg-slate-950/95 px-3 py-2 text-xs shadow-2xl"
            style={{
              left: Math.min(Math.max(hovered.x + 16, 8), 760),
              top: Math.max(8, hovered.y - 14),
            }}
          >
            <p className="font-black text-white">Ora: {hovered.label}</p>
            <p className="text-blue-300">Kills: {hovered.kills}</p>
            <p className="text-pink-300">Deaths: {hovered.deaths}</p>
          </div>
        )}

        {hoveredMarker && (
          <div
            className="pointer-events-none absolute z-20 max-w-[280px] rounded-xl border border-yellow-400/50 bg-slate-950/95 px-3 py-2 text-xs shadow-2xl"
            style={{
              left: Math.min(Math.max(hoveredMarker.x + 16, 8), 700),
              top: Math.max(8, hoveredMarker.y - 22),
            }}
          >
            <p className="font-black text-yellow-200">
              🔥 Killfeed x{hoveredMarker.count}
            </p>
            <p className="mt-1 text-white">{hoveredMarker.player}</p>
            <p className="text-slate-300">
              Ora: {hoveredMarker.exactTime || hoveredMarker.time}
              {hoveredMarker.endTime ? ` - ${hoveredMarker.endTime}` : ''}
            </p>
            <p className="text-yellow-100">Guild: {hoveredMarker.guild || '-'}</p>
            {hoveredMarker.victims?.length > 0 && (
              <p className="mt-1 truncate text-slate-400">
                Victims: {hoveredMarker.victims.join(', ')}
              </p>
            )}
          </div>
        )}

        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-[255px] w-full overflow-visible"
          role="img"
          aria-label={title}
        >
          <defs>
            <linearGradient id={`${uid}-kills`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.95" />
            </linearGradient>

            <linearGradient id={`${uid}-deaths`} x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="#ec4899" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#fb7185" stopOpacity="0.95" />
            </linearGradient>

            <linearGradient id={`${uid}-kills-area`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>

            <linearGradient id={`${uid}-deaths-area`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ec4899" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
            </linearGradient>

            <filter id={`${uid}-glow`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect x="0" y="0" width={width} height={height} fill="transparent" />

          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={zeroY}
            y2={zeroY}
            stroke="#334155"
            strokeDasharray="4 4"
          />

          {topGlowAreaKills && (
            <path d={topGlowAreaKills} fill={`url(#${uid}-kills-area)`} />
          )}

          {topGlowAreaDeaths && (
            <path d={topGlowAreaDeaths} fill={`url(#${uid}-deaths-area)`} />
          )}

          {ticks.map((tick, index) => (
            <g key={`tick-${index}`}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={tick.y}
                y2={tick.y}
                stroke="#1e293b"
                strokeDasharray={index === 0 ? '0' : '3 7'}
              />
              <text
                x={pad.left - 9}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-slate-500 text-[10px]"
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
              index === 0 || index === rows.length - 1 || index % labelStep === 0;

            return (
              <g key={`label-${row.label}-${index}`}>
                <line
                  x1={x}
                  x2={x}
                  y1={pad.top}
                  y2={height - pad.bottom}
                  stroke="#0f172a"
                />

                {showLabel && (
                  <text
                    x={x}
                    y={height - 9}
                    textAnchor="middle"
                    className="fill-slate-500 text-[10px]"
                  >
                    {String(row.label)}
                  </text>
                )}
              </g>
            );
          })}

          <path
            d={linePathDeaths}
            fill="none"
            stroke={`url(#${uid}-deaths)`}
            strokeWidth="3"
            strokeLinecap="round"
            filter={`url(#${uid}-glow)`}
          />

          <path
            d={linePathKills}
            fill="none"
            stroke={`url(#${uid}-kills)`}
            strokeWidth="3"
            strokeLinecap="round"
            filter={`url(#${uid}-glow)`}
          />

          {pointsDeaths.map((point, index) => (
            <circle
              key={`death-point-${index}`}
              cx={point.x}
              cy={point.y}
              r={hoveredIndex === index ? 4.5 : 3}
              fill="#fb7185"
              stroke="#0f172a"
              strokeWidth="1.5"
            />
          ))}

          {pointsKills.map((point, index) => (
            <circle
              key={`kill-point-${index}`}
              cx={point.x}
              cy={point.y}
              r={hoveredIndex === index ? 4.5 : 3}
              fill="#22d3ee"
              stroke="#0f172a"
              strokeWidth="1.5"
            />
          ))}

          {markerPoints.map((marker) => (
            <g key={marker.id}>
              <line
                x1={marker.x}
                x2={marker.x}
                y1={pad.top}
                y2={height - pad.bottom}
                stroke="#facc15"
                strokeOpacity="0.22"
                strokeDasharray="3 5"
              />

              <circle
                cx={marker.x}
                cy={marker.y}
                r={hoveredMarkerId === marker.id ? 7 : 5}
                fill="#facc15"
                stroke="#78350f"
                strokeWidth="2"
                filter={`url(#${uid}-glow)`}
                onMouseEnter={() => {
                  setHoveredMarkerId(marker.id);
                  setHoveredIndex(null);
                }}
              />

              <circle
                cx={marker.x}
                cy={marker.y}
                r="13"
                fill="transparent"
                onMouseEnter={() => {
                  setHoveredMarkerId(marker.id);
                  setHoveredIndex(null);
                }}
              />
            </g>
          ))}

          {hovered && !hoveredMarker && (
            <line
              x1={hovered.x}
              x2={hovered.x}
              y1={pad.top}
              y2={height - pad.bottom}
              stroke="#94a3b8"
              strokeOpacity="0.45"
              strokeDasharray="4 6"
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
              index === rows.length - 1 ? width - pad.right : (currentX + nextX) / 2;

            return (
              <rect
                key={`hover-${row.label}-${index}`}
                x={startX}
                y={pad.top}
                width={Math.max(1, endX - startX)}
                height={height - pad.bottom - pad.top}
                fill="transparent"
                onMouseEnter={() => {
                  setHoveredIndex(index);
                  setHoveredMarkerId(null);
                }}
              />
            );
          })}
        </svg>

        {markerPoints.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
              Killfeed
            </span>
          </div>
        )}
      </div>
    </Panel>
  );
}

function SummaryChip({ label, value, colorClass }) {
  return (
    <div className={`rounded-2xl border bg-slate-950/60 px-4 py-3 ${colorClass}`}>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black">{value}</p>
    </div>
  );
}

function PerformanceTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  const map = Object.fromEntries(payload.map((item) => [item.dataKey, item.value]));
  const deaths =
    map.deathsNegative != null
      ? Math.abs(Number(map.deathsNegative) || 0)
      : map.deaths ?? 0;

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-950/95 px-3 py-2 text-xs shadow-xl">
      <p className="font-black text-white">{label}</p>
      <p className="text-blue-300">Kills : {map.kills ?? 0}</p>
      <p className="text-pink-300">Deaths : {deaths}</p>
      <p className="text-emerald-300">K/D : {map.avgKd ?? 0}</p>
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
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-xl font-black">Performance</h3>
          <p className="text-sm text-slate-500">
            Daily performance with kills, deaths and average K/D
          </p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <SummaryChip
            label="Avg kills"
            value={summary.avgKills}
            colorClass="border-blue-400/20 text-blue-300"
          />
          <SummaryChip
            label="Avg deaths"
            value={summary.avgDeaths}
            colorClass="border-pink-400/20 text-pink-300"
          />
          <SummaryChip
            label="Avg K/D"
            value={summary.avgKd}
            colorClass="border-emerald-400/20 text-emerald-300"
          />
        </div>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={performanceData} margin={{ top: 12, right: 22, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#1e293b" strokeDasharray="3 5" />
            <XAxis dataKey="date" tick={axisTick} tickLine={false} axisLine={false} />
            <YAxis
              yAxisId="battle"
              ticks={battleTicks}
              domain={[battleDomain.min, battleDomain.max]}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="kd"
              orientation="right"
              domain={avgKdDomain}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<PerformanceTooltip />} cursor={false} />
            <Legend />
            <ReferenceLine yAxisId="battle" y={0} stroke="#475569" strokeDasharray="4 4" />
            <Bar
              yAxisId="battle"
              dataKey="kills"
              name="Kills"
              fill="#3b82f6"
              radius={[8, 8, 0, 0]}
              maxBarSize={34}
            />
            <Bar
              yAxisId="battle"
              dataKey="deathsNegative"
              name="Deaths"
              fill="#ec4899"
              radius={[0, 0, 8, 8]}
              maxBarSize={34}
            />
            <RechartsLine
              yAxisId="kd"
              type="monotone"
              dataKey="avgKd"
              name="Average K/D"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Area
              yAxisId="kd"
              type="monotone"
              dataKey="avgKd"
              fill="#10b981"
              fillOpacity={0.08}
              stroke="none"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

export const AveragePerformanceChart = PerformanceChart;
