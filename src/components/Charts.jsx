import React, { useMemo } from 'react';
import {
  AreaChart,
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
} from 'recharts';
import { Panel } from './UI';

const tooltipStyle = {
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: 14,
  color: '#fff',
};

const axisTick = {
  fill: '#94a3b8',
  fontSize: 11,
};

export function KillDeathChart({ data, title }) {
  return (
    <Panel>
      <h2 className="text-2xl font-black">{title}</h2>

      <div className="h-[260px] sm:h-[300px]">
        <ResponsiveContainer>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="killFillMain" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.06} />
              </linearGradient>

              <linearGradient id="deathFillMain" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f472b6" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#f472b6" stopOpacity={0.05} />
              </linearGradient>
            </defs>

            <CartesianGrid stroke="rgba(148,163,184,.14)" />

            <XAxis
              dataKey="time"
              tick={axisTick}
              angle={-35}
              textAnchor="end"
              height={55}
            />

            <YAxis tick={axisTick} allowDecimals={false} />

            <Tooltip contentStyle={tooltipStyle} />

            <Area
              type="monotone"
              dataKey="kills"
              name="Kills"
              stroke="#60a5fa"
              strokeWidth={3}
              fill="url(#killFillMain)"
            />

            <Area
              type="monotone"
              dataKey="deaths"
              name="Deaths"
              stroke="#f472b6"
              strokeWidth={3}
              fill="url(#deathFillMain)"
            />
          </AreaChart>
        </ResponsiveContainer>
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

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-900/95 px-4 py-3 shadow-2xl backdrop-blur-xl">
      <p className="mb-2 text-sm font-black text-white">{label}</p>

      <div className="space-y-1.5 text-sm">
        <p className="font-bold text-cyan-300">Kills : {map.kills ?? 0}</p>
        <p className="font-bold text-pink-300">Deaths : {map.deaths ?? 0}</p>
        <p className="font-bold text-emerald-300">
          Avg K/D : {map.avgKd ?? 0}
        </p>
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
            colorClass="text-cyan-300"
          />

          <SummaryChip
            label="Average Deaths"
            value={summary.avgDeaths}
            colorClass="text-pink-300"
          />

          <SummaryChip
            label="Average K/D"
            value={summary.avgKd}
            colorClass="text-emerald-300"
          />
        </div>
      </div>

      <div className="h-[320px] sm:h-[360px] [&_*:focus]:outline-none">
        <ResponsiveContainer>
          <ComposedChart
            data={data}
            barCategoryGap="28%"
            barGap={-8}
            margin={{ top: 6, right: 10, left: 4, bottom: 14 }}
          >
            <defs>
              <linearGradient id="perfBarKills" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8bf3ff" stopOpacity={0.96} />
                <stop offset="100%" stopColor="#5fd0ff" stopOpacity={0.72} />
              </linearGradient>

              <linearGradient id="perfBarDeaths" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f9c0ff" stopOpacity={0.96} />
                <stop offset="100%" stopColor="#f472b6" stopOpacity={0.72} />
              </linearGradient>

              <linearGradient id="avgKdFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.18} />
                <stop offset="55%" stopColor="#34d399" stopOpacity={0.07} />
                <stop offset="100%" stopColor="#34d399" stopOpacity={0.01} />
              </linearGradient>
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
            />

            <YAxis
              yAxisId="right"
              orientation="right"
              tick={axisTick}
              allowDecimals
            />

            <Tooltip content={<PerformanceTooltip />} cursor={false} />
            <Legend />

            <Bar
              yAxisId="left"
              dataKey="kills"
              name="Kills"
              fill="url(#perfBarKills)"
              radius={[10, 10, 0, 0]}
              maxBarSize={28}
              activeBar={false}
            />

            <Bar
              yAxisId="left"
              dataKey="deaths"
              name="Deaths"
              fill="url(#perfBarDeaths)"
              radius={[10, 10, 0, 0]}
              maxBarSize={28}
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
            />

            <RechartsLine
              yAxisId="right"
              type="monotone"
              dataKey="avgKd"
              name="Avg K/D"
              stroke="#34d399"
              strokeWidth={1.6}
              dot={{
                r: 2.8,
                fill: '#34d399',
                stroke: '#a7f3d0',
                strokeWidth: 1.2,
              }}
              activeDot={{
                r: 4,
                fill: '#34d399',
                stroke: '#d1fae5',
                strokeWidth: 1.5,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

export const AveragePerformanceChart = PerformanceChart;
