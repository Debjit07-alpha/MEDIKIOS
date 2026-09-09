import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export interface MediKioskLogoProps extends ComponentPropsWithoutRef<"img"> {
  variant?: "bare" | "badge";
  badgeClassName?: string;
}

/**
 * MediKiosk care mark brand logo.
 * Replaces the old heart icon with the multi-colored family care & cross reference mark.
 */
export function MediKioskLogo({
  variant = "badge",
  className,
  badgeClassName,
  alt = "MediKiosk",
  ...props
}: MediKioskLogoProps) {
  if (variant === "bare") {
    return (
      <img
        src="/medikiosk-logo.svg"
        alt={alt}
        className={cn("shrink-0 object-contain", className)}
        {...props}
      />
    );
  }

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-white p-1.5 shadow-xs ring-1 ring-border/60",
        badgeClassName ?? className,
      )}
    >
      <img src="/medikiosk-logo.svg" alt={alt} className="size-full object-contain" {...props} />
    </span>
  );
}
