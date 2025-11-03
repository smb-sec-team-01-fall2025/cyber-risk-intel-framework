import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

const assetFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(120, "Name too long"),
  type: z.enum(["HW", "SW", "Data", "User", "Service"]),
  ip: z.string().ip("Invalid IP address").optional().or(z.literal("")),
  hostname: z.string().optional(),
  owner: z.string().optional(),
  businessUnit: z.string().optional(),
  criticality: z.number().min(1).max(5),
  dataSensitivity: z.enum(["Low", "Medium", "High", "Critical"]),
  description: z.string().optional(),
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

interface AssetFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset?: any;
  onSuccess?: () => void;
}

export function AssetFormDialog({
  open,
  onOpenChange,
  asset,
  onSuccess,
}: AssetFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!asset;

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: {
      name: asset?.name || "",
      type: asset?.type || "HW",
      ip: asset?.ip || "",
      hostname: asset?.hostname || "",
      owner: asset?.owner || "",
      businessUnit: asset?.businessUnit || "",
      criticality: asset?.criticality || 2,
      dataSensitivity: asset?.dataSensitivity || "Low",
      description: asset?.description || "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: AssetFormValues) => {
      const response = await apiRequest("POST", "/api/assets", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create asset");
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: "Success",
        description: `Asset ${isEditing ? "updated" : "created"} successfully`,
      });
      onOpenChange(false);
      form.reset();
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isEditing ? "update" : "create"} asset`,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AssetFormValues) => {
    createMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Asset" : "Add New Asset"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the asset information below."
              : "Enter the asset details to add it to your inventory."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Web Server 01"
                      {...field}
                      data-testid="input-asset-name"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-asset-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="HW">Hardware</SelectItem>
                        <SelectItem value="SW">Software</SelectItem>
                        <SelectItem value="Data">Data</SelectItem>
                        <SelectItem value="User">User</SelectItem>
                        <SelectItem value="Service">Service</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="criticality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Criticality (1-5) *</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      defaultValue={field.value.toString()}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-asset-criticality">
                          <SelectValue placeholder="Select criticality" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1 - Very Low</SelectItem>
                        <SelectItem value="2">2 - Low</SelectItem>
                        <SelectItem value="3">3 - Medium</SelectItem>
                        <SelectItem value="4">4 - High</SelectItem>
                        <SelectItem value="5">5 - Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IP Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., 192.168.1.100"
                        {...field}
                        data-testid="input-asset-ip"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="hostname"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hostname</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., web-server-01.local"
                        {...field}
                        data-testid="input-asset-hostname"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="owner"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Owner</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., IT Department"
                        {...field}
                        data-testid="input-asset-owner"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="businessUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Unit</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Operations"
                        {...field}
                        data-testid="input-asset-business-unit"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="dataSensitivity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data Sensitivity *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-asset-sensitivity">
                        <SelectValue placeholder="Select sensitivity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional details about this asset..."
                      rows={3}
                      {...field}
                      data-testid="input-asset-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                data-testid="button-submit-asset"
              >
                {createMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {isEditing ? "Update Asset" : "Create Asset"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
