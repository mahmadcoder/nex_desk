import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

const COLUMNS = [
  {
    title: "Build",
    links: [
      ["Web development", "/services/web-development"],
      ["Mobile apps", "/services/mobile-apps"],
      ["E-commerce", "/services/ecommerce"],
      ["Custom software", "/services/custom-software"],
    ],
  },
  {
    title: "Design",
    links: [
      ["Web design", "/services/web-design"],
      ["Branding", "/services/branding"],
      ["UI/UX", "/services/ui-ux"],
    ],
  },
  {
    title: "Growth",
    links: [
      ["SEO", "/services/seo"],
      ["Paid ads", "/services/paid-ads"],
      ["Social media", "/services/social-media"],
      ["Analytics & CRO", "/services/analytics-cro"],
    ],
  },
  {
    title: "Company",
    links: [
      ["About", "/about"],
      ["Work", "/work"],
      ["Journal", "/blog"],
      ["FAQ", "/faq"],
      ["Contact", "/contact"],
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative z-10 mt-32 border-t border-ink-600 bg-ink-950">
      <div className="shell py-20">
        <div className="grid gap-14 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Logo />
            <p className="mt-6 max-w-sm text-bone-400">
              A software agency. We build the thing, launch it, and stay to make sure it works.
            </p>
            <Link href="/contact" className="btn btn-primary mt-8">
              Start a project
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
            {COLUMNS.map((col) => (
              <div key={col.title}>
                <p className="mono-tag">{col.title}</p>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map(([label, href]) => (
                    <li key={href}>
                      <Link href={href} className="text-sm text-bone-200 hover:text-lime-400">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-ink-600 pt-8 text-sm text-bone-400 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Nex Desk. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-bone-50">Privacy</Link>
            <Link href="/terms" className="hover:text-bone-50">Terms</Link>
            <Link href="/portal" className="hover:text-bone-50">Client login</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
