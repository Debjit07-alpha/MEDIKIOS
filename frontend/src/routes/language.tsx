import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Languages, Search, X } from "lucide-react";
import { KioskShell, PageHeading } from "@/components/kiosk/KioskShell";
import {
  getAllLanguages,
  getPopularLanguages,
  type LanguageCode,
  type LanguageConfig,
} from "@/lib/languages";
import { useKiosk, useLanguage } from "@/lib/kiosk-hooks";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/language")({
  head: () => ({
    meta: [
      { title: "Choose your language — MediKiosk" },
      {
        name: "description",
        content:
          "Pick one of 23 Indian languages — Hindi, English, Marathi, Bengali, Tamil, Telugu, Kannada, Gujarati and more — for your kiosk visit.",
      },
      { property: "og:title", content: "Choose your language — MediKiosk" },
      {
        property: "og:description",
        content: "MediKiosk guides every patient in their own Indian language.",
      },
    ],
  }),
  component: LanguagePage,
});

function LanguageCard({
  lang,
  selected,
  onSelect,
}: {
  lang: LanguageConfig;
  selected: boolean;
  onSelect: (code: LanguageCode) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(lang.code)}
      aria-pressed={selected}
      aria-label={`${lang.nativeName} (${lang.name})`}
      className={cn(
        "flex min-h-40 flex-col items-center justify-center gap-1 rounded-3xl border-2 bg-card p-6 text-center shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift active:scale-[0.99]",
        selected ? "border-primary bg-primary-soft" : "border-border",
      )}
    >
      <Languages className="size-7 text-primary" />
      <span className="text-3xl font-extrabold leading-tight">{lang.nativeName}</span>
      <span className="text-lg text-muted-foreground">{lang.name}</span>
    </button>
  );
}

function LanguageSection({
  title,
  langs,
  empty,
  selected,
  onSelect,
}: {
  title: string;
  langs: LanguageConfig[];
  empty?: string;
  selected: LanguageCode;
  onSelect: (code: LanguageCode) => void;
}) {
  return (
    <section aria-label={title} className="mb-8">
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="text-2xl font-extrabold">{title}</h2>
        <span className="text-lg font-semibold text-muted-foreground">{langs.length}</span>
      </div>
      {langs.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {langs.map((lang) => (
            <LanguageCard
              key={lang.code}
              lang={lang}
              selected={selected === lang.code}
              onSelect={onSelect}
            />
          ))}
        </div>
      ) : empty ? (
        <p
          role="status"
          className="rounded-2xl border-2 border-dashed border-border bg-card p-10 text-center text-2xl text-muted-foreground"
        >
          {empty}
        </p>
      ) : null}
    </section>
  );
}

function LanguagePage() {
  const { language, setLanguage } = useKiosk();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const q = query.trim().toLocaleLowerCase();
  const searching = q.length > 0;
  const matches = (lang: LanguageConfig) =>
    lang.name.toLocaleLowerCase().includes(q) || lang.nativeName.toLocaleLowerCase().includes(q);

  const popular = searching ? [] : getPopularLanguages();
  const all = searching ? getAllLanguages().filter(matches) : getAllLanguages();

  return (
    <KioskShell step="language">
      <PageHeading
        title={t("languageTitle")}
        subtitle={t("languageSubtitle")}
        listenText={t("languageListen")}
      />

      <div className="relative mb-8">
        <Search className="pointer-events-none absolute left-5 top-1/2 size-7 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchLanguages")}
          aria-label={t("searchLanguages")}
          enterKeyHint="search"
          className="w-full rounded-full border-2 border-border bg-card pl-14 pr-16 py-4 text-2xl text-foreground placeholder:text-muted-foreground/70 focus:border-primary focus:outline-none"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label={t("clearSearch")}
            className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-muted text-muted-foreground active:scale-95"
          >
            <X className="size-5" />
          </button>
        ) : null}
      </div>

      <div className="space-y-2">
        {!searching ? (
          <LanguageSection
            title={t("popularLanguages")}
            langs={popular}
            selected={language}
            onSelect={setLanguage}
          />
        ) : null}

        <LanguageSection
          title={t("allIndianLanguages")}
          langs={all}
          selected={language}
          onSelect={setLanguage}
          {...(searching ? { empty: t("noLanguagesFound") } : {})}
        />
      </div>

      <div className="mt-10 flex justify-end">
        <button
          type="button"
          onClick={() => navigate({ to: "/consent" })}
          className="inline-flex min-h-20 items-center gap-3 rounded-full bg-primary px-12 text-3xl font-extrabold text-primary-foreground shadow-lift active:scale-[0.99]"
        >
          {t("next")} <ArrowRight className="size-8" />
        </button>
      </div>
    </KioskShell>
  );
}
