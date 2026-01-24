import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WidgetComponentProps } from "../types";

export function LinkWidget({ widget }: WidgetComponentProps) {
  const { url, text } = widget.content;

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-full justify-between h-auto py-2.5"
      onClick={() => window.open(url, "_blank")}
    >
      <span className="text-sm font-medium">{widget.title}</span>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {text && <span>{text}</span>}
        <ExternalLink size={12} />
      </div>
    </Button>
  );
}
