"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { fetchUsers, approveUser, updateUser, fetchUsersStats, createOfficerAccount, resetUserPassword, USER_ROLE_CONFIG } from "@/lib/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Users,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Shield,
  UserCog,
  UserCheck,
  UserPlus,
  KeyRound,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

const PAGE_SIZE = 20;

export default function UsersPage() {
  const router = useRouter();
  const { profile, loading: authLoading } = useUser();

  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Edit role dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editRole, setEditRole] = useState("");
  const [saving, setSaving] = useState(false);

  // Create account dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    student_number: "",
    first_name: "",
    last_name: "",
    email: "",
    contact_number: "",
    role: "rotc_officer",
  });
  const [creating, setCreating] = useState(false);

  const isLogistics = profile?.role === "logistics_officer";

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [result, statsData] = await Promise.all([
        fetchUsers({
          search: search || undefined,
          role: roleFilter || undefined,
          status: statusFilter || undefined,
          page,
          pageSize: PAGE_SIZE,
        }),
        fetchUsersStats(),
      ]);
      // Filter out admin users from the table so they can't manage themselves
      const filteredUsers = result.data.filter(u => u.role !== 'logistics_officer');
      setUsers(filteredUsers);
      setTotalCount(result.count);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter, page]);

  useEffect(() => {
    if (!authLoading) loadUsers();
  }, [authLoading, loadUsers]);

  const handleApprove = async (userId: string) => {
    if (!profile?.id) return;
    try {
      await approveUser(userId, profile.id);
      toast.success("User approved");
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to approve user");
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      await updateUser(userId, { is_active: !currentStatus });
      toast.success(`User ${currentStatus ? "deactivated" : "activated"}`);
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to update user");
    }
  };

  const handleRoleChange = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await updateUser(editingUser.id, { role: editRole });
      toast.success("Role updated");
      setEditDialogOpen(false);
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to update role");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAccount = async () => {
    if (!createForm.student_number || !createForm.first_name || !createForm.last_name) {
      toast.error("Student ID, first name, and last name are required");
      return;
    }
    if (!createForm.email) {
      toast.error("Email is required to create an account");
      return;
    }
    setCreating(true);
    try {
      await createOfficerAccount(createForm);
      toast.success(`Account created for ${createForm.first_name} ${createForm.last_name}`);
      setCreateDialogOpen(false);
      setCreateForm({ student_number: "", first_name: "", last_name: "", email: "", contact_number: "", role: "rotc_officer" });
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setCreating(false);
    }
  };

  const handleResetPassword = async (userId: string, studentNumber: string) => {
    try {
      await resetUserPassword(userId, studentNumber);
      toast.success(`Password reset to Student ID: ${studentNumber}`);
      loadUsers();
    } catch (error: any) {
      toast.error(error.message || "Failed to reset password");
    }
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Redirect non-logistics users
  if (!authLoading && !isLogistics) {
    router.push("/dashboard");
    return null;
  }

  if (authLoading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <Users className="w-6 h-6 text-primary" />
            User Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage officer accounts, approvals, and roles
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="h-10">
          <UserPlus className="w-4 h-4 mr-2" />
          Create Officer Account
        </Button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="w-5 h-5 text-primary shrink-0" />
              <div><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total</p></div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-success shrink-0" />
              <div><p className="text-2xl font-bold">{stats.approved}</p><p className="text-xs text-muted-foreground">Approved</p></div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
              <div><p className="text-2xl font-bold">{stats.pendingApproval}</p><p className="text-xs text-muted-foreground">Pending</p></div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <Shield className="w-5 h-5 text-destructive shrink-0" />
              <div><p className="text-2xl font-bold">{stats.logistics_officer}</p><p className="text-xs text-muted-foreground">Logistics (S-4)</p></div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-primary shrink-0" />
              <div><p className="text-2xl font-bold">{stats.rotc_officer}</p><p className="text-xs text-muted-foreground">ROTC Officers</p></div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pending approval alert */}
      {stats?.pendingApproval > 0 && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                {stats.pendingApproval} account{stats.pendingApproval !== 1 ? "s" : ""} pending approval
              </p>
              <p className="text-xs text-muted-foreground">
                New ROTC Officers need your approval before they can access the system.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Filters */}
      <Card className="border-border/50">
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, student ID..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (setSearch(searchInput), setPage(1))}
                className="pl-9 h-10"
              />
            </div>
            <Button variant="outline" className="h-10" onClick={() => { setSearch(searchInput); setPage(1); }}>
              <Search className="w-4 h-4" />
            </Button>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v ?? ""); setPage(1); }}>
              <SelectTrigger className="w-44 h-10"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Roles</SelectItem>
                {Object.entries(USER_ROLE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? ""); setPage(1); }}>
              <SelectTrigger className="w-36 h-10"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="pending">Pending Approval</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="border-border/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Officer</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Role</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-4 py-3">Joined</th>
                <th className="text-right px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-16 text-center"><Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" /></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-16 text-center">
                  <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No users found</p>
                </td></tr>
              ) : (
                users.map((user: any) => {
                  const roleConfig = USER_ROLE_CONFIG[user.role];
                  return (
                    <tr key={user.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-9 h-9">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {user.first_name?.[0]}{user.last_name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{user.first_name} {user.last_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {user.email || `ID: ${user.student_number || "—"}`}
                            </p>
                            {user.student_number && (
                              <p className="text-[11px] text-muted-foreground font-mono">{user.student_number}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            user.role === "logistics_officer"
                              ? "destructive"
                              : "default"
                          }
                        >
                          {roleConfig?.label || user.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-2 h-2 rounded-full ${!user.is_approved ? "bg-warning" : user.is_active ? "bg-success" : "bg-destructive"}`} />
                          <span className="text-xs">
                            {!user.is_approved ? "Pending Approval" : user.is_active ? "Active" : "Inactive"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!user.is_approved && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-success" onClick={() => handleApprove(user.id)} title="Approve user">
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                          )}
                          {user.student_number && (
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8 text-warning"
                              onClick={() => handleResetPassword(user.id, user.student_number)}
                              title="Reset password to Student ID"
                            >
                              <KeyRound className="w-4 h-4" />
                            </Button>
                          )}
                          {user.role !== "logistics_officer" && (
                            <Button
                              variant="ghost" size="icon" className="h-8 w-8"
                              onClick={() => {
                                setEditingUser(user);
                                setEditRole(user.role);
                                setEditDialogOpen(true);
                              }}
                              title="Change role"
                            >
                              <UserCog className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                            onClick={() => handleToggleActive(user.id, user.is_active)}
                            title={user.is_active ? "Deactivate" : "Activate"}
                          >
                            {user.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-xs text-muted-foreground">{totalCount} total</p>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Role Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update role for {editingUser?.first_name} {editingUser?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={editRole} onValueChange={(v) => setEditRole(v ?? "")}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(USER_ROLE_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label} — {config.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="inline-flex">Cancel</Button>
            <Button onClick={handleRoleChange} disabled={saving}>
              {saving && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Account Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Officer Account</DialogTitle>
            <DialogDescription>
              Create a new account. Default password is the Student ID number.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Student ID Number</Label>
              <Input
                placeholder="2024-00001"
                value={createForm.student_number}
                onChange={(e) => setCreateForm({ ...createForm, student_number: e.target.value })}
                className="h-10 font-mono"
              />
              <p className="text-xs text-muted-foreground">Login ID and default password</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  placeholder="Juan"
                  value={createForm.first_name}
                  onChange={(e) => setCreateForm({ ...createForm, first_name: e.target.value })}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  placeholder="Dela Cruz"
                  value={createForm.last_name}
                  onChange={(e) => setCreateForm({ ...createForm, last_name: e.target.value })}
                  className="h-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email (Gmail)</Label>
              <Input
                type="email"
                placeholder="juandelacruz@gmail.com"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Number (Optional)</Label>
              <Input
                placeholder="09XX-XXX-XXXX"
                value={createForm.contact_number}
                onChange={(e) => setCreateForm({ ...createForm, contact_number: e.target.value })}
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={createForm.role}
                onValueChange={(v) => setCreateForm({ ...createForm, role: v ?? "rotc_officer" })}
              >
                <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="rotc_officer">ROTC Officer</SelectItem>
                  <SelectItem value="logistics_officer">Logistics Officer (S-4)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="inline-flex">Cancel</Button>
              <Button onClick={handleCreateAccount} disabled={creating}>
                {creating && <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />}
                <UserPlus className="w-4 h-4 mr-1.5" />
                Create Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-foreground/80 block">
      {children}
    </label>
  );
}
