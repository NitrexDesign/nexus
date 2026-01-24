"use client";

import { Badge } from "@/components/ui/badge";
import { EmbedWidget, EmbedWidgetProps } from "./EmbedWidget";
import { resolveUrl } from "@/lib/api-client";

interface Service {
  id: string;
  name: string;
  icon: string;
  healthStatus: string;
  url?: string;
}

interface StatusWidgetProps extends Omit<EmbedWidgetProps, "children"> {
  services?: Service[];
  showTitle?: boolean;
  gridColumns?: number;
}

export function StatusWidget({
  services,
  isLoading,
  error,
  theme = "light",
  className,
  showTitle = true,
  gridColumns = 3,
}: StatusWidgetProps) {
  return (
    <EmbedWidget
      isLoading={isLoading}
      error={error}
      theme={theme}
      className={className}
    >
      <div className="space-y-4">
        {showTitle && <h3 className="text-lg font-semibold">Service Status</h3>}

        {services && services.length > 0 ? (
          <div
            className="grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${gridColumns}, minmax(0, 1fr))`,
            }}
          >
            {services.map((service) => (
              <div
                key={service.id}
                className="flex flex-col items-center gap-2 p-3 border rounded-lg hover:shadow-md transition-shadow"
              >
                {service.icon && (
                  <img
                    src={resolveUrl(`/icons/${service.icon}`)}
                    alt={service.name}
                    className="w-8 h-8 object-contain"
                  />
                )}
                <div className="text-sm font-medium text-center">
                  {service.name}
                </div>
                <Badge
                  variant={
                    service.healthStatus === "up"
                      ? "default"
                      : service.healthStatus === "down"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {service.healthStatus}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            No services available
          </p>
        )}
      </div>
    </EmbedWidget>
  );
}
