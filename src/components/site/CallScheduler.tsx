"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  Clock,
  Globe,
  Video,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  User,
  Mail,
  Building,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TIMEZONES = [
  { id: "America/New_York", label: "US Eastern (EST / EDT)", offset: "UTC-4" },
  { id: "America/Los_Angeles", label: "US Pacific (PST / PDT)", offset: "UTC-7" },
  { id: "Europe/London", label: "London / UK (BST / GMT)", offset: "UTC+1" },
  { id: "Europe/Berlin", label: "Central Europe (CET / CEST)", offset: "UTC+2" },
  { id: "Asia/Dubai", label: "Dubai / Gulf (GST)", offset: "UTC+4" },
  { id: "Asia/Karachi", label: "Pakistan (PKT)", offset: "UTC+5" },
];

const TIME_SLOTS = [
  "10:00 AM",
  "11:30 AM",
  "02:00 PM",
  "03:30 PM",
  "05:00 PM",
  "06:30 PM",
  "08:00 PM",
];

export default function CallScheduler() {
  const [selectedTz, setSelectedTz] = useState(TIMEZONES[0].id);

  // Generate next 10 business days
  const availableDates = useMemo(() => {
    const dates: { dateStr: string; dayName: string; dayNum: number; monthName: string }[] = [];
    const now = new Date();
    let cur = new Date(now.getTime() + 24 * 60 * 60 * 1000); // start tomorrow

    while (dates.length < 10) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) {
        // Mon-Fri only
        dates.push({
          dateStr: cur.toISOString().split("T")[0],
          dayName: cur.toLocaleDateString("en-US", { weekday: "short" }),
          dayNum: cur.getDate(),
          monthName: cur.toLocaleDateString("en-US", { month: "short" }),
        });
      }
      cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000);
    }
    return dates;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(availableDates[0].dateStr);
  const [selectedSlot, setSelectedSlot] = useState<string>(TIME_SLOTS[1]);
  const [submitting, setSubmitting] = useState(false);
  const [booked, setBooked] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    website: "",
    notes: "",
  });

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Please enter your name and email.");
      return;
    }

    setSubmitting(true);
    try {
      const selectedDateObj = availableDates.find((d) => d.dateStr === selectedDate);
      const whenFormatted = `${selectedDateObj?.dayName}, ${selectedDateObj?.monthName} ${selectedDateObj?.dayNum} at ${selectedSlot} (${selectedTz})`;

      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        company: form.company.trim() || undefined,
        service_slugs: ["discovery-call"],
        timeline: "Discovery Call Requested",
        message: [
          `[STRATEGY CALL BOOKING]`,
          `• Scheduled For: ${whenFormatted}`,
          `• Timezone: ${selectedTz}`,
          form.company ? `• Company: ${form.company.trim()}` : "",
          form.website ? `• Website/Link: ${form.website.trim()}` : "",
          form.notes ? `\nAgenda & Project Brief:\n${form.notes.trim()}` : "",
        ].filter(Boolean).join("\n"),
      };

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to book meeting.");
      }

      setBooked(true);
      toast.success("Strategy call requested! Calendar invite will follow shortly.");
    } catch (err: any) {
      toast.error(err.message || "Failed to request call. Please reach us via WhatsApp.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
      {/* ── Left Meeting Information Card ─────────────────────── */}
      <div className="space-y-6">
        <div className="card p-6 space-y-6 border-ink-600/80 bg-ink-850/80 backdrop-blur-xl">
          <div className="space-y-2">
            <span className="mono-tag text-[10px] uppercase tracking-wider text-lime-400">
              Direct with Technical Founder
            </span>
            <h2 className="text-xl font-display font-medium text-bone-50">
              20-Min Architecture & Scope Call
            </h2>
            <p className="text-xs text-bone-300 leading-relaxed">
              A private technical session to review your product roadmap, architecture, feasibility, and deliver a fixed-price timeline.
            </p>
          </div>

          <div className="space-y-3.5 border-t border-ink-700/80 pt-4 text-xs font-mono text-bone-200">
            <div className="flex items-center gap-3">
              <Clock size={16} className="text-lime-400 shrink-0" />
              <span>20 Minutes · Video Session</span>
            </div>
            <div className="flex items-center gap-3">
              <Video size={16} className="text-lime-400 shrink-0" />
              <span>Google Meet / Zoom link provided</span>
            </div>
            <div className="flex items-center gap-3">
              <ShieldCheck size={16} className="text-lime-400 shrink-0" />
              <span>Mutual NDA & confidentiality guaranteed</span>
            </div>
          </div>

          {/* Timezone Selector */}
          <div className="space-y-2 border-t border-ink-700/80 pt-4">
            <label className="mono-tag text-[10px] uppercase text-bone-400 block">
              Your Timezone:
            </label>
            <div className="relative">
              <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-bone-400" />
              <select
                value={selectedTz}
                onChange={(e) => setSelectedTz(e.target.value)}
                className="w-full rounded-lg border border-ink-600 bg-ink-900 py-2 pl-9 pr-3 text-xs text-bone-100 focus:border-lime-400 focus:outline-none transition-colors cursor-pointer"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.id} value={tz.id}>
                    {tz.label} ({tz.offset})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-ink-700 bg-ink-900/60 p-3.5 text-[11px] text-bone-300 space-y-1">
            <span className="text-bone-100 font-semibold block">What we cover:</span>
            <p className="text-bone-400 leading-relaxed">
              1. Your target audience & core features<br />
              2. Technical stack recommendations<br />
              3. Realistic timeline & fixed cost budget
            </p>
          </div>
        </div>
      </div>

      {/* ── Right Date & Slot Picker + Form ────────────────────── */}
      <div className="card p-6 sm:p-8 space-y-6 border-ink-600/80 bg-ink-850/80 backdrop-blur-xl">
        {!booked ? (
          <form onSubmit={handleBook} className="space-y-6">
            {/* Step 1: Select Date */}
            <div className="space-y-3">
              <label className="mono-tag text-xs text-bone-300 font-semibold uppercase tracking-wider block">
                1. Select Preferred Date:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-2.5">
                {availableDates.map((d) => {
                  const isSelected = selectedDate === d.dateStr;
                  return (
                    <button
                      key={d.dateStr}
                      type="button"
                      onClick={() => setSelectedDate(d.dateStr)}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-xl border py-3 px-1 transition-all cursor-pointer",
                        isSelected
                          ? "border-lime-400 bg-lime-400/10 text-lime-300 ring-1 ring-lime-400/40"
                          : "border-ink-600/80 bg-ink-900/60 text-bone-300 hover:border-ink-500 hover:bg-ink-800"
                      )}
                    >
                      <span className="text-[10px] uppercase font-mono text-bone-400">{d.dayName}</span>
                      <span className="text-base sm:text-lg font-bold font-mono">{d.dayNum}</span>
                      <span className="text-[10px] text-bone-500 font-mono">{d.monthName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Select Time Slot */}
            <div className="space-y-3 border-t border-ink-700/80 pt-5">
              <label className="mono-tag text-xs text-bone-300 font-semibold uppercase tracking-wider block">
                2. Select Time Window ({selectedTz.split("/")[1]?.replace("_", " ")}):
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {TIME_SLOTS.map((slot) => {
                  const isSelected = selectedSlot === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        "rounded-lg border py-2 px-3 text-xs font-mono font-medium transition-all cursor-pointer text-center",
                        isSelected
                          ? "border-lime-400 bg-lime-400 text-ink-950 font-bold shadow-sm"
                          : "border-ink-600/80 bg-ink-900/60 text-bone-300 hover:border-ink-500 hover:text-bone-100"
                      )}
                    >
                      {slot}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Prospect Details */}
            <div className="space-y-3.5 border-t border-ink-700/80 pt-5">
              <label className="mono-tag text-xs text-bone-300 font-semibold uppercase tracking-wider block">
                3. Your Information:
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your Name *"
                  className="rounded-lg border border-ink-600 bg-ink-900 px-3.5 py-2.5 text-xs text-bone-100 placeholder:text-bone-500 focus:border-lime-400 focus:outline-none transition-colors"
                />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Work Email *"
                  className="rounded-lg border border-ink-600 bg-ink-900 px-3.5 py-2.5 text-xs text-bone-100 placeholder:text-bone-500 focus:border-lime-400 focus:outline-none transition-colors"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="Company / Project Name"
                  className="rounded-lg border border-ink-600 bg-ink-900 px-3.5 py-2.5 text-xs text-bone-100 placeholder:text-bone-500 focus:border-lime-400 focus:outline-none transition-colors"
                />
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="Current Website / Pitch Deck Link"
                  className="rounded-lg border border-ink-600 bg-ink-900 px-3.5 py-2.5 text-xs text-bone-100 placeholder:text-bone-500 focus:border-lime-400 focus:outline-none transition-colors"
                />
              </div>

              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Briefly describe what you are looking to build or solve…"
                className="w-full rounded-lg border border-ink-600 bg-ink-900 px-3.5 py-2.5 text-xs text-bone-100 placeholder:text-bone-500 focus:border-lime-400 focus:outline-none transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary w-full h-11 text-xs font-semibold gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <span>Confirming Booking…</span>
              ) : (
                <>
                  <span>Schedule 20-Min Call for {selectedSlot}</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>
        ) : (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lime-400 text-ink-950 font-bold">
              <CheckCircle2 size={28} />
            </div>
            <h3 className="text-2xl font-display font-medium text-bone-50">
              Strategy Session Requested!
            </h3>
            <p className="text-sm text-bone-300 max-w-md mx-auto leading-relaxed">
              We received your booking request for{" "}
              <strong className="text-lime-400">
                {selectedDate} at {selectedSlot} ({selectedTz.split("/")[1]})
              </strong>
              . A calendar invitation with Google Meet details has been sent to{" "}
              <span className="text-bone-100 font-semibold">{form.email}</span>.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <Link href="/" className="btn h-10 px-5 text-xs">
                Back to Nex Desk Home
              </Link>
              <Link href="/estimate" className="btn btn-primary h-10 px-5 text-xs">
                Explore Project Estimator →
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
