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
  Line as ChartLine,
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
            Daily kills/deaths with average kills, average deaths and average K/D
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

      <div className="h-[320px] sm:h-[360px]">
        <ResponsiveContainer>
          <ComposedChart data={data}>
            <CartesianGrid stroke="rgba(148,163,184,.14)" />

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

            <Tooltip contentStyle={tooltipStyle} />
            <Legend />

            <Bar
              yAxisId="left"
              dataKey="kills"
              name="Kills"
              radius={[8, 8, 0, 0]}
              fill="#60a5fa"
              fillOpacity={0.55}
            />

            <Bar
              yAxisId="left"
              dataKey="deaths"
              name="Deaths"
              radius={[8, 8, 0, 0]}
              fill="#f472b6"
              fillOpacity={0.55}
            />

            <ChartLine
              yAxisId="left"
              type="monotone"
              dataKey="avgKills"
              name="Avg Kills"
              stroke="#22d3ee"
              strokeWidth={4}
              dot={{ r: 4, strokeWidth: 2, fill: '#22d3ee' }}
              activeDot={{ r: 7 }}
            />

            <ChartLine
              yAxisId="left"
              type="monotone"
              dataKey="avgDeaths"
              name="Avg Deaths"
              stroke="#fb7185"
              strokeWidth={4}
              dot={{ r: 4, strokeWidth: 2, fill: '#fb7185' }}
              activeDot={{ r: 7 }}
            />

            <ChartLine
              yAxisId="right"
              type="monotone"
              dataKey="avgKd"
              name="Avg K/D"
              stroke="#34d399"
              strokeWidth={4}
              dot={{ r: 4, strokeWidth: 2, fill: '#34d399' }}
              activeDot={{ r: 7 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

export const AveragePerformanceChart = PerformanceChart;
