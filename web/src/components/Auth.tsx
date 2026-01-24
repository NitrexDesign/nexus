import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import * as api from "@/lib/api";
import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";
import { Server, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { useMutation, useQueryClient } from "@tanstack/react-query";

interface AuthProps {
  onLogin: (user: { username: string }) => void;
}

export function Auth({ onLogin }: AuthProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState("login");
  const queryClient = useQueryClient();

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!username) throw new Error("Please enter a username");
      let result;
      if (password) {
        result = await api.registerWithPassword(username, password);
        return {
          message: "Account created! You can now authenticate.",
          result,
        };
      } else {
        const options = await api.beginRegistration(username);
        const attestationResponse = await startRegistration({
          optionsJSON: options,
        });
        result = await api.finishRegistration(username, attestationResponse);
        return {
          message: "Identity profile initialized! You can now authenticate.",
          result,
        };
      }
    },
    onSuccess: (data) => toast.success(data.message),
    onError: (err) =>
      toast.error(
        err instanceof Error ? err.message : "Failed to initialize account",
      ),
  });

  const loginMutation = useMutation({
    mutationFn: async () => {
      if (!username) throw new Error("Please enter your username");
      let result;
      if (password) {
        result = await api.loginWithPassword(username, password);
      } else {
        const options = await api.beginLogin(username);
        const assertionResponse = await startAuthentication({
          optionsJSON: options,
        });
        result = await api.finishLogin(username, assertionResponse);
      }
      return result;
    },
    onSuccess: (result) => {
      // Store userId in localStorage for admin operations
      if (result.userId) {
        localStorage.setItem("userId", result.userId);
      }
      toast.success("Access granted. Welcome back.");
      onLogin({ username: result.username });
      queryClient.invalidateQueries(); // Refresh everything after login
    },
    onError: (err) =>
      toast.error(
        err instanceof Error
          ? err.message
          : "Authentication verification failed",
      ),
  });

  const loading = registerMutation.isPending || loginMutation.isPending;

  const handleRegister = () => registerMutation.mutate();
  const handleLogin = () => loginMutation.mutate();

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      <div className="flex-1 flex items-center justify-center p-6 relative">
        <div className="absolute inset-0 bg-grid-white/[0.02] -z-10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -z-10" />

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 20, stiffness: 100 }}
          className="w-full max-w-[480px]"
        >
          <Card className="w-full shadow-2xl border-primary/10">
            <CardHeader className="text-center">
              <div className="mx-auto bg-primary/10 w-12 h-12 rounded-2xl flex items-center justify-center mb-4">
                <Server className="text-primary h-6 w-6" />
              </div>
              <CardTitle className="text-3xl font-black tracking-tight">
                Welcome
              </CardTitle>
              <CardDescription className="text-base">
                Your secure portal to the digital ether.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="space-y-6"
              >
                <TabsList className="grid w-full grid-cols-2 rounded-xl p-1 bg-muted/50">
                  <TabsTrigger value="login" className="rounded-lg font-bold">
                    Login
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="rounded-lg font-bold"
                  >
                    Register
                  </TabsTrigger>
                </TabsList>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="username"
                      className="text-sm font-bold ml-1"
                    >
                      Username
                    </Label>
                    <Input
                      id="username"
                      placeholder="e.g. kieran"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="h-12 rounded-xl border-muted-foreground/20 focus-visible:ring-primary shadow-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-sm font-bold ml-1"
                    >
                      Password (Optional)
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="leave blank for passkey"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 rounded-xl border-muted-foreground/20 focus-visible:ring-primary shadow-sm"
                    />
                  </div>

                  <AnimatePresence mode="wait">
                    {activeTab === "login" ? (
                      <motion.div
                        key="login"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Button
                          className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/20"
                          onClick={handleLogin}
                          disabled={loading}
                        >
                          {loading ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          ) : password ? (
                            "Login with Password"
                          ) : (
                            "Authenticate with Passkey"
                          )}
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="register"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Button
                          variant="outline"
                          className="w-full h-12 rounded-xl text-base font-bold border-2 hover:bg-primary/5 hover:text-primary hover:border-primary/30 transition-all"
                          onClick={handleRegister}
                          disabled={loading}
                        >
                          {loading ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          ) : password ? (
                            "Register with Password"
                          ) : (
                            "Initialize Identity Profile"
                          )}
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
