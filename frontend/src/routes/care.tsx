import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Stethoscope, Leaf } from "lucide-react";
import { KioskShell, PageHeading } from "@/components/kiosk/KioskShell";
import { useKiosk } from "@/lib/kiosk-store";
import type { CareMode } from "@/lib/kiosk-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/care")({
  head: () => ({
    meta: [
      { title: "Choose your treatment — Allopathy or AYUSH — MediKiosk" },
      { name: "description", content: "Pick modern medicine or AYUSH care. MediKiosk then asks the right history questions for that system." },
      { property: "og:title", content: "Allopathy or AYUSH — MediKiosk" },
      { property: "og:description", content: "Two clear care pathways with history workflows tuned to each system of medicine." },
    ],
  }),
  component: CarePage,
});

const CARDS: {
  mode: CareMode;
  icon: typeof Stethoscope;
  title: string;
  native: string;
  sub: string;
  points: string[];
}[] = [
  {
    mode: "allopathy",
    icon: Stethoscope,
    title: "Modern medicine",
    native: "एलोपैथी",
    sub: "OPD doctor, tests and tablets",
    points: ["Your main problem", "Old illness and operations", "Medicines and allergy", "Family and habits"],
  },
  {
    mode: "ayush",
    icon: Leaf,
    title: "AYUSH care",
    native: "आयुष",
    sub: "Ayurveda, Yoga, Unani, Siddha, Homoeopathy",
    points: ["Your body nature", "Digestion and strength", "Sleep, mind and habits", "How the problem grew"],
  },
];

function CarePage() {
  const { setCareMode, careMode } = useKiosk();
  const navigate = useNavigate();

  return (
    <KioskShell step="care">
      <PageHeading
        title="Which treatment do you want today?"
        subtitle="Both are available in this hospital. You can change it later with the doctor."
        listenText="Which treatment do you want today? Modern medicine, or AYUSH care. Both are available in this hospital."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {CARDS.map((c) => {
          const ayush = c.mode === "ayush";
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
              <h2 className="mt-6 text-4xl">{c.title}</h2>
              <p className={cn("text-3xl font-extrabold", ayush ? "text-ayush" : "text-primary")}>
                {c.native}
              </p>
              <p className="mt-3 text-xl text-muted-foreground">{c.sub}</p>
              <ul className="mt-5 flex-1 space-y-3">
                {c.points.map((p) => (
                  <li key={p} className="flex items-center gap-3 text-xl">
                    <span
                      className={cn("size-3 shrink-0 rounded-full", ayush ? "bg-ayush" : "bg-primary")}
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
                  ayush
                    ? "bg-ayush text-ayush-foreground"
                    : "bg-primary text-primary-foreground",
                )}
              >
                Choose this
              </button>
            </div>
          );
        })}
      </div>
    </KioskShell>
  );
}
