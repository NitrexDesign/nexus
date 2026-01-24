import { motion } from "framer-motion";
import { ServiceWidget } from "./types";
import { widgetRegistry } from "./registry";

// Import and auto-register all widget components
import "./widgets";

// Re-export types for convenience
export type { ServiceWidget, WidgetComponentProps } from "./types";

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

interface ServiceWidgetRendererProps {
  widget: ServiceWidget;
  index: number;
}

export function ServiceWidgetRenderer({
  widget,
  index,
}: ServiceWidgetRendererProps) {
  // Get widget component from registry
  const WidgetComponent = widgetRegistry.get(widget.type);

  if (!WidgetComponent) {
    console.warn(`[ServiceWidgetRenderer] Unknown widget type: ${widget.type}`);
    return null;
  }

  return (
    <ServiceWidgetWrapper widget={widget} index={index}>
      <WidgetComponent widget={widget} />
    </ServiceWidgetWrapper>
  );
}
