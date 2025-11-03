import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, AlertTriangle, Eye, Activity, TrendingUp } from "lucide-react";
import { SeverityBadge } from "@/components/severity-badge";
import { useLocation } from "wouter";
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
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

  const { data: recentDetections, isLoading: detectionsLoading } = useQuery({
    queryKey: ["/api/detections/recent"],
  });

  const { data: trendData } = useQuery({
    queryKey: ["/api/stats/trend"],
  });

  const { data: coverageData } = useQuery({
    queryKey: ["/api/coverage"],
  });

  // Mock data for charts (will be replaced with real data)
  const mockTrendData = trendData || [
    { date: "Mon", detections: 12, incidents: 2 },
    { date: "Tue", detections: 19, incidents: 3 },
    { date: "Wed", detections: 15, incidents: 1 },
    { date: "Thu", detections: 25, incidents: 5 },
    { date: "Fri", detections: 22, incidents: 4 },
    { date: "Sat", detections: 18, incidents: 2 },
    { date: "Sun", detections: 14, incidents: 1 },
  ];

  const mockCoverageData = coverageData || [
    { name: "Identify", value: 75, color: "#3b82f6" },
    { name: "Protect", value: 62, color: "#8b5cf6" },
    { name: "Detect", value: 80, color: "#10b981" },
    { name: "Respond", value: 55, color: "#f59e0b" },
    { name: "Recover", value: 45, color: "#ef4444" },
    { name: "Govern", value: 68, color: "#6366f1" },
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
              title="Active Detections"
              value={stats?.detections || 0}
              icon={Eye}
              trend={{ value: -8, label: "from last week" }}
              onClick={() => setLocation("/detections")}
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

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Detection Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">7-Day Detection Trend</CardTitle>
            <CardDescription>Daily detections and incident counts</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockTrendData}>
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
                <Line type="monotone" dataKey="detections" stroke="hsl(var(--chart-1))" strokeWidth={2} name="Detections" />
                <Line type="monotone" dataKey="incidents" stroke="hsl(var(--chart-4))" strokeWidth={2} name="Incidents" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* CSF Coverage */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">CSF 2.0 Coverage</CardTitle>
            <CardDescription>Implementation status across functions</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockCoverageData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" domain={[0, 100]} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                  formatter={(value) => [`${value}%`, "Coverage"]}
                />
                <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]}>
                  {mockCoverageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tables Row */}
      <div className="grid gap-6 lg:grid-cols-2">
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

        {/* Recent Detections */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-medium">Recent Detections (24h)</CardTitle>
            <CardDescription>Latest threat detections</CardDescription>
          </CardHeader>
          <CardContent>
            {detectionsLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            ) : (
              <div className="space-y-3" data-testid="recent-detections">
                {(recentDetections && recentDetections.length > 0) ? (
                  recentDetections.map((detection: any) => (
                    <div
                      key={detection.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-md border hover-elevate cursor-pointer transition-all"
                      onClick={() => setLocation(`/detections/${detection.id}`)}
                      data-testid={`detection-${detection.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate font-mono text-sm" data-testid={`detection-indicator-${detection.id}`}>{detection.indicator}</p>
                          <SeverityBadge severity={detection.severity} />
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {detection.source} • {detection.assetName || "Unknown asset"}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground ml-4">
                        {new Date(detection.lastSeen).toLocaleTimeString()}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Eye className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No detections in the last 24 hours</p>
                    <p className="text-sm">All clear!</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest system events and agent actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4" data-testid="activity-feed">
            {/* Activity timeline will go here */}
            <div className="text-center py-8 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Activity feed coming soon</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
