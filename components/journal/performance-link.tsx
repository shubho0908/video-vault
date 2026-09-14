"use client";

import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";
import type { AnchorHTMLAttributes, FocusEvent, MouseEvent } from "react";

type Props = Omit<LinkProps, "href"> &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    href: string;
  };

export function PerformanceLink({
  href,
  onMouseEnter,
  onFocus,
  ...props
}: Props) {
  const router = useRouter();
  const prefetch = () => router.prefetch(href.toString());

  return (
    <Link
      href={href}
      onMouseEnter={(event: MouseEvent<HTMLAnchorElement>) => {
        prefetch();
        onMouseEnter?.(event);
      }}
      onFocus={(event: FocusEvent<HTMLAnchorElement>) => {
        prefetch();
        onFocus?.(event);
      }}
      {...props}
    />
  );
}
