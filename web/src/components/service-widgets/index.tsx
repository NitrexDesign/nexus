import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Info, Activity } from "lucide-react";
import { motion } from "framer-motion";

export interface ServiceWidget {
  id: string;
  serviceId: string;
  type: string;
  title: string;
  content: Record<string, any>;
  settings: Record<string, any>;
  order: number;
  isVisible: boolean;
}

interface ServiceWidgetWrapperProps {
  widget: ServiceWidget;
  index: number;
  children: React.ReactNode;
}

export function ServiceWidgetWrapper({
  widget,
  index,
  children,
}: ServiceWidgetWrapperProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="relative"
    >
      {children}
    </motion.div>
  );
}

interface MetricWidgetProps {
  widget: ServiceWidget;
}

export function MetricWidget({ widget }: MetricWidgetProps) {
  const { value, unit } = widget.content;
  
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
      <div className="flex items-center gap-2">
        <Activity size={16} className="text-muted-foreground" />
        <span className="text-sm font-medium">{widget.title}</span>
      </div>
      <div className="text-right">
        <span className="text-lg font-bold">{value}</span>
        {unit && <span className="text-xs text-muted-foreground ml-1">{unit}</span>}
      </div>
    </div>
  );
}

interface InfoWidgetProps {
  widget: ServiceWidget;
}

export function InfoWidget({ widget }: InfoWidgetProps) {
  const { description } = widget.content;
  
  return (
    <div className="p-3 rounded-lg border bg-muted/30">
      <div className="flex items-start gap-2">
        <Info size={16} className="text-muted-foreground mt-0.5 flex-shrink-0" />
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

interface LinkWidgetProps {
  widget: ServiceWidget;
}

export function LinkWidget({ widget }: LinkWidgetProps) {
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

interface StatusWidgetProps {
  widget: ServiceWidget;
}

export function StatusWidget({ widget }: StatusWidgetProps) {
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

interface ServiceWidgetRendererProps {
  widget: ServiceWidget;
  index: number;
}

export function ServiceWidgetRenderer({
  widget,
  index,
}: ServiceWidgetRendererProps) {
  let content;
  
  switch (widget.type) {
    case "metric":
      content = <MetricWidget widget={widget} />;
      break;
    case "info":
      content = <InfoWidget widget={widget} />;
      break;
    case "link":
      content = <LinkWidget widget={widget} />;
      break;
    case "status":
      content = <StatusWidget widget={widget} />;
      break;
    default:
      return null;
  }
  
  return (
    <ServiceWidgetWrapper widget={widget} index={index}>
      {content}
    </ServiceWidgetWrapper>
  );
}
