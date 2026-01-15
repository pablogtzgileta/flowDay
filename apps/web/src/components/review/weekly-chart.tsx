import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { cn } from "@/lib/utils"

export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun"

interface DayData {
  day: DayOfWeek
  label: string
  completionRate: number
  totalBlocks: number
  completedBlocks: number
}

interface WeeklyChartProps {
  data: DayData[]
  bestDay?: DayOfWeek | null
  worstDay?: DayOfWeek | null
  className?: string
}

const SHORT_DAY_LABELS: Record<DayOfWeek, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
}

export function WeeklyChart({
  data,
  bestDay,
  worstDay,
  className,
}: WeeklyChartProps) {
  // Transform data for Recharts
  const chartData = data.map((item) => ({
    ...item,
    name: SHORT_DAY_LABELS[item.day],
    fill: getBarColor(item.day, item.completionRate, bestDay, worstDay),
  }))

  return (
    <div className={cn("rounded-lg bg-card p-4", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Daily Completion Rate</h3>
        <div className="flex items-center gap-4 text-xs">
          {bestDay && (
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground">Best</span>
            </div>
          )}
          {worstDay && (
            <div className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <span className="text-muted-foreground">Needs work</span>
            </div>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            domain={[0, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
            content={({ active, payload }) => {
              if (!active || !payload?.[0]) return null
              const data = payload[0].payload as DayData & { name: string }
              return (
                <div className="rounded-lg border bg-popover px-3 py-2 shadow-md">
                  <p className="font-semibold">{data.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {data.completedBlocks}/{data.totalBlocks} blocks ({data.completionRate}%)
                  </p>
                </div>
              )
            }}
          />
          <Bar dataKey="completionRate" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// Exported for testing
export function getBarColor(
  day: DayOfWeek,
  rate: number,
  bestDay?: DayOfWeek | null,
  worstDay?: DayOfWeek | null
): string {
  if (day === bestDay) return "hsl(142 76% 36%)" // green-600
  if (day === worstDay) return "hsl(38 92% 50%)" // amber-500

  // Default color based on completion rate
  if (rate >= 80) return "hsl(142 76% 36%)" // green-600
  if (rate >= 60) return "hsl(var(--primary))"
  if (rate >= 40) return "hsl(38 92% 50%)" // amber-500
  return "hsl(var(--muted-foreground))"
}
