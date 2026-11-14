"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Ban, CheckCircle2, Loader2, Mail, User, UserPlus } from "lucide-react";
import {
  DataTable,
  FormField,
  IconHeading,
  IconInput,
  Page,
  PageHeader,
  PasswordInput,
  RequireRole,
  StatusPill,
} from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { adminApi } from "@/lib/api/admin";
import { ApiRequestError } from "@/lib/api/client";
import { formatDate } from "@/lib/utils";
import type { Role } from "@/lib/types";
import { ROLES, ROLE_ITEMS, RoleIcon, RoleOption } from "@/components/admin/role-options";


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
      <DialogTrigger
        render={
          <Button>
            <UserPlus className="size-4" />
            Create User
          </Button>
        }
      />
      <DialogContent className="gap-6 p-6 sm:max-w-lg">
        <DialogHeader className="ui-card-heading">
          <IconHeading
            icon={UserPlus}
            title={<DialogTitle className="text-lg">Create User</DialogTitle>}
            description={<DialogDescription>Add a new account and choose what they can access.</DialogDescription>}
          />
        </DialogHeader>
        <form
          className="ui-form"
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Full name" htmlFor="new-user-name">
              <IconInput
                icon={User}
                id="new-user-name"
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </FormField>
            <FormField label="Email" htmlFor="new-user-email">
              <IconInput
                icon={Mail}
                id="new-user-email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormField>
          </div>
          <FormField label="Initial password" htmlFor="new-user-password" optional>
            <PasswordInput id="new-user-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </FormField>
          <FormField label="Role">
            <Select items={ROLE_ITEMS} value={role} onValueChange={(v) => setRole((v as Role) ?? "Student")}>
              <SelectTrigger className="w-full">
                <RoleIcon role={role} />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="min-w-64">
                {ROLES.map((r) => (
                  <SelectItem key={r} value={r} label={ROLE_ITEMS[r]}>
                    <RoleOption role={r} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <Button type="submit" className="w-full" disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            {createMutation.isPending ? "Creating…" : "Create User"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AdminUsersContent() {
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => adminApi.listUsers(),
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
      <Page width="xl">
        <PageHeader title="Manage Users" actions={<CreateUserDialog />} />

        <DataTable
          numbered
          data={users}
          isLoading={isLoading}
          getRowKey={(u) => u.id}
          emptyMessage="No users yet."
          columns={[
            { key: "name", header: "Name", primary: true, cell: (u) => u.full_name },
            { key: "email", header: "Email", cell: (u) => u.email },
            {
              key: "role",
              header: "Role",
              cell: (u) => (
                <Select
                  items={ROLE_ITEMS}
                  value={u.role}
                  onValueChange={(v) => v && updateMutation.mutate({ id: u.id, role: v as Role })}
                >
                  <SelectTrigger className="w-52">
                    <RoleIcon role={u.role} />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="min-w-64">
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r} label={ROLE_ITEMS[r]}>
                        <RoleOption role={r} />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ),
            },
            {
              key: "status",
              header: "Status",
              cell: (u) =>
                u.is_active ? (
                  <StatusPill icon={CheckCircle2} tone="emerald" label="Active" />
                ) : (
                  <StatusPill icon={Ban} tone="rose" label="Inactive" />
                ),
            },
            { key: "joined", header: "Joined", cell: (u) => formatDate(u.date_joined) },
            {
              key: "actions",
              header: "Actions",
              actions: true,
              cell: (u) => (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateMutation.mutate({ id: u.id, is_active: !u.is_active })}
                >
                  {u.is_active ? "Deactivate" : "Activate"}
                </Button>
              ),
            },
          ]}
        />
      </Page>
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
