"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Copy, RefreshCw, Trash2, Eye, Code } from "lucide-react";
import { apiFetch, resolveUrl } from "@/lib/api-client";

interface EmbedConfig {
  id: string;
  name: string;
  type: string;
  apiKey: string;
  allowedOrigins: string[];
  dataEndpoint?: string | null;
  refreshInterval: number;
  settings: Record<string, any>;
  isPublic: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export function EmbedManagement() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedEmbed, setSelectedEmbed] = useState<EmbedConfig | null>(null);
  const [showApiKey, setShowApiKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Fetch embed configs
  const { data: embeds, isLoading } = useQuery<EmbedConfig[]>({
    queryKey: ["embedConfigs"],
    queryFn: async () => {
      const res = await apiFetch("/api/embed/configs", {
        headers: {
          "X-User-Id": localStorage.getItem("userId") || "",
        },
      });
      if (!res.ok) throw new Error("Failed to fetch embed configs");
      return res.json();
    },
  });

  // Create embed mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<EmbedConfig>) => {
      const res = await apiFetch("/api/embed/configs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": localStorage.getItem("userId") || "",
        },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create embed");
      return res.json();
    },
    onSuccess: (newEmbed) => {
      queryClient.invalidateQueries({ queryKey: ["embedConfigs"] });
      setIsCreateOpen(false);
      setShowApiKey(newEmbed.apiKey);
    },
  });

  // Delete embed mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/embed/configs/${id}`, {
        method: "DELETE",
        headers: {
          "X-User-Id": localStorage.getItem("userId") || "",
        },
      });
      if (!res.ok) throw new Error("Failed to delete embed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["embedConfigs"] });
    },
  });

  // Regenerate API key mutation
  const regenerateKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/embed/configs/${id}/regenerate-key`, {
        method: "POST",
        headers: {
          "X-User-Id": localStorage.getItem("userId") || "",
        },
      });
      if (!res.ok) throw new Error("Failed to regenerate API key");
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["embedConfigs"] });
      setShowApiKey(data.apiKey);
    },
  });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const generateEmbedCode = (embed: EmbedConfig) => {
    const serverUrl = resolveUrl("");
    return `<!-- Nexus Embed Widget -->
<div id="nexus-${embed.id}" 
     data-api-key="${embed.apiKey}" 
     data-server="${serverUrl}"
     data-embed-id="${embed.id}"
     data-theme="light"
     data-refresh="${embed.refreshInterval}">
</div>
<script src="${serverUrl}/embed.js"></script>`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Embed Management</h2>
          <p className="text-muted-foreground">
            Create and manage embeddable widgets for external sites
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Embed
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Embed</DialogTitle>
              <DialogDescription>
                Configure a new embeddable widget for external sites
              </DialogDescription>
            </DialogHeader>
            <CreateEmbedForm
              onSubmit={(data) => createMutation.mutate(data)}
              isLoading={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* API Key Display Dialog */}
      <Dialog open={!!showApiKey} onOpenChange={() => setShowApiKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Generated</DialogTitle>
            <DialogDescription>
              Save this API key securely. It will only be shown once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg font-mono text-sm break-all">
              {showApiKey}
            </div>
            <Button
              onClick={() => showApiKey && copyToClipboard(showApiKey, "new")}
              className="w-full"
            >
              <Copy className="mr-2 h-4 w-4" />
              Copy API Key
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="text-center py-12">Loading embeds...</div>
      ) : embeds && embeds.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {embeds.map((embed) => (
            <Card key={embed.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{embed.name}</CardTitle>
                    <Badge variant="outline" className="mt-2">
                      {embed.type}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Code className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Embed Code</DialogTitle>
                          <DialogDescription>
                            Copy this code and paste it into your website
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <pre className="p-4 bg-muted rounded-lg text-xs overflow-x-auto">
                            <code>{generateEmbedCode(embed)}</code>
                          </pre>
                          <Button
                            onClick={() =>
                              copyToClipboard(
                                generateEmbedCode(embed),
                                `code-${embed.id}`,
                              )
                            }
                            className="w-full"
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            {copiedKey === `code-${embed.id}`
                              ? "Copied!"
                              : "Copy Code"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(embed.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">
                    API Key
                  </Label>
                  <div className="flex gap-2 mt-1">
                    <code className="text-xs bg-muted px-2 py-1 rounded flex-1 truncate">
                      {embed.apiKey}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => copyToClipboard(embed.apiKey, embed.id)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Refresh Interval
                  </Label>
                  <div className="text-sm">{embed.refreshInterval}s</div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">
                    Status
                  </Label>
                  <div>
                    <Badge variant={embed.isPublic ? "default" : "secondary"}>
                      {embed.isPublic ? "Public" : "Private"}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => regenerateKeyMutation.mutate(embed.id)}
                >
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Regenerate Key
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No embeds created yet</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Embed
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface CreateEmbedFormProps {
  onSubmit: (data: Partial<EmbedConfig>) => void;
  isLoading: boolean;
}

function CreateEmbedForm({ onSubmit, isLoading }: CreateEmbedFormProps) {
  const [formData, setFormData] = useState({
    name: "",
    type: "status",
    allowedOrigins: "",
    refreshInterval: "60",
    isPublic: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: formData.name,
      type: formData.type,
      allowedOrigins: formData.allowedOrigins
        ? formData.allowedOrigins.split(",").map((o) => o.trim())
        : [],
      refreshInterval: parseInt(formData.refreshInterval),
      isPublic: formData.isPublic,
      settings: {},
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="My Status Widget"
          required
        />
      </div>

      <div>
        <Label htmlFor="type">Widget Type</Label>
        <Select
          value={formData.type}
          onValueChange={(value) => setFormData({ ...formData, type: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="status">Status</SelectItem>
            <SelectItem value="uptime">Uptime</SelectItem>
            <SelectItem value="metrics">Metrics</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="refreshInterval">Refresh Interval (seconds)</Label>
        <Input
          id="refreshInterval"
          type="number"
          min="10"
          value={formData.refreshInterval}
          onChange={(e) =>
            setFormData({ ...formData, refreshInterval: e.target.value })
          }
        />
      </div>

      <div>
        <Label htmlFor="allowedOrigins">
          Allowed Origins (comma-separated, optional)
        </Label>
        <Textarea
          id="allowedOrigins"
          value={formData.allowedOrigins}
          onChange={(e) =>
            setFormData({ ...formData, allowedOrigins: e.target.value })
          }
          placeholder="https://example.com, https://*.example.com, *"
          rows={3}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Leave empty to allow all origins. Use * for wildcards.
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isPublic"
          checked={formData.isPublic}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData({ ...formData, isPublic: e.target.checked })
          }
          className="rounded"
        />
        <Label htmlFor="isPublic" className="cursor-pointer">
          Public (visible to API key holders)
        </Label>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Creating..." : "Create Embed"}
      </Button>
    </form>
  );
}
