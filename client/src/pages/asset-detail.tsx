import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Edit, Shield, Activity, FileText, Clock, Trash2, Database, PlayCircle, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { SeverityBadge } from "@/components/severity-badge";
import { StatusBadge } from "@/components/status-badge";
import { AssetFormDialog } from "@/components/asset-form-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { DrPlan, BackupSet, RestoreTest, ResilienceFinding } from "@shared/schema";

// Wire format types (dates are serialized to strings)
type DrPlanWire = Omit<DrPlan, 'createdAt' | 'updatedAt' | 'lastRpoCheck' | 'lastRtoCheck'> & {
  createdAt: string;
  updatedAt: string;
  lastRpoCheck: string | null;
  lastRtoCheck: string | null;
};

type BackupSetWire = Omit<BackupSet, 'backupWindowStart' | 'backupWindowEnd' | 'createdAt'> & {
  backupWindowStart: string;
  backupWindowEnd: string;
  createdAt: string;
};

type RestoreTestWire = Omit<RestoreTest, 'testDate' | 'createdAt'> & {
  testDate: string;
  createdAt: string;
};

type ResilienceFindingWire = Omit<ResilienceFinding, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

export default function AssetDetail() {
  const [, params] = useRoute("/assets/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const assetId = params?.id;

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data, isLoading } = useQuery<{
    asset: any;
    linkedIntel: any[];
    assignedControls: any[];
  }>({
    queryKey: ["/api/assets", assetId],
    enabled: !!assetId,
  });

  const { data: recoverData, isLoading: isRecoverLoading } = useQuery<{
    drPlan: DrPlanWire | null;
    recentBackups: BackupSetWire[];
    recentRestoreTests: RestoreTestWire[];
    openFindings: ResilienceFindingWire[];
  }>({
    queryKey: ["/api/assets", assetId, "recover"],
    enabled: !!assetId,
  });

  const asset = data?.asset;
  const recentIntel = data?.linkedIntel;
  const controls = data?.assignedControls;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/assets/${assetId}`, null);
      if (!response.ok) {
        throw new Error("Failed to delete asset");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: "Success",
        description: "Asset deleted successfully",
      });
      setLocation("/assets");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete asset",
        variant: "destructive",
      });
    },
  });

  const runResilienceMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/recover/run", { assetId });
      if (!response.ok) {
        throw new Error("Failed to run resilience analysis");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets", assetId, "recover"] });
      toast({
        title: "Success",
        description: "Resilience analysis completed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to run resilience analysis",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="text-center py-12">
        <Shield className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
        <h2 className="text-2xl font-semibold mb-2">Asset Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The asset you're looking for doesn't exist or has been deleted.
        </p>
        <Button onClick={() => setLocation("/assets")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Assets
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/assets")}
              data-testid="button-back-to-assets"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-medium">{asset.name}</h1>
          </div>
          <div className="flex items-center gap-2 ml-12">
            <Badge variant="outline" className="font-mono text-xs">
              {asset.type}
            </Badge>
            <Badge variant="secondary">{asset.dataSensitivity}</Badge>
            {asset.criticality && (
              <div className="flex items-center gap-1 text-sm">
                <span className="text-muted-foreground">Criticality:</span>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-3 w-3 rounded-sm ${
                        i < asset.criticality ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setEditDialogOpen(true)}
            data-testid="button-edit-asset"
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Asset
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
            data-testid="button-delete-asset"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Risk Score Card */}
      {asset && (
        <Card className={asset.riskScore > 0 ? "border-l-4 border-l-destructive" : ""} data-testid="card-risk-score">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Current Risk Score</p>
                <p className={`text-4xl font-bold ${asset.riskScore > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {asset.riskScore || 0}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Asset criticality × maximum threat severity (last 7 days)
                </p>
              </div>
              {asset.riskScore > 0 && (
                <SeverityBadge
                  severity={
                    asset.riskScore >= 20 ? 5 : 
                    asset.riskScore >= 15 ? 4 : 
                    asset.riskScore >= 10 ? 3 : 
                    asset.riskScore >= 5 ? 2 : 1
                  }
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">
            <Shield className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="controls" data-testid="tab-controls">
            <FileText className="h-4 w-4 mr-2" />
            Controls
          </TabsTrigger>
          <TabsTrigger value="intel" data-testid="tab-intel">
            <Activity className="h-4 w-4 mr-2" />
            Intel Events
          </TabsTrigger>
          <TabsTrigger value="recover" data-testid="tab-recover">
            <Database className="h-4 w-4 mr-2" />
            Recover
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            <Clock className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Asset Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">IP Address</p>
                    <p className="font-mono">{asset.ip || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Hostname</p>
                    <p className="font-mono">{asset.hostname || "—"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Owner</p>
                    <p>{asset.owner || "Unassigned"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Business Unit</p>
                    <p>{asset.businessUnit || "—"}</p>
                  </div>
                </div>
                {asset.description && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p className="text-sm">{asset.description}</p>
                  </div>
                )}
                {asset.tags && asset.tags.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {asset.tags.map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Security Posture</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Data Sensitivity</p>
                  <Badge
                    variant={
                      asset.dataSensitivity === "Critical"
                        ? "destructive"
                        : asset.dataSensitivity === "High"
                        ? "default"
                        : "secondary"
                    }
                    data-testid="badge-data-sensitivity"
                  >
                    {asset.dataSensitivity}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Criticality Level</p>
                  <div className="flex items-center gap-1">
                    <span className="text-2xl font-bold">{asset.criticality}</span>
                    <span className="text-sm text-muted-foreground">/ 5</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Recent Intel Events</p>
                  <p className="text-2xl font-bold" data-testid="text-recent-intel-count">
                    {(recentIntel && recentIntel.length) || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">in the last 7 days</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Applied Controls</p>
                  <p className="text-2xl font-bold" data-testid="text-controls-count">
                    {(controls && controls.length) || 0}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="controls">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Applied Controls</CardTitle>
              <CardDescription>
                Security controls and policies assigned to this asset
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Controls management coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="intel">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Intel Events</CardTitle>
              <CardDescription>
                Threat intelligence linked to this asset
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Intel events view coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recover" className="space-y-6">
          {isRecoverLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-3">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" data-testid="spinner-recover-loading"></div>
                <p className="text-sm text-muted-foreground">Loading recovery data...</p>
              </div>
            </div>
          ) : !recoverData?.drPlan ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Database className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No DR Plan Configured</h3>
                <p className="text-muted-foreground mb-6" data-testid="text-no-dr-plan">
                  This asset does not have a disaster recovery plan configured. Create a DR plan to track backups, restore tests, and resilience posture.
                </p>
                <Button variant="default" data-testid="button-create-dr-plan">
                  <Database className="h-4 w-4 mr-2" />
                  Create DR Plan
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* DR Plan Summary Card */}
              <Card data-testid="card-dr-plan-summary">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{recoverData.drPlan.name}</CardTitle>
                      <CardDescription>Disaster recovery plan and resilience metrics</CardDescription>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => runResilienceMutation.mutate()}
                      disabled={runResilienceMutation.isPending}
                      data-testid="button-run-analysis"
                    >
                      <PlayCircle className="h-4 w-4 mr-2" />
                      {runResilienceMutation.isPending ? "Running..." : "Run Analysis"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">RPO Target</p>
                      <p className="text-2xl font-bold" data-testid="text-rpo-target">{recoverData.drPlan.rpoMinutes} min</p>
                      {recoverData.drPlan.cachedRpoStatus && (
                        <Badge 
                          variant={recoverData.drPlan.cachedRpoStatus === "compliant" ? "default" : "destructive"}
                          className="mt-2"
                          data-testid="badge-rpo-status"
                        >
                          {recoverData.drPlan.cachedRpoStatus === "compliant" ? (
                            <><CheckCircle2 className="h-3 w-3 mr-1" />Compliant</>
                          ) : (
                            <><XCircle className="h-3 w-3 mr-1" />Breach</>
                          )}
                        </Badge>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">RTO Target</p>
                      <p className="text-2xl font-bold" data-testid="text-rto-target">{recoverData.drPlan.rtoMinutes} min</p>
                      {recoverData.drPlan.cachedRtoStatus && (
                        <Badge 
                          variant={recoverData.drPlan.cachedRtoStatus === "compliant" ? "default" : "destructive"}
                          className="mt-2"
                          data-testid="badge-rto-status"
                        >
                          {recoverData.drPlan.cachedRtoStatus === "compliant" ? (
                            <><CheckCircle2 className="h-3 w-3 mr-1" />Compliant</>
                          ) : (
                            <><XCircle className="h-3 w-3 mr-1" />Violation</>
                          )}
                        </Badge>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Resilience Score</p>
                      <p className="text-2xl font-bold" data-testid="text-resilience-score-value">
                        {recoverData.drPlan.cachedResilienceScore ?? "—"}
                      </p>
                      {recoverData.drPlan.cachedResilienceScore !== null && (
                        <Badge 
                          variant={
                            recoverData.drPlan.cachedResilienceScore >= 80 ? "default" :
                            recoverData.drPlan.cachedResilienceScore >= 60 ? "secondary" : "destructive"
                          }
                          className="mt-2"
                          data-testid="badge-resilience-level"
                        >
                          {recoverData.drPlan.cachedResilienceScore >= 80 ? "Good" :
                           recoverData.drPlan.cachedResilienceScore >= 60 ? "Fair" : "Poor"}
                        </Badge>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Open Findings</p>
                      <p className="text-2xl font-bold" data-testid="text-open-findings-count">
                        {recoverData.openFindings.length}
                      </p>
                      {recoverData.openFindings.length > 0 && (
                        <Badge variant="outline" className="mt-2">
                          {recoverData.openFindings.filter((f: any) => f.severity >= 4).length} Critical/High
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Recent Backups Card */}
                <Card data-testid="card-recent-backups">
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Backups</CardTitle>
                    <CardDescription>Last 10 backup operations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recoverData.recentBackups.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8" data-testid="text-no-backups">
                        No backup operations recorded
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {recoverData.recentBackups.map((backup: any) => (
                          <div 
                            key={backup.id} 
                            className="flex items-center justify-between py-2 border-b last:border-0"
                            data-testid={`backup-${backup.id}`}
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {new Date(backup.backupWindowEnd).toLocaleDateString()} {new Date(backup.backupWindowEnd).toLocaleTimeString()}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {backup.backupSizeBytes ? `${(backup.backupSizeBytes / 1024 / 1024 / 1024).toFixed(2)} GB` : "Size unknown"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {backup.rpoBreached && (
                                <Badge variant="destructive" className="text-xs">
                                  RPO Breach
                                </Badge>
                              )}
                              <Badge variant={backup.backupStatus === "success" ? "default" : "destructive"}>
                                {backup.backupStatus}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Restore Tests Card */}
                <Card data-testid="card-recent-restore-tests">
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Restore Tests</CardTitle>
                    <CardDescription>Last 10 validation exercises</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recoverData.recentRestoreTests.length === 0 ? (
                      <p className="text-muted-foreground text-center py-8" data-testid="text-no-restore-tests">
                        No restore tests performed
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {recoverData.recentRestoreTests.map((test: any) => (
                          <div 
                            key={test.id} 
                            className="flex items-center justify-between py-2 border-b last:border-0"
                            data-testid={`restore-test-${test.id}`}
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {new Date(test.testDate).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {test.restoreDurationMinutes !== null ? `${test.restoreDurationMinutes} min` : "Duration unknown"}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {test.rtoViolated && (
                                <Badge variant="destructive" className="text-xs">
                                  RTO Violation
                                </Badge>
                              )}
                              <Badge variant={test.testResult === "pass" ? "default" : "destructive"}>
                                {test.testResult}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Open Findings Card */}
              {recoverData.openFindings.length > 0 && (
                <Card data-testid="card-open-findings">
                  <CardHeader>
                    <CardTitle className="text-lg">Open Resilience Findings</CardTitle>
                    <CardDescription>AI-identified gaps and violations requiring attention</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recoverData.openFindings.map((finding: any) => (
                        <div 
                          key={finding.id} 
                          className="p-4 border rounded-lg"
                          data-testid={`finding-${finding.id}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <SeverityBadge severity={finding.severity} />
                              <Badge variant="outline">{finding.category}</Badge>
                            </div>
                            <Badge variant="secondary">{finding.status}</Badge>
                          </div>
                          <p className="text-sm font-medium mb-1">{finding.finding}</p>
                          {finding.recommendation && (
                            <p className="text-xs text-muted-foreground">
                              <span className="font-medium">Recommendation:</span> {finding.recommendation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Audit History</CardTitle>
              <CardDescription>
                Changes and activity log for this asset
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Audit history coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Asset Dialog */}
      <AssetFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        asset={asset}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Asset</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{asset?.name}"? This action cannot be
              undone and will remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              Delete Asset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
