import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";

interface MetricsSnapshot {
  id: string;
  snapshotDate: string;
  coveragePct: number;
  evidenceFreshPct: number;
  mttrMinutes: number | null;
  mttdMinutes: number | null;
  irSlaPct: number | null;
  rpoRtoPct: number | null;
  openRisksCritical: number;
  openRisksHigh: number;
  openRisksMedium: number;
  openRisksLow: number;
  openPoamItems: number;
}

export default function MetricsTrends() {
  const [period, setPeriod] = useState("30d");

  const { data, isLoading } = useQuery<{ snapshots: MetricsSnapshot[] }>({
    queryKey: ["/api/metrics/snapshots", { period }],
  });

  const snapshots = data?.snapshots || [];

  const chartData = snapshots.map((s) => ({
    date: new Date(s.snapshotDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    coverage: s.coveragePct,
    freshness: s.evidenceFreshPct,
    mttr: s.mttrMinutes,
    mttd: s.mttdMinutes,
    irSla: s.irSlaPct,
    rpoRto: s.rpoRtoPct,
    risks: s.openRisksCritical + s.openRisksHigh + s.openRisksMedium + s.openRisksLow,
    poam: s.openPoamItems,
  }));

  const getTrend = (values: number[]) => {
    if (values.length < 2) return "stable";
    const first = values[0];
    const last = values[values.length - 1];
    if (last > first * 1.05) return "up";
    if (last < first * 0.95) return "down";
    return "stable";
  };

  const TrendIcon = ({ trend, positive }: { trend: string; positive: boolean }) => {
    const isGood = (trend === "up" && positive) || (trend === "down" && !positive);
    const isBad = (trend === "down" && positive) || (trend === "up" && !positive);
    
    if (trend === "up") {
      return <TrendingUp className={`h-4 w-4 ${isGood ? "text-chart-2" : "text-destructive"}`} />;
    }
    if (trend === "down") {
      return <TrendingDown className={`h-4 w-4 ${isBad ? "text-destructive" : "text-chart-2"}`} />;
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const metrics = [
    {
      title: "CSF Coverage",
      key: "coverage",
      color: "#22c55e",
      suffix: "%",
      positiveUp: true,
      target: 65,
    },
    {
      title: "Evidence Freshness",
      key: "freshness",
      color: "#3b82f6",
      suffix: "%",
      positiveUp: true,
      target: 80,
    },
    {
      title: "IR SLA Compliance",
      key: "irSla",
      color: "#f59e0b",
      suffix: "%",
      positiveUp: true,
      target: 90,
    },
    {
      title: "RPO/RTO Compliance",
      key: "rpoRto",
      color: "#8b5cf6",
      suffix: "%",
      positiveUp: true,
      target: 85,
    },
    {
      title: "MTTR",
      key: "mttr",
      color: "#ef4444",
      suffix: " min",
      positiveUp: false,
      target: 480,
    },
    {
      title: "Open Risks",
      key: "risks",
      color: "#f97316",
      suffix: "",
      positiveUp: false,
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium">Metrics Trends</h1>
          <p className="text-muted-foreground">
            Historical KPI data and trend analysis
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[150px]" data-testid="select-period">
            <Calendar className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {snapshots.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <TrendingUp className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-medium mb-2">No metrics data yet</h3>
            <p className="text-muted-foreground">
              Run the Govern Agent from the Governance Dashboard to start collecting metrics
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {metrics.map((metric) => {
            const values = chartData.map((d) => d[metric.key as keyof typeof d] as number).filter((v) => v !== null);
            const trend = getTrend(values);
            const current = values[values.length - 1] || 0;
            
            return (
              <Card key={metric.key} data-testid={`chart-${metric.key}`}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div>
                    <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-2xl font-bold">
                        {current !== null ? `${Math.round(current)}${metric.suffix}` : "N/A"}
                      </span>
                      <TrendIcon trend={trend} positive={metric.positiveUp} />
                    </div>
                  </div>
                  {metric.target && (
                    <div className="text-xs text-muted-foreground">
                      Target: {metric.target}{metric.suffix}
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="h-[150px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tick={{ fontSize: 10 }} 
                          className="text-muted-foreground"
                        />
                        <YAxis 
                          tick={{ fontSize: 10 }} 
                          className="text-muted-foreground"
                          domain={metric.suffix === "%" ? [0, 100] : ["auto", "auto"]}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: "hsl(var(--card))", 
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px"
                          }}
                          labelStyle={{ color: "hsl(var(--foreground))" }}
                        />
                        <defs>
                          <linearGradient id={`gradient-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={metric.color} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={metric.color} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area
                          type="monotone"
                          dataKey={metric.key}
                          stroke={metric.color}
                          fill={`url(#gradient-${metric.key})`}
                          strokeWidth={2}
                        />
                        {metric.target && (
                          <Line
                            type="monotone"
                            dataKey={() => metric.target}
                            stroke="hsl(var(--muted-foreground))"
                            strokeDasharray="5 5"
                            dot={false}
                          />
                        )}
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* POA&M Trend */}
      {snapshots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Open POA&M Items Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <defs>
                    <linearGradient id="gradient-poam" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="poam"
                    stroke="#6366f1"
                    fill="url(#gradient-poam)"
                    strokeWidth={2}
                    name="Open Items"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
