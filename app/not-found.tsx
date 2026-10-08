import Link from "next/link";

import { FolderIcon } from "@/components/finder/icons";
import { PageShell } from "@/components/finder/page-shell";

export default function NotFound() {
  return (
    <PageShell title="Not Found" back="/dashboard" backLabel="Library" alert>
      <div className="pg-ic">
        <FolderIcon size={72} id="nf" />
        <i aria-hidden="true">?</i>
      </div>
      <h2>This page isn&apos;t in the vault.</h2>
      <p>The entry you are looking for may have been deleted or never existed.</p>
      <div className="pg-actions">
        <Link href="/dashboard" className="pg-btn" data-primary="true">Back to dashboard</Link>
      </div>
    </PageShell>
  );
}
