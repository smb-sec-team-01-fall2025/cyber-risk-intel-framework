import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Search, Shield, Plus, Sparkles, Loader2 } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { insertControlSchema, type InsertControl } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { z } from "zod";

const generateFormSchema = z.object({
  assetType: z.string().min(1, "Asset type is required"),
  criticality: z.number().min(1).max(5),
  threats: z.string(),
});

export default function ControlsList() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [familyFilter, setFamilyFilter] = useState<string>("all");
  const [functionFilter, setFunctionFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: controlsData, isLoading } = useQuery({
    queryKey: ["/api/controls", { search: searchTerm, family: familyFilter, function: functionFilter, page, pageSize }],
  });

  const controls = controlsData?.controls || [];
  const total = controlsData?.total || 0;

  const addForm = useForm<InsertControl>({
    resolver: zodResolver(insertControlSchema),
    defaultValues: {
      controlId: "",
      family: "AC",
      title: "",
      description: "",
      csfFunction: "Protect",
      csfCategory: "",
      csfSubcategory: "",
      implementationStatus: "Proposed",
      priority: 3,
    },
  });

  const generateForm = useForm<z.infer<typeof generateFormSchema>>({
    resolver: zodResolver(generateFormSchema),
    defaultValues: {
      assetType: "",
      criticality: 3,
      threats: "",
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: InsertControl) => {
      const res = await apiRequest("POST", "/api/controls", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/controls"] });
      setAddDialogOpen(false);
      addForm.reset();
      toast({
        title: "Control added",
        description: "The security control has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add control. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof generateFormSchema>) => {
      const threats = data.threats.split(",").map((t) => t.trim()).filter(Boolean);
      const res = await apiRequest("POST", "/api/protect/generate-controls", {
        assetType: data.assetType,
        criticality: data.criticality,
        threats,
      });
      return await res.json();
    },
    onSuccess: async (data) => {
      console.log("Generate mutation success, saved controls:", data);
      await queryClient.invalidateQueries({ queryKey: ["/api/controls"] });
      await queryClient.refetchQueries({ queryKey: ["/api/controls"] });
      setGenerateDialogOpen(false);
      generateForm.reset();
      toast({
        title: "Controls generated",
        description: `AI has generated ${data?.controls?.length || 0} security controls.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate controls. Please try again.",
        variant: "destructive",
      });
    },
  });

  const columns = [
    {
      key: "controlId",
      header: "Control ID",
      className: "font-mono font-medium",
    },
    {
      key: "family",
      header: "Family",
      render: (value: string) => (
        <Badge variant="outline" className="text-xs font-mono">
          {value}
        </Badge>
      ),
    },
    {
      key: "title",
      header: "Title",
      className: "max-w-md",
      render: (value: string) => (
        <div className="truncate">{value}</div>
      ),
    },
    {
      key: "csfFunction",
      header: "CSF Function",
      render: (value: string) => (
        <Badge variant="secondary" className="text-xs">
          {value}
        </Badge>
      ),
    },
    {
      key: "implementationStatus",
      header: "Status",
      render: (value: string) => <StatusBadge status={value as any} />,
    },
    {
      key: "priority",
      header: "Priority",
      render: (value: number) => (
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`h-3 w-3 rounded-sm ${
                  i < value ? "bg-chart-1" : "bg-muted"
                }`}
              />
            ))}
          </div>
        </div>
      ),
    },
    {
      key: "sopId",
      header: "SOP",
      render: (value: string) => 
        value ? (
          <Badge variant="outline" className="text-xs">
            SOP Defined
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium">Security Controls</h1>
          <p className="text-muted-foreground">
            NIST 800-53 R5 controls mapped to CSF 2.0
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setGenerateDialogOpen(true)}
            data-testid="button-generate-controls"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            AI Generate Controls
          </Button>
          <Button
            onClick={() => setAddDialogOpen(true)}
            data-testid="button-add-control"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Control
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search controls by ID or title..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-controls"
              />
            </div>
          </div>
          <Select value={familyFilter} onValueChange={setFamilyFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-family-filter">
              <SelectValue placeholder="Family" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Families</SelectItem>
              <SelectItem value="AC">AC - Access Control</SelectItem>
              <SelectItem value="AU">AU - Audit</SelectItem>
              <SelectItem value="AT">AT - Awareness</SelectItem>
              <SelectItem value="CM">CM - Configuration</SelectItem>
              <SelectItem value="IA">IA - Identification</SelectItem>
              <SelectItem value="IR">IR - Incident Response</SelectItem>
              <SelectItem value="SC">SC - System & Comms</SelectItem>
            </SelectContent>
          </Select>
          <Select value={functionFilter} onValueChange={setFunctionFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-function-filter">
              <SelectValue placeholder="CSF Function" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Functions</SelectItem>
              <SelectItem value="Identify">Identify</SelectItem>
              <SelectItem value="Protect">Protect</SelectItem>
              <SelectItem value="Detect">Detect</SelectItem>
              <SelectItem value="Respond">Respond</SelectItem>
              <SelectItem value="Recover">Recover</SelectItem>
              <SelectItem value="Govern">Govern</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <DataTable
        columns={columns}
        data={controls}
        isLoading={isLoading}
        onRowClick={(row) => setLocation(`/controls/${row.id}`)}
        emptyMessage="No controls found. Use AI to generate controls based on your assets."
        emptyIcon={<Shield className="h-16 w-16 mx-auto opacity-50 text-muted-foreground" />}
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: setPage,
        }}
      />

      {/* Add Control Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-add-control">
          <DialogHeader>
            <DialogTitle>Add Security Control</DialogTitle>
            <DialogDescription>
              Manually add a NIST 800-53 R5 control to your security framework.
            </DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit((data) => addMutation.mutate(data))} className="space-y-4" data-testid="form-add-control">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="controlId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Control ID</FormLabel>
                      <FormControl>
                        <Input placeholder="AC-2" {...field} data-testid="input-control-id" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="family"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Family</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-control-family">
                            <SelectValue placeholder="Select family" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="AC">AC - Access Control</SelectItem>
                          <SelectItem value="AU">AU - Audit</SelectItem>
                          <SelectItem value="AT">AT - Awareness</SelectItem>
                          <SelectItem value="CM">CM - Configuration</SelectItem>
                          <SelectItem value="IA">IA - Identification</SelectItem>
                          <SelectItem value="IR">IR - Incident Response</SelectItem>
                          <SelectItem value="SC">SC - System & Comms</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={addForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Account Management" {...field} data-testid="input-control-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Control description..."
                        {...field}
                        value={field.value || ""}
                        data-testid="input-control-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="csfFunction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CSF Function</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-csf-function">
                            <SelectValue placeholder="Select function" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Identify">Identify</SelectItem>
                          <SelectItem value="Protect">Protect</SelectItem>
                          <SelectItem value="Detect">Detect</SelectItem>
                          <SelectItem value="Respond">Respond</SelectItem>
                          <SelectItem value="Recover">Recover</SelectItem>
                          <SelectItem value="Govern">Govern</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority (1-5)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={5}
                          {...field}
                          value={field.value || 3}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-control-priority"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)} data-testid="button-cancel-control">
                  Cancel
                </Button>
                <Button type="submit" disabled={addMutation.isPending} data-testid="button-submit-control">
                  {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Control
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* AI Generate Controls Dialog */}
      <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
        <DialogContent data-testid="dialog-generate-controls">
          <DialogHeader>
            <DialogTitle>AI Generate Controls</DialogTitle>
            <DialogDescription>
              Let AI suggest relevant NIST 800-53 controls based on your asset characteristics.
            </DialogDescription>
          </DialogHeader>
          <Form {...generateForm}>
            <form onSubmit={generateForm.handleSubmit((data) => generateMutation.mutate(data))} className="space-y-4" data-testid="form-generate-controls">
              <FormField
                control={generateForm.control}
                name="assetType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asset Type</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Web Server, Database, API Gateway" {...field} data-testid="input-asset-type" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={generateForm.control}
                name="criticality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Criticality (1-5)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={5}
                        {...field}
                        value={field.value}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-criticality"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={generateForm.control}
                name="threats"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Known Threats (comma-separated)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., SQL Injection, DDoS, Unauthorized Access"
                        {...field}
                        data-testid="input-threats"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setGenerateDialogOpen(false)} data-testid="button-cancel-generate">
                  Cancel
                </Button>
                <Button type="submit" disabled={generateMutation.isPending} data-testid="button-submit-generate">
                  {generateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Generate Controls
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
