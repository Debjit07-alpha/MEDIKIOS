import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { Outlet } from "@tanstack/react-router";
import { ArrowRight, IdCard, UserRoundPlus } from "lucide-react";
import { KioskShell, PageHeading } from "@/components/kiosk/KioskShell";
import { BigChoice } from "@/components/kiosk/BigChoice";
import { useKiosk, useLanguage } from "@/lib/kiosk-hooks";

export const Route = createFileRoute("/identity/registration")({
  component: RegistrationPage,
});

function RegistrationPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { setIdentityMethod } = useKiosk();
  const { t } = useLanguage();
  const navigate = useNavigate();

  if (pathname !== "/identity/registration") return <Outlet />;

  return (
    <KioskShell step="identity">
      <PageHeading title={t("registrationTitle")} subtitle={t("registrationSubtitle")} />

      <div className="grid gap-4">
        <BigChoice
          icon={<UserRoundPlus className="size-8" />}
          title={t("registrationNew")}
          subtitle={t("registrationNewSub")}
          onClick={() => {
            setIdentityMethod("new");
            navigate({ to: "/identity/new-patient/form" });
          }}
          selected={false}
          trailing={
            <span className="grid size-11 place-items-center rounded-full border">
              <ArrowRight className="size-6" />
            </span>
          }
        />
        <BigChoice
          icon={<IdCard className="size-8" />}
          title={t("registrationExisting")}
          subtitle={t("registrationExistingSub")}
          onClick={() => {
            navigate({ to: "/identity/login" });
          }}
          selected={false}
          trailing={
            <span className="grid size-11 place-items-center rounded-full border">
              <ArrowRight className="size-6" />
            </span>
          }
        />
      </div>
    </KioskShell>
  );
}
