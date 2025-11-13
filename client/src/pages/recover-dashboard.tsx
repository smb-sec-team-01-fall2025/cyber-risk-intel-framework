import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, XCircle, AlertTriangle, Shield, Database, Clock, TrendingUp } from "lucide-react";

interface RecoverySummary {
  totalDrPlans: number;
  rpoCompliancePercent: number;
  rtoCompliancePercent: number;
  openFindingsBySeverity: Record<number, number>;
  recentBackupsCount: number;
  recentRestoreTestsCount: number;
  averageResilienceScore: number;
}

export default function RecoverDashboard() {
  const { data: summary, isLoading } = useQuery<RecoverySummary>({
    queryKey: ["/api/recover/summary"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" data-testid="spinner-loading"></div>
          <p className="text-sm text-muted-foreground">Loading recovery posture...</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground" data-testid="text-no-data">No recovery data available</p>
      </div>
    );
  }

  const totalOpenFindings = Object.values(summary.openFindingsBySeverity).reduce((sum, count) => sum + count, 0);
  const criticalFindings = summary.openFindingsBySeverity[5] || 0;
  const highFindings = summary.openFindingsBySeverity[4] || 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-medium" data-testid="text-page-title">Recover Function</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Business continuity & disaster recovery posture
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card data-testid="card-dr-plans">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DR Plans</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold" data-testid="text-total-dr-plans">{summary.totalDrPlans}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Active disaster recovery plans
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-rpo-compliance">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RPO Compliance</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold" data-testid="text-rpo-compliance">
              {summary.rpoCompliancePercent}%
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Plans with recent successful backups
            </p>
            <div className="mt-3 w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${summary.rpoCompliancePercent}%` }}
                data-testid="progress-rpo"
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-rto-compliance">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RTO Compliance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold" data-testid="text-rto-compliance">
              {summary.rtoCompliancePercent}%
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Plans with proven restore times
            </p>
            <div className="mt-3 w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${summary.rtoCompliancePercent}%` }}
                data-testid="progress-rto"
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-resilience-score">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resilience Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold" data-testid="text-resilience-score">
              {summary.averageResilienceScore}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Average across all DR plans
            </p>
            <div className="mt-3">
              {summary.averageResilienceScore >= 80 && (
                <Badge variant="default" className="gap-1" data-testid="badge-score-good">
                  <CheckCircle2 className="h-3 w-3" />
                  Good
                </Badge>
              )}
              {summary.averageResilienceScore >= 60 && summary.averageResilienceScore < 80 && (
                <Badge variant="secondary" className="gap-1" data-testid="badge-score-fair">
                  <AlertTriangle className="h-3 w-3" />
                  Fair
                </Badge>
              )}
              {summary.averageResilienceScore < 60 && (
                <Badge variant="destructive" className="gap-1" data-testid="badge-score-poor">
                  <XCircle className="h-3 w-3" />
                  Poor
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-findings">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Open Resilience Findings</CardTitle>
            <p className="text-sm text-muted-foreground">
              AI-identified gaps and violations
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {totalOpenFindings === 0 ? (
              <div className="flex items-center gap-3 text-muted-foreground" data-testid="text-no-findings">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="text-sm">No open findings - excellent recovery posture</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Open Findings</span>
                  <Badge variant="outline" data-testid="badge-total-findings">{totalOpenFindings}</Badge>
                </div>
                
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map(severity => {
                    const count = summary.openFindingsBySeverity[severity] || 0;
                    if (count === 0) return null;
                    
                    const severityLabel = severity === 5 ? "Critical" : severity === 4 ? "High" : severity === 3 ? "Medium" : severity === 2 ? "Low" : "Info";
                    const severityColor = severity === 5 ? "destructive" : severity === 4 ? "destructive" : severity === 3 ? "secondary" : "outline";
                    
                    return (
                      <div key={severity} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          <Badge variant={severityColor as any} data-testid={`badge-severity-${severity}`}>
                            {severityLabel}
                          </Badge>
                          <span className="text-sm text-muted-foreground">Severity {severity}</span>
                        </div>
                        <span className="text-sm font-medium" data-testid={`text-count-${severity}`}>{count}</span>
                      </div>
                    );
                  })}
                </div>

                {(criticalFindings > 0 || highFindings > 0) && (
                  <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Attention Required</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {criticalFindings > 0 && `${criticalFindings} critical`}
                          {criticalFindings > 0 && highFindings > 0 && " and "}
                          {highFindings > 0 && `${highFindings} high`}
                          {" severity "}
                          {criticalFindings + highFindings === 1 ? "finding" : "findings"} require immediate remediation
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-activity">
          <CardHeader>
            <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
            <p className="text-sm text-muted-foreground">
              Last 24 hours
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Database className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Backup Operations</p>
                  <p className="text-xs text-muted-foreground">Completed backups</p>
                </div>
              </div>
              <span className="text-2xl font-bold" data-testid="text-recent-backups">
                {summary.recentBackupsCount}
              </span>
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">Restore Tests</p>
                  <p className="text-xs text-muted-foreground">Validation exercises</p>
                </div>
              </div>
              <span className="text-2xl font-bold" data-testid="text-recent-restores">
                {summary.recentRestoreTestsCount}
              </span>
            </div>

            {summary.recentBackupsCount === 0 && summary.recentRestoreTestsCount === 0 && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Low Activity</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      No backup or restore activity in the last 24 hours
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
