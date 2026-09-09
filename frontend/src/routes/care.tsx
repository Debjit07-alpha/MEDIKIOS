import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Stethoscope, Leaf } from "lucide-react";
import { KioskShell, PageHeading } from "@/components/kiosk/KioskShell";
import { useKiosk, useLanguage } from "@/lib/kiosk-hooks";
import type { CareMode } from "@/lib/kiosk-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/care")({
  head: () => ({
    meta: [
      { title: "Choose your treatment — Allopathy or AYUSH — MediKiosk" },
      {
        name: "description",
        content:
          "Pick modern medicine or AYUSH care. MediKiosk then asks the right history questions for that system.",
      },
      { property: "og:title", content: "Allopathy or AYUSH — MediKiosk" },
      {
        property: "og:description",
        content: "Two clear care pathways with history workflows tuned to each system of medicine.",
      },
    ],
  }),
  component: CarePage,
});

const CARDS: {
  mode: CareMode;
  icon: typeof Stethoscope;
}[] = [
  { mode: "allopathy", icon: Stethoscope },
  { mode: "ayush", icon: Leaf },
];

function CarePage() {
  const { setCareMode, careMode } = useKiosk();
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <KioskShell step="care">
      <PageHeading
        title={t("careTitle")}
        subtitle={t("careSubtitle")}
        listenText={`${t("careTitle")} ${t("modernMedicine")}, ${t("ayushCare")}. ${t("careSubtitle")}`}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {CARDS.map((c) => {
          const ayush = c.mode === "ayush";
          const title = ayush ? t("ayushCare") : t("modernMedicine");
          const sub = ayush ? t("ayushCareSub") : t("modernMedicineSub");
          const native = ayush ? t("careAyushNative") : t("careAllopathyNative");
          const points = [
            ...(ayush
              ? [
                  t("careAyushPoint1"),
                  t("careAyushPoint2"),
                  t("careAyushPoint3"),
                  t("careAyushPoint4"),
                ]
              : [
                  t("careModernPoint1"),
                  t("careModernPoint2"),
                  t("careModernPoint3"),
                  t("careModernPoint4"),
                ]),
          ];
          return (
            <div
              key={c.mode}
              className={cn(
                "animate-rise flex flex-col rounded-4xl border-2 bg-card p-7 shadow-card",
                careMode === c.mode ? (ayush ? "border-ayush" : "border-primary") : "border-border",
              )}
            >
              <span
                className={cn(
                  "grid size-20 place-items-center rounded-3xl",
                  ayush ? "bg-ayush text-ayush-foreground" : "bg-primary text-primary-foreground",
                )}
              >
                <c.icon className="size-10" />
              </span>
              <h2 className="mt-6 text-4xl">{title}</h2>
              <p className={cn("text-3xl font-extrabold", ayush ? "text-ayush" : "text-primary")}>
                {native}
              </p>
              <p className="mt-3 text-xl text-muted-foreground">{sub}</p>
              <ul className="mt-5 flex-1 space-y-3">
                {points.map((p) => (
                  <li key={p} className="flex items-center gap-3 text-xl">
                    <span
                      className={cn(
                        "size-3 shrink-0 rounded-full",
                        ayush ? "bg-ayush" : "bg-primary",
                      )}
                    />
                    {p}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  setCareMode(c.mode);
                  navigate({ to: "/dashboard" });
                }}
                className={cn(
                  "mt-7 min-h-20 rounded-3xl text-2xl font-extrabold shadow-lift active:scale-[0.99]",
                  ayush ? "bg-ayush text-ayush-foreground" : "bg-primary text-primary-foreground",
                )}
              >
                {t("chooseThis")}
              </button>
            </div>
          );
        })}
      </div>
    </KioskShell>
  );
}
