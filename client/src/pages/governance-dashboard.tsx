import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Shield, CheckCircle, AlertTriangle, Clock, TrendingUp, 
  FileText, RefreshCw, Download, Activity, Target, Calendar
} from "lucide-react";

interface GovernSummary {
  latestSnapshot: {
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
    totalAssets: number;
    totalControls: number;
    implementedControls: number;
    snapshotDate: string;
  } | null;
  assertions: {
    total: number;
    implemented: number;
    partial: number;
    planned: number;
    notAssessed: number;
  };
  openPoamItems: number;
  openRisks: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  coverageByFunction: Record<string, { total: number; covered: number; pct: number }>;
}

export default function GovernanceDashboard() {
  const { toast } = useToast();

  const { data: summary, isLoading, refetch } = useQuery<GovernSummary>({
    queryKey: ["/api/govern/summary"],
  });

  const runAgentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/govern/run");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/govern/summary"] });
      queryClient.invalidateQueries({ queryKey: ["/api/compliance/assertions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/poam"] });
      toast({
        title: "Governance analysis complete",
        description: `Coverage: ${data.coveragePct?.toFixed(1)}%, ${data.poamCreated} new POA&M items created`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to run governance analysis",
        variant: "destructive",
      });
    },
  });

  const exportReportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", "/api/govern/report");
      return response.json();
    },
    onSuccess: (data) => {
      const blob = new Blob([data.report], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `governance-report-${new Date().toISOString().split("T")[0]}.md`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "Report exported",
        description: "Executive report downloaded as Markdown",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to export report",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const snapshot = summary?.latestSnapshot;
  const coverageByFunction = summary?.coverageByFunction || {};

  const kpiCards = [
    {
      title: "CSF Coverage",
      value: `${snapshot?.coveragePct || 0}%`,
      target: "65%",
      icon: Shield,
      color: (snapshot?.coveragePct || 0) >= 65 ? "text-chart-2" : "text-destructive",
      progress: snapshot?.coveragePct || 0,
    },
    {
      title: "Evidence Freshness",
      value: `${snapshot?.evidenceFreshPct || 0}%`,
      target: "80%",
      icon: CheckCircle,
      color: (snapshot?.evidenceFreshPct || 0) >= 80 ? "text-chart-2" : "text-yellow-600",
      progress: snapshot?.evidenceFreshPct || 0,
    },
    {
      title: "IR SLA Compliance",
      value: `${snapshot?.irSlaPct ?? 0}%`,
      target: "90%",
      icon: Clock,
      color: (snapshot?.irSlaPct ?? 0) >= 90 ? "text-chart-2" : "text-yellow-600",
      progress: snapshot?.irSlaPct ?? 0,
    },
    {
      title: "RPO/RTO Compliance",
      value: `${snapshot?.rpoRtoPct ?? 0}%`,
      target: "85%",
      icon: Activity,
      color: (snapshot?.rpoRtoPct ?? 0) >= 85 ? "text-chart-2" : "text-yellow-600",
      progress: snapshot?.rpoRtoPct ?? 0,
    },
    {
      title: "MTTR",
      value: `${snapshot?.mttrMinutes ?? 0} min`,
      target: "480 min",
      icon: TrendingUp,
      color: (snapshot?.mttrMinutes ?? 9999) <= 480 ? "text-chart-2" : "text-yellow-600",
    },
    {
      title: "MTTD",
      value: `${snapshot?.mttdMinutes ?? 0} min`,
      target: "60 min",
      icon: Target,
      color: (snapshot?.mttdMinutes ?? 9999) <= 60 ? "text-chart-2" : "text-yellow-600",
    },
    {
      title: "Open POA&M Items",
      value: summary?.openPoamItems?.toString() || "0",
      icon: FileText,
      color: (summary?.openPoamItems || 0) > 10 ? "text-yellow-600" : "text-chart-2",
    },
    {
      title: "Open Risks",
      value: `${(summary?.openRisks?.critical || 0) + (summary?.openRisks?.high || 0) + (summary?.openRisks?.medium || 0) + (summary?.openRisks?.low || 0)}`,
      icon: AlertTriangle,
      color: (summary?.openRisks?.critical || 0) > 0 ? "text-destructive" : "text-chart-2",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium">Governance Dashboard</h1>
          <p className="text-muted-foreground">
            CSF 2.0 compliance status, KPIs, and governance metrics
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportReportMutation.mutate()}
            disabled={exportReportMutation.isPending}
            data-testid="button-export-report"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button
            onClick={() => runAgentMutation.mutate()}
            disabled={runAgentMutation.isPending}
            data-testid="button-run-analysis"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${runAgentMutation.isPending ? "animate-spin" : ""}`} />
            Run Analysis
          </Button>
        </div>
      </div>

      {/* Last updated info */}
      {snapshot?.snapshotDate && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          Last analysis: {new Date(snapshot.snapshotDate).toLocaleString()}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title} data-testid={`card-kpi-${kpi.title.toLowerCase().replace(/\s/g, "-")}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              {kpi.target && (
                <p className="text-xs text-muted-foreground">Target: {kpi.target}</p>
              )}
              {kpi.progress !== undefined && (
                <Progress value={kpi.progress} className="mt-2 h-2" />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CSF Function Coverage */}
      <Card>
        <CardHeader>
          <CardTitle>CSF 2.0 Function Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(coverageByFunction).map(([func, data]) => (
              <div key={func} className="space-y-2" data-testid={`coverage-${func.toLowerCase()}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{func}</span>
                  <Badge variant={data.pct >= 80 ? "default" : data.pct >= 50 ? "secondary" : "destructive"}>
                    {data.pct.toFixed(0)}%
                  </Badge>
                </div>
                <Progress value={data.pct} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {data.covered} of {data.total} subcategories covered
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Risk Summary and Assertions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Open Risks by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-destructive" />
                  <span>Critical</span>
                </div>
                <span className="font-bold">{summary?.openRisks?.critical || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-orange-500" />
                  <span>High</span>
                </div>
                <span className="font-bold">{summary?.openRisks?.high || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <span>Medium</span>
                </div>
                <span className="font-bold">{summary?.openRisks?.medium || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span>Low</span>
                </div>
                <span className="font-bold">{summary?.openRisks?.low || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assertion Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="default">Implemented</Badge>
                </div>
                <span className="font-bold">{summary?.assertions?.implemented || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">Partial</Badge>
                </div>
                <span className="font-bold">{summary?.assertions?.partial || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Planned</Badge>
                </div>
                <span className="font-bold">{summary?.assertions?.planned || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="destructive">Not Assessed</Badge>
                </div>
                <span className="font-bold">{summary?.assertions?.notAssessed || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{snapshot?.totalAssets || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{snapshot?.totalControls || 0}</div>
            <p className="text-xs text-muted-foreground">
              {snapshot?.implementedControls || 0} implemented
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assertions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.assertions?.total || 0}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
