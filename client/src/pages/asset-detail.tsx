import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Edit, Shield, Activity, FileText, Clock } from "lucide-react";
import { SeverityBadge } from "@/components/severity-badge";
import { StatusBadge } from "@/components/status-badge";

export default function AssetDetail() {
  const [, params] = useRoute("/assets/:id");
  const [, setLocation] = useLocation();
  const assetId = params?.id;

  const { data: asset, isLoading } = useQuery({
    queryKey: ["/api/assets", assetId],
    enabled: !!assetId,
  });

  const { data: recentIntel } = useQuery({
    queryKey: ["/api/assets", assetId, "intel"],
    enabled: !!assetId,
  });

  const { data: controls } = useQuery({
    queryKey: ["/api/assets", assetId, "controls"],
    enabled: !!assetId,
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
        <Button data-testid="button-edit-asset">
          <Edit className="h-4 w-4 mr-2" />
          Edit Asset
        </Button>
      </div>

      {/* Risk Score Card */}
      {asset.riskScore && (
        <Card className="border-l-4 border-l-destructive" data-testid="card-risk-score">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Current Risk Score</p>
                <p className="text-4xl font-bold text-destructive">{asset.riskScore}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Criticality {asset.criticality} × Max Intel Severity
                </p>
              </div>
              <SeverityBadge
                severity={asset.riskScore >= 20 ? 5 : asset.riskScore >= 15 ? 4 : 3}
              />
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
                  <StatusBadge status={asset.dataSensitivity === "High" ? "Open" : "Closed"} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Recent Detections</p>
                  <p className="text-2xl font-bold">
                    {(recentIntel && recentIntel.length) || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">in the last 7 days</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Applied Controls</p>
                  <p className="text-2xl font-bold">
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
    </div>
  );
}
