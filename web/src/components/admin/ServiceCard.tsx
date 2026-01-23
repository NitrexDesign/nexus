import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Server, Edit2, MoreVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { resolveUrl } from "@/lib/api-client";
import { UptimeView } from "../UptimeView";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";

interface Service {
  id: string;
  name: string;
  url: string;
  icon: string;
  group: string;
  order: number;
  public: boolean;
  authRequired: boolean;
  newTab: boolean;
  checkHealth: boolean;
  healthStatus?: string;
  lastChecked?: string;
}

interface ServiceCardProps {
  service: Service;
  viewMode: "grid" | "list";
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ServiceCard({
  service: s,
  viewMode,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
}: ServiceCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      whileHover={{
        y: viewMode === "grid" ? -4 : 0,
        x: viewMode === "list" ? 4 : 0,
      }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "p-0 transition-colors",
          isSelected && "border-primary bg-primary/5",
        )}
      >
        <CardContent
          className={cn(
            "p-4",
            viewMode === "list" && "flex items-center gap-4 p-3",
          )}
        >
          {viewMode === "grid" && (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div className="size-12 rounded-xl border flex items-center justify-center relative overflow-hidden bg-muted group/logo">
                  {s.icon && (
                    <div
                      className="absolute inset-0 opacity-20 blur-md scale-150 transition-transform group-hover/logo:scale-[2]"
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
                      className="relative z-10 max-w-[70%] max-h-[70%] object-contain drop-shadow-sm"
                    />
                  ) : (
                    <Server
                      size={24}
                      className="relative z-10 text-muted-foreground"
                    />
                  )}
                </div>
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={onToggleSelect}
                  className="rounded-md"
                />
              </div>

              <div>
                <h3 className="font-bold truncate text-foreground">{s.name}</h3>
                <p className="text-xs text-muted-foreground truncate opacity-70">
                  {s.url}
                </p>
              </div>

              <div className="flex gap-2">
                {s.public && (
                  <Badge
                    variant="secondary"
                    className="bg-green-500/10 text-green-600 border-green-500/20"
                  >
                    Public
                  </Badge>
                )}
                {s.authRequired && (
                  <Badge
                    variant="secondary"
                    className="bg-blue-500/10 text-blue-600 border-blue-500/20"
                  >
                    Secured
                  </Badge>
                )}
                {s.checkHealth && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "border-transparent cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors",
                          s.healthStatus === "online"
                            ? "bg-green-500/10 text-green-600 border-green-500/20"
                            : s.healthStatus === "offline"
                              ? "bg-red-500/10 text-red-600 border-red-500/20"
                              : "bg-neutral-500/10 text-neutral-600 border-neutral-500/20",
                        )}
                      >
                        {s.healthStatus || "Unknown"}
                      </Badge>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] rounded-3xl">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-black">
                          {s.name} Uptime
                        </DialogTitle>
                        <DialogDescription>
                          Historic performance for the last 30 days.
                        </DialogDescription>
                      </DialogHeader>
                      <UptimeView serviceId={s.id} />
                    </DialogContent>
                  </Dialog>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button
                  className="flex-1 rounded-lg"
                  variant="outline"
                  size="sm"
                  onClick={onEdit}
                >
                  <Edit2 size={14} className="mr-2" /> Edit
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-lg"
                    >
                      <MoreVertical size={14} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="rounded-xl">
                    <DropdownMenuItem
                      onClick={() =>
                        window.open(s.url, s.newTab ? "_blank" : "_self")
                      }
                      className="cursor-pointer"
                    >
                      Launch Service
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive cursor-pointer"
                      onClick={onDelete}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}

          {viewMode === "list" && (
            <div className="flex items-center gap-4 w-full">
              <Checkbox
                checked={isSelected}
                onCheckedChange={onToggleSelect}
                className="rounded-md"
              />
              <div className="size-10 rounded-lg border flex items-center justify-center relative overflow-hidden bg-muted group/logo">
                {s.icon && (
                  <div
                    className="absolute inset-0 opacity-20 blur-md scale-150 transition-transform group-hover/logo:scale-[2]"
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
                    className="relative z-10 max-w-[70%] max-h-[70%] object-contain drop-shadow-sm"
                  />
                ) : (
                  <Server
                    size={18}
                    className="relative z-10 text-muted-foreground"
                  />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="font-bold truncate text-foreground">
                  {s.name}
                </div>
                <div className="text-xs text-muted-foreground truncate opacity-70">
                  {s.url}
                </div>
              </div>
              <div className="flex gap-3 items-center">
                <div className="hidden md:flex gap-2">
                  {s.public && (
                    <Badge
                      variant="secondary"
                      className="bg-green-500/10 text-green-600 border-green-500/20"
                    >
                      Public
                    </Badge>
                  )}
                  {s.authRequired && (
                    <Badge
                      variant="secondary"
                      className="bg-blue-500/10 text-blue-600 border-blue-500/20"
                    >
                      Secured
                    </Badge>
                  )}
                </div>
                {s.checkHealth && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <div
                        className={cn(
                          "size-2.5 rounded-full cursor-pointer hover:scale-125 transition-transform",
                          s.healthStatus === "online"
                            ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                            : s.healthStatus === "offline"
                              ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"
                              : "bg-neutral-300 dark:bg-neutral-700",
                        )}
                        title={
                          s.healthStatus
                            ? `Status: ${s.healthStatus} (Click for history)`
                            : "Status: unknown (Click for history)"
                        }
                      />
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px] rounded-3xl">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-black">
                          {s.name} Uptime
                        </DialogTitle>
                        <DialogDescription>
                          Historic performance for the last 30 days.
                        </DialogDescription>
                      </DialogHeader>
                      <UptimeView serviceId={s.id} />
                    </DialogContent>
                  </Dialog>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 rounded-lg"
                  onClick={onEdit}
                >
                  <Edit2 size={14} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-9 w-9 rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
