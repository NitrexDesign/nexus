import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Auth } from "@/components/Auth";
import { PublicDashboard } from "@/components/PublicDashboard";
import { AdminDashboard } from "@/components/AdminDashboard";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";
import { FloatingNav } from "@/components/FloatingNav";
import { TooltipProvider } from "@/components/ui/tooltip";

function App() {
  const [user, setUser] = useState<any>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const savedUser = localStorage.getItem("nexus_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (u: any) => {
    setUser(u);
    localStorage.setItem("nexus_user", JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("nexus_user");
  };

  return (
    <TooltipProvider>
      <BrowserRouter>
        <Navbar
          user={user}
          onLogout={handleLogout}
          search={search}
          onSearchChange={setSearch}
        />
        <Routes>
          <Route path="/" element={<PublicDashboard search={search} />} />
          <Route
            path="/auth"
            element={
              user ? <Navigate to="/admin" /> : <Auth onLogin={handleLogin} />
            }
          />
          <Route
            path="/admin"
            element={
              user ? (
                <AdminDashboard search={search} />
              ) : (
                <Navigate to="/auth" />
              )
            }
          />
        </Routes>
        <FloatingNav />
        <Toaster position="top-right" />
      </BrowserRouter>
    </TooltipProvider>
  );
}

export default App;
