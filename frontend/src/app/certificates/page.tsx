"use client";

import { useQuery } from "@tanstack/react-query";
import { Award, Download } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { RequireRole } from "@/components/shared/RequireRole";
import { EmptyState } from "@/components/shared/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { certificateApi } from "@/lib/api/certificates";
import { mediaUrl, formatDate } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";

function CertificatesContent() {
  const { user } = useAuth();

  const { data: certificates, isLoading } = useQuery({
    queryKey: ["certificates", user?.id],
    queryFn: () => certificateApi.myCertificates(user!.id),
    enabled: !!user,
  });

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-3xl font-semibold">My Certificates</h1>

        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : !certificates || certificates.length === 0 ? (
          <EmptyState
            title="You have not earned any certificates yet. Complete a course to receive one."
            actionLabel="Explore Courses"
            actionHref="/courses"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {certificates.map((cert) => (
              <Card key={cert.id}>
                <CardContent className="flex items-start gap-4 pt-6">
                  <Award className="h-10 w-10 shrink-0 text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">Certificate {cert.certificate_number}</p>
                    <p className="text-sm text-muted-foreground">Issued {formatDate(cert.date)}</p>
                    {cert.pdf && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3"
                        render={
                          <a href={mediaUrl(cert.pdf)} target="_blank" rel="noreferrer">
                            <Download className="h-4 w-4" /> Download PDF
                          </a>
                        }
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

export default function CertificatesPage() {
  return (
    <RequireRole roles={["Student", "Teacher", "Admin"]}>
      <CertificatesContent />
    </RequireRole>
  );
}
