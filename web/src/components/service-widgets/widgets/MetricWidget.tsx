import { Activity } from "lucide-react";
import { WidgetComponentProps } from "../types";

export function MetricWidget({ widget }: WidgetComponentProps) {
  const { value, unit } = widget.content;

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-2">
        <Activity size={16} className="text-muted-foreground" />
        <span className="text-sm font-medium">{widget.title}</span>
      </div>
      <div className="text-right">
        <span className="text-lg font-bold">{value}</span>
        {unit && (
          <span className="text-xs text-muted-foreground ml-1">{unit}</span>
        )}
      </div>
    </div>
  );
}
