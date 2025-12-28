import { Home, LayoutDashboard, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ModeToggle } from "./ModeToggle";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function FloatingNav() {
  const location = useLocation();
  const [isExtension, setIsExtension] = useState(false);
  const [serverUrl, setServerUrl] = useState("http://localhost:8080");
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    setIsExtension(window.location.protocol === "chrome-extension:");
    const savedUrl = localStorage.getItem("nexus_server_url");
    if (savedUrl) setServerUrl(savedUrl);
  }, []);

  const handleSaveSettings = () => {
    localStorage.setItem("nexus_server_url", serverUrl);
    setSettingsOpen(false);
    toast.success("Settings saved. Refreshing...");
    setTimeout(() => window.location.reload(), 1000);
  };

  const navItems = [
    { label: "Public", icon: Home, path: "/" },
    { label: "Admin", icon: LayoutDashboard, path: "/admin" },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <nav className="flex items-center gap-1 p-1 bg-background border rounded-full shadow-lg">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Tooltip key={item.path}>
              <TooltipTrigger asChild>
                <Link
                  to={item.path}
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className={cn(isActive ? "block" : "hidden sm:block")}>
                    {item.label}
                  </span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top">{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
        <div className="w-px h-4 bg-border mx-1" />
        
        {isExtension && (
          <>
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <button className="flex items-center justify-center p-2 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                      <Settings className="h-4 w-4" />
                    </button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">Settings</TooltipContent>
              </Tooltip>
              <DialogContent className="sm:max-w-[425px] rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Extension Settings</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="server-url">Nexus Server URL</Label>
                    <Input
                      id="server-url"
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      placeholder="http://nexus.local:8080"
                      className="rounded-xl"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      The full URL of your Nexus backend instance.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleSaveSettings} className="rounded-xl w-full">
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <div className="w-px h-4 bg-border mx-1" />
          </>
        )}

        <ModeToggle />
      </nav>
    </div>
  );
}
