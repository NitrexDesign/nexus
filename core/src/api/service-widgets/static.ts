import { WidgetHandler } from "./types";

// Static widget types that don't need data fetching
export const metricWidget: WidgetHandler = {
  type: "metric",
};

export const infoWidget: WidgetHandler = {
  type: "info",
};

export const linkWidget: WidgetHandler = {
  type: "link",
};

export const statusWidget: WidgetHandler = {
  type: "status",
};
