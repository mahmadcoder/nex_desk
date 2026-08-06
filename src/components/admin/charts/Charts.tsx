"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SERIES, SINGLE, GRID, AXIS, seriesColour } from "./palette";
import { money } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * The charts, as thin client leaves.
 *
 * recharts needs the browser, so every page that uses these stays a server
 * component and passes plain serialisable arrays down.
 *
 * House rules applied throughout: thin marks, recessive grid, a tooltip on
 * every chart, a legend whenever there are two or more series, and never two
 * y-axes on one chart — two measures of different scale are two charts.
 */

const axisStyle = { fill: AXIS, fontSize: 11, fontFamily: "var(--font-mono)" };

/** Shared dark tooltip — recharts' default is a white box on a dark card. */
function tip(formatter?: (v: any, n: any) => any) {
  return (
    <Tooltip
      cursor={{ fill: "rgba(255,255,255,0.04)" }}
      contentStyle={{
        background: "#0B0B0F",
        border: "1px solid #26262E",
        borderRadius: 10,
        fontSize: 12,
      }}
      labelStyle={{ color: "#F5F3EC", marginBottom: 4 }}
      itemStyle={{ color: "#C9C6BA" }}
      formatter={formatter as any}
    />
  );
}

/** Horizontal bars — one row per category, sorted by the caller. */
export function CategoryBars({
  data,
  valueKey = "value",
  currency,
  height = 260,
}: {
  data: Array<{ label: string; value: number; colourIndex?: number }>;
  valueKey?: string;
  /** When set, values are money and are formatted as such. */
  currency?: string;
  height?: number;
}) {
  if (!data.length) {
    return <p className="py-8 text-center text-sm text-bone-300">Nothing in this range.</p>;
  }

  const fmt = (v: number) => (currency ? money(Number(v), currency) : String(v));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          tick={axisStyle}
          axisLine={false}
          tickLine={false}
          width={104}
        />
        {tip((v: any) => fmt(v))}
        {/* 4px rounded data-end, anchored at the baseline. */}
        <Bar dataKey={valueKey} radius={[0, 4, 4, 0]} maxBarSize={22}>
          {data.map((d, i) => (
            <Cell key={i} fill={seriesColour(d.colourIndex ?? i)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** One series over months — the single-series case, so brand lime and no legend. */
export function MonthlyBars({
  data,
  label,
  height = 240,
}: {
  data: Array<{ month: string; value: number }>;
  label: string;
  height?: number;
}) {
  if (!data.length) {
    return <p className="py-8 text-center text-sm text-bone-300">Nothing in this range.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: -16, right: 8, top: 4, bottom: 4 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} allowDecimals={false} />
        {tip((v: any) => [v, label])}
        <Bar dataKey="value" fill={SINGLE} radius={[4, 4, 0, 0]} maxBarSize={38} name={label} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Money by month, one series per currency.
 *
 * Grouped side by side rather than stacked, because stacking would draw a
 * combined height that is the sum of two currencies — a number that does not
 * exist. The legend is always present here: two or more series means identity
 * can never be colour-alone.
 */
export function MonthlyMoney({
  data,
  currencies,
  height = 260,
}: {
  data: Array<Record<string, any>>;
  currencies: string[];
  height?: number;
}) {
  if (!data.length || !currencies.length) {
    return <p className="py-8 text-center text-sm text-bone-300">Nothing collected in this range.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ left: -8, right: 8, top: 4, bottom: 4 }} barGap={2}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tick={axisStyle} axisLine={false} tickLine={false} width={64} />
        {tip((v: any, n: any) => money(Number(v), String(n)))}
        {currencies.length > 1 && (
          <Legend
            wrapperStyle={{ fontSize: 11, fontFamily: "var(--font-mono)", color: AXIS }}
            iconType="circle"
            iconSize={8}
          />
        )}
        {currencies.map((cur, i) => (
          <Bar
            key={cur}
            dataKey={cur}
            name={cur}
            fill={SERIES[i % SERIES.length]}
            radius={[4, 4, 0, 0]}
            maxBarSize={26}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
