import React from "react";
import { Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowRight, IdCard, Fingerprint, UserRoundPlus } from "lucide-react";
import { KioskShell, PageHeading } from "@/components/kiosk/KioskShell";
import { BigChoice } from "@/components/kiosk/BigChoice";
import { useKiosk, useLanguage } from "@/lib/kiosk-hooks";

export const Route = createFileRoute("/identity")({
  component: IdentityPage,
});

// Use React.ReactNode instead of JSX.Element
interface IdentityOption {
  id: "abha" | "aadhaar" | "new";
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  working: string;
}

const OPTIONS: IdentityOption[] = [
  {
    id: "abha",
    icon: <IdCard className="size-8" />,
    title: "I have an ABHA health number",
    subtitle: "14 digit health ID card",
    working: "Reading your ABHA number...",
  },
  {
    id: "aadhaar",
    icon: <Fingerprint className="size-8" />,
    title: "Use my Aadhaar fingerprint",
    subtitle: "Place your thumb on the scanner",
    working: "Matching your fingerprint...",
  },
  {
    id: "new",
    icon: <UserRoundPlus className="size-8" />,
    title: "I am a new patient",
    subtitle: "First time in this hospital",
    working: "Creating your new record...",
  },
];

function IdentityPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { setIdentityMethod } = useKiosk();
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (pathname !== "/identity") return <Outlet />;

  return (
    <KioskShell step="identity">
      <PageHeading title={t("identityTitle")} subtitle={t("identitySubtitle")} />

      <div className="grid gap-4">
        {OPTIONS.map((o: IdentityOption) => {
          const copy =
            o.id === "abha"
              ? {
                  title: t("identityAbha"),
                  subtitle: t("identityAbhaSub"),
                }
              : o.id === "aadhaar"
                ? {
                    title: t("identityAadhaar"),
                    subtitle: t("identityAadhaarSub"),
                  }
                : {
                    title: t("identityNew"),
                    subtitle: t("identityNewSub"),
                  };
          return (
            <BigChoice
              key={o.id}
              icon={o.icon}
              title={copy.title}
              subtitle={copy.subtitle}
              onClick={() => {
                setIdentityMethod(o.id);
                if (o.id === "aadhaar") {
                  navigate({ to: "/identity/aadhaar" });
                } else if (o.id === "abha") {
                  navigate({ to: "/identity/abha" });
                } else {
                  navigate({ to: "/identity/new-patient" });
                }
              }}
              selected={false}
              trailing={
                <span className="grid size-11 place-items-center rounded-full border">
                  <ArrowRight className="size-6" />
                </span>
              }
            />
          );
        })}
      </div>
    </KioskShell>
  );
}
