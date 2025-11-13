import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
import { 
  ArrowLeft, Shield, CheckSquare, Clock, FileText, Link2, AlertCircle,
  ChevronRight, Download, CheckCircle, XCircle
} from "lucide-react";
import { SeverityBadge } from "@/components/severity-badge";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow, format } from "date-fns";

export default function IncidentDetail() {
  const [, params] = useRoute("/incidents/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const incidentId = params?.id;

  const [closeDialogOpen, setCloseDialogOpen] = useState(false);

  const { data, isLoading } = useQuery<{
    incident: any;
    tasks: any[];
    primaryAsset: any;
  }>({
    queryKey: ["/api/incidents", incidentId],
    enabled: !!incidentId,
  });

  const incident = data?.incident;
  const tasks = data?.tasks || [];
  const primaryAsset = data?.primaryAsset;

  const advancePhaseMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      const response = await apiRequest("PATCH", `/api/incidents/${incidentId}`, { status: newStatus });
      if (!response.ok) {
        throw new Error("Failed to advance phase");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents", incidentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      toast({
        title: "Success",
        description: "Incident phase advanced",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to advance incident phase",
        variant: "destructive",
      });
    },
  });

  const closeIncidentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", `/api/incidents/${incidentId}`, { 
        status: "Closed",
        closedAt: new Date().toISOString()
      });
      if (!response.ok) {
        throw new Error("Failed to close incident");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      toast({
        title: "Success",
        description: "Incident closed successfully",
      });
      setLocation("/incidents");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to close incident",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const response = await apiRequest("PATCH", `/api/incidents/${incidentId}/tasks/${taskId}`, { status });
      if (!response.ok) {
        throw new Error("Failed to update task");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents", incidentId] });
      toast({
        title: "Success",
        description: "Task updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update task",
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

  if (!incident) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/incidents")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Incident Not Found</h1>
            <p className="text-muted-foreground">The requested incident could not be found.</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate SLA status
  const getSlaStatus = () => {
    if (incident.slaBreached) return { label: "Breached", variant: "destructive" as const };
    if (!incident.slaDueAt) return { label: "No SLA", variant: "outline" as const };
    
    const now = new Date();
    const dueDate = new Date(incident.slaDueAt);
    const hoursLeft = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (hoursLeft < 0) return { label: "Expired", variant: "destructive" as const };
    if (hoursLeft < 4) return { label: `${hoursLeft}h left`, variant: "outline" as const };
    return { label: "On Track", variant: "outline" as const };
  };

  const slaStatus = getSlaStatus();

  // Get next phase
  const getNextPhase = (currentStatus: string) => {
    const phases = ["Open", "Triage", "Containment", "Eradication", "Recovery", "Closed"];
    const currentIndex = phases.indexOf(currentStatus);
    return currentIndex >= 0 && currentIndex < phases.length - 1 ? phases[currentIndex + 1] : null;
  };

  const nextPhase = getNextPhase(incident.status);

  // Group tasks by phase
  const tasksByPhase = tasks.reduce((acc: any, task: any) => {
    if (!acc[task.phase]) {
      acc[task.phase] = [];
    }
    acc[task.phase].push(task);
    return acc;
  }, {});

  const phases = ["Triage", "Containment", "Eradication", "Recovery", "Close"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/incidents")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold" data-testid="text-incident-title">{incident.title}</h1>
              <Badge variant="outline" className="font-mono" data-testid="text-incident-number">
                {incident.incidentNumber}
              </Badge>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <SeverityBadge severity={incident.severity} />
              <StatusBadge status={incident.status} />
              <Badge variant={slaStatus.variant} data-testid="badge-sla-status">
                {slaStatus.label}
              </Badge>
              {primaryAsset && (
                <Badge variant="outline" data-testid="badge-primary-asset">
                  <Link2 className="h-3 w-3 mr-1" />
                  {primaryAsset.name}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {nextPhase && incident.status !== "Closed" && (
            <Button
              variant="default"
              onClick={() => advancePhaseMutation.mutate(nextPhase)}
              disabled={advancePhaseMutation.isPending}
              data-testid="button-advance-phase"
            >
              <ChevronRight className="h-4 w-4 mr-2" />
              Advance to {nextPhase}
            </Button>
          )}
          {incident.status !== "Closed" && (
            <Button
              variant="outline"
              onClick={() => setCloseDialogOpen(true)}
              data-testid="button-close-incident"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Close Incident
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => window.open(`/api/incidents/${incidentId}/export?format=md`, '_blank')}
            data-testid="button-export"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">
            <Shield className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="tasks" data-testid="tab-tasks">
            <CheckSquare className="h-4 w-4 mr-2" />
            Tasks ({tasks.length})
          </TabsTrigger>
          <TabsTrigger value="timeline" data-testid="tab-timeline">
            <Clock className="h-4 w-4 mr-2" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="evidence" data-testid="tab-evidence">
            <FileText className="h-4 w-4 mr-2" />
            Evidence
          </TabsTrigger>
          <TabsTrigger value="linked" data-testid="tab-linked">
            <Link2 className="h-4 w-4 mr-2" />
            Linked Items
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Incident Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Severity</p>
                    <SeverityBadge severity={incident.severity} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <StatusBadge status={incident.status} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Owner</p>
                    <p>{incident.owner || "Unassigned"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Opened</p>
                    <p className="text-sm">
                      {formatDistanceToNow(new Date(incident.openedAt), { addSuffix: true })}
                    </p>
                  </div>
                  {incident.slaDueAt && (
                    <div>
                      <p className="text-sm text-muted-foreground">SLA Due</p>
                      <p className="text-sm">{format(new Date(incident.slaDueAt), "PPp")}</p>
                    </div>
                  )}
                  {incident.closedAt && (
                    <div>
                      <p className="text-sm text-muted-foreground">Closed</p>
                      <p className="text-sm">
                        {formatDistanceToNow(new Date(incident.closedAt), { addSuffix: true })}
                      </p>
                    </div>
                  )}
                </div>
                {incident.summary && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Summary</p>
                    <p className="text-sm">{incident.summary}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Impact & Analysis</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {primaryAsset && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Primary Asset</p>
                    <button
                      className="text-sm text-primary hover:underline cursor-pointer"
                      onClick={() => setLocation(`/assets/${primaryAsset.id}`)}
                      data-testid="link-primary-asset"
                    >
                      {primaryAsset.name}
                    </button>
                  </div>
                )}
                {incident.rootCause && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Root Cause</p>
                    <p className="text-sm">{incident.rootCause}</p>
                  </div>
                )}
                {incident.lessonsLearned && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Lessons Learned</p>
                    <p className="text-sm">{incident.lessonsLearned}</p>
                  </div>
                )}
                {incident.tags && incident.tags.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {incident.tags.map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-4">
          {phases.map((phase) => {
            const phaseTasks = tasksByPhase[phase] || [];
            if (phaseTasks.length === 0) return null;

            const completedCount = phaseTasks.filter((t: any) => t.status === "Done").length;

            return (
              <Card key={phase} data-testid={`card-phase-${phase.toLowerCase()}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{phase}</CardTitle>
                    <Badge variant="outline">
                      {completedCount}/{phaseTasks.length} Complete
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {phaseTasks.map((task: any) => (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 p-3 rounded-md border"
                      data-testid={`task-${task.id}`}
                    >
                      <Checkbox
                        checked={task.status === "Done"}
                        onCheckedChange={(checked) => {
                          updateTaskMutation.mutate({
                            taskId: task.id,
                            status: checked ? "Done" : "Open"
                          });
                        }}
                        disabled={updateTaskMutation.isPending}
                        data-testid={`checkbox-task-${task.id}`}
                      />
                      <div className="flex-1">
                        <p className="font-medium">{task.title}</p>
                        {task.assignee && (
                          <p className="text-sm text-muted-foreground">Assignee: {task.assignee}</p>
                        )}
                        {task.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{task.notes}</p>
                        )}
                        {task.dueAt && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Due: {format(new Date(task.dueAt), "PPp")}
                          </p>
                        )}
                      </div>
                      {task.status === "Done" && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      {task.status === "Skipped" && (
                        <XCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}

          {tasks.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No tasks found for this incident.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Generate a playbook to create incident response tasks.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardContent className="p-12 text-center">
              <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Timeline feature coming soon</p>
              <p className="text-sm text-muted-foreground mt-1">
                Track all incident events, status changes, and communications.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Evidence Tab */}
        <TabsContent value="evidence" className="space-y-4">
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Evidence management coming soon</p>
              <p className="text-sm text-muted-foreground mt-1">
                Upload and track evidence with chain-of-custody.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Linked Items Tab */}
        <TabsContent value="linked" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Linked Detections</CardTitle>
              </CardHeader>
              <CardContent>
                {incident.detectionRefs && incident.detectionRefs.length > 0 ? (
                  <div className="space-y-2">
                    {incident.detectionRefs.map((detId: string) => (
                      <div key={detId} className="text-sm p-2 border rounded">
                        Detection: {detId.substring(0, 8)}...
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No linked detections</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Linked Risk Items</CardTitle>
              </CardHeader>
              <CardContent>
                {incident.riskItemRefs && incident.riskItemRefs.length > 0 ? (
                  <div className="space-y-2">
                    {incident.riskItemRefs.map((riskId: string) => (
                      <div key={riskId} className="text-sm p-2 border rounded">
                        Risk: {riskId.substring(0, 8)}...
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No linked risk items</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Close Incident Dialog */}
      <AlertDialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close Incident?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the incident as closed. You can add root cause and lessons learned before closing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => closeIncidentMutation.mutate()}
              disabled={closeIncidentMutation.isPending}
            >
              Close Incident
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
