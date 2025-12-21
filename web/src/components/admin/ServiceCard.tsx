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
import { Server, Edit2, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface Service {
  id: string;
  name: string;
  url: string;
  icon: string;
  group: string;
  order: number;
  public: boolean;
  auth_required: boolean;
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
    <Card className={"p-0" + cn(isSelected && " border-primary")}>
      <CardContent
        className={cn(
          "p-4",
          viewMode === "list" && "flex items-center gap-4 p-3",
        )}
      >
        {viewMode === "grid" && (
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <div className="size-12 rounded border flex items-center justify-center relative overflow-hidden bg-muted group/logo">
                {s.icon && (
                  <div
                    className="absolute inset-0 opacity-20 blur-md scale-150 transition-transform group-hover/logo:scale-[2]"
                    style={{
                      backgroundImage: `url(${s.icon})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }}
                  />
                )}
                {s.icon ? (
                  <img
                    src={s.icon}
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
              <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} />
            </div>

            <div>
              <h3 className="font-bold truncate">{s.name}</h3>
              <p className="text-xs text-muted-foreground truncate">{s.url}</p>
            </div>

            <div className="flex gap-2">
              {s.public && <Badge variant="outline">Public</Badge>}
              {s.auth_required && <Badge variant="outline">Secured</Badge>}
            </div>

            <div className="flex gap-2">
              <Button
                className="flex-1"
                variant="outline"
                size="sm"
                onClick={onEdit}
              >
                <Edit2 size={14} className="mr-1" /> Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <MoreVertical size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => window.open(s.url, "_blank")}
                  >
                    Launch
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive"
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
            <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} />
            <div className="size-10 rounded border flex items-center justify-center relative overflow-hidden bg-muted group/logo">
              {s.icon && (
                <div
                  className="absolute inset-0 opacity-20 blur-md scale-150 transition-transform group-hover/logo:scale-[2]"
                  style={{
                    backgroundImage: `url(${s.icon})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
              )}
              {s.icon ? (
                <img
                  src={s.icon}
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
              <div className="font-bold truncate">{s.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {s.url}
              </div>
            </div>
            <div className="flex gap-2">
              {s.public && (
                <Badge variant="outline" className="hidden sm:inline-flex">
                  Public
                </Badge>
              )}
              {s.auth_required && (
                <Badge variant="outline" className="hidden sm:inline-flex">
                  Secured
                </Badge>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={onEdit}
              >
                <Edit2 size={14} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-destructive"
                onClick={onDelete}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Re-using Trash2 from lucide-react in the list mode
import { Trash2 } from "lucide-react";
