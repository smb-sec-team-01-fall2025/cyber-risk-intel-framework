import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Shield, FileText, AlertTriangle } from "lucide-react";
import { BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";

export default function Compliance() {
  const { data: coverage } = useQuery({
    queryKey: ["/api/compliance/coverage"],
  });

  const { data: gaps } = useQuery({
    queryKey: ["/api/compliance/gaps"],
  });

  // Mock data
  const mockCoverageData = coverage || [
    { name: "Identify", implemented: 45, total: 60, percentage: 75 },
    { name: "Protect", implemented: 38, total: 61, percentage: 62 },
    { name: "Detect", implemented: 32, total: 40, percentage: 80 },
    { name: "Respond", implemented: 22, total: 40, percentage: 55 },
    { name: "Recover", implemented: 18, total: 40, percentage: 45 },
    { name: "Govern", implemented: 34, total: 50, percentage: 68 },
  ];

  const radarData = mockCoverageData.map(item => ({
    subject: item.name,
    coverage: item.percentage,
    target: 90,
  }));

  const topGaps = gaps || [
    { category: "PR.AC-1", title: "Identity Management", priority: 5 },
    { category: "DE.CM-7", title: "Network Monitoring", priority: 4 },
    { category: "RS.CO-2", title: "Incident Reporting", priority: 4 },
    { category: "RC.RP-1", title: "Recovery Planning", priority: 3 },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-medium">Compliance Dashboard</h1>
        <p className="text-muted-foreground">
          Track NIST CSF 2.0 implementation status and identify gaps
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Overall Coverage"
          value="65%"
          icon={CheckCircle}
          trend={{ value: 8, label: "from last month" }}
        />
        <StatCard
          title="Controls Implemented"
          value={189}
          icon={Shield}
          trend={{ value: 12, label: "this month" }}
        />
        <StatCard
          title="Critical Gaps"
          value={12}
          icon={AlertTriangle}
        />
        <StatCard
          title="SOPs Documented"
          value={45}
          icon={FileText}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Coverage by Function */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">CSF Function Coverage</CardTitle>
            <CardDescription>Implementation status across all 6 functions</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockCoverageData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis domain={[0, 100]} className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                  formatter={(value) => [`${value}%`, "Coverage"]}
                />
                <Legend />
                <Bar dataKey="percentage" fill="hsl(var(--chart-1))" name="Implemented %" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">CSF Maturity Profile</CardTitle>
            <CardDescription>Current vs. target coverage</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" className="text-xs" />
                <PolarRadiusAxis domain={[0, 100]} className="text-xs" />
                <Radar name="Current" dataKey="coverage" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.6} />
                <Radar name="Target" dataKey="target" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.2} />
                <Tooltip />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Function Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {mockCoverageData.map((func) => (
          <Card key={func.name} data-testid={`coverage-card-${func.name.toLowerCase()}`}>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{func.name}</CardTitle>
                <Badge 
                  variant={func.percentage >= 70 ? "default" : func.percentage >= 50 ? "secondary" : "destructive"}
                  className="text-sm"
                >
                  {func.percentage}%
                </Badge>
              </div>
              <CardDescription>
                {func.implemented} of {func.total} controls implemented
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Progress value={func.percentage} className="h-3" />
              <p className="text-xs text-muted-foreground mt-2">
                {func.total - func.implemented} controls remaining
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top Gaps */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Priority Gaps</CardTitle>
          <CardDescription>
            Critical controls that need immediate attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topGaps.map((gap, idx) => (
              <div key={idx} className="flex items-center justify-between gap-4 p-4 rounded-md border hover-elevate cursor-pointer" data-testid={`gap-${gap.category.toLowerCase().replace(/\./g, "-")}`}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="font-mono text-xs">
                      {gap.category}
                    </Badge>
                    <p className="font-medium">{gap.title}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Not yet implemented
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Priority:</span>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className={`h-3 w-3 rounded-sm ${
                          i < gap.priority ? "bg-destructive" : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
