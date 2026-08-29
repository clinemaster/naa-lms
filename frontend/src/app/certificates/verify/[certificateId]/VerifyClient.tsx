"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle, GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { certificateApi } from "@/lib/api/certificates";
import { ApiRequestError } from "@/lib/api/client";
import { formatDate } from "@/lib/utils";

export function VerifyClient({ certificateId }: { certificateId: string }) {
  const { data: certificate, isLoading, error } = useQuery({
    queryKey: ["certificate-verify", certificateId],
    queryFn: () => certificateApi.verify(certificateId),
    retry: false,
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-16">
      <Link href="/" className="flex items-center gap-2 font-semibold">
        <GraduationCap className="h-6 w-6 text-primary" />
        National Audit Academy
      </Link>

      <Card className="w-full max-w-lg">
        <CardContent className="flex flex-col items-center gap-4 pt-8 text-center">
          {isLoading ? (
            <p className="text-muted-foreground">Verifying certificate…</p>
          ) : error || !certificate ? (
            <>
              <XCircle className="h-12 w-12 text-destructive" />
              <h1 className="text-xl font-semibold">Certificate Not Found</h1>
              <p className="text-muted-foreground">
                {error instanceof ApiRequestError
                  ? error.message
                  : "This certificate number could not be verified."}
              </p>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
              <h1 className="text-xl font-semibold">Certificate Verified</h1>
              <div className="w-full space-y-2 rounded-lg border bg-muted/30 p-4 text-left text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Student</span>
                  <span className="font-medium">{certificate.student_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Course</span>
                  <span className="font-medium">{certificate.course.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Certificate Number</span>
                  <span className="font-medium">{certificate.certificate_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Issued</span>
                  <span className="font-medium">{formatDate(certificate.date)}</span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
