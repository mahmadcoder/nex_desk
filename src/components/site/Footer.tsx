"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { ArrowUpRight, MessageSquare, ArrowRight, Check } from "lucide-react";
import { FaLinkedin, FaInstagram, FaXTwitter, FaGithub } from "react-icons/fa6";

import { toast } from "sonner";

const COMPANY_NAV = [
  { label: "Services", href: "/services" },
  { label: "Selected Work", href: "/work" },
  { label: "Pricing", href: "/pricing" },
  { label: "About Studio", href: "/about" },
  { label: "Journal", href: "/blog" },
  { label: "Contact Us", href: "/contact" },
];

const SOCIAL_NAV = [
  { label: "LinkedIn", href: "https://linkedin.com", Icon: FaLinkedin },
  { label: "Instagram", href: "https://instagram.com", Icon: FaInstagram },
  { label: "X", href: "https://x.com", Icon: FaXTwitter },
  { label: "GitHub", href: "https://github.com", Icon: FaGithub },
];

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Subscription failed");

      setSubscribed(true);
      setEmail("");
      toast.success(data.message || "Thank you for subscribing!");
      setTimeout(() => setSubscribed(false), 5000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to subscribe. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="relative z-10 mt-12 border-t border-ink-700/60 bg-ink-950/90 backdrop-blur-xl">
      <div className="shell pt-12 pb-20 lg:pt-16 lg:pb-24">
        {/* Top Hero Section: Headline */}
        <div className="max-w-4xl">
          <p className="mono-tag text-lime-400">Start a conversation</p>
          <h2 className="mt-4 text-[clamp(2.75rem,7vw,5.5rem)] font-medium leading-[0.95] tracking-tight text-bone-50">
            Let&apos;s build something
            <br />
            that <span className="text-bone-400 italic">ships.</span>
          </h2>
        </div>

        {/* Brand Block directly beneath headline + Contact badge */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-8 py-8">
          <div className="flex flex-col gap-2.5">
            <Logo className="scale-110 origin-left" />
            <p className="max-w-md text-sm text-bone-400 leading-relaxed">
              High-performance web applications, mobile products, and custom software systems built to scale.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <a
              href="mailto:hello@nexdesk.com"
              className="group inline-flex items-center gap-3 rounded-full border border-ink-600 bg-ink-900/80 px-6 py-3.5 text-base font-medium text-bone-100 transition-all hover:border-lime-400 hover:bg-lime-400 hover:text-ink-950"
            >
              <span className="h-2 w-2 rounded-full bg-lime-400 transition-colors group-hover:bg-ink-950" />
              hello@nexdesk.com
              <ArrowUpRight size={18} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>

            <a
              href="https://wa.me/920000000000"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900/40 px-5 py-3.5 text-sm text-bone-300 transition-colors hover:border-bone-300 hover:text-bone-50"
            >
              <MessageSquare size={16} className="text-lime-400" />
              WhatsApp
            </a>
          </div>
        </div>

        {/* 3 Columns Grid */}
        <div className="mt-14 grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3 lg:gap-16">
          {/* Column 1: Location & Socials (Left) */}
          <div>
            <p className="mono-tag text-xs text-lime-400">Location</p>
            <p className="mt-5 text-sm text-bone-200">Islamabad, Pakistan</p>
            <p className="mt-1 text-xs text-bone-400">Working worldwide across timezones.</p>

            {/* Social Icons (Horizontal, Icon-only with hover label & pointer arrow) */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {SOCIAL_NAV.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="group relative flex h-10 w-10 items-center justify-center rounded-full border border-ink-700 bg-ink-900/60 text-bone-300 transition-all duration-300 ease-out hover:scale-105 hover:border-lime-400 hover:bg-lime-400 hover:text-ink-950 hover:shadow-[0_0_15px_rgba(163,230,53,0.35)]"
                >
                  <Icon size={18} className="transition-transform duration-300 group-hover:scale-110" />
                  
                  {/* Tooltip box with downward pointer arrow notch */}
                  <span className="pointer-events-none absolute -top-11 left-1/2 -translate-x-1/2 flex flex-col items-center opacity-0 scale-90 transition-all duration-300 ease-out group-hover:opacity-100 group-hover:scale-100 group-hover:-translate-y-1 z-30">
                    <span className="rounded-md border border-ink-700 bg-ink-900 px-3 py-1 text-[11px] font-medium text-white shadow-2xl whitespace-nowrap">
                      {label}
                    </span>
                    <span className="h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-ink-700 -mt-px" />
                  </span>
                </a>
              ))}
            </div>

            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900/60 px-3 py-1.5 text-xs text-bone-300">
              <span className="h-2 w-2 rounded-full bg-lime-400 animate-pulse" />
              <span>Available for new projects</span>
            </div>
          </div>

          {/* Column 2: Company (Middle) */}
          <div className="lg:pl-8">
            <p className="mono-tag text-xs text-lime-400">Company</p>
            <ul className="mt-5 space-y-3">
              {COMPANY_NAV.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-bone-300 transition-colors hover:text-lime-400"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Newsletter (Right) */}
          <div>
            <p className="mono-tag text-xs text-lime-400">Newsletter</p>
            <p className="mt-5 text-sm text-bone-200 font-medium">Join our insights</p>
            <p className="mt-1 text-xs text-bone-400 leading-relaxed">
              Subscribe for monthly updates on software, product design, and tech strategy.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-2.5">
              <div className="relative flex items-center rounded-full border border-ink-700 bg-ink-900/80 p-1 transition-all focus-within:border-lime-400 focus-within:ring-1 focus-within:ring-lime-400">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  style={{ outline: "none", boxShadow: "none" }}
                  className="w-full bg-transparent px-3.5 py-1.5 text-xs text-bone-100 placeholder:text-bone-500 border-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none"
                />
                <button
                  type="submit"
                  aria-label="Subscribe"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lime-400 text-ink-950 transition-all hover:bg-lime-300 hover:scale-105 active:scale-95"
                >
                  <ArrowRight size={14} />
                </button>
              </div>

              {subscribed && (
                <div className="inline-flex items-center gap-1.5 text-xs text-lime-400 font-medium animate-fadeIn">
                  <Check size={14} />
                  <span>Subscribed! Thank you for joining.</span>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Bottom Slim Legal Bar */}
        <hr className="rule mt-16" />
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-xs text-bone-400">
          <p>© {new Date().getFullYear()} Nex Desk. All rights reserved.</p>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <Link href="/privacy" className="transition-colors hover:text-bone-100">
              Privacy Policy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-bone-100">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
