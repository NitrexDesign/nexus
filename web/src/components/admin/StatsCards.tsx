import { Card, CardContent } from "@/components/ui/card";
import { Server, Globe, ShieldCheck, LayoutGrid } from "lucide-react";

interface StatsProps {
  total: number;
  publicCount: number;
  authCount: number;
  groupCount: number;
}

export function StatsCards({
  total,
  publicCount,
  authCount,
  groupCount,
}: StatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Server className="h-4 w-4" />
            <span className="text-sm font-medium">Total Services</span>
          </div>
          <div className="text-2xl font-bold">{total}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Globe className="h-4 w-4" />
            <span className="text-sm font-medium">Public</span>
          </div>
          <div className="text-2xl font-bold">{publicCount}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-sm font-medium">Secured</span>
          </div>
          <div className="text-2xl font-bold">{authCount}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <LayoutGrid className="h-4 w-4" />
            <span className="text-sm font-medium">Groups</span>
          </div>
          <div className="text-2xl font-bold">{groupCount}</div>
        </CardContent>
      </Card>
    </div>
  );
}
