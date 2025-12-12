import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Shield, FileText, CheckCircle, AlertCircle, Sparkles, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useState } from "react";

export default function ControlDetail() {
  const [, params] = useRoute("/controls/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const controlId = params?.id;
  const [sopExpanded, setSopExpanded] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: response, isLoading } = useQuery({
    queryKey: ["/api/controls", controlId],
    enabled: !!controlId,
  });

  const controlData = response?.control;
  const sopData = response?.sop;

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await apiRequest("PATCH", `/api/controls/${controlId}`, { implementationStatus: status });
      if (!response.ok) {
        throw new Error("Failed to update control status");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/controls", controlId] });
      queryClient.invalidateQueries({ queryKey: ["/api/controls"] });
      toast({
        title: "Success",
        description: "Control status updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update control status",
        variant: "destructive",
      });
    },
  });

  const generateSopMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/protect/generate-sop/${controlId}`);
      if (!response.ok) {
        throw new Error("Failed to generate SOP");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/controls", controlId] });
      toast({
        title: "Success",
        description: "SOP generated successfully",
      });
      setSopExpanded(true);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate SOP",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/controls/${controlId}`);
      if (!response.ok) {
        throw new Error("Failed to delete control");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/controls"] });
      toast({
        title: "Success",
        description: "Control deleted successfully",
      });
      setLocation("/controls");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete control",
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

  if (!controlData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Shield className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-medium mb-2">Control not found</h2>
        <p className="text-muted-foreground mb-4">The control you're looking for doesn't exist.</p>
        <Button onClick={() => setLocation("/controls")} data-testid="button-back-to-controls">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Controls
        </Button>
      </div>
    );
  }

  const control = controlData;

  const familyNames: Record<string, string> = {
    AC: "Access Control",
    AU: "Audit and Accountability",
    AT: "Awareness and Training",
    CM: "Configuration Management",
    CP: "Contingency Planning",
    IA: "Identification and Authentication",
    IR: "Incident Response",
    MA: "Maintenance",
    MP: "Media Protection",
    PS: "Personnel Security",
    PE: "Physical and Environmental Protection",
    PL: "Planning",
    PM: "Program Management",
    RA: "Risk Assessment",
    CA: "Security Assessment and Authorization",
    SC: "System and Communications Protection",
    SI: "System and Information Integrity",
    SA: "System and Services Acquisition",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => setLocation("/controls")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-medium">{control.controlId}</h1>
            <Badge variant="outline">{familyNames[control.family] || control.family}</Badge>
          </div>
          <p className="text-muted-foreground">{control.title}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={control.implementationStatus} />
          <Select
            value={control.implementationStatus}
            onValueChange={(value) => updateStatusMutation.mutate(value)}
            disabled={updateStatusMutation.isPending}
          >
            <SelectTrigger className="w-[180px]" data-testid="select-control-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Proposed">Proposed</SelectItem>
              <SelectItem value="In-Progress">In Progress</SelectItem>
              <SelectItem value="Implemented">Implemented</SelectItem>
              <SelectItem value="Declined">Declined</SelectItem>
            </SelectContent>
          </Select>
          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon" data-testid="button-delete-control">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Control</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete {control.controlId}? This will also remove any associated SOPs and policy assignments. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => deleteMutation.mutate()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="button-confirm-delete"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Control Info Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Control Family</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">{control.family}</p>
                <p className="text-sm text-muted-foreground">{familyNames[control.family]}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">CSF Function</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-chart-2" />
              <div>
                <p className="font-medium">{control.csfFunction}</p>
                {control.csfCategory && (
                  <p className="text-sm text-muted-foreground">{control.csfCategory}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Priority</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className={`h-5 w-5 ${control.priority <= 2 ? 'text-destructive' : control.priority === 3 ? 'text-yellow-600' : 'text-muted-foreground'}`} />
              <div>
                <p className="font-medium">Priority {control.priority}</p>
                <div className="flex gap-1 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-2 w-2 rounded-full ${
                        i < control.priority ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground whitespace-pre-wrap">
            {control.description || "No description provided."}
          </p>
        </CardContent>
      </Card>

      {/* SOP Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Standard Operating Procedure (SOP)
          </CardTitle>
          {!sopData && (
            <Button
              onClick={() => generateSopMutation.mutate()}
              disabled={generateSopMutation.isPending}
              data-testid="button-generate-sop"
            >
              {generateSopMutation.isPending ? (
                <>Generating...</>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate SOP
                </>
              )}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {sopData ? (
            <div className="space-y-3">
              <div className="mb-3">
                <h3 className="font-medium mb-2">{sopData.title}</h3>
                {sopData.description && (
                  <p className="text-sm text-muted-foreground mb-3">{sopData.description}</p>
                )}
              </div>
              <Textarea
                value={sopData.content || ""}
                readOnly
                className="min-h-[300px] font-mono text-sm"
                data-testid="textarea-sop"
              />
              <p className="text-xs text-muted-foreground">
                AI-generated implementation guidance. Review and customize for your environment.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground mb-2">No SOP generated yet</p>
              <p className="text-sm text-muted-foreground max-w-md">
                Click "Generate SOP" to create step-by-step implementation guidance using AI
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Info */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Implementation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <div className="mt-1">
                <StatusBadge status={control.implementationStatus} />
              </div>
            </div>
            {control.csfSubcategory && (
              <div>
                <p className="text-sm font-medium text-muted-foreground">CSF Subcategory</p>
                <p className="text-sm mt-1">{control.csfSubcategory}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">References</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {control.references && control.references.length > 0 ? (
                control.references.map((ref: string, i: number) => (
                  <Badge key={i} variant="outline" className="mr-2">
                    {ref}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No references available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
