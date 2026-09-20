"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CHART_COLORS } from "./colors";

export function AdoptionTrendChart({ data }: { data: { month: string; score: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#767f91" }} axisLine={{ stroke: CHART_COLORS.grid }} tickLine={false} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#767f91" }} axisLine={false} tickLine={false} width={36} />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #dde1e7" }}
          labelStyle={{ fontWeight: 600 }}
        />
        <Line type="monotone" dataKey="score" stroke={CHART_COLORS.primary} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}
