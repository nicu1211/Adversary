import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
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

export function AveragePerformanceChart({ data }) {
  return (
    <Panel>
      <div className="mb-3">
        <h2 className="text-2xl font-black">Average Performance</h2>
        <p className="text-sm text-slate-400">
          Average kills, deaths and K/D per node war day
        </p>
      </div>

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
              dataKey="avgKills"
              name="Avg Kills"
              stroke="#60a5fa"
              fill="#60a5fa55"
            />

            <Area
              type="monotone"
              dataKey="avgDeaths"
              name="Avg Deaths"
              stroke="#f9a8d4"
              fill="#fb718555"
            />

            <Area
              type="monotone"
              dataKey="avgKd"
              name="Avg K/D"
              stroke="#34d399"
              fill="#34d39933"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Panel>
  );
}
