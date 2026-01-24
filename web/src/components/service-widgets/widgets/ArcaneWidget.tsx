import { Server, Play, Square, Info } from "lucide-react";
import { WidgetComponentProps } from "../types";

export function ArcaneWidget({ widget }: WidgetComponentProps) {
  const { runningContainers, stoppedContainers, totalContainers, error } =
    widget.content;

  if (error) {
    return (
      <div className="p-3 rounded-lg border bg-destructive/10 border-destructive/20">
        <div className="flex items-center gap-2 text-sm text-destructive">
          <Info size={16} />
          <span>Error: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-3 pt-3">
        <Server size={16} className="text-muted-foreground" />
        <span className="text-sm font-medium">{widget.title}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 px-3 pb-3">
        <div className="flex items-center gap-2 p-2 rounded-md bg-blue-500/10 border border-blue-500/20">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-blue-600">
              {totalContainers ?? 0}
            </span>
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-md bg-green-500/10 border border-green-500/20">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-green-600">
              {runningContainers ?? 0}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Play size={10} />
              Running
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-md bg-gray-500/10 border border-gray-500/20">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-gray-600">
              {stoppedContainers ?? 0}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Square size={10} />
              Stopped
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
