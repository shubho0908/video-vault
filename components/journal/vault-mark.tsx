import Image from "next/image";

import { cn } from "@/lib/utils";

export function VaultMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "glow-primary relative block size-8 shrink-0 overflow-hidden rounded-lg",
        className
      )}
    >
      <Image
        src="/logo.png"
        alt=""
        aria-hidden="true"
        fill
        sizes="48px"
        className="object-cover"
      />
    </span>
  );
}
