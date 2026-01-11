"use client";

import dynamic from "next/dynamic";
import { Navbar } from "@/components/Navbar";
import { FloatingNav } from "@/components/FloatingNav";
import { useState, useEffect } from "react";
import { WidgetProvider } from "@/lib/widgets";
// Import to register widgets
import "@/lib/widgets";

const PublicDashboard = dynamic(
  () => import("@/components/PublicDashboard").then((m) => m.PublicDashboard),
  { ssr: false },
);

interface User {
  username: string;
  display_name?: string;
  id?: string;
}

export default function Page() {
  const [user, setUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedUser = localStorage.getItem("nexus_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("nexus_user");
  };

  if (!mounted) {
    return null;
  }

  return (
    <WidgetProvider>
      <Navbar
        user={user}
        onLogout={handleLogout}
        search={search}
        onSearchChange={setSearch}
      />
      <PublicDashboard search={search} />
      <FloatingNav />
    </WidgetProvider>
  );
}
