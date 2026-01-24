"use client";

import dynamic from "next/dynamic";
import { Navbar } from "@/components/Navbar";
import { FloatingNav } from "@/components/FloatingNav";
import { useState, useEffect } from "react";

const ProfilePage = dynamic(
  () => import("@/components/ProfilePage").then((m) => m.ProfilePage),
  { ssr: false },
);

interface User {
  username: string;
  display_name?: string;
  id?: string;
}

export default function Profile() {
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
    localStorage.removeItem("nexus_user");
    localStorage.removeItem("userId");
    setUser(null);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen">
      <Navbar
        user={user}
        search={search}
        onSearchChange={setSearch}
        onLogout={handleLogout}
      />
      <FloatingNav user={user} onLogout={handleLogout} />
      <div className="container mx-auto px-4 pt-20">
        <ProfilePage />
      </div>
    </div>
  );
}
