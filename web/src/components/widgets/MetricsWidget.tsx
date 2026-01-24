"use client";

import { EmbedWidget, EmbedWidgetProps } from "./EmbedWidget";

interface Metrics {
  total: number;
  healthy: number;
  unhealthy: number;
  unknown: number;
  uptimePercentage: string;
}

interface MetricsWidgetProps extends Omit<EmbedWidgetProps, "children"> {
  metrics?: Metrics;
  showTitle?: boolean;
}

export function MetricsWidget({
  metrics,
  isLoading,
  error,
  theme = "light",
  className,
  showTitle = true,
}: MetricsWidgetProps) {
  return (
    <EmbedWidget
      isLoading={isLoading}
      error={error}
      theme={theme}
      className={className}
    >
      <div className="space-y-4">
        {showTitle && <h3 className="text-lg font-semibold">System Metrics</h3>}

        {metrics ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Total" value={metrics.total} theme={theme} />
            <MetricCard
              label="Healthy"
              value={metrics.healthy}
              theme={theme}
              color="green"
            />
            <MetricCard
              label="Unhealthy"
              value={metrics.unhealthy}
              theme={theme}
              color="red"
            />
            <MetricCard
              label="Uptime"
              value={`${metrics.uptimePercentage}%`}
              theme={theme}
              color="blue"
            />
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            No metrics available
          </p>
        )}
      </div>
    </EmbedWidget>
  );
}

interface MetricCardProps {
  label: string;
  value: number | string;
  theme: "light" | "dark";
  color?: "green" | "red" | "blue";
}

function MetricCard({ label, value, theme, color }: MetricCardProps) {
  const colorClasses = {
    green: "text-green-600 dark:text-green-400",
    red: "text-red-600 dark:text-red-400",
    blue: "text-blue-600 dark:text-blue-400",
  };

  return (
    <div
      className={`text-center p-4 rounded-lg ${
        theme === "dark" ? "bg-gray-800" : "bg-gray-50"
      }`}
    >
      <div className={`text-3xl font-bold ${color ? colorClasses[color] : ""}`}>
        {value}
      </div>
      <div className="text-xs uppercase tracking-wider opacity-70 mt-1">
        {label}
      </div>
    </div>
  );
}
