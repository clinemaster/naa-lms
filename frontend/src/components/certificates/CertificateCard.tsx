import { Award, Download } from "lucide-react";
import { IconCard } from "@/components/shared/cards";
import { Button } from "@/components/ui/button";
import { formatDate, mediaUrl } from "@/lib/utils";
import type { Certificate } from "@/lib/types";

/** Extends IconCard with the certificate number, issue date and PDF download. */
export function CertificateCard({ certificate }: { certificate: Certificate }) {
  return (
    <IconCard
      icon={Award}
      title={`Certificate ${certificate.certificate_number}`}
      description={`Issued ${formatDate(certificate.date)}`}
    >
      {certificate.pdf && (
        <Button
          variant="outline"
          size="sm"
          render={
            <a href={mediaUrl(certificate.pdf)} target="_blank" rel="noreferrer">
              <Download className="h-4 w-4" /> Download PDF
            </a>
          }
        />
      )}
    </IconCard>
  );
}
