import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";
import { UserCog, Shield, GraduationCap, User, Users, UserPlus, Pencil, Trash2, KeyRound } from "lucide-react";

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: "admin" | "teacher" | "student";
}

interface ClassInfo {
  id: string;
  name: string;
}

const UserManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isBulkDialogOpen, setIsBulkDialogOpen] = useState(false);
  const [bulkRole, setBulkRole] = useState<string>("");

  // Create user form state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createFullName, setCreateFullName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createRole, setCreateRole] = useState("");
  const [createClassId, setCreateClassId] = useState("");
  const [creating, setCreating] = useState(false);

  // Edit user state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);

  // Reset password state
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetUser, setResetUser] = useState<UserProfile | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  const fetchData = async () => {
    try {
      const [usersRes, rolesRes, classesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("*"),
        supabase.from("classes").select("id, name").order("name"),
      ]);

      if (usersRes.error) throw usersRes.error;
      if (rolesRes.error) throw rolesRes.error;

      setUsers(usersRes.data || []);
      setUserRoles(rolesRes.data || []);
      setClasses(classesRes.data || []);
    } catch (error: any) {
      toast.error("Failed to fetch users: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const rolesChannel = supabase
      .channel("user-roles-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles" }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(rolesChannel);
    };
  }, []);

  const getUserRoles = (userId: string) => {
    return userRoles.filter((role) => role.user_id === userId).map((role) => role.role);
  };

  const handleCreateUser = async () => {
    if (!createFullName || !createEmail || !createPassword || !createRole) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (createPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setCreating(true);
    try {
      const response = await supabase.functions.invoke("create-user", {
        body: {
          fullName: createFullName.trim(),
          email: createEmail.trim(),
          password: createPassword,
          role: createRole,
          classId: createRole === "student" ? createClassId || null : null,
        },
      });

      if (response.error) throw new Error(response.error.message || "Failed to create user");
      const result = response.data;
      if (result.error) throw new Error(result.error);

      toast.success(`User "${createFullName}" created successfully with ${createRole} role`);
      setIsCreateDialogOpen(false);
      setCreateFullName("");
      setCreateEmail("");
      setCreatePassword("");
      setCreateRole("");
      setCreateClassId("");
      setTimeout(() => fetchData(), 1000);
    } catch (error: any) {
      toast.error("Failed to create user: " + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleEditUser = async () => {
    if (!editUser || !editFullName || !editEmail) {
      toast.error("Please fill in all fields");
      return;
    }

    setSaving(true);
    try {
      const response = await supabase.functions.invoke("manage-user", {
        body: {
          action: "update",
          userId: editUser.id,
          fullName: editFullName.trim(),
          email: editEmail.trim(),
        },
      });

      if (response.error) throw new Error(response.error.message);
      const result = response.data;
      if (result.error) throw new Error(result.error);

      toast.success("User updated successfully");
      setIsEditDialogOpen(false);
      setEditUser(null);
      fetchData();
    } catch (error: any) {
      toast.error("Failed to update user: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetUser || !newPassword) {
      toast.error("Please enter a new password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setResetting(true);
    try {
      const response = await supabase.functions.invoke("manage-user", {
        body: {
          action: "resetPassword",
          userId: resetUser.id,
          password: newPassword,
        },
      });

      if (response.error) throw new Error(response.error.message);
      const result = response.data;
      if (result.error) throw new Error(result.error);

      toast.success(`Password reset for ${resetUser.full_name}`);
      setIsResetDialogOpen(false);
      setResetUser(null);
      setNewPassword("");
    } catch (error: any) {
      toast.error("Failed to reset password: " + error.message);
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (!confirm(`Are you sure you want to permanently delete "${user.full_name}" (${user.email})? This cannot be undone.`)) return;

    try {
      const response = await supabase.functions.invoke("manage-user", {
        body: { action: "delete", userId: user.id },
      });

      if (response.error) throw new Error(response.error.message);
      const result = response.data;
      if (result.error) throw new Error(result.error);

      toast.success("User deleted successfully");
      fetchData();
    } catch (error: any) {
      toast.error("Failed to delete user: " + error.message);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) {
      toast.error("Please select a user and role");
      return;
    }

    try {
      const existingRole = userRoles.find(
        (role) => role.user_id === selectedUser.id && role.role === selectedRole
      );

      if (existingRole) {
        toast.info("User already has this role");
        setIsDialogOpen(false);
        return;
      }

      const { error } = await supabase.from("user_roles").insert({
        user_id: selectedUser.id,
        role: selectedRole as "admin" | "teacher" | "student",
      });

      if (error) throw error;
      logAudit({
        action: "role.assigned",
        entity_type: "user_role",
        entity_id: selectedUser.id,
        metadata: { target_user_email: selectedUser.email, role: selectedRole },
      });
      toast.success(`${selectedRole} role assigned successfully`);
      setIsDialogOpen(false);
      setSelectedUser(null);
      setSelectedRole("");
    } catch (error: any) {
      toast.error("Failed to assign role: " + error.message);
    }
  };

  const handleRemoveRole = async (userId: string, roleId: string) => {
    if (!confirm("Are you sure you want to remove this role?")) return;

    try {
      const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
      if (error) throw error;
      logAudit({
        action: "role.removed",
        entity_type: "user_role",
        entity_id: roleId,
        metadata: { target_user_id: userId },
      });
      toast.success("Role removed successfully");
    } catch (error: any) {
      toast.error("Failed to remove role: " + error.message);
    }
  };

  const handleBulkAssign = async () => {
    if (selectedUsers.size === 0 || !bulkRole) {
      toast.error("Please select users and a role");
      return;
    }

    try {
      const usersToAssign = Array.from(selectedUsers);
      const usersNeedingRole = usersToAssign.filter((userId) => {
        return !userRoles.find((role) => role.user_id === userId && role.role === bulkRole);
      });

      if (usersNeedingRole.length === 0) {
        toast.info("All selected users already have this role");
        setIsBulkDialogOpen(false);
        return;
      }

      const roleAssignments = usersNeedingRole.map((userId) => ({
        user_id: userId,
        role: bulkRole as "admin" | "teacher" | "student",
      }));

      const { error } = await supabase.from("user_roles").insert(roleAssignments);
      if (error) throw error;

      logAudit({
        action: "role.bulk_assigned",
        entity_type: "user_role",
        metadata: { role: bulkRole, count: usersNeedingRole.length, user_ids: usersNeedingRole },
      });
      toast.success(`Successfully assigned ${bulkRole} role to ${usersNeedingRole.length} user(s)`);
      setIsBulkDialogOpen(false);
      setSelectedUsers(new Set());
      setBulkRole("");
    } catch (error: any) {
      toast.error("Failed to assign roles: " + error.message);
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((u) => u.id)));
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin": return <Shield className="h-4 w-4" />;
      case "teacher": return <GraduationCap className="h-4 w-4" />;
      case "student": return <User className="h-4 w-4" />;
      default: return null;
    }
  };

  const getRoleVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case "admin": return "destructive";
      case "teacher": return "default";
      case "student": return "secondary";
      default: return "outline";
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <div>
          <CardTitle>User Management</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Create, edit, delete users and manage roles
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* Create User Button */}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Create a user account with a password. No email verification needed.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Full Name *</Label>
                  <Input value={createFullName} onChange={(e) => setCreateFullName(e.target.value)} placeholder="Enter full name" />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input type="email" value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} placeholder="Enter email address" />
                </div>
                <div>
                  <Label>Password *</Label>
                  <Input type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} placeholder="Min 6 characters" />
                </div>
                <div>
                  <Label>Role *</Label>
                  <Select value={createRole} onValueChange={setCreateRole}>
                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin"><div className="flex items-center gap-2"><Shield className="h-4 w-4" /> Admin</div></SelectItem>
                      <SelectItem value="teacher"><div className="flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Teacher</div></SelectItem>
                      <SelectItem value="student"><div className="flex items-center gap-2"><User className="h-4 w-4" /> Student</div></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {createRole === "student" && (
                  <div>
                    <Label>Assign Class</Label>
                    <Select value={createClassId} onValueChange={setCreateClassId}>
                      <SelectTrigger><SelectValue placeholder="Select class (optional)" /></SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <Button onClick={handleCreateUser} className="w-full" disabled={creating || !createFullName || !createEmail || !createPassword || !createRole}>
                  {creating ? "Creating..." : "Create User"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {selectedUsers.size > 0 && (
            <Dialog open={isBulkDialogOpen} onOpenChange={setIsBulkDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Bulk Assign ({selectedUsers.size})
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Assign Role</DialogTitle>
                  <DialogDescription>Assign a role to {selectedUsers.size} selected user(s)</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Role</label>
                    <Select value={bulkRole} onValueChange={setBulkRole}>
                      <SelectTrigger><SelectValue placeholder="Choose a role to assign" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin"><div className="flex items-center gap-2"><Shield className="h-4 w-4" /> Admin</div></SelectItem>
                        <SelectItem value="teacher"><div className="flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Teacher</div></SelectItem>
                        <SelectItem value="student"><div className="flex items-center gap-2"><User className="h-4 w-4" /> Student</div></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="bg-muted p-3 rounded-md">
                    <p className="text-sm font-medium mb-2">Selected Users:</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {users.filter((u) => selectedUsers.has(u.id)).map((user) => (
                        <div key={user.id} className="text-sm text-muted-foreground">• {user.full_name} ({user.email})</div>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleBulkAssign} className="flex-1">Assign Role to All</Button>
                    <Button variant="outline" onClick={() => { setSelectedUsers(new Set()); setIsBulkDialogOpen(false); }}>Clear</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Edit User Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setEditUser(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
              <DialogDescription>Update user details.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Full Name *</Label>
                <Input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
              </div>
              <div>
                <Label>Email *</Label>
                <Input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>
              <Button onClick={handleEditUser} className="w-full" disabled={saving || !editFullName || !editEmail}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={isResetDialogOpen} onOpenChange={(open) => { setIsResetDialogOpen(open); if (!open) { setResetUser(null); setNewPassword(""); } }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
              <DialogDescription>
                Set a new password for {resetUser?.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>New Password *</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 6 characters" />
              </div>
              <Button onClick={handleResetPassword} className="w-full" disabled={resetting || newPassword.length < 6}>
                {resetting ? "Resetting..." : "Reset Password"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox checked={selectedUsers.size === users.length && users.length > 0} onCheckedChange={toggleSelectAll} />
                </TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Current Roles</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => {
                const roles = getUserRoles(user.id);
                const userRoleObjects = userRoles.filter((role) => role.user_id === user.id);

                return (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Checkbox checked={selectedUsers.has(user.id)} onCheckedChange={() => toggleUserSelection(user.id)} />
                    </TableCell>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-2 flex-wrap">
                        {roles.length > 0 ? (
                          roles.map((role, idx) => {
                            const roleObj = userRoleObjects.find((r) => r.role === role);
                            return (
                              <Badge key={idx} variant={getRoleVariant(role)} className="flex items-center gap-1">
                                {getRoleIcon(role)}
                                {role}
                                <button onClick={() => roleObj && handleRemoveRole(user.id, roleObj.id)} className="ml-1 hover:text-destructive" title="Remove role">×</button>
                              </Badge>
                            );
                          })
                        ) : (
                          <Badge variant="outline">No roles assigned</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {/* Assign Role */}
                        <Dialog
                          open={isDialogOpen && selectedUser?.id === user.id}
                          onOpenChange={(open) => {
                            setIsDialogOpen(open);
                            if (!open) { setSelectedUser(null); setSelectedRole(""); }
                          }}
                        >
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setSelectedUser(user)} title="Assign role">
                              <UserCog className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Assign Role to {user.full_name}</DialogTitle>
                              <DialogDescription>Select a role to assign.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <Select value={selectedRole} onValueChange={setSelectedRole}>
                                <SelectTrigger><SelectValue placeholder="Choose a role" /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="admin"><div className="flex items-center gap-2"><Shield className="h-4 w-4" /> Admin</div></SelectItem>
                                  <SelectItem value="teacher"><div className="flex items-center gap-2"><GraduationCap className="h-4 w-4" /> Teacher</div></SelectItem>
                                  <SelectItem value="student"><div className="flex items-center gap-2"><User className="h-4 w-4" /> Student</div></SelectItem>
                                </SelectContent>
                              </Select>
                              <div className="bg-muted p-3 rounded-md">
                                <p className="text-sm text-muted-foreground">
                                  <strong>Current roles:</strong> {roles.length > 0 ? roles.join(", ") : "None"}
                                </p>
                              </div>
                              <Button onClick={handleAssignRole} className="w-full">Assign Role</Button>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* Edit */}
                        <Button
                          variant="outline"
                          size="sm"
                          title="Edit user"
                          onClick={() => {
                            setEditUser(user);
                            setEditFullName(user.full_name);
                            setEditEmail(user.email);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        {/* Reset Password */}
                        <Button
                          variant="outline"
                          size="sm"
                          title="Reset password"
                          onClick={() => {
                            setResetUser(user);
                            setNewPassword("");
                            setIsResetDialogOpen(true);
                          }}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>

                        {/* Delete */}
                        <Button
                          variant="destructive"
                          size="sm"
                          title="Delete user"
                          onClick={() => handleDeleteUser(user)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserManagement;
