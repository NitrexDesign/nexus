import { useState, useEffect } from "react";
import {
  Server,
  LayoutGrid,
  List as ListIcon,
  Loader2,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface PublicDashboardProps {
  search: string;
}

export function PublicDashboard({ search }: PublicDashboardProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">(
    (localStorage.getItem("public_view_mode") as "grid" | "list") || "grid",
  );

  useEffect(() => {
    fetch("/api/services")
      .then((res) => res.json())
      .then((data) => {
        const isLoggedIn = !!localStorage.getItem("nexus_user");
        const publicServices =
          data?.filter((s: Service) => {
            if (!s.public) return false;
            // If secured, only show if logged in
            if (s.auth_required && !isLoggedIn) return false;
            return true;
          }) || [];
        setServices(publicServices);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    localStorage.setItem("public_view_mode", viewMode);
  }, [viewMode]);

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="space-y-1">
            <h1 className="text-4xl font-black tracking-tight text-foreground">
              Welcome Home
            </h1>
            <p className="text-muted-foreground text-lg">
              Your personal command center.
            </p>
          </div>
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
        </div>

        {loading ? (
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
          <div className="text-center py-32 border-2 border-dashed rounded-3xl bg-card/50">
            <Search className="mx-auto h-20 w-20 text-muted-foreground mb-6 opacity-10" />
            <h3 className="text-2xl font-black mb-2">No results found</h3>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              We couldn't find any services matching your search query.
            </p>
          </div>
        ) : (
          <div className="space-y-16">
            {Object.entries(groupedServices).map(([group, groupServices]) => (
              <section key={group} className="space-y-8">
                <div className="flex items-center gap-6">
                  <h2 className="text-2xl font-black tracking-tight">
                    {group}
                  </h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
                </div>
                <div
                  className={cn(
                    "grid gap-6",
                    viewMode === "grid"
                      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                      : "grid-cols-1",
                  )}
                >
                  {groupServices.map((s) => (
                    <a
                      key={s.id}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block group"
                    >
                      <Card
                        className={cn(
                          "h-full transition-all duration-300 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1 overflow-hidden",
                          viewMode === "list" &&
                            "hover:translate-x-1 hover:-translate-y-0",
                        )}
                      >
                        <CardContent
                          className={cn(
                            "p-6 h-full",
                            viewMode === "list" &&
                              "flex items-center gap-6 p-4",
                          )}
                        >
                          <div
                            className={cn(
                              "rounded-2xl border bg-muted/30 flex items-center justify-center relative overflow-hidden transition-colors group-hover:bg-muted/50",
                              viewMode === "grid" ? "size-16 mb-6" : "size-14",
                            )}
                          >
                            {s.icon && (
                              <div
                                className="absolute inset-0 opacity-10 blur-xl scale-150 transition-transform group-hover:scale-[2]"
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
                                className="relative z-10 max-w-[65%] max-h-[65%] object-contain drop-shadow-md transition-transform group-hover:scale-110"
                              />
                            ) : (
                              <Server
                                size={viewMode === "grid" ? 32 : 24}
                                className="relative z-10 text-muted-foreground"
                              />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
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
                            <p className="text-sm text-muted-foreground truncate opacity-70 group-hover:opacity-100 transition-opacity">
                              {s.url.replace(/^https?:\/\//, "")}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </a>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
