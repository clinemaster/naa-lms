"use client";

import { useQuery } from "@tanstack/react-query";
import { certificateApi } from "@/lib/api/certificates";
import { useAuth } from "@/context/AuthContext";
import { EmptyState, Page, PageHeader, RequireRole, SectionSkeleton } from "@/components/shared";
import { CertificateCard } from "@/components/certificates/CertificateCard";

function CertificatesContent() {
  const { user } = useAuth();

  const { data: certificates, isLoading } = useQuery({
    queryKey: ["certificates", user?.id],
    queryFn: () => certificateApi.myCertificates(user!.id),
    enabled: !!user,
  });

  return (
    <>
      <Page width="md">
        <PageHeader title="My Certificates" />

        {isLoading ? (
          <SectionSkeleton />
        ) : !certificates || certificates.length === 0 ? (
          <EmptyState
            title="You have not earned any certificates yet. Complete a course to receive one."
            actionLabel="Explore Courses"
            actionHref="/courses"
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {certificates.map((cert) => (
              <CertificateCard key={cert.id} certificate={cert} />
            ))}
          </div>
        )}
      </Page>
    </>
  );
}

export default function CertificatesPage() {
  return (
    <RequireRole roles={["Student", "Teacher", "Admin", "Academy Admin"]}>
      <CertificatesContent />
    </RequireRole>
  );
}
