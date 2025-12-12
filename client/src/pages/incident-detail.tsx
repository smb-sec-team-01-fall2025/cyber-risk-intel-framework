import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ChevronRight, Download, CheckCircle, XCircle, Plus, Send, Trash2
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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [timelineNote, setTimelineNote] = useState("");
  const [evidenceType, setEvidenceType] = useState("log");
  const [evidenceDescription, setEvidenceDescription] = useState("");
  const [evidenceLocation, setEvidenceLocation] = useState("");

  const { data, isLoading } = useQuery<{
    incident: any;
    tasks: any[];
    primaryAsset: any;
  }>({
    queryKey: ["/api/incidents", incidentId],
    enabled: !!incidentId,
  });

  const { data: timelineData } = useQuery<any[]>({
    queryKey: ["/api/incidents", incidentId, "timeline"],
    enabled: !!incidentId,
  });

  const incident = data?.incident;
  const tasks = data?.tasks || [];
  const primaryAsset = data?.primaryAsset;
  const timeline = timelineData || [];

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
      queryClient.invalidateQueries({ queryKey: ["/api/incidents", incidentId, "timeline"] });
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

  const deleteIncidentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/incidents/${incidentId}`);
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete incident");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      toast({
        title: "Success",
        description: "Incident deleted successfully",
      });
      setLocation("/incidents");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete incident",
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

  const addTimelineEntryMutation = useMutation({
    mutationFn: async (note: string) => {
      const response = await apiRequest("POST", `/api/incidents/${incidentId}/timeline`, {
        eventType: "note",
        description: note,
        actor: "analyst",
      });
      if (!response.ok) {
        throw new Error("Failed to add timeline entry");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents", incidentId, "timeline"] });
      setTimelineNote("");
      toast({
        title: "Success",
        description: "Timeline entry added",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add timeline entry",
        variant: "destructive",
      });
    },
  });

  const addEvidenceMutation = useMutation({
    mutationFn: async (evidence: { evidenceType: string; description: string; location: string }) => {
      const response = await apiRequest("POST", `/api/incidents/${incidentId}/evidence`, evidence);
      if (!response.ok) {
        throw new Error("Failed to add evidence");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents", incidentId, "timeline"] });
      setEvidenceType("log");
      setEvidenceDescription("");
      setEvidenceLocation("");
      toast({
        title: "Success",
        description: "Evidence added",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add evidence",
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

  const getNextPhase = (currentStatus: string) => {
    const phases = ["Open", "Triage", "Containment", "Eradication", "Recovery", "Closed"];
    const currentIndex = phases.indexOf(currentStatus);
    return currentIndex >= 0 && currentIndex < phases.length - 1 ? phases[currentIndex + 1] : null;
  };

  const nextPhase = getNextPhase(incident.status);

  const tasksByPhase = tasks.reduce((acc: any, task: any) => {
    if (!acc[task.phase]) {
      acc[task.phase] = [];
    }
    acc[task.phase].push(task);
    return acc;
  }, {});

  const phases = ["Triage", "Containment", "Eradication", "Recovery", "Close"];

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case "status_change": return <ChevronRight className="h-4 w-4 text-blue-500" />;
      case "note": return <FileText className="h-4 w-4 text-green-500" />;
      case "evidence": return <FileText className="h-4 w-4 text-purple-500" />;
      case "task": return <CheckSquare className="h-4 w-4 text-orange-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const evidenceItems = timeline.filter((entry: any) => entry.eventType === "evidence");

  return (
    <div className="space-y-6">
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
          {incident.status === "Closed" && (
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
              data-testid="button-delete-incident"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

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
            Timeline ({timeline.length})
          </TabsTrigger>
          <TabsTrigger value="evidence" data-testid="tab-evidence">
            <FileText className="h-4 w-4 mr-2" />
            Evidence ({evidenceItems.length})
          </TabsTrigger>
        </TabsList>

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
                <CardTitle className="text-lg">Description</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm" data-testid="text-incident-description">
                  {incident.description || "No description provided."}
                </p>
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
                  Tasks are generated when the incident is created based on severity and type.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Timeline Entry</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Textarea
                  placeholder="Add a note about actions taken, observations, or updates..."
                  value={timelineNote}
                  onChange={(e) => setTimelineNote(e.target.value)}
                  className="flex-1"
                  data-testid="input-timeline-note"
                />
                <Button
                  onClick={() => {
                    if (timelineNote.trim()) {
                      addTimelineEntryMutation.mutate(timelineNote.trim());
                    }
                  }}
                  disabled={!timelineNote.trim() || addTimelineEntryMutation.isPending}
                  data-testid="button-add-timeline"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {timeline.length > 0 ? (
                <div className="space-y-4">
                  {timeline.map((entry: any, index: number) => (
                    <div key={entry.id || index} className="flex gap-3" data-testid={`timeline-entry-${index}`}>
                      <div className="flex-shrink-0 mt-1">
                        {getEventIcon(entry.eventType)}
                      </div>
                      <div className="flex-1 border-l pl-4 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs capitalize">
                            {entry.eventType?.replace("_", " ") || "Event"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {entry.timestamp && formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                          </span>
                          {entry.actor && (
                            <span className="text-xs text-muted-foreground">by {entry.actor}</span>
                          )}
                        </div>
                        <p className="text-sm">{entry.description || entry.detail?.description}</p>
                        {entry.detail && typeof entry.detail === 'object' && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {entry.detail.from && entry.detail.to && (
                              <span>Phase: {entry.detail.from} → {entry.detail.to}</span>
                            )}
                            {entry.detail.location && (
                              <span className="block">Location: {entry.detail.location}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No timeline entries yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add notes to track incident progress and actions taken
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evidence" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add Evidence</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="evidence-type">Type</Label>
                  <Select value={evidenceType} onValueChange={setEvidenceType}>
                    <SelectTrigger id="evidence-type" data-testid="select-evidence-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="log">Log File</SelectItem>
                      <SelectItem value="screenshot">Screenshot</SelectItem>
                      <SelectItem value="pcap">Network Capture</SelectItem>
                      <SelectItem value="config">Configuration</SelectItem>
                      <SelectItem value="memory">Memory Dump</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="evidence-description">Description</Label>
                  <Input
                    id="evidence-description"
                    placeholder="Brief description of the evidence"
                    value={evidenceDescription}
                    onChange={(e) => setEvidenceDescription(e.target.value)}
                    data-testid="input-evidence-description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="evidence-location">Location/Reference</Label>
                  <div className="flex gap-2">
                    <Input
                      id="evidence-location"
                      placeholder="File path or URL"
                      value={evidenceLocation}
                      onChange={(e) => setEvidenceLocation(e.target.value)}
                      data-testid="input-evidence-location"
                    />
                    <Button
                      onClick={() => {
                        if (evidenceDescription.trim()) {
                          addEvidenceMutation.mutate({
                            evidenceType,
                            description: evidenceDescription.trim(),
                            location: evidenceLocation.trim(),
                          });
                        }
                      }}
                      disabled={!evidenceDescription.trim() || addEvidenceMutation.isPending}
                      data-testid="button-add-evidence"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Evidence Chain</CardTitle>
            </CardHeader>
            <CardContent>
              {evidenceItems.length > 0 ? (
                <div className="space-y-3">
                  {evidenceItems.map((item: any, index: number) => (
                    <div
                      key={item.id || index}
                      className="flex items-start gap-3 p-3 rounded-md border"
                      data-testid={`evidence-item-${index}`}
                    >
                      <FileText className="h-5 w-5 text-purple-500 mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs capitalize">
                            {item.detail?.evidenceType || "evidence"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {item.timestamp && format(new Date(item.timestamp), "PPp")}
                          </span>
                          {item.actor && (
                            <span className="text-xs text-muted-foreground">by {item.actor}</span>
                          )}
                        </div>
                        <p className="text-sm">{item.detail?.description || item.description}</p>
                        {item.detail?.location && (
                          <p className="text-xs text-muted-foreground mt-1">Location: {item.detail.location}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No evidence collected yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add evidence to maintain chain-of-custody for the investigation
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Incident?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the incident and all related tasks, timeline entries, and evidence. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteIncidentMutation.mutate()}
              disabled={deleteIncidentMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Incident
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
