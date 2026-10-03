import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-[#1a1a1a] text-white ring-1 ring-black/10 dark:ring-white/10 shadow-xs",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="size-4"
        aria-hidden="true"
      >
        <path
          d="M4 19V5M4 12H11C13.2091 12 15 13.7909 15 16V19M11 5L15 9M15 9L19 5M15 9V19"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Logo({
  className,
  dark,
}: {
  className?: string;
  dark?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-semibold tracking-tight",
        className,
      )}
    >
      <LogoMark />
      <span className={cn("text-lg font-bold tracking-tight", dark && "text-white")}>
        Usine<span className="text-muted-foreground font-normal">Flow</span>
      </span>
    </span>
  );
}
