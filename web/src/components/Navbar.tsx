import { Link } from "react-router-dom";
import {
  Server,
  Search,
  LogIn,
  LogOut,
  LayoutGrid,
  List as ListIcon,
  User,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavbarProps {
  user?: {
    username: string;
    display_name?: string;
  } | null;
  onLogout?: () => void;
  search?: string;
  onSearchChange?: (val: string) => void;
  viewMode?: "grid" | "list";
  onViewModeChange?: (mode: "grid" | "list") => void;
}

export function Navbar({
  user,
  onLogout,
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
}: NavbarProps) {
  return (
    <header className="border-b sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-8">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="bg-primary/10 p-2 rounded-lg group-hover:bg-primary/20 transition-colors">
            <Server className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold text-xl tracking-tight">Nexus</span>
        </Link>

        <div className="flex-1 max-w-md mx-6 hidden md:block">
          {onSearchChange !== undefined && (
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                type="search"
                placeholder="Search everything..."
                className="pl-10 bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary h-10 w-full"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {onViewModeChange && (
            <div className="hidden sm:flex border rounded-lg overflow-hidden bg-muted/30 p-1">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0 rounded-md"
                onClick={() => onViewModeChange("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 w-8 p-0 rounded-md"
                onClick={() => onViewModeChange("list")}
              >
                <ListIcon className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full bg-muted/50 p-0 hover:bg-muted transition-colors"
                >
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.display_name || user.username}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.username}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/admin" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Admin Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive cursor-pointer"
                  onClick={onLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  variant="default"
                  size="sm"
                  className="shadow-sm"
                >
                  <Link to="/auth">
                    <LogIn className="mr-2 h-4 w-4" />
                    Login
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Admin Portal</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </header>
  );
}
