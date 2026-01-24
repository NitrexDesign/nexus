import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { WidgetComponentProps } from "../types";

export function StatusWidget({ widget }: WidgetComponentProps) {
  const { status, message } = widget.content;

  const statusStyles = {
    success: "bg-green-500/10 text-green-600 border-green-500/20",
    warning: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    error: "bg-red-500/10 text-red-600 border-red-500/20",
    info: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
      <span className="text-sm font-medium">{widget.title}</span>
      <Badge
        variant="secondary"
        className={cn(
          "border",
          statusStyles[status as keyof typeof statusStyles] ||
            statusStyles.info,
        )}
      >
        {message}
      </Badge>
    </div>
  );
}
