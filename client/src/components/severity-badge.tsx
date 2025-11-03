import { Badge } from "@/components/ui/badge";
import { AlertCircle, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type SeverityLevel = 1 | 2 | 3 | 4 | 5 | "Low" | "Medium" | "High" | "Critical" | "Info" | "P1" | "P2" | "P3" | "P4";

interface SeverityBadgeProps {
  severity: SeverityLevel;
  className?: string;
  showIcon?: boolean;
}

export function SeverityBadge({ severity, className, showIcon = true }: SeverityBadgeProps) {
  const getSeverityConfig = (sev: SeverityLevel) => {
    // Normalize to number (1-5) or string
    let normalizedSev: string;
    
    if (typeof sev === "number") {
      if (sev === 5) normalizedSev = "Critical";
      else if (sev === 4) normalizedSev = "High";
      else if (sev === 3) normalizedSev = "Medium";
      else if (sev === 2) normalizedSev = "Low";
      else normalizedSev = "Info";
    } else if (sev.startsWith("P")) {
      // Incident severity
      const pNum = parseInt(sev.substring(1));
      if (pNum === 1) normalizedSev = "Critical";
      else if (pNum === 2) normalizedSev = "High";
      else if (pNum === 3) normalizedSev = "Medium";
      else normalizedSev = "Low";
    } else {
      normalizedSev = sev;
    }

    switch (normalizedSev) {
      case "Critical":
        return {
          label: "Critical",
          variant: "destructive" as const,
          icon: AlertCircle,
          className: "bg-destructive text-destructive-foreground border-destructive",
        };
      case "High":
        return {
          label: "High",
          variant: "default" as const,
          icon: AlertTriangle,
          className: "bg-chart-4 text-white border-chart-4",
        };
      case "Medium":
        return {
          label: "Medium",
          variant: "secondary" as const,
          icon: AlertTriangle,
          className: "bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
        };
      case "Low":
        return {
          label: "Low",
          variant: "outline" as const,
          icon: Info,
          className: "text-muted-foreground",
        };
      case "Info":
      default:
        return {
          label: "Info",
          variant: "outline" as const,
          icon: CheckCircle,
          className: "text-muted-foreground",
        };
    }
  };

  const config = getSeverityConfig(severity);
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn("flex items-center gap-1 whitespace-nowrap", config.className, className)}
      data-testid={`severity-badge-${config.label.toLowerCase()}`}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      <span>{config.label}</span>
    </Badge>
  );
}
