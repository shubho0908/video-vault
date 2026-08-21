import { cn } from "@/lib/utils";

export function VaultMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "glow-primary grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground",
        className
      )}
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-4" aria-hidden="true">
        <path
          d="M10.4 8.6v6.8c0 .52.58.83 1.01.54l5.13-3.4a.65.65 0 0 0 0-1.08l-5.13-3.4a.65.65 0 0 0-1.01.54Z"
          fill="currentColor"
        />
        <path d="M7.1 7.1v9.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    </span>
  );
}
