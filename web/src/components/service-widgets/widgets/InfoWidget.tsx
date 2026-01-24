import { Info } from "lucide-react";
import { WidgetComponentProps } from "../types";

export function InfoWidget({ widget }: WidgetComponentProps) {
  const { description } = widget.content;

  return (
    <div className="p-3 rounded-lg border bg-muted/30">
      <div className="flex items-start gap-2">
        <Info
          size={16}
          className="text-muted-foreground mt-0.5 flex-shrink-0"
        />
        <div>
          <div className="text-sm font-medium mb-1">{widget.title}</div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
