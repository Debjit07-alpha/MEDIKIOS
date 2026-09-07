import { createFileRoute } from "@tanstack/react-router";
import { IdentityInstructionPage } from "@/components/kiosk/IdentityInstructionPage";

export const Route = createFileRoute("/identity/aadhaar")({
  component: AadhaarInstructionPage,
});

function AadhaarInstructionPage() {
  return (
    <IdentityInstructionPage
      method="aadhaar"
      titleKey="identityAadhaarTitle"
      subtitleKey="identityAadhaarSubtitle"
      instructionTitleKey="identityAadhaarInstructionTitle"
      instructionKey="identityAadhaarInstruction"
      listenKey="identityAadhaarListen"
      startKey="identityAadhaarStart"
      startTo="/identity/aadhaar/scan"
    />
  );
}
