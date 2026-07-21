export const metadata = { title: "Privacy" };

export default function Privacy() {
  return (
    <section className="shell max-w-3xl py-16">
      <p className="drawer-label">Legal</p>
      <h1 className="mt-6 text-[var(--text-h1)]">Privacy</h1>
      <div className="mt-10 space-y-6 leading-relaxed text-bone-200">
        <p>
          We collect only what we need to quote and deliver work: your name, email, phone,
          company, city and country, plus whatever you tell us about the project.
        </p>
        <p>
          That information is stored in our own database and used to contact you, produce
          agreements and invoices, and run your project. We do not sell it, and we do not
          share it with anyone except the services we need to operate — hosting, database
          and email delivery.
        </p>
        <p>
          Ask us at any time for a copy of what we hold on you, or for it to be deleted, by
          emailing ahmadsadiq.dev@gmail.com. Deletion is subject to the records we are legally
          required to keep for tax purposes.
        </p>
        <p>
          The website uses cookies only for keeping you signed in to the client portal. There
          is no advertising or cross-site tracking on it.
        </p>
      </div>
    </section>
  );
}
