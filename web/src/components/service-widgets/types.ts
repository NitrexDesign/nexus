import { ReactNode } from "react";

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

export interface WidgetComponentProps {
  widget: ServiceWidget;
}

export type WidgetComponent = React.FC<WidgetComponentProps>;
