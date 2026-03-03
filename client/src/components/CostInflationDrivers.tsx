/* CostInflationDrivers — Margin Sentinel
 * Design: Dark Intelligence — dual charts panel
 * Left: 6-month line chart (WTI Crude & Shipping Rates)
 * Right: Stacked bar chart (Estimated Item Cost Impact by Category)
 */
import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  LabelList,
  Legend,
} from "recharts";
import { MoreHorizontal } from "lucide-react";

// 6-month line chart data
const lineData = [
  { month: "Jun", oil: 2100, freight: 1800 },
  { month: "Jul", oil: 2800, freight: 2200 },
  { month: "Aug", oil: 3200, freight: 2600 },
  { month: "Sep", oil: 4100, freight: 3400 },
  { month: "Oct", oil: 5200, freight: 4100 },
  { month: "Nov", oil: 5800, freight: 4800 },
  { month: "Dec", oil: 6200, freight: 5400 },
];

// Stacked bar chart data — cost impact by category
const barData = [
  {
    category: "Raw\nmaterials",
    rawMaterials: 90,
    fuel: 60,
    logistics: 50,
    overhead: 40,
    total: 6.2,
  },
  {
    category: "Home &\nGarden",
    rawMaterials: 70,
    fuel: 55,
    logistics: 45,
    overhead: 30,
    total: 4.8,
  },
  {
    category: "Logistics",
    rawMaterials: 60,
    fuel: 65,
    logistics: 55,
    overhead: 35,
    total: 4.8,
  },
  {
    category: "Overhead",
    rawMaterials: 50,
    fuel: 45,
    logistics: 40,
    overhead: 50,
    total: 3.9,
  },
];

const CHART_COLORS = {
  oil: "#3b82f6",
  freight: "#f97316",
  rawMaterials: "#3b82f6",
  fuel: "#f97316",
  logistics: "#ef4444",
  overhead: "#6b7280",
};

const CustomTooltipLine = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "rgba(10,14,26,0.95)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "6px",
          padding: "8px 12px",
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.75rem",
        }}
      >
        <div style={{ color: "rgba(255,255,255,0.5)", marginBottom: "4px" }}>{label}</div>
        {payload.map((p: any) => (
          <div key={p.name} style={{ color: p.color, display: "flex", gap: "8px" }}>
            <span>{p.name === "oil" ? "Oil Cost" : "Freight Cost"}:</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              ${p.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CustomTooltipBar = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        style={{
          background: "rgba(10,14,26,0.95)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "6px",
          padding: "8px 12px",
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.75rem",
        }}
      >
        <div style={{ color: "rgba(255,255,255,0.5)", marginBottom: "4px" }}>
          {label.replace("\n", " ")}
        </div>
        {payload.map((p: any) => (
          <div key={p.name} style={{ color: p.fill, display: "flex", gap: "8px" }}>
            <span style={{ textTransform: "capitalize" }}>{p.name}:</span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Custom label for total % on top of bars
const renderCustomBarLabel = (props: any) => {
  const { x, y, width, value } = props;
  if (!value) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      fill="rgba(255,255,255,0.7)"
      textAnchor="middle"
      fontSize={10}
      fontFamily="'Rajdhani', sans-serif"
      fontWeight={700}
    >
      +{value}%
    </text>
  );
};

export default function CostInflationDrivers() {
  return (
    <div className="ms-panel" style={{ height: "100%" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <span className="panel-header">COST INFLATION DRIVERS</span>
        <button
          style={{
            background: "none",
            border: "none",
            color: "rgba(255,255,255,0.35)",
            cursor: "pointer",
          }}
        >
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* Charts container */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0",
          padding: "12px 8px 8px",
          height: "calc(100% - 48px)",
        }}
      >
        {/* Line Chart */}
        <div style={{ padding: "0 8px" }}>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.68rem",
              color: "rgba(255,255,255,0.4)",
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            WTI CRUDE & SHIPPING RATES (6 Months)
          </div>
          {/* Legend */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "6px" }}>
            {[
              { color: CHART_COLORS.oil, label: "Oil Cost" },
              { color: CHART_COLORS.freight, label: "Freight Cost" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <div
                  style={{
                    width: 16,
                    height: 2,
                    background: item.color,
                    borderRadius: 1,
                  }}
                />
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.65rem",
                    color: "rgba(255,255,255,0.45)",
                  }}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={lineData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="month"
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "'Inter', sans-serif" }}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                domain={[0, 7000]}
              />
              <Tooltip content={<CustomTooltipLine />} />
              <Line
                type="monotone"
                dataKey="oil"
                stroke={CHART_COLORS.oil}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: CHART_COLORS.oil }}
              />
              <Line
                type="monotone"
                dataKey="freight"
                stroke={CHART_COLORS.freight}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: CHART_COLORS.freight }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Stacked Bar Chart */}
        <div style={{ padding: "0 8px", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: "0.68rem",
              color: "rgba(255,255,255,0.4)",
              marginBottom: "8px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            ESTIMATED ITEM COST IMPACT BY CATEGORY
          </div>
          {/* Legend */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "6px" }}>
            {[
              { color: CHART_COLORS.rawMaterials, label: "Raw materials" },
              { color: CHART_COLORS.fuel, label: "Fuel" },
              { color: CHART_COLORS.logistics, label: "Logistics" },
              { color: CHART_COLORS.overhead, label: "Overhead" },
            ].map((item) => (
              <div key={item.label} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    background: item.color,
                    borderRadius: 2,
                  }}
                />
                <span
                  style={{
                    fontFamily: "'Inter', sans-serif",
                    fontSize: "0.62rem",
                    color: "rgba(255,255,255,0.45)",
                  }}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} margin={{ top: 18, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="category"
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9, fontFamily: "'Inter', sans-serif" }}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltipBar />} />
              <Bar dataKey="rawMaterials" stackId="a" fill={CHART_COLORS.rawMaterials} radius={[0, 0, 0, 0]} />
              <Bar dataKey="fuel" stackId="a" fill={CHART_COLORS.fuel} />
              <Bar dataKey="logistics" stackId="a" fill={CHART_COLORS.logistics} />
              <Bar dataKey="overhead" stackId="a" fill={CHART_COLORS.overhead} radius={[3, 3, 0, 0]}>
                <LabelList dataKey="total" content={renderCustomBarLabel} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
