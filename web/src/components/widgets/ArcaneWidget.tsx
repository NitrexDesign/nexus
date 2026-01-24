"use client";

import { EmbedWidget, EmbedWidgetProps } from "./EmbedWidget";
import { Server, Play, Square, Boxes } from "lucide-react";

interface ArcaneData {
  runningContainers: number;
  stoppedContainers: number;
  totalContainers: number;
  error?: string;
}

interface ArcaneWidgetProps extends Omit<EmbedWidgetProps, "children"> {
  arcane?: ArcaneData;
  showTitle?: boolean;
}

export function ArcaneWidget({
  arcane,
  isLoading,
  error,
  theme = "light",
  className,
  showTitle = true,
}: ArcaneWidgetProps) {
  return (
    <EmbedWidget
      isLoading={isLoading}
      error={error || arcane?.error}
      theme={theme}
      className={className}
    >
      <div className="space-y-4">
        {showTitle && (
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            <h3 className="text-lg font-semibold">Container Status</h3>
          </div>
        )}

        {arcane ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ContainerCard
              icon={<Boxes className="h-5 w-5" />}
              label="Total Containers"
              value={arcane.totalContainers}
              theme={theme}
              color="blue"
            />
            <ContainerCard
              icon={<Play className="h-5 w-5" />}
              label="Running"
              value={arcane.runningContainers}
              theme={theme}
              color="green"
            />
            <ContainerCard
              icon={<Square className="h-5 w-5" />}
              label="Stopped"
              value={arcane.stoppedContainers}
              theme={theme}
              color="gray"
            />
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            No container data available
          </p>
        )}
      </div>
    </EmbedWidget>
  );
}

interface ContainerCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  theme: "light" | "dark";
  color?: "green" | "red" | "blue" | "gray";
}

function ContainerCard({
  icon,
  label,
  value,
  theme,
  color = "blue",
}: ContainerCardProps) {
  const colorClasses = {
    green: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950",
    red: "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950",
    blue: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950",
    gray: "text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-950",
  };

  return (
    <div
      className={`rounded-lg border p-4 ${theme === "dark" ? "border-gray-800" : "border-gray-200"}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div
          className={`p-2 rounded-md ${colorClasses[color] || colorClasses.blue}`}
        >
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}
