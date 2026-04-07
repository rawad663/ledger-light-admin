"use client";

import { cn } from "@/lib/utils";

type TeamStatCardProps = {
  label: string;
  value: number;
  tone: "emerald" | "amber" | "slate";
};

export function TeamStatCard({ label, value, tone }: TeamStatCardProps) {
  const toneClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50/60"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50/60"
        : "border-slate-200 bg-slate-50/60";

  return (
    <div className={cn("rounded-xl border p-5", toneClass)}>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}
