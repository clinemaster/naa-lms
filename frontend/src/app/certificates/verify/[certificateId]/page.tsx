import { VerifyClient } from "./VerifyClient";

export default async function VerifyCertificatePage({ params }: PageProps<"/certificates/verify/[certificateId]">) {
  const { certificateId } = await params;
  return <VerifyClient certificateId={certificateId} />;
}
