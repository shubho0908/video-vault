import type { Metadata } from "next";

import {
  LegalDocument,
  P,
  UL,
  type LegalDoc,
} from "@/components/legal/legal-document";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Shubhojeet's Videos collects, uses, and protects information — including Google sign-in data — for this private learning journal.",
};

const doc: LegalDoc = {
  kicker: "Legal · Privacy",
  title: "Privacy Policy",
  intro: (
    <p>
      Shubhojeet&apos;s Videos is a personal, single-owner learning journal.
      This policy explains, in plain language, what information the service
      handles when you sign in with Google or use the journal, and exactly what
      we do — and never do — with it.
    </p>
  ),
  sections: [
    {
      id: "overview",
      title: "Overview",
      body: (
        <>
          <P>
            The service is a private notebook for recording explanations, notes,
            and links to unlisted YouTube videos. Access is restricted to a
            single designated owner account. There are no public profiles, no
            follower features, and no shared content.
          </P>
          <P>
            By using the service you agree to this policy and to our{" "}
            <a
              href="/terms"
              className="text-primary underline decoration-primary/40 underline-offset-[0.18em]"
            >
              Terms of Service
            </a>
            .
          </P>
        </>
      ),
    },
    {
      id: "collect",
      title: "Information we collect",
      body: (
        <>
          <UL
            items={[
              <>
                <strong className="font-medium text-foreground">
                  Google sign-in data.
                </strong>{" "}
                When you sign in with Google, we receive your basic profile
                information only: your name, email address, and profile picture.
                We never see or store your Google password. We request no
                sensitive or restricted Google scopes.
              </>,
              <>
                <strong className="font-medium text-foreground">
                  Content you create.
                </strong>{" "}
                Journal entries you write — titles, notes, and links to unlisted
                YouTube videos — plus any images you upload to attach to
                entries.
              </>,
              <>
                <strong className="font-medium text-foreground">
                  Essential technical data.
                </strong>{" "}
                A session cookie that keeps you signed in, and standard server
                logs (such as request timestamps) used for security and
                reliability.
              </>,
            ]}
          />
        </>
      ),
    },
    {
      id: "use",
      title: "How we use information",
      body: (
        <>
          <UL
            items={[
              "To verify that the person signing in is the designated owner of the journal.",
              "To provide the core service: storing and displaying your entries, notes, and attachments.",
              "To keep the service secure — detecting abuse, unauthorized access attempts, and debugging failures.",
            ]}
          />
          <P>
            We do not sell your data, do not show advertising, do not run
            third-party analytics or tracking scripts, and do not use your
            content or Google data to train machine-learning models.
          </P>
        </>
      ),
    },
    {
      id: "google-data",
      title: "Google user data",
      body: (
        <>
          <P>
            The service&apos;s use and transfer to any other app of information
            received from Google Accounts will adhere to the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline decoration-primary/40 underline-offset-[0.18em]"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </P>
          <P>
            In practice, this means the basic profile data we receive at sign-in
            is used solely to authenticate the owner account and operate the
            journal. It is not passed to advertising networks, data brokers, or
            unrelated third-party apps, and it is not used for any purpose
            described in the policy&apos;s prohibited-practices list.
          </P>
        </>
      ),
    },
    {
      id: "youtube",
      title: "YouTube content & embeds",
      body: (
        <>
          <P>
            Entries may link to unlisted YouTube videos. To preview them, the
            service loads video thumbnails from YouTube&apos;s image servers and
            plays videos through YouTube&apos;s privacy-enhanced embed player
            (youtube-nocookie.com). When one of these loads in your browser,
            your browser connects directly to Google, which may receive your IP
            address and standard browser information under Google&apos;s own
            policies.
          </P>
          <P>
            The service does not use the YouTube Data API and does not access
            your YouTube account, playlists, watch history, or any other
            YouTube-specific data.
          </P>
        </>
      ),
    },
    {
      id: "sharing",
      title: "Sharing & third parties",
      body: (
        <>
          <P>
            We share personal information only with the providers needed to
            operate the service:
          </P>
          <UL
            items={[
              "Google — authentication via Google sign-in.",
              "Our hosting and database provider — application hosting and encrypted storage of journal data.",
              "An image-delivery provider — storage and delivery of images you upload as entry attachments.",
            ]}
          />
          <P>
            These providers process data only on our behalf to deliver the
            service. Your entries are visible exclusively to the signed-in
            owner; no other user can browse, search, or view them.
          </P>
        </>
      ),
    },
    {
      id: "retention",
      title: "Retention & deletion",
      body: (
        <>
          <P>
            Your account information and entries are kept for as long as the
            journal is active. You may delete individual entries at any time
            from within the app.
          </P>
          <P>
            To have all of your data permanently deleted — including your Google
            sign-in information — email us and we will remove it within 30 days
            and confirm once done.
          </P>
        </>
      ),
    },
    {
      id: "cookies",
      title: "Cookies",
      body: (
        <P>
          The service sets a single essential cookie that maintains your
          authenticated session after sign-in. It contains no tracking
          identifiers and is removed when you sign out. We set no advertising,
          analytics, or cross-site cookies.
        </P>
      ),
    },
    {
      id: "security",
      title: "Security",
      body: (
        <P>
          Traffic to the service is encrypted in transit over HTTPS.
          Authentication is delegated to Google, and sessions are tied to the
          verified owner account. While we take reasonable measures to protect
          your data, no system is perfectly secure — please keep valuable
          backups of anything irreplaceable.
        </P>
      ),
    },
    {
      id: "children",
      title: "Children's privacy",
      body: (
        <P>
          The service is a personal tool not directed at children. We do not
          knowingly collect information from children under 13 (or under the
          equivalent minimum age in your jurisdiction).
        </P>
      ),
    },
    {
      id: "changes",
      title: "Changes to this policy",
      body: (
        <P>
          If this policy changes, the updated version will be posted on this
          page with a new “last updated” date. Material changes affecting how
          your Google data is used will be highlighted before they take effect.
        </P>
      ),
    },
    {
      id: "contact",
      title: "Contact",
      body: (
        <P>
          Questions, requests, or concerns about privacy? Reach the operator of
          this journal by email and we will respond promptly.
        </P>
      ),
    },
  ],
};

export default function PrivacyPage() {
  return (
    <LegalDocument
      doc={doc}
      other={{ href: "/terms", label: "Terms of Service" }}
    />
  );
}
