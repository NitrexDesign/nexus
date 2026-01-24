"use client";

import dynamic from "next/dynamic";
import { Navbar } from "@/components/Navbar";
import { FloatingNav } from "@/components/FloatingNav";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const AdminDashboard = dynamic(
  () => import("@/components/AdminDashboard").then((m) => m.AdminDashboard),
  { ssr: false },
);
const Auth = dynamic(() => import("@/components/Auth").then((m) => m.Auth), {
  ssr: false,
});

interface User {
  username: string;
  display_name?: string;
  id?: string;
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [search, setSearch] = useState("");
  const router = useRouter();
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

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem("nexus_user", JSON.stringify(u));
    if (u.id) {
      localStorage.setItem("userId", u.id);
    }
    router.push("/admin");
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("nexus_user");
    localStorage.removeItem("userId");
    router.push("/");
  };

  if (!mounted) {
    return null;
  }

  if (!user) {
    return (
      <>
        <Navbar
          user={null}
          onLogout={() => {}}
          search={search}
          onSearchChange={setSearch}
        />
        <Auth onLogin={handleLogin} />
        <FloatingNav />
      </>
    );
  }

  return (
    <>
      <Navbar
        user={user}
        onLogout={handleLogout}
        search={search}
        onSearchChange={setSearch}
      />
      <AdminDashboard search={search} />
      <FloatingNav />
    </>
  );
}
