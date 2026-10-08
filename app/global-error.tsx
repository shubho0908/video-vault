"use client";

import { FolderIcon } from "@/components/finder/icons";
import { PageShell } from "@/components/finder/page-shell";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en" className="dark">
      <body>
        <PageShell title="Error" back="/" backLabel="Home" alert>
          <div className="pg-ic">
            <FolderIcon size={72} id="ge" />
            <i aria-hidden="true">!</i>
          </div>
          <h2>Something went wrong.</h2>
          <p>The app could not be shown. You can try again.</p>
          <div className="pg-actions">
            <button type="button" className="pg-btn" data-primary="true" onClick={reset}>Try Again</button>
          </div>
        </PageShell>
      </body>
    </html>
  );
}
