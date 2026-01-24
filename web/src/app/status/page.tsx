"use client";

import dynamic from "next/dynamic";
import { Navbar } from "@/components/Navbar";
import { FloatingNav } from "@/components/FloatingNav";
import { useState, useEffect } from "react";

const StatusPage = dynamic(
  () => import("@/components/StatusPage").then((m) => m.StatusPage),
  { ssr: false },
);

interface User {
  username: string;
  display_name?: string;
  id?: string;
}

export default function StatusPageRoute() {
  const [user, setUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedUser = localStorage.getItem("nexus_user");
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      if (parsedUser.id) {
        localStorage.setItem("userId", parsedUser.id);
      }
    }
  }, []);

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("nexus_user");
    localStorage.removeItem("userId");
  };

  if (!mounted) {
    return null;
  }

  return (
    <>
      <Navbar
        user={user}
        onLogout={handleLogout}
        search={search}
        onSearchChange={setSearch}
      />
      <StatusPage search={search} />
      <FloatingNav />
    </>
  );
}
