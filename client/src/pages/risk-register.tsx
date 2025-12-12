import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Search, AlertTriangle, Plus, TrendingUp, Loader2, Trash2 } from "lucide-react";
import { SeverityBadge } from "@/components/severity-badge";
import { StatusBadge } from "@/components/status-badge";
import { StatCard } from "@/components/stat-card";
import { insertRiskItemSchema, type InsertRiskItem } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function RiskRegister() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [riskToDelete, setRiskToDelete] = useState<any>(null);
  const { toast } = useToast();

  const { data: riskStats } = useQuery({
    queryKey: ["/api/risk/stats"],
  });

  const { data: risksData, isLoading } = useQuery({
    queryKey: ["/api/risk-items", { search: searchTerm, status: statusFilter, page, pageSize }],
  });

  const risks = risksData?.data || [];
  const total = risksData?.total || 0;

  const addForm = useForm<InsertRiskItem>({
    resolver: zodResolver(insertRiskItemSchema),
    defaultValues: {
      title: "",
      description: "",
      assetId: null,
      likelihood: 3,
      impact: 3,
      status: "Open",
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: InsertRiskItem) => {
      const res = await apiRequest("POST", "/api/risk-items", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/risk-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risk/stats"] });
      setAddDialogOpen(false);
      addForm.reset();
      toast({
        title: "Risk added",
        description: "The risk has been added to the register.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add risk. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/risk-items/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/risk-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/risk/stats"] });
      setDeleteDialogOpen(false);
      setRiskToDelete(null);
      toast({
        title: "Risk deleted",
        description: "The risk has been removed from the register.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete risk. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getRiskColor = (score: number) => {
    if (score >= 20) return "text-destructive";
    if (score >= 15) return "text-chart-4";
    if (score >= 10) return "text-yellow-600";
    return "text-muted-foreground";
  };

  const handleDeleteClick = (e: React.MouseEvent, risk: any) => {
    e.stopPropagation();
    setRiskToDelete(risk);
    setDeleteDialogOpen(true);
  };

  const columns = [
    {
      key: "title",
      header: "Risk",
      className: "max-w-md font-medium",
      render: (value: string) => (
        <div className="truncate">{value}</div>
      ),
    },
    {
      key: "assetName",
      header: "Asset",
      render: (value: string) => value || <span className="text-muted-foreground">—</span>,
    },
    {
      key: "likelihood",
      header: "Likelihood",
      render: (value: number) => (
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
      ),
    },
    {
      key: "impact",
      header: "Impact",
      render: (value: number) => (
        <div className="flex gap-0.5">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`h-3 w-3 rounded-sm ${
                i < value ? "bg-chart-4" : "bg-muted"
              }`}
            />
          ))}
        </div>
      ),
    },
    {
      key: "score",
      header: "Risk Score",
      className: "text-right",
      render: (value: number) => {
        const severity = value >= 20 ? 5 : value >= 15 ? 4 : value >= 10 ? 3 : value >= 5 ? 2 : 1;
        return (
          <div className="flex items-center justify-end gap-2">
            <span className={`font-bold text-lg ${getRiskColor(value)}`}>{value}</span>
            <SeverityBadge severity={severity} showIcon={false} />
          </div>
        );
      },
    },
    {
      key: "residualRisk",
      header: "Residual",
      className: "text-right",
      render: (value: number) => 
        value ? (
          <span className={`font-medium ${getRiskColor(value)}`}>{value}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (value: string) => <StatusBadge status={value as any} />,
    },
    {
      key: "owner",
      header: "Owner",
      render: (value: string) => value || <span className="text-muted-foreground">Unassigned</span>,
    },
    {
      key: "actions",
      header: "",
      className: "w-12",
      render: (_: any, row: any) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={(e) => handleDeleteClick(e, row)}
          data-testid={`button-delete-risk-${row.id}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium">Risk Register</h1>
          <p className="text-muted-foreground">
            Track and manage organizational security risks
          </p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)} data-testid="button-add-risk">
          <Plus className="h-4 w-4 mr-2" />
          Add Risk
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Risks"
          value={riskStats?.total || 0}
          icon={AlertTriangle}
        />
        <StatCard
          title="Critical Risks"
          value={riskStats?.critical || 0}
          icon={AlertTriangle}
          className="border-l-4 border-l-destructive"
        />
        <StatCard
          title="Open Risks"
          value={riskStats?.open || 0}
          icon={TrendingUp}
        />
        <StatCard
          title="Avg Risk Score"
          value={riskStats?.avgScore?.toFixed(1) || "0.0"}
          icon={TrendingUp}
        />
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search risks by title or asset..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                data-testid="input-search-risks"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="Open">Open</SelectItem>
              <SelectItem value="In-Progress">In Progress</SelectItem>
              <SelectItem value="Mitigated">Mitigated</SelectItem>
              <SelectItem value="Accepted">Accepted</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <DataTable
        columns={columns}
        data={risks}
        isLoading={isLoading}
        onRowClick={(row) => setLocation(`/risks/${row.id}`)}
        emptyMessage="No risks found. Add risks manually or let AI identify them from your assets."
        emptyIcon={<AlertTriangle className="h-16 w-16 mx-auto opacity-50 text-muted-foreground" />}
        pagination={{
          page,
          pageSize,
          total,
          onPageChange: setPage,
        }}
      />

      {/* Add Risk Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent data-testid="dialog-add-risk">
          <DialogHeader>
            <DialogTitle>Add Risk</DialogTitle>
            <DialogDescription>
              Add a new risk to the register.
            </DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit((data) => addMutation.mutate(data))} className="space-y-4" data-testid="form-add-risk">
              <FormField
                control={addForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Risk title" {...field} data-testid="input-risk-title" />
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
                        placeholder="Describe the risk..."
                        {...field}
                        value={field.value || ""}
                        data-testid="input-risk-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={addForm.control}
                  name="likelihood"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Likelihood (1-5)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={5}
                          {...field}
                          value={field.value}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-likelihood"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="impact"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Impact (1-5)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={5}
                          {...field}
                          value={field.value}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
                          data-testid="input-impact"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)} data-testid="button-cancel-risk">
                  Cancel
                </Button>
                <Button type="submit" disabled={addMutation.isPending} data-testid="button-submit-risk">
                  {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Risk
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Risk</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{riskToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-risk">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => riskToDelete && deleteMutation.mutate(riskToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-risk"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
