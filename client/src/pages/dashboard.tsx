import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, AlertTriangle, Activity, FileCheck } from "lucide-react";
import { useLocation } from "wouter";
import { 
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const [, setLocation] = useLocation();
  
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats"],
  });

  const { data: topRiskyAssets, isLoading: assetsLoading } = useQuery({
    queryKey: ["/api/assets/top-risky"],
  });

  const { data: trendData } = useQuery({
    queryKey: ["/api/stats/trend"],
  });

  const chartData = trendData || [
    { date: "Mon", events: 0 },
    { date: "Tue", events: 0 },
    { date: "Wed", events: 0 },
    { date: "Thu", events: 0 },
    { date: "Fri", events: 0 },
    { date: "Sat", events: 0 },
    { date: "Sun", events: 0 },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-medium">Security Dashboard</h1>
        <p className="text-muted-foreground">
          Real-time overview of your security posture and threat landscape
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statsLoading ? (
          <>
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </>
        ) : (
          <>
            <StatCard
              title="Total Assets"
              value={stats?.assets || 0}
              icon={Shield}
              trend={{ value: 5, label: "from last month" }}
              onClick={() => setLocation("/assets")}
            />
            <StatCard
              title="Intel Events"
              value={stats?.intelEvents || 0}
              icon={Activity}
              trend={{ value: 12, label: "from last week" }}
              onClick={() => setLocation("/intel-events")}
            />
            <StatCard
              title="Controls"
              value={stats?.controls || 0}
              icon={FileCheck}
              onClick={() => setLocation("/controls")}
            />
            <StatCard
              title="Open Incidents"
              value={stats?.incidents || 0}
              icon={AlertTriangle}
              onClick={() => setLocation("/incidents")}
            />
          </>
        )}
      </div>

      {/* Charts and Tables Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Event Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">7-Day Event Trend</CardTitle>
            <CardDescription>Daily intel events collected from OSINT sources</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="events" stroke="hsl(var(--chart-1))" strokeWidth={2} name="Intel Events" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Risky Assets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Top 5 Risky Assets</CardTitle>
            <CardDescription>Assets with highest risk scores</CardDescription>
          </CardHeader>
          <CardContent>
            {assetsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (
              <div className="space-y-3" data-testid="top-risky-assets">
                {(topRiskyAssets && topRiskyAssets.length > 0) ? (
                  topRiskyAssets.map((asset: any) => (
                    <div
                      key={asset.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-md border hover-elevate cursor-pointer transition-all"
                      onClick={() => setLocation(`/assets/${asset.id}`)}
                      data-testid={`risky-asset-${asset.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{asset.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {asset.type} • {asset.owner || "Unassigned"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">Risk Score</p>
                          <p className="text-2xl font-bold text-destructive">{asset.riskScore || 0}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No risk data available yet</p>
                    <p className="text-sm">Import assets to get started</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
