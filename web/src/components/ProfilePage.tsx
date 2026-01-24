"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { startRegistration } from "@simplewebauthn/browser";
import {
  User,
  Key,
  Trash2,
  Plus,
  Lock,
  Loader2,
  Shield,
  Calendar,
} from "lucide-react";
import { motion } from "framer-motion";

interface Passkey {
  id: string;
  type: string;
  signCount: number;
}

interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  approved: boolean;
  hasPassword: boolean;
  passkeys: Passkey[];
}

export function ProfilePage() {
  const queryClient = useQueryClient();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const userId =
    typeof window !== "undefined" ? localStorage.getItem("userId") : null;

  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ["profile"],
    queryFn: async () => {
      const res = await apiFetch("/api/profile", {
        headers: {
          "X-User-Id": userId || "",
        },
      });
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
    enabled: !!userId,
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) {
        throw new Error("Passwords do not match");
      }
      if (newPassword.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      const res = await apiFetch("/api/profile/password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": userId || "",
        },
        body: JSON.stringify({
          currentPassword: profile?.hasPassword ? currentPassword : undefined,
          newPassword,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update password");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const addPasskeyMutation = useMutation({
    mutationFn: async () => {
      const beginRes = await apiFetch("/api/profile/passkey/begin", {
        method: "POST",
        headers: {
          "X-User-Id": userId || "",
        },
      });
      if (!beginRes.ok) throw new Error("Failed to start passkey registration");
      const options = await beginRes.json();

      const attestationResponse = await startRegistration({
        optionsJSON: options,
      });

      const finishRes = await apiFetch("/api/profile/passkey/finish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": userId || "",
        },
        body: JSON.stringify({ response: attestationResponse }),
      });
      if (!finishRes.ok) throw new Error("Failed to add passkey");
      return finishRes.json();
    },
    onSuccess: () => {
      toast.success("Passkey added successfully");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deletePasskeyMutation = useMutation({
    mutationFn: async (passkeyId: string) => {
      const res = await apiFetch(`/api/profile/passkey/${passkeyId}`, {
        method: "DELETE",
        headers: {
          "X-User-Id": userId || "",
        },
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete passkey");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Passkey deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  if (!userId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please log in to view your profile
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950 px-4 md:px-8 py-12">
      <div className="container mx-auto max-w-4xl space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          <h1 className="text-4xl font-black tracking-tight">
            Profile Settings
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage your account security and authentication methods
          </p>
        </motion.div>

        {/* User Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-sm">
                    Username
                  </Label>
                  <p className="font-semibold">{profile?.username}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-sm">
                    Status
                  </Label>
                  <div>
                    {profile?.approved ? (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                        Approved
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Pending Approval</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Password Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Password
              </CardTitle>
              <CardDescription>
                {profile?.hasPassword
                  ? "Update your password"
                  : "Set a password for your account"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile?.hasPassword && (
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              <Button
                onClick={() => updatePasswordMutation.mutate()}
                disabled={updatePasswordMutation.isPending || !newPassword}
                className="w-full"
              >
                {updatePasswordMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {profile?.hasPassword ? "Update Password" : "Set Password"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Passkeys Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Passkeys
                  </CardTitle>
                  <CardDescription>
                    Secure, passwordless authentication using biometrics or
                    security keys
                  </CardDescription>
                </div>
                <Button
                  onClick={() => addPasskeyMutation.mutate()}
                  disabled={addPasskeyMutation.isPending}
                  size="sm"
                >
                  {addPasskeyMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Passkey
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {profile?.passkeys && profile.passkeys.length > 0 ? (
                <div className="space-y-3">
                  {profile.passkeys.map((passkey, index) => (
                    <motion.div
                      key={passkey.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Key className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">Passkey {index + 1}</div>
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <span className="text-xs">
                              Used {passkey.signCount} times
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deletePasskeyMutation.mutate(passkey.id)}
                        disabled={deletePasskeyMutation.isPending}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>No passkeys configured</p>
                  <p className="text-sm">
                    Add a passkey for secure, passwordless authentication
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
