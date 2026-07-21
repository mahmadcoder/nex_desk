import type { Metadata } from "next";
import ContactForm from "@/components/site/ContactForm";

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
          {[
            ["Email", "ahmadsadiq.dev@gmail.com"],
            ["WhatsApp", "+92 300 0000000"],
            ["Based in", "Multan, Pakistan — working across timezones"],
            ["Hours", "Mon–Sat, 10am–7pm PKT"],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="mono-tag">{k}</dt>
              <dd className="mt-1">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <ContactForm />
    </section>
  );
}
