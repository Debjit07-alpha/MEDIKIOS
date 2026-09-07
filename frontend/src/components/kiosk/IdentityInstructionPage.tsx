import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { ArrowRight, Fingerprint, IdCard, UserRoundPlus } from "lucide-react";
import { KioskShell, PageHeading } from "./KioskShell";
import { ListenButton } from "./ListenButton";
import { useKiosk, useLanguage } from "@/lib/kiosk-hooks";
import type { TranslationKey } from "@/lib/i18n";

type IdentityMethod = "aadhaar" | "abha" | "new";

type Props = {
  method: IdentityMethod;
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  instructionTitleKey: TranslationKey;
  instructionKey: TranslationKey;
  listenKey: TranslationKey;
  startKey: TranslationKey;
  startTo: "/identity/aadhaar/scan" | "/identity/abha/input" | "/identity/new-patient/form";
};

const ICONS = {
  aadhaar: Fingerprint,
  abha: IdCard,
  new: UserRoundPlus,
};

export function IdentityInstructionPage({
  method,
  titleKey,
  subtitleKey,
  instructionTitleKey,
  instructionKey,
  listenKey,
  startKey,
  startTo,
}: Props) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { t } = useLanguage();
  const { setIdentityMethod, clearIdentityMethod } = useKiosk();
  const Icon = ICONS[method];
  const instruction = t(instructionKey);
  const basePath = method === "new" ? "/identity/new-patient" : `/identity/${method}`;

  if (pathname !== basePath) return <Outlet />;

  const goBack = () => {
    clearIdentityMethod();
    navigate({ to: "/identity" });
  };

  const start = () => {
    setIdentityMethod(method);
    navigate({ to: startTo });
  };

  return (
    <KioskShell step="identity">
      <PageHeading title={t(titleKey)} subtitle={t(subtitleKey)} />

      <div className="mx-auto max-w-3xl rounded-4xl border-2 border-border bg-card p-8 text-center shadow-card sm:p-10">
        <span className="mx-auto grid size-32 place-items-center rounded-4xl bg-accent text-primary">
          <Icon className="size-20" />
        </span>
        <h2 className="mt-8 text-3xl font-extrabold sm:text-4xl">{t(instructionTitleKey)}</h2>
        <p className="mx-auto mt-3 max-w-2xl text-xl text-muted-foreground sm:text-2xl">
          {instruction}
        </p>
        <div className="mt-7 flex justify-center">
          <ListenButton text={`${t(instructionTitleKey)}. ${instruction}`} label={t(listenKey)} />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <button
          type="button"
          onClick={start}
          className="inline-flex min-h-20 items-center gap-3 rounded-full bg-primary px-10 text-2xl font-extrabold text-primary-foreground shadow-lift active:scale-[0.99]"
        >
          {t(startKey)} <ArrowRight className="size-7" />
        </button>
        <button
          type="button"
          onClick={goBack}
          className="inline-flex min-h-20 items-center justify-center rounded-full border-2 border-border bg-card px-10 text-2xl font-bold active:scale-[0.99]"
        >
          {t("back")}
        </button>
      </div>
    </KioskShell>
  );
}
