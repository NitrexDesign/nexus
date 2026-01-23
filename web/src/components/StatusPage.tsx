import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import type { UptimeHistory } from "./UptimeView";

import { Card, CardContent } from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Loader2, Activity, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, useInView } from "framer-motion";
import { useRef, memo, useMemo, lazy, Suspense } from "react";
import { List, useDynamicRowHeight } from "react-window";
import type { CSSProperties } from "react";

interface Service {
  id: string;
  name: string;
  url: string;
  icon: string;
  group: string;
  check_health: boolean;
  health_status: string;
  last_checked: string;
}

interface StatusPageProps {
  search?: string;
}

// Lazy load the heavy UptimeView component
const LazyUptimeView = lazy(() =>
  import("./UptimeView").then((module) => ({ default: module.UptimeView })),
);

// Memoized service card to avoid unnecessary re‑renders
const LazyServiceCard = memo(
  ({
    service,
    index,
    bulkUptime,
  }: {
    service: Service;
    index: number;
    bulkUptime?: Record<string, UptimeHistory>;
  }) => {
    const ref = useRef(null);
    const isInView = useInView(ref, { once: true, margin: "200px" });

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={isInView ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.4, delay: Math.min(index * 0.05, 0.5) }}
        className="group"
      >
        <div className="flex items-center gap-4 mb-4 ml-1">
          <div className="size-12 rounded-2xl bg-muted/40 border-2 flex items-center justify-center p-2 group-hover:bg-primary/5 transition-colors">
            {service.icon ? (
              <img
                src={service.icon}
                alt=""
                className="size-full object-contain grayscale group-hover:grayscale-0 transition-all"
              />
            ) : (
              <Activity
                size={24}
                className="text-muted-foreground/40 group-hover:text-primary transition-colors"
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-black tracking-tight uppercase italic">
                {service.name}
              </h3>
              <Badge
                variant="outline"
                className={cn(
                  "px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2",
                  service.health_status === "online"
                    ? "bg-green-500/5 text-green-600 border-green-500/20"
                    : service.health_status === "offline"
                      ? "bg-red-500/5 text-red-600 border-red-500/20"
                      : "bg-neutral-500/5 text-neutral-600 border-neutral-500/20",
                )}
              >
                {service.health_status || "Unknown"}
              </Badge>
            </div>
            <p className="text-xs font-mono text-muted-foreground opacity-50 truncate mt-0.5">
              {service.url}
            </p>
          </div>
          <div className="hidden md:flex flex-col items-end text-right">
            <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-tighter">
              Last Ping
            </span>
            <span className="text-xs font-black italic">
              {service.last_checked
                ? new Date(service.last_checked).toLocaleTimeString()
                : "Never"}
            </span>
          </div>
        </div>

        <Card className="overflow-hidden border-2 group-hover:border-primary/20 transition-all duration-500 bg-background shadow-none relative min-h-[200px]">
          <CardContent className="py-8 px-8">
            {isInView ? (
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-[200px]">
                    <div className="size-10 rounded-full border-2 border-t-primary animate-spin opacity-20" />
                  </div>
                }
              >
                <LazyUptimeView
                  serviceId={service.id}
                  initialData={bulkUptime ? bulkUptime[service.id] : undefined}
                  showBoth
                />
              </Suspense>
            ) : (
              <div className="flex items-center justify-center h-[200px]">
                <div className="size-10 rounded-full border-2 border-t-primary animate-spin opacity-20" />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  },
);

// Row renderer for react‑window
const Row = memo(
  ({
    index,
    style,
    services,
    bulkUptime,
    ariaAttributes,
    observeRowElements,
  }: {
    index: number;
    style: CSSProperties;
    services: Service[];
    bulkUptime?: Record<string, UptimeHistory>;
    ariaAttributes: any;
    observeRowElements: (elements: Element[]) => () => void;
  }) => {
    const service = services[index];
    const rowRef = useRef<HTMLDivElement>(null);

    // Observe this element's size for dynamic height
    useInView(rowRef, {
      onEnter: (entry: any) => {
        if (entry.target) observeRowElements([entry.target]);
      },
    } as any);

    return (
      <div ref={rowRef} style={style} className="px-4 pb-8" {...ariaAttributes}>
        <LazyServiceCard
          service={service}
          index={index}
          bulkUptime={bulkUptime}
        />
      </div>
    );
  },
);

interface RowExtraProps {
  services: Service[];
  bulkUptime?: Record<string, UptimeHistory>;
  observeRowElements: (elements: Element[]) => () => void;
}

export function StatusPage({ search = "" }: StatusPageProps) {
  const { data: services, isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["services"],
    queryFn: async () => {
      const res = await apiFetch("/api/services");
      return res.json();
    },
    staleTime: 300000, // 5 min cache
    refetchOnWindowFocus: false,
  });

  const { data: bulkUptime, isLoading: uptimeLoading } = useQuery<
    Record<string, UptimeHistory>
  >({
    queryKey: ["uptime-bulk"],
    queryFn: async () => {
      const res = await apiFetch("/api/services/uptime");
      return res.json();
    },
    staleTime: 300000,
    refetchInterval: 300000, // refresh every 5 min
    refetchOnWindowFocus: false,
  });

  const monitoredServices = services?.filter((s) => s.check_health) || [];
  const filteredServices = useMemo(
    () =>
      monitoredServices.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.url.toLowerCase().includes(search.toLowerCase()) ||
          (s.group || "").toLowerCase().includes(search.toLowerCase()),
      ),
    [monitoredServices, search],
  );

  const DEFAULT_ITEM_HEIGHT = 300;
  const dynamicRowHeight = useDynamicRowHeight({
    defaultRowHeight: DEFAULT_ITEM_HEIGHT,
  });

  if (servicesLoading || uptimeLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
        <p className="text-muted-foreground animate-pulse font-medium">
          Crunching fleet metrics…
        </p>
      </div>
    );
  }

  const onlineCount = monitoredServices.filter(
    (s) => s.health_status === "online",
  ).length;
  const offlineCount = monitoredServices.filter(
    (s) => s.health_status === "offline",
  ).length;

  return (
    <div className="container mx-auto max-w-5xl py-12 px-4 space-y-12">
      <header className="space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
          <Activity size={14} />
          Fleet Monitoring
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter italic">
              NEXUS STATUS
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl font-medium leading-tight">
              Real-time health telemetry across the entire Nexus fleet.
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-background border-2 rounded-2xl px-8 py-5 flex flex-col items-center justify-center shadow-sm">
              <span className="text-4xl font-black text-green-500 tabular-nums leading-none">
                {onlineCount}
              </span>
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-2 opacity-60">
                Fleet Online
              </span>
            </div>
            {offlineCount > 0 && (
              <div className="bg-background border-2 border-red-500/20 rounded-2xl px-8 py-5 flex flex-col items-center justify-center shadow-sm">
                <span className="text-4xl font-black text-red-500 tabular-nums leading-none">
                  {offlineCount}
                </span>
                <span className="text-[10px] uppercase font-bold text-red-500 tracking-widest mt-2 opacity-60">
                  System Failures
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {filteredServices.length === 0 ? (
        <Card className="border-dashed py-20 bg-muted/20 border-2">
          <CardContent className="flex flex-col items-center justify-center gap-4">
            <ShieldCheck
              size={48}
              className="text-muted-foreground opacity-20"
            />
            <p className="text-muted-foreground font-medium">
              {search
                ? `No fleet components matching "${search}"`
                : "No services are currently being monitored."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <List<RowExtraProps>
          rowCount={filteredServices.length}
          rowHeight={dynamicRowHeight}
          rowProps={{
            services: filteredServices,
            bulkUptime,
            observeRowElements: dynamicRowHeight.observeRowElements,
          }}
          rowComponent={Row as any}
          style={{
            height: Math.min(DEFAULT_ITEM_HEIGHT * 3, window.innerHeight - 200),
            width: "100%",
          }}
        />
      )}

      <footer className="pt-12 border-t flex flex-col items-center gap-4 text-center">
        <Activity className="size-8 text-primary/20" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 max-w-lg">
          Telemetry resolution: 5 minutes • Data retention: 30 days • Latency
          source: primary_gateway
        </p>
      </footer>
    </div>
  );
}
