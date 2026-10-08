import Link from "next/link";
import type { ReactNode } from "react";

import { PageShell } from "@/components/finder/page-shell";

export const LEGAL_CONTACT_EMAIL = "hey@shubhojeet.com";

export const LEGAL_LAST_UPDATED = "February 2026";

export type LegalSection = {
  id: string;
  title: string;
  body: ReactNode;
};

export type LegalDoc = {
  kicker: string;
  title: string;
  intro: ReactNode;
  sections: LegalSection[];
};

function Email({ children }: { children?: ReactNode }) {
  return (
    <a href={`mailto:${LEGAL_CONTACT_EMAIL}`} className="pg-a">
      {children ?? LEGAL_CONTACT_EMAIL}
    </a>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p className="pg-p">{children}</p>;
}

function UL({ items }: { items: ReactNode[] }) {
  return (
    <ul className="pg-ul">
      {items.map((item, index) => (
        <li key={index}>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export { Email, P, UL };

export function LegalDocument({ doc }: { doc: LegalDoc }) {
  return (
    <PageShell
      title={doc.title}
      back="/sign-in"
      backLabel="Sign In"
      nav={doc.sections.map(section => ({ href: `#${section.id}`, label: section.title }))}
    >
      <article className="pg-doc">
        <h2 className="pg-h1">{doc.title}</h2>
        <div className="pg-lede">{doc.intro}</div>
        <p className="pg-meta">Last updated {LEGAL_LAST_UPDATED}</p>
        {doc.sections.map(section => (
          <section key={section.id} id={section.id} className="pg-sec">
            <h3>{section.title}</h3>
            {section.body}
          </section>
        ))}
        <footer className="pg-foot">
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/terms">Terms of Service</Link>
          <span>
            Questions? <Email />
          </span>
        </footer>
      </article>
    </PageShell>
  );
}
