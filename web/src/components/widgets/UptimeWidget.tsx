"use client";

import { Progress } from "@/components/ui/progress";
import { EmbedWidget, EmbedWidgetProps } from "./EmbedWidget";

interface UptimeData {
  serviceId: string;
  serviceName: string;
  uptime: Array<{ status: string; timestamp: string }> | null;
}

interface UptimeWidgetProps extends Omit<EmbedWidgetProps, "children"> {
  uptimeData?: UptimeData[];
  showTitle?: boolean;
  daysShown?: number;
}

export function UptimeWidget({
  uptimeData,
  isLoading,
  error,
  theme = "light",
  className,
  showTitle = true,
  daysShown = 7,
}: UptimeWidgetProps) {
  const calculateUptimePercentage = (
    uptime: Array<{ status: string }> | null,
  ): number => {
    if (!uptime || uptime.length === 0) return 0;
    const total = uptime.length;
    const up = uptime.filter((d) => d.status === "up").length;
    return (up / total) * 100;
  };

  return (
    <EmbedWidget
      isLoading={isLoading}
      error={error}
      theme={theme}
      className={className}
    >
      <div className="space-y-4">
        {showTitle && (
          <h3 className="text-lg font-semibold">Uptime ({daysShown} days)</h3>
        )}

        {uptimeData && uptimeData.length > 0 ? (
          <div className="space-y-3">
            {uptimeData.map((item) => {
              const percentage = calculateUptimePercentage(item.uptime);
              return (
                <div
                  key={item.serviceId}
                  className="p-3 border rounded-lg space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{item.serviceName}</span>
                    <span className="text-sm font-semibold">
                      {percentage.toFixed(2)}%
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            No uptime data available
          </p>
        )}
      </div>
    </EmbedWidget>
  );
}
