"use client";

import { X } from "lucide-react";
import { AssistantChat } from "@/features/ai/assistant-chat";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Right-hand assistant panel: chat over the organization's own data (read-only tools). */
export function AssistantPanel({
  onClose,
  className,
}: {
  onClose: () => void;
  className?: string;
}) {
  const t = useT();
  return (
    <aside
      className={cn(
        "flex h-full w-95 shrink-0 flex-col rounded-2xl bg-background",
        className,
      )}
      aria-label={t("Assistant UsineFlow")}
    >
      <div className="flex h-14 items-center justify-between px-4">
        <span className="rounded-full border px-3 py-1.5 text-[13px] font-medium">
          {t("Assistant IA")}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("Fermer")}
          className="grid size-8 place-items-center rounded-full hover:bg-secondary"
        >
          <X className="size-4" />
        </button>
      </div>
      <AssistantChat compact />
    </aside>
  );
}
