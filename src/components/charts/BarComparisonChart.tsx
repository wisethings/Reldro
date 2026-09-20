"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { CHART_COLORS } from "./colors";

export function BarComparisonChart({
  data,
  dataKey = "value",
  labelKey = "label",
  unit = "%",
  height = 240,
}: {
  data: Record<string, string | number>[];
  dataKey?: string;
  labelKey?: string;
  unit?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis dataKey={labelKey} tick={{ fontSize: 11, fill: "#767f91" }} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#767f91" }} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          formatter={(value: number) => [`${value}${unit}`, ""]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #dde1e7" }}
        />
        <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS.series[i % CHART_COLORS.series.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
