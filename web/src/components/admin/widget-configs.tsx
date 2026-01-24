import { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface WidgetFieldConfig {
  name: string;
  label: string;
  type: "text" | "url" | "password" | "textarea" | "number" | "select";
  placeholder?: string;
  options?: { value: string; label: string }[];
  target: "content" | "settings";
  span?: 1 | 2; // Grid column span
  rows?: number; // For textarea
  description?: string;
}

export interface WidgetTypeConfig {
  type: string;
  fields: WidgetFieldConfig[];
}

// Widget configuration registry
const widgetConfigs: WidgetTypeConfig[] = [
  {
    type: "metric",
    fields: [
      {
        name: "value",
        label: "Value",
        type: "text",
        placeholder: "42",
        target: "content",
        span: 1,
      },
      {
        name: "unit",
        label: "Unit (optional)",
        type: "text",
        placeholder: "ms, %, MB",
        target: "content",
        span: 1,
      },
    ],
  },
  {
    type: "link",
    fields: [
      {
        name: "url",
        label: "URL",
        type: "url",
        placeholder: "https://example.com/docs",
        target: "content",
        span: 1,
      },
      {
        name: "text",
        label: "Link Text",
        type: "text",
        placeholder: "View Documentation",
        target: "content",
        span: 1,
      },
    ],
  },
  {
    type: "info",
    fields: [
      {
        name: "description",
        label: "Description",
        type: "textarea",
        placeholder: "Additional information about this service...",
        target: "content",
        span: 2,
        rows: 3,
      },
    ],
  },
  {
    type: "status",
    fields: [
      {
        name: "status",
        label: "Status",
        type: "select",
        target: "content",
        span: 1,
        options: [
          { value: "success", label: "Success" },
          { value: "warning", label: "Warning" },
          { value: "error", label: "Error" },
          { value: "info", label: "Info" },
        ],
      },
      {
        name: "message",
        label: "Message",
        type: "text",
        placeholder: "Service is operating normally",
        target: "content",
        span: 1,
      },
    ],
  },
  {
    type: "arcane",
    fields: [
      {
        name: "token",
        label: "API Token",
        type: "password",
        placeholder: "Bearer token for Arcane API",
        target: "settings",
        span: 2,
        description: "Uses the service's URL automatically",
      },
      {
        name: "environmentId",
        label: "Environment ID",
        type: "text",
        placeholder: "Environment ID in Arcane",
        target: "settings",
        span: 2,
      },
    ],
  },
];

// Get configuration for a widget type
export function getWidgetConfig(type: string): WidgetTypeConfig | undefined {
  return widgetConfigs.find((config) => config.type === type);
}

// Render a field based on its configuration
export function renderField(
  field: WidgetFieldConfig,
  value: any,
  onChange: (value: any) => void,
): ReactNode {
  const commonProps = {
    value: value || "",
    onChange: (e: any) => onChange(e.target?.value ?? e),
  };

  const wrapperClass = field.span === 2 ? "col-span-2" : "";

  switch (field.type) {
    case "textarea":
      return (
        <div key={field.name} className={wrapperClass}>
          <Label>{field.label}</Label>
          <Textarea
            {...commonProps}
            placeholder={field.placeholder}
            rows={field.rows}
          />
          {field.description && (
            <p className="text-xs text-muted-foreground mt-1">
              {field.description}
            </p>
          )}
        </div>
      );

    case "select":
      return (
        <div key={field.name} className={wrapperClass}>
          <Label>{field.label}</Label>
          <Select
            value={value || field.options?.[0]?.value}
            onValueChange={onChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.description && (
            <p className="text-xs text-muted-foreground mt-1">
              {field.description}
            </p>
          )}
        </div>
      );

    default:
      return (
        <div key={field.name} className={wrapperClass}>
          <Label>{field.label}</Label>
          <Input
            {...commonProps}
            type={field.type}
            placeholder={field.placeholder}
          />
          {field.description && (
            <p className="text-xs text-muted-foreground mt-1">
              {field.description}
            </p>
          )}
        </div>
      );
  }
}

// Get all registered widget types
export function getRegisteredWidgetTypes(): string[] {
  return widgetConfigs.map((config) => config.type);
}
