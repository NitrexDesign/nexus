import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Loader2, Search, ChevronsUpDown, Check, Plus, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import { Checkbox } from "@/components/ui/checkbox";

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
}

interface ServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: string | "new" | null;
  formData: Partial<Service>;
  setFormData: (data: Partial<Service>) => void;
  groups: string[];
  onSave: (id?: string) => Promise<void>;
}

export function ServiceDialog({
  open,
  onOpenChange,
  editingId,
  formData,
  setFormData,
  groups,
  onSave,
}: ServiceDialogProps) {
  const [groupPopoverOpen, setGroupPopoverOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [foundIcons, setFoundIcons] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const searchIcons = async () => {
    if (!formData.url) return;
    setIsSearching(true);
    try {
      const res = await apiFetch(
        `/api/icons/search?url=${encodeURIComponent(formData.url)}`,
      );
      const data = await res.json();
      setFoundIcons(data || []);
    } catch (err) {
      toast.error("Failed to find icons");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectRemoteIcon = async (url: string) => {
    setIsDownloading(true);
    try {
      const res = await apiFetch("/api/icons/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      setFormData({ ...formData, icon: data.path });
      toast.success("Icon downloaded and set");
    } catch (err) {
      toast.error("Failed to download icon");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingId === "new" ? "Add Service" : "Edit Service"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Service Name</Label>
              <Input
                value={formData.name || ""}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g. Plex"
              />
            </div>
            <div className="grid gap-2">
              <Label>Group / Category</Label>
              <Popover open={groupPopoverOpen} onOpenChange={setGroupPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="justify-between font-normal"
                  >
                    <span className="truncate">{formData.group || "Select..."}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search..."
                      value={searchValue}
                      onValueChange={setSearchValue}
                    />
                    <CommandList>
                      <CommandEmpty>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-xs"
                          onClick={() => {
                            setFormData({ ...formData, group: searchValue });
                            setGroupPopoverOpen(false);
                          }}
                        >
                          <Plus className="mr-2 h-3 w-3" /> Create "{searchValue}"
                        </Button>
                      </CommandEmpty>
                      <CommandGroup>
                        {groups.map((g) => (
                          <CommandItem
                            key={g}
                            value={g}
                            onSelect={(val) => {
                              setFormData({ ...formData, group: val });
                              setGroupPopoverOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4 text-primary",
                                formData.group === g
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
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Service URL</Label>
            <div className="flex gap-2">
              <Input
                value={formData.url || ""}
                onChange={(e) =>
                  setFormData({ ...formData, url: e.target.value })
                }
                placeholder="https://..."
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={searchIcons}
                disabled={isSearching || !formData.url}
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {foundIcons.length > 0 && (
            <div className="grid grid-cols-5 gap-2 border p-2 rounded-lg bg-muted/30">
              {foundIcons.slice(0, 5).map((icon, i) => (
                <button
                  key={i}
                  className="aspect-square rounded-md border bg-background hover:border-primary flex items-center justify-center p-1 transition-all hover:scale-105"
                  onClick={() => handleSelectRemoteIcon(icon)}
                >
                  <img
                    src={icon}
                    alt={`Icon ${i}`}
                    className="max-w-full max-h-full object-contain"
                  />
                </button>
              ))}
            </div>
          )}

          <div className="grid gap-2">
            <Label>Icon Path / URL</Label>
            <Input
              value={formData.icon || ""}
              onChange={(e) =>
                setFormData({ ...formData, icon: e.target.value })
              }
              placeholder="/icons/..."
            />
          </div>

          <div className="grid gap-3">
            <Label>Visibility & Access</Label>
            <RadioGroup
              value={
                formData.public
                  ? formData.auth_required
                    ? "secured"
                    : "public"
                  : "private"
              }
              onValueChange={(val) => {
                if (val === "public")
                  setFormData({
                    ...formData,
                    public: true,
                    auth_required: false,
                  });
                if (val === "secured")
                  setFormData({
                    ...formData,
                    public: true,
                    auth_required: true,
                  });
                if (val === "private")
                  setFormData({
                    ...formData,
                    public: false,
                    auth_required: true,
                  });
              }}
              className="grid grid-cols-3 gap-2"
            >
              <div
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border p-2 hover:bg-muted/30 transition-colors cursor-pointer text-center gap-1",
                  (formData.public && !formData.auth_required) && "border-primary bg-primary/5"
                )}
                onClick={() =>
                  setFormData({
                    ...formData,
                    public: true,
                    auth_required: false,
                  })
                }
              >
                <RadioGroupItem value="public" id="public" className="sr-only" />
                <Label htmlFor="public" className="font-bold cursor-pointer text-xs">
                  Public
                </Label>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  No login
                </span>
              </div>
              <div
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border p-2 hover:bg-muted/30 transition-colors cursor-pointer text-center gap-1",
                  (formData.public && formData.auth_required) && "border-primary bg-primary/5"
                )}
                onClick={() =>
                  setFormData({
                    ...formData,
                    public: true,
                    auth_required: true,
                  })
                }
              >
                <RadioGroupItem value="secured" id="secured" className="sr-only" />
                <Label htmlFor="secured" className="font-bold cursor-pointer text-xs">
                  Secured
                </Label>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  Requires login
                </span>
              </div>
              <div
                className={cn(
                  "flex flex-col items-center justify-center rounded-lg border p-2 hover:bg-muted/30 transition-colors cursor-pointer text-center gap-1",
                  (!formData.public) && "border-primary bg-primary/5"
                )}
                onClick={() =>
                  setFormData({
                    ...formData,
                    public: false,
                    auth_required: true,
                  })
                }
              >
                <RadioGroupItem value="private" id="private" className="sr-only" />
                <Label htmlFor="private" className="font-bold cursor-pointer text-xs">
                  Private
                </Label>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  Admin only
                </span>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => setFormData({ ...formData, new_tab: !formData.new_tab })}>
            <Checkbox
              id="new_tab"
              checked={formData.new_tab !== false}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, new_tab: checked === true })
              }
            />
            <div className="flex-1 cursor-pointer">
              <Label htmlFor="new_tab" className="font-bold flex items-center gap-2 cursor-pointer text-sm">
                Open in new tab <ExternalLink size={14} className="opacity-50" />
              </Label>
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSave(editingId === "new" ? undefined : (editingId ?? undefined))
            }
            disabled={isDownloading}
          >
            {isDownloading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editingId === "new" ? "Create" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
