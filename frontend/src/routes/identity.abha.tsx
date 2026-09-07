import { createFileRoute } from "@tanstack/react-router";
import { IdentityInstructionPage } from "@/components/kiosk/IdentityInstructionPage";

export const Route = createFileRoute("/identity/abha")({
  component: AbhaInstructionPage,
});

function AbhaInstructionPage() {
  return (
    <IdentityInstructionPage
      method="abha"
      titleKey="identityAbhaTitle"
      subtitleKey="identityAbhaSubtitle"
      instructionTitleKey="identityAbhaInstructionTitle"
      instructionKey="identityAbhaInstruction"
      listenKey="identityAbhaListen"
      startKey="identityAbhaStart"
      startTo="/identity/abha/input"
    />
  );
}
