import { useState, useEffect, useRef } from "react";
import {
  Server,
  LayoutGrid,
  List as ListIcon,
  Loader2,
  Search,
  Settings,
  Plus,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { apiFetch, resolveUrl } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { UptimeView } from "./UptimeView";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { WidgetGrid } from "./widgets/WidgetGrid";
import { WidgetManager } from "./widgets/WidgetManager";
import { useWidgets, widgetRegistry } from "@/lib/widgets";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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

interface PublicDashboardProps {
  search: string;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.02,
      delayChildren: 0.05,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
  transition: { duration: 0.15 }
};

export function PublicDashboard({ search }: PublicDashboardProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">(
    (localStorage.getItem("public_view_mode") as "grid" | "list") || "grid",
  );
  const [showWidgetManager, setShowWidgetManager] = useState(false);
  const [draggedCategories, setDraggedCategories] = useState<string[]>([]);
  const servicesRef = useRef<HTMLDivElement>(null);

  const { 
    widgets, 
    addWidget, 
    setIsEditing, 
    isEditing, 
    categoryOrder, 
    reorderCategories, 
    isLoading,
    gridSettings,
    updateGridSettings
  } = useWidgets();

  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["services"],
    queryFn: async () => {
      const res = await apiFetch("/api/services");
      const data = await res.json();
      const isLoggedIn = !!localStorage.getItem("nexus_user");
      return data?.filter((s: Service) => {
        if (!s.public) return false;
        // If secured, only show if logged in
        if (s.auth_required && !isLoggedIn) return false;
        return true;
      }) || [];
    },
  });

  useEffect(() => {
    localStorage.setItem("public_view_mode", viewMode);
  }, [viewMode]);

  // Initialize dragged categories when dialog opens
  useEffect(() => {
    if (showWidgetManager) {
      const availableCategories = widgetRegistry.getCategories();
      const orderedCategories = categoryOrder.length > 0
        ? categoryOrder.filter(cat => availableCategories.includes(cat))
        : availableCategories;

      // Add any new categories that aren't in the order yet
      const newCategories = availableCategories.filter(cat => !orderedCategories.includes(cat));
      const finalOrder = [...orderedCategories, ...newCategories];

      setDraggedCategories(finalOrder);
    }
  }, [showWidgetManager, categoryOrder]);

  // Reset dragged categories when dialog closes
  useEffect(() => {
    if (!showWidgetManager) {
      setDraggedCategories([]);
    }
  }, [showWidgetManager]);

  // Scroll to services when searching
  useEffect(() => {
    if (search.trim() && servicesRef.current) {
      servicesRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }, [search]);

  const handleAddWidget = (widgetType: string) => {
    addWidget(widgetType);
    setShowWidgetManager(false);
  };

  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.group.toLowerCase().includes(search.toLowerCase()),
  );

  const groupedServices: Record<string, Service[]> = {};
  filteredServices.forEach((s) => {
    if (!groupedServices[s.group]) groupedServices[s.group] = [];
    groupedServices[s.group].push(s);
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-neutral-50/50 dark:bg-neutral-950 px-4 md:px-8 pb-16">
      <div className="container mx-auto py-12">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12"
        >
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight text-foreground">
              Welcome Home
            </h1>
            <p className="text-muted-foreground text-lg">
              Your personal command center.
            </p>
          </div>
          <div className="flex gap-2">
            <div className="flex border rounded-xl h-11 items-center overflow-hidden bg-card p-1 shadow-sm">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-lg h-full px-4"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4 mr-2" /> Grid
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="rounded-lg h-full px-4"
                onClick={() => setViewMode("list")}
              >
                <ListIcon className="h-4 w-4 mr-2" /> List
              </Button>
            </div>

            <div className="flex border rounded-xl h-11 items-center overflow-hidden bg-card p-1 shadow-sm">
              <Button
                variant={isEditing ? "secondary" : "ghost"}
                size="sm"
                className="rounded-lg h-full px-4"
                onClick={() => setIsEditing(!isEditing)}
              >
                <Settings className="h-4 w-4 mr-2" />
                {isEditing ? "Done" : "Edit"}
              </Button>
              <Dialog open={showWidgetManager} onOpenChange={setShowWidgetManager}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-lg h-full px-4"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Manage Widgets
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Widget Manager</DialogTitle>
                    <DialogDescription>
                      Add new widgets or manage existing ones.
                    </DialogDescription>
                  </DialogHeader>
                  <Tabs defaultValue="add" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="add">Add</TabsTrigger>
                      <TabsTrigger value="manage">Active</TabsTrigger>
                      <TabsTrigger value="categories">Categories</TabsTrigger>
                      <TabsTrigger value="grid">Grid</TabsTrigger>
                    </TabsList>
                    <TabsContent value="add" className="mt-4">
                      <div className="py-4 space-y-8">
                        {draggedCategories.map((category) => {
                          const categoryWidgets = widgetRegistry.getByCategory(category);
                          if (categoryWidgets.length === 0) return null;

                          return (
                            <div key={category} className="space-y-3">
                              <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground/60 px-1">
                                {category}
                              </h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {categoryWidgets.map((widget) => (
                                  <Button
                                    key={widget.id}
                                    variant="outline"
                                    className="justify-start h-auto p-4 rounded-2xl hover:border-primary/50 hover:bg-primary/5 transition-all group"
                                    onClick={() => handleAddWidget(widget.id)}
                                  >
                                    <div className="flex items-center gap-4">
                                      <span className="text-3xl group-hover:scale-110 transition-transform duration-150">{widget.icon}</span>
                                      <div className="text-left min-w-0">
                                        <div className="font-bold truncate">{widget.name}</div>
                                        <div className="text-xs text-muted-foreground line-clamp-1">
                                          {widget.description}
                                        </div>
                                      </div>
                                    </div>
                                  </Button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </TabsContent>
                    <TabsContent value="categories" className="mt-4">
                      <div className="py-4 space-y-6">
                        <div className="bg-muted/30 p-4 rounded-2xl border">
                          <p className="text-sm text-muted-foreground mb-4">
                            Drag to reorder how widget categories appear in the "Add" menu.
                          </p>
                          <Reorder.Group
                            axis="y"
                            values={draggedCategories}
                            onReorder={setDraggedCategories}
                            className="space-y-2"
                          >
                            {draggedCategories.map((category) => (
                              <Reorder.Item
                                key={category}
                                value={category}
                                className="bg-card rounded-xl p-3 border shadow-sm flex items-center gap-3 cursor-grab active:cursor-grabbing"
                              >
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                                <span className="font-bold text-sm uppercase tracking-wide">{category}</span>
                              </Reorder.Item>
                            ))}
                          </Reorder.Group>
                        </div>
                        <div className="flex justify-end pt-4 border-t">
                          <Button
                            variant="default"
                            className="rounded-xl px-8 font-bold"
                            onClick={async () => {
                              await reorderCategories(draggedCategories);
                              toast.success("Category order saved");
                            }}
                          >
                            Save Order
                          </Button>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="manage" className="mt-4">
                      <WidgetManager />
                    </TabsContent>
                    <TabsContent value="grid" className="mt-4">
                      <div className="space-y-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="grid-cols">Columns</Label>
                            <Input
                              id="grid-cols"
                              type="number"
                              min={1}
                              max={12}
                              value={gridSettings.cols}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateGridSettings(parseInt(e.target.value) || 1, gridSettings.rows)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="grid-rows">Rows</Label>
                            <Input
                              id="grid-rows"
                              type="number"
                              min={1}
                              max={20}
                              value={gridSettings.rows}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateGridSettings(gridSettings.cols, parseInt(e.target.value) || 1)}
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => {
                              const enabledWidgets = widgets.filter(w => w.enabled);
                              if (enabledWidgets.length === 0) {
                                updateGridSettings(1, 1);
                                return;
                              }
                              const minCols = Math.max(...enabledWidgets.map(w => w.position.x + w.position.width), 1);
                              const minRows = Math.max(...enabledWidgets.map(w => w.position.y + w.position.height), 1);
                              updateGridSettings(minCols, minRows);
                              toast.success(`Grid set to minimum: ${minCols}x${minRows}`);
                            }}
                          >
                            Set to Minimum Size
                          </Button>
                          <p className="text-xs text-muted-foreground text-center">
                            Shrinks the grid to fit all currently enabled widgets.
                          </p>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </motion.div>

        {/* Widgets Section - Hidden when searching */}
        <AnimatePresence>
          {!isLoading && widgets.length > 0 && !search.trim() && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20, transition: { duration: 0.15 } }}
              transition={{ duration: 0.2 }}
              className="mb-12"
            >
              <WidgetGrid className="mb-6" />
            </motion.div>
          )}
        </AnimatePresence>

        {servicesLoading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="relative">
              <Loader2 className="animate-spin h-12 w-12 text-primary" />
              <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
            </div>
            <p className="text-muted-foreground mt-6 text-xl font-medium">
              Powering up your services...
            </p>
          </div>
        ) : filteredServices.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            className="text-center py-32 border-2 border-dashed rounded-3xl bg-card/50"
          >
            <Search className="mx-auto h-20 w-20 text-muted-foreground mb-6 opacity-10" />
            <h3 className="text-2xl font-black mb-2">No results found</h3>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              We couldn't find any services matching your search query.
            </p>
          </motion.div>
        ) : search.trim() ? (
          // Flat list view when searching
          <div ref={servicesRef} className="space-y-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-6"
            >
              <h2 className="text-xl font-bold text-muted-foreground">
                Search Results ({filteredServices.length})
              </h2>
            </motion.div>
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className={cn(
                "grid gap-4",
                viewMode === "grid"
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  : "grid-cols-1",
              )}
            >
              {filteredServices.map((s) => (
                <motion.div
                  key={s.id}
                  variants={item}
                  layout
                  onClick={() => window.open(s.url, s.new_tab ? "_blank" : "_self")}
                  className="block group cursor-pointer"
                >
                  <Card
                    className={cn(
                      "h-full transition-all duration-150 p-0 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/50 overflow-hidden",
                      viewMode === "list" &&
                        "hover:translate-x-1",
                      viewMode === "grid" && "hover:-translate-y-1"
                    )}
                  >
                    <CardContent
                      className={cn(
                        "p-5 h-auto flex flex-row gap-4",
                        viewMode === "list" &&
                          "p-3 flex items-center gap-6",
                      )}
                    >
                      <div
                        className={cn(
                          "rounded-2xl border bg-muted/30 flex flex-row items-center justify-center relative overflow-hidden transition-colors group-hover:bg-primary/5 group-hover:border-primary/20",
                          viewMode === "grid" ? "size-16 mb-2" : "size-14",
                        )}
                      >
                      {s.icon && (
                        <div
                          className="absolute inset-0 opacity-10 blur-xl scale-150 transition-transform duration-150 group-hover:scale-[2]"
                          style={{
                            backgroundImage: `url(${resolveUrl(s.icon)})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }}
                        />
                      )}
                      {s.icon ? (
                        <img
                          src={resolveUrl(s.icon)}
                          alt={s.name}
                          className="relative z-10 max-w-[65%] max-h-[65%] object-contain drop-shadow-md transition-transform duration-150 group-hover:scale-110"
                        />
                      ) : (
                          <Server
                            size={viewMode === "grid" ? 32 : 24}
                            className="relative z-10 text-muted-foreground"
                          />
                        )}
                      </div>

                      <div className="min-h-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">
                            {s.name}
                          </h3>
                          {s.auth_required && (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-4 py-0 px-1 border-primary/20 text-primary bg-primary/5"
                            >
                              Auth
                            </Badge>
                          )}
                          <Badge
                            variant="secondary"
                            className="text-[10px] h-4 py-0 px-1"
                          >
                            {s.group}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground truncate opacity-70 group-hover:opacity-100 transition-opacity">
                            {s.url.replace(/^https?:\/\//, "")}
                          </p>
                          {s.check_health && (
                            <div
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            >
                              <Dialog>
                                <DialogTrigger asChild>
                                  <div
                                    className={cn(
                                      "size-3 rounded-full cursor-pointer hover:scale-125 transition-all duration-150 ring-offset-background ring-2 ring-transparent hover:ring-primary/20",
                                      s.health_status === "online" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" :
                                      s.health_status === "offline" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" :
                                      "bg-neutral-300 dark:bg-neutral-700"
                                    )}
                                    title={s.health_status ? `Status: ${s.health_status} (Click for history)` : "Status: unknown (Click for history)"}
                                  />
                                </DialogTrigger>
                                <DialogContent
                                  className="sm:max-w-[425px] rounded-3xl"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <DialogHeader>
                                    <DialogTitle className="text-2xl font-black">{s.name} Uptime</DialogTitle>
                                    <DialogDescription>Historic performance for the last 30 days.</DialogDescription>
                                  </DialogHeader>
                                  <UptimeView serviceId={s.id} />
                                </DialogContent>
                              </Dialog>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          </div>
        ) : (
          // Grouped view when not searching
          <div ref={servicesRef} className="space-y-16">
            <AnimatePresence mode="popLayout">
              {Object.entries(groupedServices).map(([group, groupServices]) => (
                <motion.section
                  key={group}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-6">
                    <h2 className="text-2xl font-black tracking-tight">
                      {group}
                    </h2>
                    <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
                  </div>
                  <motion.div
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className={cn(
                      "grid gap-4",
                      viewMode === "grid"
                        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                        : "grid-cols-1",
                    )}
                  >
                    {groupServices.map((s) => (
                      <motion.div
                        key={s.id}
                        variants={item}
                        layout
                        onClick={() => window.open(s.url, s.new_tab ? "_blank" : "_self")}
                        className="block group cursor-pointer"
                      >
                        <Card
                          className={cn(
                            "h-full transition-all duration-150 p-0 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/50 overflow-hidden",
                            viewMode === "list" &&
                              "hover:translate-x-1",
                            viewMode === "grid" && "hover:-translate-y-1"
                          )}
                        >
                          <CardContent
                            className={cn(
                              "p-5 h-auto flex flex-row gap-4",
                              viewMode === "list" &&
                                "p-3 flex items-center gap-6",
                            )}
                          >
                            <div
                              className={cn(
                                "rounded-2xl border bg-muted/30 flex flex-row items-center justify-center relative overflow-hidden transition-colors group-hover:bg-primary/5 group-hover:border-primary/20",
                                viewMode === "grid" ? "size-16 mb-2" : "size-14",
                              )}
                            >
                            {s.icon && (
                              <div
                                className="absolute inset-0 opacity-10 blur-xl scale-150 transition-transform duration-150 group-hover:scale-[2]"
                                style={{
                                  backgroundImage: `url(${resolveUrl(s.icon)})`,
                                  backgroundSize: "cover",
                                  backgroundPosition: "center",
                                }}
                              />
                            )}
                            {s.icon ? (
                              <img
                                src={resolveUrl(s.icon)}
                                alt={s.name}
                                className="relative z-10 max-w-[65%] max-h-[65%] object-contain drop-shadow-md transition-transform duration-150 group-hover:scale-110"
                              />
                            ) : (
                                <Server
                                  size={viewMode === "grid" ? 32 : 24}
                                  className="relative z-10 text-muted-foreground"
                                />
                              )}
                            </div>

                            <div className="min-h-0 flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">
                                  {s.name}
                                </h3>
                                {s.auth_required && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] h-4 py-0 px-1 border-primary/20 text-primary bg-primary/5"
                                  >
                                    Auth
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm text-muted-foreground truncate opacity-70 group-hover:opacity-100 transition-opacity">
                                  {s.url.replace(/^https?:\/\//, "")}
                                </p>
                                {s.check_health && (
                                  <div
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }}
                                  >
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <div
                                          className={cn(
                                            "size-3 rounded-full cursor-pointer hover:scale-125 transition-all duration-150 ring-offset-background ring-2 ring-transparent hover:ring-primary/20",
                                            s.health_status === "online" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" :
                                            s.health_status === "offline" ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" :
                                            "bg-neutral-300 dark:bg-neutral-700"
                                          )}
                                          title={s.health_status ? `Status: ${s.health_status} (Click for history)` : "Status: unknown (Click for history)"}
                                        />
                                      </DialogTrigger>
                                      <DialogContent
                                        className="sm:max-w-[425px] rounded-3xl"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <DialogHeader>
                                          <DialogTitle className="text-2xl font-black">{s.name} Uptime</DialogTitle>
                                          <DialogDescription>Historic performance for the last 30 days.</DialogDescription>
                                        </DialogHeader>
                                        <UptimeView serviceId={s.id} />
                                      </DialogContent>
                                    </Dialog>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </motion.div>
                </motion.section>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

