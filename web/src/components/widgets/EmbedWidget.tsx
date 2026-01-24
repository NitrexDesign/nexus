"use client";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export interface EmbedWidgetProps {
  data?: any;
  isLoading?: boolean;
  error?: string | null;
  theme?: "light" | "dark";
  className?: string;
  children?: React.ReactNode;
}

export function EmbedWidget({
  data,
  isLoading,
  error,
  theme = "light",
  className,
  children,
}: EmbedWidgetProps) {
  if (error) {
    return (
      <Card
        className={cn("p-4 border-destructive bg-destructive/10", className)}
      >
        <div className="text-destructive">
          <strong>Error:</strong> {error}
        </div>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-4 w-24" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "p-4",
        theme === "dark" && "bg-gray-900 text-white border-gray-700",
        className,
      )}
    >
      {children}
    </Card>
  );
}
