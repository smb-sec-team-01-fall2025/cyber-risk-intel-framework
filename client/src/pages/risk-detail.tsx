import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, AlertTriangle, Shield, TrendingUp } from "lucide-react";
import { SeverityBadge } from "@/components/severity-badge";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function RiskDetail() {
  const [, params] = useRoute("/risks/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const riskId = params?.id;

  const { data: riskData, isLoading } = useQuery({
    queryKey: ["/api/risk-items", riskId],
    enabled: !!riskId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await apiRequest("PATCH", `/api/risk-items/${riskId}`, { status });
      if (!response.ok) {
        throw new Error("Failed to update risk status");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/risk-items", riskId] });
      queryClient.invalidateQueries({ queryKey: ["/api/risk-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risk/stats"] });
      toast({
        title: "Success",
        description: "Risk status updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update risk status",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!riskData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <AlertTriangle className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-medium mb-2">Risk not found</h2>
        <p className="text-muted-foreground mb-4">The risk you're looking for doesn't exist.</p>
        <Button onClick={() => setLocation("/risk-register")} data-testid="button-back-to-risks">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Risk Register
        </Button>
      </div>
    );
  }

  const risk = riskData;
  const severity = risk.score >= 20 ? 5 : risk.score >= 15 ? 4 : risk.score >= 10 ? 3 : risk.score >= 5 ? 2 : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => setLocation("/risk-register")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-medium">{risk.title}</h1>
          {risk.assetName && (
            <p className="text-muted-foreground">
              Associated with: <span className="font-medium">{risk.assetName}</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={risk.status} />
          <Select
            value={risk.status}
            onValueChange={(value) => updateStatusMutation.mutate(value)}
            disabled={updateStatusMutation.isPending}
          >
            <SelectTrigger className="w-[180px]" data-testid="select-risk-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="In-Progress">In Progress</SelectItem>
              <SelectItem value="Mitigated">Mitigated</SelectItem>
              <SelectItem value="Accepted">Accepted</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Risk Score Card */}
      <Card className="border-l-4 border-l-destructive" data-testid="card-risk-score">
        <CardContent className="p-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Likelihood</p>
              <div className="flex items-center gap-3">
                <p className="text-3xl font-bold">{risk.likelihood}</p>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-4 w-4 rounded-sm ${
                        i < risk.likelihood ? "bg-chart-1" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Impact</p>
              <div className="flex items-center gap-3">
                <p className="text-3xl font-bold">{risk.impact}</p>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-4 w-4 rounded-sm ${
                        i < risk.impact ? "bg-chart-4" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Risk Score</p>
              <div className="flex items-center gap-3">
                <p className="text-3xl font-bold text-destructive">{risk.score}</p>
                <SeverityBadge severity={severity} />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Likelihood × Impact = {risk.likelihood} × {risk.impact}
              </p>
            </div>
          </div>
          {risk.residualRisk && (
            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-muted-foreground">Residual Risk:</p>
                <p className="text-lg font-bold">{risk.residualRisk}</p>
                <Badge variant="outline">After Controls</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground whitespace-pre-wrap">
            {risk.description || "No description provided."}
          </p>
        </CardContent>
      </Card>

      {/* Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Risk Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Owner</p>
              <p className="text-sm mt-1">
                {risk.owner || <span className="text-muted-foreground">Unassigned</span>}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <div className="mt-1">
                <StatusBadge status={risk.status} />
              </div>
            </div>
            {risk.assetName && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">Associated Asset</p>
                <Button
                  variant="link"
                  className="h-auto p-0 text-sm"
                  onClick={() => setLocation(`/assets/${risk.assetId}`)}
                  data-testid="link-associated-asset"
                >
                  {risk.assetName}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Risk Treatment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-md bg-muted">
              <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Treatment Options</p>
                <p className="text-xs text-muted-foreground mt-1">
                  • Mitigate: Implement controls to reduce likelihood/impact<br />
                  • Accept: Document acceptance and monitor<br />
                  • Transfer: Insurance or third-party responsibility<br />
                  • Avoid: Eliminate the risk-causing activity
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
