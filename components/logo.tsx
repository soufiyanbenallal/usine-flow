import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoMarkProps {
  className?: string;
  size?: number;
}

export function LogoMark({ className, size = 28 }: LogoMarkProps) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        className,
      )}
    >
      <Image
        src="/usineflow-mark.png"
        alt="UsineFlow"
        width={size}
        height={Math.round((size * 579) / 720)}
        className="size-full object-contain"
        priority
      />
    </span>
  );
}

interface LogoProps {
  className?: string;
  dark?: boolean;
  size?: "sm" | "md" | "lg";
  variant?: "brand" | "full-image";
}

export function Logo({
  className,
  dark,
  size = "md",
  variant = "brand",
}: LogoProps) {
  if (variant === "full-image") {
    const dimensions = {
      sm: { width: 98, height: 24, className: "h-6" },
      md: { width: 122, height: 30, className: "h-7.5" },
      lg: { width: 146, height: 36, className: "h-9" },
    };
    const dim = dimensions[size];
    return (
      <span className={cn("inline-flex items-center", className)}>
        <Image
          src="/usineflow.png"
          alt="UsineFlow"
          width={dim.width}
          height={dim.height}
          className={cn(dim.className, "w-auto object-contain")}
          priority
        />
      </span>
    );
  }

  const markSizeMap = {
    sm: "size-6",
    md: "size-7.5",
    lg: "size-9",
  };

  const textMap = {
    sm: "text-base",
    md: "text-lg",
    lg: "text-xl",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 font-semibold tracking-tight select-none",
        className,
      )}
    >
      <LogoMark className={markSizeMap[size]} />
      <span
        className={cn(
          textMap[size],
          "font-bold tracking-tight text-foreground transition-colors leading-none",
          dark && "text-white",
        )}
      >
        <span className="text-[#0d7377] dark:text-[#2dd4bf]">Usine</span>
        <span className={cn(dark ? "text-white" : "text-zinc-900 dark:text-white")}>
          Flow
        </span>
      </span>
    </span>
  );
}


