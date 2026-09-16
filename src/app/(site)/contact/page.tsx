import type { Metadata } from "next";
import ContactForm from "@/components/site/ContactForm";
import { CONTACT_EMAIL, CONTACT_WHATSAPP, whatsappLink } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Contact",
  description: "Tell us about your project and get a written quote within one working day.",
};

export default function ContactPage() {
  return (
    <section className="shell grid gap-16 py-16 lg:grid-cols-[1fr_1.1fr]">
      <div>
        <p className="drawer-label">Contact</p>
        <h1 className="mt-6 text-[var(--text-h1)]">Start a project.</h1>
        <p className="mt-4 max-w-md text-lg text-bone-200">
          Three short steps. You get a confirmation immediately and a real reply
          within one working day.
        </p>

        <dl className="mt-8 space-y-6 border-t border-ink-600 pt-8">
          <div>
            <dt className="mono-tag">Email</dt>
            <dd className="mt-1">
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-bone-100 transition-colors hover:text-lime-400 inline-flex items-center gap-1.5"
              >
                {CONTACT_EMAIL}
              </a>
            </dd>
          </div>

          <div>
            <dt className="mono-tag">WhatsApp</dt>
            <dd className="mt-1">
              <a
                href={whatsappLink(CONTACT_WHATSAPP, "Hi Nex Desk — I would like to enquire about a project.")}
                target="_blank"
                rel="noopener noreferrer"
                className="text-bone-100 transition-colors hover:text-lime-400 inline-flex items-center gap-2"
              >
                <span>{CONTACT_WHATSAPP}</span>
                <span className="text-xs text-lime-400 font-mono">Chat on WhatsApp →</span>
              </a>
            </dd>
          </div>

          <div>
            <dt className="mono-tag">Based in</dt>
            <dd className="mt-1 text-bone-200">Multan, Pakistan — working across timezones</dd>
          </div>

          <div>
            <dt className="mono-tag">Hours</dt>
            <dd className="mt-1 text-bone-200">Mon–Sat, 10am–7pm PKT</dd>
          </div>
        </dl>
      </div>

      <ContactForm />
    </section>
  );
}
