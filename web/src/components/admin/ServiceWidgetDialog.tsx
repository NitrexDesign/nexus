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

  // Fetch widgets for this service
  const { data: widgets = [], isLoading } = useQuery<ServiceWidget[]>({
    queryKey: ["serviceWidgets", serviceId],
    queryFn: async () => {
      const res = await apiFetch(
        `/api/services/widgets/admin/${serviceId}`,
        {
          headers: {
            "X-User-Id": localStorage.getItem("userId") || "",
          },
        },
      );
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
      queryClient.invalidateQueries({ queryKey: ["serviceWidgets", serviceId] });
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
      queryClient.invalidateQueries({ queryKey: ["serviceWidgets", serviceId] });
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
      queryClient.invalidateQueries({ queryKey: ["serviceWidgets", serviceId] });
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

  // Parse content based on widget type
  const getContentFields = () => {
    switch (formData.type) {
      case "metric":
        return (
          <>
            <div>
              <Label>Value</Label>
              <Input
                value={formData.content?.value || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    content: { ...formData.content, value: e.target.value },
                  })
                }
                placeholder="42"
              />
            </div>
            <div>
              <Label>Unit (optional)</Label>
              <Input
                value={formData.content?.unit || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    content: { ...formData.content, unit: e.target.value },
                  })
                }
                placeholder="ms, %, MB"
              />
            </div>
          </>
        );
      case "link":
        return (
          <>
            <div>
              <Label>URL</Label>
              <Input
                type="url"
                value={formData.content?.url || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    content: { ...formData.content, url: e.target.value },
                  })
                }
                placeholder="https://example.com/docs"
              />
            </div>
            <div>
              <Label>Link Text</Label>
              <Input
                value={formData.content?.text || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    content: { ...formData.content, text: e.target.value },
                  })
                }
                placeholder="View Documentation"
              />
            </div>
          </>
        );
      case "info":
        return (
          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.content?.description || ""}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  content: { ...formData.content, description: e.target.value },
                })
              }
              placeholder="Additional information about this service..."
              rows={3}
            />
          </div>
        );
      case "status":
        return (
          <>
            <div>
              <Label>Status</Label>
              <Select
                value={formData.content?.status || "info"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    content: { ...formData.content, status: value },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Message</Label>
              <Input
                value={formData.content?.message || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    content: { ...formData.content, message: e.target.value },
                  })
                }
                placeholder="Service is operating normally"
              />
            </div>
          </>
        );
      default:
        return null;
    }
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
                      setFormData({ ...formData, type: value, content: {} })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="info">Info Card</SelectItem>
                      <SelectItem value="metric">Metric</SelectItem>
                      <SelectItem value="link">Link</SelectItem>
                      <SelectItem value="status">Status Badge</SelectItem>
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

              {getContentFields()}

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
                        setFormData({ ...formData, isVisible: e.target.checked })
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
              widgets.map((widget) => (
                <Card key={widget.id}>
                  <CardContent className="py-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">{widget.title}</h4>
                          <Badge variant="outline">{widget.type}</Badge>
                          {!widget.isVisible && (
                            <Badge variant="secondary">Hidden</Badge>
                          )}
                        </div>
                        <pre className="text-xs text-muted-foreground bg-muted p-2 rounded overflow-x-auto">
                          {JSON.stringify(widget.content, null, 2)}
                        </pre>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleVisibility(widget)}
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
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(widget.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
