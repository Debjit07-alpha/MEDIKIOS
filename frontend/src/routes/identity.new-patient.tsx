import { createFileRoute } from "@tanstack/react-router";
import { IdentityInstructionPage } from "@/components/kiosk/IdentityInstructionPage";

export const Route = createFileRoute("/identity/new-patient")({
  component: NewPatientInstructionPage,
});

function NewPatientInstructionPage() {
  return (
    <IdentityInstructionPage
      method="new"
      titleKey="identityNewTitle"
      subtitleKey="identityNewSubtitle"
      instructionTitleKey="identityNewInstructionTitle"
      instructionKey="identityNewInstruction"
      listenKey="identityNewListen"
      startKey="identityNewStart"
      startTo="/identity/new-patient/form"
    />
  );
}
