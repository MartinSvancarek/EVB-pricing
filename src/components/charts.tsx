"use client";
import {
  AreaChart,
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const axisStyle = { fontSize: 11, fill: "#8a93a6" };
const grid = "#222735";
const tooltipStyle = { background: "#11141b", border: "1px solid #222735", padding: "6px 10px", fontSize: 12, lineHeight: "1.4" };

export function CostTrendChart({
  data,
  targetRatio = 0.2,
}: {
  data: Array<{ date: string; cost: number; ratio?: number | null }>;
  targetRatio?: number;
}) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid stroke={grid} strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={axisStyle} stroke={grid} />
          <YAxis yAxisId="l" tick={axisStyle} stroke={grid} />
          <YAxis yAxisId="r" orientation="right" tick={axisStyle} stroke={grid} domain={[0, 0.4]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
          <Tooltip contentStyle={tooltipStyle} wrapperStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar yAxisId="l" dataKey="cost" name="Náklady CZK" fill="#5b8cff" />
          <Line yAxisId="r" dataKey="ratio" name="Cost ratio" stroke="#e0a23a" strokeWidth={2} dot={false} />
          <ReferenceLine yAxisId="r" y={targetRatio} stroke="#3fb27f" strokeDasharray="4 4" label={{ value: "cíl 20 %", fill: "#3fb27f", fontSize: 11 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StackedAreaByService({
  data,
  serviceCodes,
  serviceColors,
}: {
  data: Array<Record<string, any>>;
  serviceCodes: string[];
  serviceColors: Record<string, string>;
}) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid stroke={grid} strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={axisStyle} stroke={grid} />
          <YAxis tick={axisStyle} stroke={grid} />
          <Tooltip contentStyle={tooltipStyle} wrapperStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {serviceCodes.map((code) => (
            <Area
              key={code}
              type="monotone"
              dataKey={code}
              stackId="1"
              stroke={serviceColors[code] ?? "#5b8cff"}
              fill={serviceColors[code] ?? "#5b8cff"}
              fillOpacity={0.45}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StackedBarByService({
  data,
  serviceCodes,
  serviceColors,
}: {
  data: Array<Record<string, any>>;
  serviceCodes: string[];
  serviceColors: Record<string, string>;
}) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke={grid} strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={axisStyle} stroke={grid} />
          <YAxis tick={axisStyle} stroke={grid} />
          <Tooltip contentStyle={tooltipStyle} wrapperStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {serviceCodes.map((code) => (
            <Bar key={code} dataKey={code} stackId="1" fill={serviceColors[code] ?? "#5b8cff"} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ServiceDonut({
  data,
}: {
  data: Array<{ name: string; value: number; color: string }>;
}) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} wrapperStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CompareBarChart({
  data,
}: {
  data: Array<{ name: string; current: number; simulated: number; color?: string }>;
}) {
  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid stroke={grid} strokeDasharray="3 3" />
          <XAxis dataKey="name" tick={axisStyle} stroke={grid} />
          <YAxis tick={axisStyle} stroke={grid} />
          <Tooltip contentStyle={tooltipStyle} wrapperStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="current" name="Aktuální CZK" fill="#5b8cff" />
          <Bar dataKey="simulated" name="Simulované CZK" fill="#e0a23a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
