import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, UserMinus, UserCheck, Trash2, Check, Clock } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";

interface User {
  id: string;
  username: string;
  display_name: string;
  approved: boolean;
}

interface UserManagementProps {
  users: User[];
  loading: boolean;
  onRefresh: () => void;
}

export function UserManagement({
  users,
  loading,
  onRefresh,
}: UserManagementProps) {
  const handleActionUser = async (id: string, approved: boolean) => {
    const res = await apiFetch(`/api/users/${id}/approve`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approved }),
    });
    if (res.ok) {
      toast.success(approved ? "User approved" : "User unapproved");
      onRefresh();
    } else {
      toast.error("Failed to update user");
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Delete this user? All their credentials will be removed."))
      return;
    const res = await apiFetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("User deleted");
      onRefresh();
    } else {
      toast.error("Failed to delete user");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin h-8 w-8 mb-4 text-primary" />
        <p className="text-muted-foreground font-medium">Loading users...</p>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-20 border rounded-xl bg-card/50 border-dashed">
        <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-20" />
        <h3 className="text-lg font-bold">No users found</h3>
        <p className="text-muted-foreground">
          New registrations will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-xl overflow-hidden bg-card/50 backdrop-blur-sm shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left p-4 font-semibold text-muted-foreground">
                User Information
              </th>
              <th className="text-left p-4 font-semibold text-muted-foreground">
                Account Status
              </th>
              <th className="text-right p-4 font-semibold text-muted-foreground">
                Manage Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                <td className="p-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-base">
                      {user.display_name || user.username}
                    </span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {user.username}
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  {user.approved ? (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20 transition-colors px-3 py-1">
                      <Check className="h-3 w-3 mr-1" /> Approved
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-amber-500 border-amber-500/20 bg-amber-500/5 px-3 py-1"
                    >
                      <Clock className="h-3 w-3 mr-1" /> Pending
                    </Badge>
                  )}
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    {user.approved ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                        onClick={() => handleActionUser(user.id, false)}
                        title="Revoke Approval"
                      >
                        <UserMinus size={16} className="mr-2" /> Revoke
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                        onClick={() => handleActionUser(user.id, true)}
                        title="Approve User"
                      >
                        <UserCheck size={16} className="mr-2" /> Approve
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteUser(user.id)}
                      title="Delete User"
                    >
                      <Trash2 size={16} className="mr-2" /> Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

