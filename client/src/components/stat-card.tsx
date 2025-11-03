import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
  onClick?: () => void;
}

export function StatCard({ title, value, icon: Icon, trend, className, onClick }: StatCardProps) {
  return (
    <Card
      className={cn(
        "hover-elevate transition-all",
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
      data-testid={`stat-card-${title.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-4xl font-bold" data-testid={`stat-value-${title.toLowerCase().replace(/\s+/g, "-")}`}>
          {value}
        </div>
        {trend && (
          <p className="text-xs text-muted-foreground mt-2">
            <span className={cn(
              "font-medium",
              trend.value > 0 ? "text-chart-3" : trend.value < 0 ? "text-destructive" : ""
            )}>
              {trend.value > 0 ? "+" : ""}{trend.value}%
            </span>{" "}
            {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
