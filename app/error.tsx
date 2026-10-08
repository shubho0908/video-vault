"use client";

import Link from "next/link";

import { FolderIcon } from "@/components/finder/icons";
import { PageShell } from "@/components/finder/page-shell";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <PageShell title="Error" back="/dashboard" backLabel="Library" alert>
      <div className="pg-ic">
        <FolderIcon size={72} id="er" />
        <i aria-hidden="true">!</i>
      </div>
      <h2>Something went wrong.</h2>
      <p>The page could not be shown. You can try again or go back to your library.</p>
      <div className="pg-actions">
        <button type="button" className="pg-btn" onClick={reset}>Try Again</button>
        <Link href="/dashboard" className="pg-btn" data-primary="true">Back to dashboard</Link>
      </div>
    </PageShell>
  );
}
