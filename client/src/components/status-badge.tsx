import { Badge } from "@/components/ui/badge";
import { Circle } from "lucide-react";
import { cn } from "@/lib/utils";

type StatusType =
  | "Open"
  | "In-Progress"
  | "Mitigated"
  | "Accepted"
  | "Closed"
  | "Proposed"
  | "Implemented"
  | "Declined"
  | "Triage"
  | "Containment"
  | "Eradication"
  | "Recovery"
  | "Done"
  | "Skipped";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusConfig = (stat: StatusType) => {
    switch (stat) {
      case "Open":
        return {
          label: "Open",
          className: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
          dotColor: "text-blue-500",
        };
      case "In-Progress":
      case "Triage":
      case "Containment":
      case "Eradication":
      case "Recovery":
        return {
          label: status.replace("-", " "),
          className: "bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
          dotColor: "text-yellow-500",
        };
      case "Mitigated":
      case "Done":
      case "Implemented":
        return {
          label: status,
          className: "bg-green-100 text-green-900 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
          dotColor: "text-green-500",
        };
      case "Closed":
        return {
          label: "Closed",
          className: "bg-gray-100 text-gray-900 border-gray-300 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700",
          dotColor: "text-gray-500",
        };
      case "Accepted":
        return {
          label: "Accepted",
          className: "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
          dotColor: "text-purple-500",
        };
      case "Proposed":
        return {
          label: "Proposed",
          className: "bg-cyan-100 text-cyan-900 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800",
          dotColor: "text-cyan-500",
        };
      case "Declined":
      case "Skipped":
        return {
          label: status,
          className: "bg-red-100 text-red-900 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
          dotColor: "text-red-500",
        };
      default:
        return {
          label: status,
          className: "bg-muted text-muted-foreground",
          dotColor: "text-muted-foreground",
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge
      variant="outline"
      className={cn("flex items-center gap-1.5 whitespace-nowrap", config.className, className)}
      data-testid={`status-badge-${status.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <Circle className={cn("h-2 w-2 fill-current", config.dotColor)} />
      <span>{config.label}</span>
    </Badge>
  );
}
