"use client";

import { useMemo, useState } from "react";
import { Icon } from "./icons";

export type SeriesPoint = { date: string; value: number };

function formatDay(date: string): string {
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}

function smoothPath(points: Array<[number, number]>): string {
  if (!points.length) return "";
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;
  let path = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i += 1) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const cx = (x0 + x1) / 2;
    path += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
  }
  return path;
}

export function XpProgressChart({ data, accent = "#a259ff" }: { data: SeriesPoint[]; accent?: string }) {
  const [range, setRange] = useState<7 | 30 | 90>(7);
  const chart = useMemo(() => {
    const slice = data.slice(-range);
    let accumulator = 0;
    const cumulative = slice.map((point) => {
      accumulator += point.value;
      return { date: point.date, value: accumulator };
    });
    const max = Math.max(10, ...cumulative.map((point) => point.value));
    const width = 640;
    const height = 210;
    const paddingX = 12;
    const paddingY = 18;
    const stepX = cumulative.length > 1 ? (width - paddingX * 2) / (cumulative.length - 1) : 0;
    const points: Array<[number, number]> = cumulative.map((point, index) => [
      paddingX + index * stepX,
      height - paddingY - (point.value / max) * (height - paddingY * 2),
    ]);
    return { cumulative, max, width, height, points, total: accumulator, accent };
  }, [data, range, accent]);

  if (!data.length) {
    return <p className="py-12 text-center text-sm text-white/40">Sem dados de XP no período.</p>;
  }

  const line = smoothPath(chart.points);
  const area = `${line} L ${chart.points.at(-1)?.[0] ?? 0} ${chart.height - 18} L ${chart.points[0]?.[0] ?? 0} ${chart.height - 18} Z`;
  const labelStep = Math.max(1, Math.ceil(chart.cumulative.length / 6));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
          {[7, 30, 90].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRange(value as 7 | 30 | 90)}
              className={`rounded-md px-2.5 py-1 text-[0.68rem] font-semibold transition ${
                range === value ? "bg-neon text-white shadow-[0_4px_14px_-6px_#a259ff]" : "text-white/50 hover:text-white"
              }`}
            >
              {value}D
            </button>
          ))}
        </div>
        <span className="chip border-white/10 bg-white/5 text-white/70">
          <span className="size-1.5 rounded-full" style={{ background: accent }} />
          +{chart.total} XP no período
        </span>
      </div>
      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="h-auto w-full" role="img" aria-label="Evolução de XP">
        <defs>
          <linearGradient id="xp-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={accent} stopOpacity="0.38" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="xp-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="100%" stopColor={accent} />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1="0"
            x2={chart.width}
            y1={chart.height - 18 - ratio * (chart.height - 36)}
            y2={chart.height - 18 - ratio * (chart.height - 36)}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="4 6"
          />
        ))}
        <path d={area} fill="url(#xp-area)" />
        <path d={line} fill="none" stroke="url(#xp-line)" strokeWidth="2.4" strokeLinecap="round" />
        {chart.points.map(([x, y], index) => {
          const isLast = index === chart.points.length - 1;
          return (
            <g key={index}>
              <circle cx={x} cy={y} r={isLast ? 4.2 : 2.6} fill={isLast ? "#fff" : accent} stroke={accent} strokeWidth="1.6" />
              {isLast ? (
                <g>
                  <rect x={Math.min(x - 44, chart.width - 92)} y={y - 30} width="88" height="20" rx="6" fill="#14141e" stroke={accent} strokeOpacity="0.5" />
                  <text
                    x={Math.min(x - 44, chart.width - 92) + 44}
                    y={y - 16}
                    fill="#fff"
                    fontSize="10"
                    textAnchor="middle"
                    fontWeight="600"
                  >
                    {chart.total} XP
                  </text>
                </g>
              ) : null}
            </g>
          );
        })}
        {chart.cumulative.map((point, index) =>
          index % labelStep === 0 || index === chart.cumulative.length - 1 ? (
            <text
              key={point.date}
              x={chart.points[index][0]}
              y={chart.height - 2}
              fill="rgba(255,255,255,0.4)"
              fontSize="9.5"
              textAnchor={index === 0 ? "start" : index === chart.cumulative.length - 1 ? "end" : "middle"}
            >
              {formatDay(point.date)}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

export function WeeklyBarChart({
  data,
  color = "#a259ff",
}: {
  data: Array<{ label: string; value: number }>;
  color?: string;
}) {
  const max = Math.max(1, ...data.map((item) => item.value));
  return (
    <div className="flex h-40 items-end gap-2">
      {data.map((item) => (
        <div key={item.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-[0.62rem] font-semibold text-white/45 group-hover:text-white">{item.value}</span>
          <div
            className="w-full rounded-md transition-all duration-500 group-hover:brightness-125"
            style={{
              height: `${Math.max(4, (item.value / max) * 100)}%`,
              background: `linear-gradient(180deg, ${color}, ${color}33)`,
              boxShadow: `0 0 16px -8px ${color}`,
            }}
          />
          <span className="text-[0.62rem] text-white/40">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export function MultiMemberChart({
  series,
  labels,
}: {
  series: Array<{ name: string; color: string; data: number[] }>;
  labels: string[];
}) {
  const [window, setWindow] = useState<30 | 60 | 84>(30);
  const sliced = series.map((entry) => ({
    ...entry,
    data: entry.data.slice(-window).reduce<number[]>((accumulator, value, index) => {
      const previous = index === 0 ? 0 : accumulator[index - 1];
      accumulator.push(previous + value);
      return accumulator;
    }, []),
  }));
  const slicedLabels = labels.slice(-window);
  const max = Math.max(10, ...sliced.flatMap((entry) => entry.data));
  const width = 660;
  const height = 230;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-3">
          {series.map((entry) => (
            <span key={entry.name} className="flex items-center gap-1.5 text-xs text-white/60">
              <span className="size-2 rounded-full" style={{ background: entry.color }} />
              {entry.name}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
          {[30, 60, 84].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setWindow(value as 30 | 60 | 84)}
              className={`rounded-md px-2.5 py-1 text-[0.68rem] font-semibold transition ${
                window === value ? "bg-neon text-white" : "text-white/50 hover:text-white"
              }`}
            >
              {value}D
            </button>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Evolução de XP por integrante">
        {[0.25, 0.5, 0.75, 1].map((ratio) => (
          <line
            key={ratio}
            x1="8"
            x2={width - 8}
            y1={height - 22 - ratio * (height - 44)}
            y2={height - 22 - ratio * (height - 44)}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="4 6"
          />
        ))}
        {sliced.map((entry) => {
          const stepX = entry.data.length > 1 ? (width - 20) / (entry.data.length - 1) : 0;
          const points: Array<[number, number]> = entry.data.map((value, index) => [
            10 + index * stepX,
            height - 22 - (value / max) * (height - 44),
          ]);
          return (
            <path
              key={entry.name}
              d={smoothPath(points)}
              fill="none"
              stroke={entry.color}
              strokeWidth="2.1"
              strokeLinecap="round"
              opacity="0.95"
            />
          );
        })}
        {slicedLabels.map((label, index) =>
          index % Math.ceil(slicedLabels.length / 6) === 0 ? (
            <text
              key={label}
              x={10 + (index * (width - 20)) / Math.max(1, slicedLabels.length - 1)}
              y={height - 6}
              fill="rgba(255,255,255,0.38)"
              fontSize="9.5"
              textAnchor="middle"
            >
              {formatDay(label)}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

export function HorizontalBars({
  data,
  suffix = "",
}: {
  data: Array<{ label: string; value: number; color?: string }>;
  suffix?: string;
}) {
  const max = Math.max(1, ...data.map((item) => item.value));
  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-white/65">{item.label}</span>
            <span className="font-semibold text-white">
              {item.value}
              {suffix}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/7">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(3, (item.value / max) * 100)}%`,
                background: `linear-gradient(90deg, ${item.color ?? "#a259ff"}55, ${item.color ?? "#a259ff"})`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AchievementProgressDots({ progress, target }: { progress: number; target: number }) {
  const dots = Math.min(target, 10);
  const ratio = target > 10 ? progress / target : progress / Math.max(1, dots);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: dots }).map((_, index) => (
        <span
          key={index}
          className={`size-1.5 rounded-full ${index < Math.round(ratio * dots) ? "bg-neon-bright" : "bg-white/15"}`}
        />
      ))}
      <span className="ml-1 inline-flex items-center gap-0.5 text-[0.62rem] text-white/40">
        <Icon name="sparkles" size={9} />
        {Math.min(progress, target)}/{target}
      </span>
    </div>
  );
}
