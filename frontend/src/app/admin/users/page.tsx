"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { RequireRole } from "@/components/shared/RequireRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { adminApi } from "@/lib/api/admin";
import { ApiRequestError } from "@/lib/api/client";
import { formatDate } from "@/lib/utils";
import type { Role } from "@/lib/types";

const ROLES: Role[] = ["Student", "Teacher", "Admin"];
const ROLE_ITEMS = Object.fromEntries(ROLES.map((r) => [r, r]));

function CreateUserDialog() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("Student");
  const [password, setPassword] = useState("");

  const createMutation = useMutation({
    mutationFn: () => adminApi.createUser({ email, full_name: fullName, role, password: password || undefined }),
    onSuccess: () => {
      toast.success("User created.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setOpen(false);
      setEmail("");
      setFullName("");
      setPassword("");
      setRole("Student");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiRequestError ? error.message : "Could not create user.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button>Create User</Button>} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="new-user-name">Full name</Label>
            <Input id="new-user-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-email">Email</Label>
            <Input id="new-user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-user-password">Initial password (optional)</Label>
            <Input
              id="new-user-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select items={ROLE_ITEMS} value={role} onValueChange={(v) => setRole((v as Role) ?? "Student")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" disabled={createMutation.isPending} onClick={() => createMutation.mutate()}>
            Create User
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AdminUsersContent() {
  const queryClient = useQueryClient();
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users", roleFilter],
    queryFn: () => adminApi.listUsers(roleFilter === "all" ? undefined : { role: roleFilter as Role }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...patch }: { id: number; role?: Role; is_active?: boolean }) =>
      adminApi.updateUser(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User updated.");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiRequestError ? error.message : "Could not update user.");
    },
  });

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-semibold">Manage Users</h1>
          <CreateUserDialog />
        </div>

        <div className="mb-4 w-48">
          <Select items={{ all: "All roles", ...ROLE_ITEMS }} value={roleFilter} onValueChange={(v) => setRoleFilter(v ?? "all")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground">Loading…</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users?.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.full_name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Select
                            items={ROLE_ITEMS}
                            value={u.role}
                            onValueChange={(v) => v && updateMutation.mutate({ id: u.id, role: v as Role })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((r) => (
                                <SelectItem key={r} value={r}>
                                  {r}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.is_active ? "secondary" : "destructive"}>
                            {u.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatDate(u.date_joined)}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateMutation.mutate({ id: u.id, is_active: !u.is_active })}
                          >
                            {u.is_active ? "Deactivate" : "Activate"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </>
  );
}

export default function AdminUsersPage() {
  return (
    <RequireRole roles={["Admin"]}>
      <AdminUsersContent />
    </RequireRole>
  );
}
