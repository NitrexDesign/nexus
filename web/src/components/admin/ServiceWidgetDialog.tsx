"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit, Eye, EyeOff } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { getWidgetConfig, renderField } from "./widget-configs";

interface ServiceWidget {
  id: string;
  serviceId: string;
  type: string;
  title: string;
  content: Record<string, any>;
  settings: Record<string, any>;
  order: number;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ServiceWidgetDialogProps {
  serviceId: string;
  serviceName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServiceWidgetDialog({
  serviceId,
  serviceName,
  open,
  onOpenChange,
}: ServiceWidgetDialogProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<ServiceWidget>>({
    type: "info",
    title: "",
    content: {},
    settings: {},
    order: 0,
    isVisible: true,
  });

  // Fetch available widget types from backend registry
  const { data: widgetTypes = [] } = useQuery<string[]>({
    queryKey: ["widgetTypes"],
    queryFn: async () => {
      const res = await apiFetch("/api/services/widgets/types");
      if (!res.ok) throw new Error("Failed to fetch widget types");
      return res.json();
    },
  });

  // Fetch widgets for this service
  const { data: widgets = [], isLoading } = useQuery<ServiceWidget[]>({
    queryKey: ["serviceWidgets", serviceId],
    queryFn: async () => {
      const res = await apiFetch(`/api/services/widgets/admin/${serviceId}`, {
        headers: {
          "X-User-Id": localStorage.getItem("userId") || "",
        },
      });
      if (!res.ok) throw new Error("Failed to fetch widgets");
      return res.json();
    },
    enabled: open && !!serviceId,
  });

  // Create widget mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<ServiceWidget>) => {
      const res = await apiFetch(`/api/services/${serviceId}/widgets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": localStorage.getItem("userId") || "",
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create widget");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["serviceWidgets", serviceId],
      });
      resetForm();
    },
  });

  // Update widget mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<ServiceWidget>;
    }) => {
      const res = await apiFetch(`/api/services/widgets/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": localStorage.getItem("userId") || "",
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update widget");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["serviceWidgets", serviceId],
      });
      resetForm();
    },
  });

  // Delete widget mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/services/widgets/${id}`, {
        method: "DELETE",
        headers: {
          "X-User-Id": localStorage.getItem("userId") || "",
        },
      });
      if (!res.ok) throw new Error("Failed to delete widget");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["serviceWidgets", serviceId],
      });
    },
  });

  const resetForm = () => {
    setEditing(null);
    setFormData({
      type: "info",
      title: "",
      content: {},
      settings: {},
      order: 0,
      isVisible: true,
    });
  };

  const handleSave = () => {
    if (editing) {
      updateMutation.mutate({ id: editing, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (widget: ServiceWidget) => {
    setEditing(widget.id);
    setFormData({
      type: widget.type,
      title: widget.title,
      content: widget.content,
      settings: widget.settings,
      order: widget.order,
      isVisible: widget.isVisible,
    });
  };

  const toggleVisibility = (widget: ServiceWidget) => {
    updateMutation.mutate({
      id: widget.id,
      data: { isVisible: !widget.isVisible },
    });
  };

  // Dynamically render fields based on widget type configuration
  const getContentFields = () => {
    const config = getWidgetConfig(formData.type || "");

    if (!config || config.fields.length === 0) {
      return (
        <div className="col-span-2 text-sm text-muted-foreground">
          Widget type "{formData.type}" has no configuration fields. Content
          will be fetched automatically.
        </div>
      );
    }

    return config.fields.map((field) => {
      const targetData =
        field.target === "content" ? formData.content : formData.settings;
      const value = targetData?.[field.name];

      const handleChange = (newValue: any) => {
        const target = field.target === "content" ? "content" : "settings";
        setFormData({
          ...formData,
          [target]: {
            ...formData[target],
            [field.name]: newValue,
          },
        });
      };

      return renderField(field, value, handleChange);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Widgets - {serviceName}</DialogTitle>
          <DialogDescription>
            Add custom information cards to display on this service
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Widget Form */}
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  {editing ? "Edit Widget" : "New Widget"}
                </h3>
                {editing && (
                  <Button variant="ghost" size="sm" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Widget Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        type: value,
                        content: {},
                        settings: {},
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {widgetTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Response Time"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">{getContentFields()}</div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Display Order</Label>
                  <Input
                    type="number"
                    value={formData.order}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        order: parseInt(e.target.value),
                      })
                    }
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isVisible}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFormData({
                          ...formData,
                          isVisible: e.target.checked,
                        })
                      }
                      className="rounded"
                    />
                    <span className="text-sm">Visible to public</span>
                  </label>
                </div>
              </div>

              <Button onClick={handleSave} className="w-full">
                {editing ? "Update Widget" : "Add Widget"}
              </Button>
            </CardContent>
          </Card>

          {/* Existing Widgets */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Existing Widgets</h3>
            {isLoading ? (
              <div className="text-center py-8">Loading widgets...</div>
            ) : widgets.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No widgets added yet. Create one above to get started.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {widgets.map((widget) => (
                  <Card key={widget.id} className="hover:bg-accent/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Left side - Widget info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-3">
                            <h4 className="font-semibold text-base">{widget.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {widget.type}
                            </Badge>
                            {!widget.isVisible && (
                              <Badge variant="secondary" className="text-xs">
                                Hidden
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground ml-auto">
                              Order: {widget.order}
                            </span>
                          </div>

                          {/* Content and Settings in a cleaner format */}
                          <div className="space-y-2">
                            {(() => {
                              // Parse content if it's a string
                              const content = typeof widget.content === 'string' 
                                ? JSON.parse(widget.content) 
                                : widget.content;
                              const contentKeys = Object.keys(content || {});
                              
                              return contentKeys.length > 0 && (
                                <div className="text-sm">
                                  <span className="font-medium text-muted-foreground">Content: </span>
                                  <span className="text-foreground">
                                    {Object.entries(content)
                                      .map(([key, value]) => `${key}: ${value}`)
                                      .join(", ")}
                                  </span>
                                </div>
                              );
                            })()}
                            {(() => {
                              // Parse settings if it's a string
                              const settings = typeof widget.settings === 'string'
                                ? JSON.parse(widget.settings)
                                : widget.settings;
                              const settingsKeys = Object.keys(settings || {});
                              
                              return settingsKeys.length > 0 && (
                                <div className="text-sm">
                                  <span className="font-medium text-muted-foreground">Settings: </span>
                                  <span className="text-foreground">
                                    {Object.entries(settings)
                                      .map(([key, value]) => {
                                        // Mask sensitive values like tokens
                                        if (key.toLowerCase().includes("token") && typeof value === "string") {
                                          return `${key}: ${value.substring(0, 20)}...`;
                                        }
                                        return `${key}: ${value}`;
                                      })
                                      .join(", ")}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>
                        </div>

                        {/* Right side - Action buttons */}
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleVisibility(widget)}
                            title={widget.isVisible ? "Hide widget" : "Show widget"}
                          >
                            {widget.isVisible ? (
                              <Eye className="h-4 w-4" />
                            ) : (
                              <EyeOff className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(widget)}
                            title="Edit widget"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteMutation.mutate(widget.id)}
                            title="Delete widget"
                            className="hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
