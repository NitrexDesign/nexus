import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Trash2,
  Search,
  Loader2,
  List as ListIcon,
  Filter,
  Download,
  Upload,
  FileJson,
  LayoutGrid,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { apiFetch } from "@/lib/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// External components
import { ServiceCard } from "./admin/ServiceCard";
import { StatsCards } from "./admin/StatsCards";
import { UserManagement } from "./admin/UserManagement";
import { ServiceDialog } from "./admin/ServiceDialog";

interface Service {
  id: string;
  name: string;
  url: string;
  icon: string;
  group: string;
  order: number;
  public: boolean;
  auth_required: boolean;
  new_tab: boolean;
  check_health: boolean;
  health_status?: string;
  last_checked?: string;
}

interface User {
  id: string;
  username: string;
  display_name: string;
  approved: boolean;
}

interface AdminDashboardProps {
  search: string;
}

export function AdminDashboard({ search }: AdminDashboardProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("services");
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [formData, setFormData] = useState<Partial<Service>>({});
  const [filterGroup, setFilterGroup] = useState<string | "all">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">(
    (localStorage.getItem("admin_view_mode") as "grid" | "list") || "list",
  );
  const [showStats, setShowStats] = useState<boolean>(
    localStorage.getItem("admin_show_stats") !== "false",
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: services = [], isLoading: loading } = useQuery<Service[]>({
    queryKey: ["services"],
    queryFn: async () => {
      const res = await apiFetch("/api/services");
      const data = await res.json();
      return data || [];
    },
  });

  const { data: groups = [] } = useQuery<string[]>({
    queryKey: ["groups"],
    queryFn: async () => {
      const res = await apiFetch("/api/services/groups");
      const data = await res.json();
      return data || [];
    },
  });

  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await apiFetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      return data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ id, data }: { id?: string; data: Partial<Service> }) => {
      const method = id ? "PUT" : "POST";
      const url = id ? `/api/services/${id}` : "/api/services";
      const res = await apiFetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save service");
      return res.json();
    },
    onSuccess: () => {
      toast.success(editing && editing !== "new" ? "Service updated" : "Service created");
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      setEditing(null);
      setFormData({});
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/services/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete service");
    },
    onSuccess: () => {
      toast.success("Service deleted");
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => apiFetch(`/api/services/${id}`, { method: "DELETE" })));
    },
    onSuccess: () => {
      toast.success("Services deleted");
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });

  const bulkImportMutation = useMutation({
    mutationFn: async (data: any[]) => {
      const res = await apiFetch("/api/services/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to import services");
    },
    onSuccess: () => {
      toast.success("Import successful");
      queryClient.invalidateQueries({ queryKey: ["services"] });
      queryClient.invalidateQueries({ queryKey: ["groups"] });
    },
  });

  useEffect(() => {
    localStorage.setItem("admin_view_mode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem("admin_show_stats", showStats.toString());
  }, [showStats]);

  const handleSave = async (id?: string) => {
    saveMutation.mutate({ id, data: formData });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This action cannot be undone.")) return;
    deleteMutation.mutate(id);
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} services?`)) return;
    bulkDeleteMutation.mutate(Array.from(selectedIds));
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(services, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nexus-services.json";
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const rawData = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(rawData)) throw new Error("Invalid format");

        const data = rawData.map((item: Record<string, unknown>) => ({
          name: item.name as string || "",
          url: item.url as string || "",
          group: item.group as string || "",
          order: Number(item.order) || 0,
          public: item.public as boolean ?? true,
          auth_required: item.auth_required as boolean ?? false,
          new_tab: item.new_tab as boolean ?? false,
          check_health: item.check_health as boolean ?? true,
          health_status: item.health_status as string || "",
          last_checked: item.last_checked || null,
        }));

        const res = await apiFetch("/api/services/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        if (res.ok) {
          bulkImportMutation.mutate(data);
        }
      } catch (err) {
        toast.error("Failed to import services");
      }
    };
    reader.readAsText(file);
  };

  const filteredServices = (services || []).filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.url.toLowerCase().includes(search.toLowerCase()) ||
      (s.group || "").toLowerCase().includes(search.toLowerCase());
    const matchesGroup = filterGroup === "all" || s.group === filterGroup;
    return matchesSearch && matchesGroup;
  });

  const groupedServices: Record<string, Service[]> = {};
  filteredServices.forEach((s) => {
    if (!groupedServices[s.group]) groupedServices[s.group] = [];
    groupedServices[s.group].push(s);
  });

  const stats = {
    total: services.length,
    public: services.filter((s) => s.public).length,
    auth: services.filter((s) => s.auth_required).length,
    groups: groups.length,
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-neutral-50/50 dark:bg-neutral-950 px-4 md:px-8 pb-16">
      <div className="container mx-auto py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10"
        >
          <div>
            <h1 className="text-4xl font-black tracking-tight mb-1">
              Dashboard
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage your digital infrastructure.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-muted/50 p-1.5 rounded-xl border">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-[240px] grid-cols-2 bg-transparent">
                <TabsTrigger value="services" className="rounded-lg">
                  Services
                </TabsTrigger>
                <TabsTrigger value="users" className="rounded-lg">
                  Users
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </motion.div>

        <Tabs value={activeTab} className="space-y-8">
          <AnimatePresence mode="wait">
            {activeTab === "services" ? (
              <motion.div
                key="services"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <TabsContent value="services" className="space-y-8 outline-none mt-0">
                  <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between bg-card p-6 rounded-2xl border shadow-sm">
                    <div className="flex flex-wrap gap-3 items-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => setShowStats(!showStats)}
                              className="rounded-xl"
                            >
                              {showStats ? <EyeOff size={18} /> : <Eye size={18} />}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {showStats ? "Hide Statistics" : "Show Statistics"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="icon"
                            className="rounded-xl"
                          >
                            <FileJson size={18} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="rounded-xl">
                          <DropdownMenuItem
                            onClick={handleExport}
                            className="cursor-pointer"
                          >
                            <Download className="mr-2 h-4 w-4" /> Export JSON
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => fileInputRef.current?.click()}
                            className="cursor-pointer"
                          >
                            <Upload className="mr-2 h-4 w-4" /> Import JSON
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        accept=".json"
                        onChange={handleImport}
                      />
                      <div className="h-8 w-px bg-border mx-2 hidden sm:block" />
                      <Button
                        onClick={() => {
                          setEditing("new");
                          setFormData({ public: true });
                        }}
                        className="rounded-xl shadow-md"
                      >
                        <Plus className="mr-2 h-4 w-4" /> Add Service
                      </Button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full lg:w-auto">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="rounded-xl justify-between min-w-[160px]"
                          >
                            <div className="flex items-center">
                              <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                              {filterGroup === "all" ? "All Groups" : filterGroup}
                            </div>
                            <Check
                              className={cn(
                                "ml-2 h-4 w-4 opacity-0",
                                filterGroup !== "all" && "opacity-100",
                              )}
                            />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-64 p-0 rounded-xl overflow-hidden"
                          align="end"
                        >
                          <Command>
                            <CommandInput placeholder="Search groups..." />
                            <CommandList>
                              <CommandGroup>
                                <CommandItem
                                  onSelect={() => setFilterGroup("all")}
                                  className="cursor-pointer"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      filterGroup === "all"
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                  All Groups
                                </CommandItem>
                                {groups.map((g) => (
                                  <CommandItem
                                    key={g}
                                    onSelect={() => setFilterGroup(g)}
                                    className="cursor-pointer"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        filterGroup === g
                                          ? "opacity-100"
                                          : "opacity-0",
                                      )}
                                    />
                                    {g}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>

                      <div className="flex border rounded-xl h-10 items-center overflow-hidden bg-muted/30 p-1">
                        <Button
                          variant={viewMode === "list" ? "secondary" : "ghost"}
                          size="sm"
                          className="rounded-lg h-full px-3"
                          onClick={() => setViewMode("list")}
                        >
                          <ListIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          variant={viewMode === "grid" ? "secondary" : "ghost"}
                          size="sm"
                          className="rounded-lg h-full px-3"
                          onClick={() => setViewMode("grid")}
                        >
                          <LayoutGrid className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {showStats && (
                    <StatsCards
                      total={stats.total}
                      publicCount={stats.public}
                      authCount={stats.auth}
                      groupCount={stats.groups}
                    />
                  )}

                  <AnimatePresence>
                    {selectedIds.size > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                        animate={{ opacity: 1, height: "auto", marginBottom: 32 }}
                        exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                        className="bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-2xl flex items-center justify-between overflow-hidden"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-destructive/20 p-2 rounded-lg">
                            <Trash2 className="h-5 w-5" />
                          </div>
                          <span className="font-bold">
                            {selectedIds.size} items selected for deletion
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedIds(new Set())}
                            className="hover:bg-destructive/5 text-destructive font-medium"
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleBulkDelete}
                            className="shadow-lg font-bold px-6"
                          >
                            Confirm Delete
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-32">
                      <Loader2 className="animate-spin h-12 w-12 mb-6 text-primary" />
                      <p className="text-muted-foreground text-xl font-medium">
                        Fetching your services...
                      </p>
                    </div>
                  ) : filteredServices.length === 0 ? (
                    <div className="text-center py-32 border-2 border-dashed rounded-3xl bg-card/50">
                      <Search className="mx-auto h-20 w-20 text-muted-foreground mb-6 opacity-10" />
                      <h3 className="text-2xl font-black mb-2">No results found</h3>
                      <p className="text-muted-foreground text-lg max-w-md mx-auto">
                        We couldn't find any services matching your current filters or
                        search query.
                      </p>
                      <Button
                        variant="link"
                        onClick={() => {
                          setFilterGroup("all");
                          toast.info("Filters cleared");
                        }}
                        className="mt-4 text-primary font-bold"
                      >
                        Clear all filters
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-12">
                      {Object.entries(groupedServices).map(
                        ([group, filteredGroupServices]) => (
                          <div key={group} className="space-y-6">
                            <div className="flex items-center gap-6">
                              <h2 className="text-2xl font-black tracking-tight">
                                {group}
                              </h2>
                              <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
                            </div>

                            <motion.div
                              layout
                              className={cn(
                                "grid gap-6",
                                viewMode === "grid"
                                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                                  : "grid-cols-1",
                              )}
                            >
                              {filteredGroupServices.map((s) => (
                                <ServiceCard
                                  key={s.id}
                                  service={s}
                                  viewMode={viewMode}
                                  isSelected={selectedIds.has(s.id)}
                                  onToggleSelect={() => toggleSelect(s.id)}
                                  onEdit={() => {
                                    setEditing(s.id);
                                    setFormData(s);
                                  }}
                                  onDelete={() => handleDelete(s.id)}
                                />
                              ))}
                            </motion.div>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </TabsContent>
              </motion.div>
            ) : (
              <motion.div
                key="users"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <TabsContent value="users" className="outline-none mt-0">
                  <div className="space-y-6">
                    <div className="bg-card p-6 rounded-2xl border shadow-sm mb-6">
                      <h2 className="text-2xl font-black mb-1">User Management</h2>
                      <p className="text-muted-foreground">
                        Approve or remove access for users on your instance.
                      </p>
                    </div>
                    <UserManagement
                      users={users}
                      loading={usersLoading}
                      onRefresh={refetchUsers}
                    />
                  </div>
                </TabsContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Tabs>
      </div>

      <ServiceDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        editingId={editing}
        formData={formData}
        setFormData={setFormData}
        groups={groups}
        onSave={handleSave}
      />
    </div>
  );
}

