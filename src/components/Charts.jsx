import React from 'react';
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
              fill="#60a5fa55"
            />

            <Area
              type="monotone"
              dataKey="deaths"
              name="Deaths"
              stroke="#f9a8d4"
              fill="#fb718555"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

export function PerformanceChart({ data }) {
  return (
    <Panel>
      <div className="mb-3">
        <h2 className="text-2xl font-black">Performance</h2>
        <p className="text-sm text-slate-400">
          Daily kills/deaths with average kills, average deaths and average K/D
        </p>
      </div>

      <div className="h-[300px] sm:h-[340px]">
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
            />

            <Tooltip contentStyle={tooltipStyle} />

            <Legend />

            <Bar
              yAxisId="left"
              dataKey="kills"
              name="Kills"
              radius={[8, 8, 0, 0]}
              fill="#60a5fa"
            />

            <Bar
              yAxisId="left"
              dataKey="deaths"
              name="Deaths"
              radius={[8, 8, 0, 0]}
              fill="#f472b6"
            />

            <ChartLine
              yAxisId="left"
              type="monotone"
              dataKey="avgKills"
              name="Avg Kills"
              stroke="#38bdf8"
              strokeWidth={3}
              dot={{ r: 3 }}
            />

            <ChartLine
              yAxisId="left"
              type="monotone"
              dataKey="avgDeaths"
              name="Avg Deaths"
              stroke="#fb7185"
              strokeWidth={3}
              dot={{ r: 3 }}
            />

            <ChartLine
              yAxisId="right"
              type="monotone"
              dataKey="avgKd"
              name="Avg K/D"
              stroke="#34d399"
              strokeWidth={3}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}

/*
  Compatibilitate cu importurile vechi.
  Dacă în alt fișier încă există AveragePerformanceChart,
  va folosi automat noul PerformanceChart.
*/
export const AveragePerformanceChart = PerformanceChart;
