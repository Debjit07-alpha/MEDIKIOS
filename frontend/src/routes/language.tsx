import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Languages } from "lucide-react";
import { KioskShell, PageHeading } from "@/components/kiosk/KioskShell";
import { LANGUAGES } from "@/lib/kiosk-data";
import { useKiosk } from "@/lib/kiosk-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/language")({
  head: () => ({
    meta: [
      { title: "Choose your language — MediKiosk" },
      { name: "description", content: "Pick Hindi, English, Marathi, Bengali, Tamil, Telugu, Kannada or Gujarati for your kiosk visit." },
      { property: "og:title", content: "Choose your language — MediKiosk" },
      { property: "og:description", content: "MediKiosk speaks eight Indian languages so every patient is guided in their own words." },
    ],
  }),
  component: LanguagePage,
});

function LanguagePage() {
  const { language, setLanguage } = useKiosk();
  const navigate = useNavigate();

  return (
    <KioskShell step="language">
      <PageHeading
        title={<>अपनी भाषा चुनें / Choose your language</>}
        subtitle="भाषा चुनने के बाद आगे बढ़ें।"
        listenText="Choose your language. Touch your language, then touch Next."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => setLanguage(l.code)}
            aria-pressed={language === l.code}
            className={cn(
              "flex min-h-40 flex-col items-center justify-center gap-1 rounded-3xl border-2 bg-card p-6 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.99]",
              language === l.code ? "border-primary bg-primary-soft" : "border-border",
            )}
          >
            <Languages className="size-7 text-primary" />
            <span className="text-3xl font-extrabold">{l.native}</span>
            <span className="text-lg text-muted-foreground">{l.english}</span>
          </button>
        ))}
      </div>

      <div className="mt-10 flex justify-end">
        <button
          type="button"
          onClick={() => navigate({ to: "/consent" })}
          className="inline-flex min-h-20 items-center gap-3 rounded-full bg-primary px-12 text-3xl font-extrabold text-primary-foreground shadow-lift active:scale-[0.99]"
        >
          Next <ArrowRight className="size-8" />
        </button>
      </div>
    </KioskShell>
  );
}
