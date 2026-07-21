export const metadata = { title: "Terms" };

export default function Terms() {
  return (
    <section className="shell max-w-3xl py-16">
      <p className="drawer-label">Legal</p>
      <h1 className="mt-6 text-[var(--text-h1)]">Terms of service</h1>
      <div className="mt-10 space-y-6 leading-relaxed text-bone-200">
        <p>
          These general terms apply to the website. The terms that govern any actual project
          are the ones written into your signed agreement, which take precedence over
          anything on this page.
        </p>
        <p>
          Prices shown on the website are starting points, not quotes. A quote is binding
          only once issued in writing as a PDF and accepted by you.
        </p>
        <p>
          Work begins when the advance payment clears. Ownership of source code, design files
          and credentials transfers to you on final payment. Until then they remain ours.
        </p>
        <p>
          We may display finished work in our portfolio unless you ask us in writing not to.
        </p>
        <p>
          Questions about any of this go to ahmadsadiq.dev@gmail.com.
        </p>
      </div>
    </section>
  );
}
