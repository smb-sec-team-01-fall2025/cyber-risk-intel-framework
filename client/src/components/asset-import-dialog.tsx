import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, FileText, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

interface AssetImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AssetImportDialog({
  open,
  onOpenChange,
}: AssetImportDialogProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const importMutation = useMutation({
    mutationFn: async (assetsData: any[]) => {
      const response = await apiRequest("POST", "/api/assets/import", { assets: assetsData });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to import assets");
      }
      return await response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      toast({
        title: "Import Successful",
        description: `Successfully imported ${data.imported} asset(s)`,
      });
      setFile(null);
      setParseError(null);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import assets",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setParseError(null);
    }
  };

  const parseFile = async (file: File): Promise<any[]> => {
    const text = await file.text();
    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    if (fileExtension === "json") {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed : [parsed];
    } else if (fileExtension === "csv") {
      const lines = text.trim().split("\n");
      const headers = lines[0].split(",").map((h) => h.trim());
      
      return lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const asset: any = {};
        
        headers.forEach((header, index) => {
          const value = values[index];
          
          if (header === "criticality") {
            asset[header] = parseInt(value) || 2;
          } else if (header === "tags") {
            asset[header] = value ? value.split(";").map((t) => t.trim()) : [];
          } else if (value && value !== "") {
            asset[header] = value;
          }
        });
        
        return asset;
      });
    } else {
      throw new Error("Unsupported file format. Please upload CSV or JSON.");
    }
  };

  const handleImport = async () => {
    if (!file) return;

    try {
      setParseError(null);
      const assetsData = await parseFile(file);
      
      if (assetsData.length === 0) {
        throw new Error("No valid assets found in file");
      }
      
      importMutation.mutate(assetsData);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to parse file";
      setParseError(errorMessage);
      toast({
        title: "Parse Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Assets</DialogTitle>
          <DialogDescription>
            Upload a CSV or JSON file to bulk import assets into your inventory.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="p-6 border-2 border-dashed hover-elevate">
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center gap-2 cursor-pointer"
            >
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">
                  {file ? file.name : "Click to upload"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  CSV or JSON format
                </p>
              </div>
              <input
                id="file-upload"
                type="file"
                accept=".csv,.json"
                onChange={handleFileChange}
                className="hidden"
                data-testid="input-import-file"
              />
            </label>
          </Card>

          {parseError && (
            <Card className="p-4 bg-destructive/10 border-destructive">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">
                    Parse Error
                  </p>
                  <p className="text-xs text-destructive/80 mt-1">
                    {parseError}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {file && !parseError && (
            <Card className="p-4 bg-primary/10 border-primary/20">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">File Ready</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </p>
                </div>
              </div>
            </Card>
          )}

          <div className="bg-muted/50 p-4 rounded-md">
            <p className="text-xs font-medium mb-2">Required Fields:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• name - Asset name</li>
              <li>• type - HW, SW, Data, User, or Service</li>
              <li>• criticality - Number from 1 to 5</li>
            </ul>
            <p className="text-xs font-medium mt-3 mb-2">Optional Fields:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• ip - IP address</li>
              <li>• hostname - Hostname</li>
              <li>• owner - Asset owner</li>
              <li>• businessUnit - Business unit</li>
              <li>• dataSensitivity - Low, Medium, High, or Critical</li>
              <li>• description - Asset description</li>
            </ul>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFile(null);
                setParseError(null);
                onOpenChange(false);
              }}
              data-testid="button-cancel-import"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || importMutation.isPending}
              data-testid="button-submit-import"
            >
              {importMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Import Assets
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
