import { useState, lazy, Suspense } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "@/components/ui/sonner";
import { FloatingNav } from "@/components/FloatingNav";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";

// Lazy load route components
const Auth = lazy(() => import("@/components/Auth").then(m => ({ default: m.Auth })));
const PublicDashboard = lazy(() => import("@/components/PublicDashboard").then(m => ({ default: m.PublicDashboard })));
const AdminDashboard = lazy(() => import("@/components/AdminDashboard").then(m => ({ default: m.AdminDashboard })));

const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
    <Loader2 className="h-10 w-10 animate-spin text-primary opacity-50" />
  </div>
);

interface User {
  username: string;
  display_name?: string;
  id?: string;
}

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("nexus_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [search, setSearch] = useState("");

  const handleLogin = (u: User) => {
    setUser(u);
    localStorage.setItem("nexus_user", JSON.stringify(u));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("nexus_user");
  };

  return (
    <TooltipProvider>
      <HashRouter>
        <Navbar
          user={user}
          onLogout={handleLogout}
          search={search}
          onSearchChange={setSearch}
        />
        <Suspense fallback={<PageLoader />}>
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
        </Suspense>
        <FloatingNav />
        <Toaster position="top-right" />
      </HashRouter>
    </TooltipProvider>
  );
}

export default App;
