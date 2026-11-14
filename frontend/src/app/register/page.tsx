"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Mail, User, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthCard, CenteredPage, FormField, IconInput, PasswordInput } from "@/components/shared";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/lib/api/auth";
import { ApiRequestError } from "@/lib/api/client";

const schema = z
  .object({
    full_name: z.string().min(2, "Enter your full name."),
    email: z.string().email("Enter a valid email address."),
    password: z.string().min(8, "Password must be at least 8 characters."),
    password2: z.string(),
  })
  .refine((data) => data.password === data.password2, {
    message: "Passwords do not match.",
    path: ["password2"],
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      await authApi.register(values);
      await login(values.email, values.password);
      toast.success("Account created. Welcome to the National Audit Academy!");
      router.push("/dashboard");
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "Registration failed. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CenteredPage>
      <AuthCard
        icon={UserPlus}
        title="Create your account"
        description="Join the National Audit Academy to start learning."
        footer={
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Login
            </Link>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="ui-form">
          <FormField label="Full name" htmlFor="full_name" error={errors.full_name?.message}>
            <IconInput
              icon={User}
              id="full_name"
              placeholder="Jane Doe"
              autoComplete="name"
              aria-invalid={!!errors.full_name}
              {...register("full_name")}
            />
          </FormField>
          <FormField label="Email" htmlFor="email" error={errors.email?.message}>
            <IconInput
              icon={Mail}
              id="email"
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              aria-invalid={!!errors.email}
              {...register("email")}
            />
          </FormField>
          <FormField label="Password" htmlFor="password" error={errors.password?.message}>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              aria-invalid={!!errors.password}
              {...register("password")}
            />
          </FormField>
          <FormField label="Confirm password" htmlFor="password2" error={errors.password2?.message}>
            <PasswordInput
              id="password2"
              autoComplete="new-password"
              aria-invalid={!!errors.password2}
              {...register("password2")}
            />
          </FormField>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            {isSubmitting ? "Creating account…" : "Register"}
          </Button>
        </form>
      </AuthCard>
    </CenteredPage>
  );
}
