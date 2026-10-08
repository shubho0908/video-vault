import Link from "next/link";
import type { ReactNode } from "react";

import { AppleGlyph } from "./icons";
import "./finder.css";
import "./welcome.css";
import "./pages.css";

export type PageNavItem = { href: string; label: string };

export function PageShell({
  title,
  back = "/sign-in",
  backLabel = "Back",
  nav,
  navTitle = "On this page",
  alert = false,
  children,
}: {
  title: string;
  back?: string;
  backLabel?: string;
  nav?: PageNavItem[];
  navTitle?: string;
  alert?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="fx wl-root pg-root" data-os="mac">
      <div className="wl-wall" />
      <div className="wl-mbar pg-mbar">
        <span className="pg-mb-l"><AppleGlyph /><b>Shubhojeet&apos;s Videos</b></span>
      </div>
      <div className="pg-stage">
        <section className={`fx-window pg-window${alert ? " pg-alert" : ""}`} data-active="true" aria-label={title}>
          <header className="pg-bar">
            <div className="pg-tl">
              <Link href={back} className="r" aria-label={backLabel} />
              <span className="y" />
              <span className="g" />
            </div>
            <Link href={back} className="pg-back">
              <svg width="9" height="15" viewBox="0 0 9 15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M7.5 1.5 1.8 7.5l5.7 6" /></svg>
              <span>{backLabel}</span>
            </Link>
            <h1 className="pg-title">{title}</h1>
          </header>
          <div className="pg-body">
            {nav?.length ? (
              <nav className="fx-sidebar pg-side" aria-label={navTitle}>
                <div>
                  <div className="fx-side-h">{navTitle}</div>
                  {nav.map(item => (
                    <a key={item.href} className="fx-side-row" href={item.href}><span>{item.label}</span></a>
                  ))}
                </div>
              </nav>
            ) : null}
            <div className="pg-scroll">{children}</div>
          </div>
        </section>
      </div>
    </div>
  );
}
