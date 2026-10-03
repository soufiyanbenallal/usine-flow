"use client";

import { AudioLines, Plus, Sparkles, X } from "lucide-react";
import { Banner } from "@xco-agency/corex-ui";

import { cn } from "@/lib/utils";

const prompts = [
  "Quel ordre de fabrication est en retard ?",
  "État des stocks de matières premières",
  "Ordres de maintenance prévus cette semaine",
];

/** Right-hand assistant panel. Visual placeholder — the AI assistant is a V2 feature. */
export function AssistantPanel({
  onClose,
  className,
}: {
  onClose: () => void;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        "flex h-full w-95 shrink-0 flex-col rounded-2xl bg-background",
        className,
      )}
      aria-label="Assistant UsineFlow"
    >
      <div className="flex h-14 items-center justify-between px-4">
        <span className="rounded-full border px-3 py-1.5 text-[13px] font-medium">
          Récents
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer"
          className="grid size-8 place-items-center rounded-full hover:bg-secondary"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        <span className="grid size-12 place-items-center rounded-2xl bg-[#1a1a1a] text-brand">
          <Sparkles className="size-6" />
        </span>
        <h2 className="text-2xl font-semibold tracking-tight">
          Par où commencer ?
        </h2>
        <div className="flex w-full flex-col gap-2">
          {prompts.map((p) => (
            <div
              key={p}
              className="rounded-lg border px-3 py-2 text-left text-[13px] text-muted-foreground"
            >
              {p}
            </div>
          ))}
        </div>
        <Banner tone="info">
          <strong className="block">Bientôt disponible</strong>
          L’assistant IA industriel de UsineFlow arrive avec la version 2.
        </Banner>
      </div>
      <div className="m-3 flex items-center gap-2 rounded-2xl border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        <span className="flex-1">Demander à UsineFlow…</span>
        <Plus className="size-4" />
        <AudioLines className="size-4" />
      </div>
    </aside>
  );
}
