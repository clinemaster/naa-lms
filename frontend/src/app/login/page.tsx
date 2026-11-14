"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, LogIn, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthCard, CenteredPage, FormField, IconInput, PasswordInput } from "@/components/shared";
import { useAuth } from "@/context/AuthContext";
import { ApiRequestError } from "@/lib/api/client";

const schema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

type FormValues = z.infer<typeof schema>;

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const user = await login(values.email, values.password);
      toast.success(`Welcome , ${user.full_name}!`);
      const next = searchParams.get("next");
      if (next) {
        router.push(next);
      } else if (user.role === "Admin") {
        router.push("/admin");
      } else if (user.role === "Academy Admin") {
        router.push("/admin/courses");
      } else if (user.role === "Teacher") {
        router.push("/teacher");
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      const message = error instanceof ApiRequestError ? error.message : "Unable to log in. Please try again.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard
      icon={LogIn}
      title="Login"
      description="Welcome back. Sign in to continue learning."
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Register
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="ui-form">
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
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            {...register("password")}
          />
        </FormField>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
          {isSubmitting ? "Logging in…" : "Login"}
        </Button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <CenteredPage>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </CenteredPage>
  );
}
