import type { Metadata } from "next";

import {
  LegalDocument,
  Email,
  P,
  UL,
  type LegalDoc,
} from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern the use of Shubhojeet's Videos — a private, single-owner learning journal secured with Google sign-in.",
};

const doc: LegalDoc = {
  kicker: "Legal · Terms",
  title: "Terms of Service",
  intro: (
    <p>
      These terms govern your use of Shubhojeet&apos;s Videos, a personal
      learning journal for notes and unlisted YouTube references. They are
      intentionally short and written to be readable.
    </p>
  ),
  sections: [
    {
      id: "acceptance",
      title: "Acceptance of terms",
      body: (
        <P>
          By accessing or using the service — including by signing in with
          Google — you agree to be bound by these terms and our{" "}
          <a
            href="/privacy"
            className="pg-a"
          >
            Privacy Policy
          </a>
          . If you do not agree, do not use the service.
        </P>
      ),
    },
    {
      id: "service",
      title: "What the service is",
      body: (
        <P>
          The service provides a private space for a single designated owner to
          keep journal entries: short-form explanations, written notes, links to
          unlisted YouTube videos, and attached images. It is provided on a
          personal basis and offers no public-facing features.
        </P>
      ),
    },
    {
      id: "accounts",
      title: "Accounts & eligibility",
      body: (
        <>
          <UL
            items={[
              "Sign-in is available exclusively through Google authentication.",
              "Access is restricted to the designated owner account; sign-in attempts from any other Google account are refused.",
              "You are responsible for keeping your Google account secure and for all activity that occurs under your session.",
            ]}
          />
        </>
      ),
    },
    {
      id: "use-policy",
      title: "Acceptable use",
      body: (
        <>
          <P>You agree not to use the service to:</P>
          <UL
            items={[
              "Store or share content that is unlawful, infringing, or violates any third party's rights.",
              "Embed or link material in violation of the platform hosting it, including YouTube's Terms of Service.",
              "Probe, scan, or test the vulnerability of the service, attempt unauthorized access, scrape it programmatically, or interfere with its normal operation.",
            ]}
          />
        </>
      ),
    },
    {
      id: "content",
      title: "Your content",
      body: (
        <>
          <P>
            You retain ownership of everything you write or upload to the
            journal. You grant the operator only the limited technical right to
            store, back up, and display your content within the service for you.
          </P>
          <P>
            You are solely responsible for your entries, including the legality
            of any third-party material (such as embedded videos) you link to.
          </P>
        </>
      ),
    },
    {
      id: "third-party",
      title: "Third-party services",
      body: (
        <P>
          The service relies on third parties — Google (authentication), a
          hosting/database provider, an image-delivery provider, and
          YouTube&apos;s embed player for video playback. Those services have
          their own terms and privacy policies, and the operator is not
          responsible for their availability, actions, or changes.
        </P>
      ),
    },
    {
      id: "availability",
      title: "Availability & changes",
      body: (
        <P>
          The service is provided on an “as is” and “as available” basis. It may
          be modified, suspended, or discontinued at any time, with or without
          notice. Downtime, data loss from causes outside reasonable control, or
          feature changes are not grounds for any claim.
        </P>
      ),
    },
    {
      id: "warranty",
      title: "Disclaimers",
      body: (
        <P>
          To the fullest extent permitted by law, the service disclaims all
          warranties, express or implied, including merchantability, fitness for
          a particular purpose, and non-infringement. No advice or information
          obtained through the service creates any warranty.
        </P>
      ),
    },
    {
      id: "liability",
      title: "Limitation of liability",
      body: (
        <P>
          To the fullest extent permitted by law, the operator will not be
          liable for any indirect, incidental, special, consequential, or
          punitive damages — including loss of data, profits, or goodwill —
          arising from your use of or inability to use the service.
        </P>
      ),
    },
    {
      id: "termination",
      title: "Termination",
      body: (
        <P>
          Access may be revoked at any time if these terms are breached or if
          the owner discontinues the service. You may stop using the service at
          any time; on request, associated data will be deleted as described in
          the Privacy Policy.
        </P>
      ),
    },
    {
      id: "changes-terms",
      title: "Changes to these terms",
      body: (
        <P>
          These terms may be updated from time to time. Changes take effect when
          posted on this page with a new “last updated” date, and continued use
          of the service after that constitutes acceptance.
        </P>
      ),
    },
    {
      id: "contact",
      title: "Contact",
      body: (
        <P>
          Questions about these terms? Contact the operator at <Email />.
        </P>
      ),
    },
  ],
};

export default function TermsPage() {
  return (
    <LegalDocument doc={doc} />
  );
}

