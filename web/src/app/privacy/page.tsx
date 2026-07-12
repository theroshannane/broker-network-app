import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | CoBroker",
  description: "How CoBroker collects, uses, and protects your data.",
};

const EFFECTIVE_DATE = "12 July 2026";
const CONTACT_EMAIL = "support@cobroker.in";

export default function PrivacyPolicy() {
  return (
    <article className="prose prose-neutral max-w-none">
      <h1 className="text-2xl font-semibold">Privacy Policy</h1>
      <p className="text-sm text-neutral-500">Effective {EFFECTIVE_DATE}</p>

      <p className="mt-4">
        CoBroker (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates a
        peer-to-peer, broker-to-broker real estate co-broking network delivered
        through our mobile app and website (the &quot;Service&quot;). This
        policy explains what we collect, why, and the choices you have. By using
        the Service you agree to this policy.
      </p>

      <h2 className="mt-6 text-lg font-semibold">Information we collect</h2>
      <ul className="list-disc pl-6">
        <li>
          <strong>Account &amp; identity:</strong> name, phone number, email
          address, and the one-time passcode (OTP) used to sign in.
        </li>
        <li>
          <strong>Verification:</strong> RERA registration number and KYC
          documents you submit to prove you are a licensed broker.
        </li>
        <li>
          <strong>Listings &amp; requirements:</strong> property details,
          requirements, and co-broking requests you create or respond to.
        </li>
        <li>
          <strong>Device &amp; usage:</strong> app version, device type, and
          basic diagnostic logs to keep the Service reliable.
        </li>
      </ul>

      <h2 className="mt-6 text-lg font-semibold">How we use it</h2>
      <ul className="list-disc pl-6">
        <li>Authenticate you and secure your account via OTP.</li>
        <li>Verify broker status (RERA / KYC) before granting network access.</li>
        <li>
          Match listings with requirements and route co-broking requests
          between brokers.
        </li>
        <li>
          Reveal your contact details to another broker only after you accept
          their request.
        </li>
        <li>Operate, maintain, and improve the Service and prevent abuse.</li>
      </ul>

      <h2 className="mt-6 text-lg font-semibold">Sharing</h2>
      <p>
        We do not sell your personal data. Contact details are shared with
        another broker only when you accept a co-broking request. We may share
        data with service providers who host and operate the Service on our
        behalf, or when required by law.
      </p>

      <h2 className="mt-6 text-lg font-semibold">Data retention</h2>
      <p>
        We keep your data for as long as your account is active or as needed to
        provide the Service and meet legal obligations. You may request deletion
        at any time (see Contact).
      </p>

      <h2 className="mt-6 text-lg font-semibold">Security</h2>
      <p>
        We use industry-standard measures including encrypted transport (HTTPS),
        OTP-based authentication, and access controls. No method of transmission
        or storage is completely secure, but we work to protect your data.
      </p>

      <h2 className="mt-6 text-lg font-semibold">Your rights</h2>
      <p>
        You can access, correct, or delete your account data, and withdraw
        consent, by contacting us. We will respond within a reasonable period.
      </p>

      <h2 className="mt-6 text-lg font-semibold">Children</h2>
      <p>
        The Service is intended for licensed real estate professionals and is
        not directed to anyone under 18. We do not knowingly collect data from
        children.
      </p>

      <h2 className="mt-6 text-lg font-semibold">Changes</h2>
      <p>
        We may update this policy. Material changes will be posted here with a
        new effective date.
      </p>

      <h2 className="mt-6 text-lg font-semibold">Contact</h2>
      <p>
        Questions or data requests:{" "}
        <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </article>
  );
}
