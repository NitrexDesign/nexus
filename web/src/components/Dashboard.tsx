import { useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExternalLink, Search, Server, Settings, LogOut } from "lucide-react";

interface Service {
  id: string;
  name: string;
  url: string;
  description: string;
  icon: any;
  status: "online" | "offline";  new_tab: boolean;
}

const MOCK_SERVICES: Service[] = [
  {
    id: "1",
    name: "Plex",
    url: "http://plex:32400",
    description: "Media Server",
    icon: Server,
    status: "online",
  },
  {
    id: "2",
    name: "Home Assistant",
    url: "http://hass:8123",
    description: "Smart Home",
    icon: Settings,
    status: "online",
  },
  {
    id: "3",
    name: "Pi-hole",
    url: "http://pihole",
    description: "Network Ad-blocker",
    icon: Server,
    status: "online",
  },
  {
    id: "4",
    name: "Nextcloud",
    url: "http://nextcloud",
    description: "File Storage",
    icon: ExternalLink,
    status: "offline",
  },
];

interface DashboardProps {
  user: any;
  onLogout: () => void;
}

export function Dashboard({ user, onLogout }: DashboardProps) {
  const [search, setSearch] = useState("");

  const filteredServices = MOCK_SERVICES.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground p-2 rounded-lg">
            <Server size={24} />
          </div>
          <h1 className="text-xl font-bold">Nexus</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground italic">
            Welcome, {user.username}
          </span>
          <Button variant="ghost" size="icon" onClick={onLogout}>
            <LogOut size={20} />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <div className="relative w-full md:w-96">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              size={18}
            />
            <Input
              placeholder="Search services..."
              className="pl-10 h-11"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredServices.map((service) => (
            <a
              href={service.url}
              target={service.new_tab ? "_blank" : "_self"}
              rel="noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <Card
                key={service.id}
                className="group hover:border-primary transition-all duration-300"
              >
                <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                  <div
                    className={`p-3 rounded-xl ${service.status === "online" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}
                  >
                    <service.icon size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg truncate">
                      {service.name}
                    </CardTitle>
                    <CardDescription className="truncate">
                      {service.description}
                    </CardDescription>
                  </div>
                  <ExternalLink size={18} />
                </CardHeader>
              </Card>
            </a>
          ))}
        </div>
      </main>
    </div>
  );
}
