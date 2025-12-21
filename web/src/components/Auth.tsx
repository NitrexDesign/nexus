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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import * as api from "@/lib/api";
import {
  startRegistration,
  startAuthentication,
} from "@simplewebauthn/browser";
import { ModeToggle } from "./ModeToggle";
import { Server, Loader2 } from "lucide-react";

interface AuthProps {
  onLogin: (user: any) => void;
}

export function Auth({ onLogin }: AuthProps) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username) {
      toast.error("Please enter a username");
      return;
    }
    try {
      setLoading(true);
      const options = await api.beginRegistration(username);
      const attestationResponse = await startRegistration({
        optionsJSON: options,
      });
      await api.finishRegistration(username, attestationResponse);
      toast.success("Identity profile initialized! You can now authenticate.");
    } catch (err: any) {
      toast.error(err.message || "Protocol mismatch during initialization");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!username) {
      toast.error("Please enter your username");
      return;
    }
    try {
      setLoading(true);
      const options = await api.beginLogin(username);
      const assertionResponse = await startAuthentication({
        optionsJSON: options,
      });
      await api.finishLogin(username, assertionResponse);
      toast.success("Access granted. Welcome back.");
      onLogin({ username });
    } catch (err: any) {
      toast.error(
        err.message || "Authentication signature verification failed",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-4 md:px-8 flex justify-between items-center bg-background border-b h-14">
        <div className="flex items-center gap-2">
          <Server className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl">Nexus</span>
        </div>
        <ModeToggle />
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-[400px]">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
            <CardDescription>
              Enter your username to access your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </div>

                <TabsContent value="login">
                  <Button
                    className="w-full"
                    onClick={handleLogin}
                    disabled={loading}
                  >
                    {loading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Login with Passkey
                  </Button>
                </TabsContent>

                <TabsContent value="register">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleRegister}
                    disabled={loading}
                  >
                    {loading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Register Passkey
                  </Button>
                </TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
