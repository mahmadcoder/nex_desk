"use client";

import { useState, useTransition, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveClient } from "@/lib/actions";
import { COUNTRIES, CURRENCIES, type CountryData } from "@/lib/countries";
import { PlatformIcon } from "@/components/brand/PlatformIcons";
import { X, ChevronDown, Check, Search, MapPin, Loader2 } from "lucide-react";

const field =
  "w-full rounded-lg border border-ink-500 bg-ink-800 px-3 py-2.5 text-sm text-bone-50 placeholder:text-bone-600 focus:border-lime-400 focus:outline-none transition-colors";
const labelStyle = "mono-tag mb-1.5 block text-xs text-bone-300";

const cityCache: Record<string, string[]> = {};

export const PLATFORMS = [
  { id: "linkedin", label: "LinkedIn" },
  { id: "fiverr", label: "Fiverr" },
  { id: "upwork", label: "Upwork" },
  { id: "instagram", label: "Instagram" },
  { id: "facebook", label: "Facebook" },
  { id: "website", label: "Website (Inbound)" },
  { id: "dribbble_behance", label: "Dribbble / Behance" },
  { id: "twitter", label: "Twitter / X" },
  { id: "youtube_tiktok", label: "YouTube / TikTok" },
  { id: "referral", label: "Client Referral" },
  { id: "cold_outreach", label: "Cold Email / Outreach" },
  { id: "whatsapp", label: "WhatsApp / Phone Call" },
  { id: "other", label: "Other (Type Custom Platform…)" },
];

export default function ClientDialog() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  const defaultCountry = COUNTRIES.find((c) => c.code === "PK") || COUNTRIES[0];
  const [selectedCountry, setSelectedCountry] = useState<CountryData>(defaultCountry);

  const [liveCities, setLiveCities] = useState<string[]>(defaultCountry.cities);
  const [loadingCities, setLoadingCities] = useState<boolean>(false);

  const [showCountryMenu, setShowCountryMenu] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const [showCityMenu, setShowCityMenu] = useState(false);
  const [showCurrencyMenu, setShowCurrencyMenu] = useState(false);
  const [showPlatformMenu, setShowPlatformMenu] = useState(false);

  const [f, setF] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    city: "",
    country: defaultCountry.name,
    address: "",
    tax_id: "",
    preferred_currency: defaultCountry.currency,
    source: "website",
    custom_source: "",
  });

  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  const loadCitiesForCountry = useCallback(async (countryName: string, fallbackCities: string[]) => {
    if (cityCache[countryName]) {
      setLiveCities(cityCache[countryName]);
      return;
    }

    setLoadingCities(true);
    try {
      const res = await fetch("/api/geo/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: countryName }),
      });
      const data = await res.json();
      if (data?.cities && Array.isArray(data.cities) && data.cities.length > 0) {
        cityCache[countryName] = data.cities;
        setLiveCities(data.cities);
      } else {
        setLiveCities(fallbackCities);
      }
    } catch {
      setLiveCities(fallbackCities);
    } finally {
      setLoadingCities(false);
    }
  }, []);

  useEffect(() => {
    loadCitiesForCountry(selectedCountry.name, selectedCountry.cities);
  }, [selectedCountry, loadCitiesForCountry]);

  const handleSelectCountry = (c: CountryData) => {
    setSelectedCountry(c);
    setF((prev) => ({
      ...prev,
      country: c.name,
      preferred_currency: c.currency,
      city: "",
    }));
    setShowCountryMenu(false);
    setCountrySearch("");
  };

  const filteredCountries = useMemo(() => {
    if (!countrySearch) return COUNTRIES;
    const q = countrySearch.toLowerCase();
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [countrySearch]);

  const filteredCities = useMemo(() => {
    const pool = liveCities.length > 0 ? liveCities : selectedCountry.cities;
    if (!f.city) return pool.slice(0, 80);
    const q = f.city.toLowerCase();
    return pool.filter((ct) => ct.toLowerCase().includes(q)).slice(0, 100);
  }, [liveCities, selectedCountry, f.city]);

  const selectedPlatformObj = PLATFORMS.find((p) => p.id === f.source) || PLATFORMS[0];

  const save = () => {
    if (!f.name) return toast.error("Please enter the client's full name.");
    if (!f.email || !f.email.includes("@")) return toast.error("Please enter a valid email address.");

    const rawDigits = f.phone.replace(/\D/g, "");
    if (rawDigits && rawDigits.length < (selectedCountry.digits - 2)) {
      return toast.error(
        `Phone number for ${selectedCountry.name} should contain around ${selectedCountry.digits} digits.`
      );
    }

    const fullPhone = rawDigits ? `${selectedCountry.dialCode} ${rawDigits}` : "";

    let finalSource = f.source;
    if (f.source === "other") {
      finalSource = f.custom_source.trim() ? f.custom_source.trim() : "Other";
    }

    const payload = {
      name: f.name,
      email: f.email,
      phone: fullPhone,
      company: f.company,
      city: f.city,
      country: f.country,
      address: f.address,
      tax_id: f.tax_id,
      preferred_currency: f.preferred_currency,
      source: finalSource,
    };

    start(async () => {
      try {
        await saveClient(null, payload);
        toast.success(`${f.name} added successfully! Portal credentials generated.`);
        setOpen(false);
        setF({
          name: "",
          email: "",
          phone: "",
          company: "",
          city: "",
          country: defaultCountry.name,
          address: "",
          tax_id: "",
          preferred_currency: defaultCountry.currency,
          source: "website",
          custom_source: "",
        });
        router.refresh();
      } catch {
        toast.error("Couldn't save that client. Please check details.");
      }
    });
  };

  if (!open) {
    return (
      <button className="btn btn-primary h-10 px-4 cursor-pointer hover:cursor-pointer" onClick={() => setOpen(true)}>
        + Add client
      </button>
    );
  }

  const selectedCurrObj = CURRENCIES.find((c) => c.code === f.preferred_currency) || CURRENCIES[0];

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 p-4 backdrop-blur-sm overflow-y-auto"
      onClick={() => setOpen(false)}
    >
      <div
        className="card w-full max-w-xl p-6 md:p-7 relative bg-ink-900 border-ink-600 shadow-2xl my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header with Close Icon */}
        <div className="flex items-start justify-between border-b border-ink-600 pb-4">
          <div>
            <h2 className="text-xl font-semibold text-bone-50">Add New Client</h2>
            <p className="mt-1 text-xs text-bone-400">
              Details here appear on official agreements, invoices, and automated email communications.
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg p-1.5 text-bone-400 hover:bg-ink-800 hover:text-bone-50 transition-colors cursor-pointer hover:cursor-pointer"
            onClick={() => setOpen(false)}
            aria-label="Close dialog"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {/* Full Name */}
          <div className="sm:col-span-2">
            <label className={labelStyle}>Full Name *</label>
            <input
              className={field}
              placeholder="e.g. Ali Ahmed"
              value={f.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className={labelStyle}>Email Address *</label>
            <input
              className={field}
              type="email"
              placeholder="client@company.com"
              value={f.email}
              onChange={(e) => set("email", e.target.value)}
              required
            />
          </div>

          {/* Company */}
          <div>
            <label className={labelStyle}>Company / Agency</label>
            <input
              className={field}
              placeholder="e.g. Acme Corp"
              value={f.company}
              onChange={(e) => set("company", e.target.value)}
            />
          </div>

          {/* Acquisition Source / Origin Platform */}
          <div className="relative sm:col-span-2">
            <label className={labelStyle}>Client Origin Platform / Channel</label>
            <button
              type="button"
              className={`${field} flex items-center justify-between text-left cursor-pointer border-lime-400/40`}
              onClick={() => {
                setShowPlatformMenu(!showPlatformMenu);
                setShowCountryMenu(false);
                setShowCityMenu(false);
                setShowCurrencyMenu(false);
              }}
            >
              <span className="flex items-center gap-2.5">
                <PlatformIcon id={selectedPlatformObj.id} className="w-4 h-4 shrink-0" />
                <span className="font-medium text-bone-50">{selectedPlatformObj.label}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-bone-400 shrink-0" />
            </button>

            {/* Platform Dropdown */}
            {showPlatformMenu && (
              <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-ink-600 bg-ink-900 p-1.5 shadow-xl max-h-60 overflow-y-auto">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`flex w-full items-center justify-between rounded px-3 py-2 text-xs transition-colors cursor-pointer ${
                      f.source === p.id
                        ? "bg-lime-400/10 text-lime-400 font-medium"
                        : "text-bone-200 hover:bg-ink-800"
                    }`}
                    onClick={() => {
                      set("source", p.id);
                      setShowPlatformMenu(false);
                    }}
                  >
                    <span className="flex items-center gap-2.5">
                      <PlatformIcon id={p.id} className="w-4 h-4 shrink-0" />
                      <span>{p.label}</span>
                    </span>
                    {f.source === p.id && <Check className="h-4 w-4 text-lime-400" />}
                  </button>
                ))}
              </div>
            )}

            {/* Custom Other Platform Input */}
            {f.source === "other" && (
              <div className="mt-2.5">
                <input
                  className={field}
                  placeholder="Type custom platform name (e.g. Clutch.co, Event, Referral...)"
                  value={f.custom_source}
                  onChange={(e) => set("custom_source", e.target.value)}
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Country Selector with Flag Image & Search */}
          <div className="relative">
            <label className={labelStyle}>Country</label>
            <button
              type="button"
              className={`${field} flex items-center justify-between text-left cursor-pointer`}
              onClick={() => {
                setShowCountryMenu(!showCountryMenu);
                setShowCityMenu(false);
                setShowCurrencyMenu(false);
                setShowPlatformMenu(false);
              }}
            >
              <span className="flex items-center gap-2 truncate">
                <img
                  src={selectedCountry.flagUrl}
                  alt={selectedCountry.name}
                  className="w-5 h-3.5 object-cover rounded-xs shrink-0"
                />
                <span>{selectedCountry.name}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-bone-400 shrink-0" />
            </button>

            {/* Country Dropdown */}
            {showCountryMenu && (
              <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-ink-600 bg-ink-900 p-2 shadow-xl max-h-60 overflow-y-auto">
                <div className="relative mb-2">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-bone-500" />
                  <input
                    type="text"
                    placeholder="Search country or code…"
                    className="w-full rounded-md border border-ink-600 bg-ink-950 pl-8 pr-3 py-1.5 text-xs text-bone-50 focus:border-lime-400 focus:outline-none"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                <div className="space-y-0.5">
                  {filteredCountries.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      className={`flex w-full items-center justify-between rounded px-2.5 py-1.5 text-xs transition-colors cursor-pointer ${
                        selectedCountry.code === c.code
                          ? "bg-lime-400/10 text-lime-400 font-medium"
                          : "text-bone-200 hover:bg-ink-800"
                      }`}
                      onClick={() => handleSelectCountry(c)}
                    >
                      <span className="flex items-center gap-2 truncate">
                        <img src={c.flagUrl} alt="" className="w-5 h-3.5 object-cover rounded-xs shrink-0" />
                        <span>{c.name}</span>
                      </span>
                      <span className="font-mono text-bone-400 text-[11px]">{c.dialCode}</span>
                    </button>
                  ))}
                  {!filteredCountries.length && (
                    <p className="p-3 text-center text-xs text-bone-500">No country found.</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* City Autocomplete */}
          <div className="relative">
            <label className={labelStyle}>
              City {loadingCities && <Loader2 className="inline-block h-3 w-3 animate-spin text-lime-400 ml-1" />}
            </label>
            <div className="relative">
              <input
                className={field}
                placeholder={`Type or pick city (${selectedCountry.name})`}
                value={f.city}
                onChange={(e) => {
                  set("city", e.target.value);
                  setShowCityMenu(true);
                }}
                onFocus={() => setShowCityMenu(true)}
              />
              <MapPin className="absolute right-3 top-3 h-4 w-4 text-bone-500 pointer-events-none" />
            </div>

            {/* City Suggestions Dropdown */}
            {showCityMenu && (
              <div
                className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-ink-600 bg-ink-900 p-1.5 shadow-xl max-h-52 overflow-y-auto"
                onMouseDown={(e) => e.preventDefault()}
              >
                <div className="px-2 py-1 text-[10px] mono-tag text-bone-500 border-b border-ink-700 mb-1 flex justify-between items-center">
                  <span>Live cities in {selectedCountry.name}</span>
                  {loadingCities && <span className="text-lime-400">Fetching…</span>}
                </div>

                {filteredCities.map((ct) => (
                  <button
                    key={ct}
                    type="button"
                    className="flex w-full items-center justify-between rounded px-2.5 py-1.5 text-xs text-bone-200 hover:bg-ink-800 transition-colors text-left cursor-pointer"
                    onClick={() => {
                      set("city", ct);
                      setShowCityMenu(false);
                    }}
                  >
                    <span>{ct}</span>
                    {f.city === ct && <Check className="h-3.5 w-3.5 text-lime-400" />}
                  </button>
                ))}

                {!filteredCities.length && !loadingCities && (
                  <p className="p-3 text-center text-xs text-bone-400">
                    Type your custom city name.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Phone Number with Dial Code Prefix & Length Indicator */}
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between">
              <label className={labelStyle}>Phone Number</label>
              <span className="mono-tag text-[10px] text-bone-400">
                Format: {selectedCountry.dialCode} ({selectedCountry.digits} digits)
              </span>
            </div>
            <div className="flex rounded-lg border border-ink-500 bg-ink-800 overflow-hidden focus-within:border-lime-400 transition-colors">
              <div className="flex items-center gap-2 bg-ink-900 border-r border-ink-600 px-3 text-xs font-mono text-lime-400 shrink-0 select-none">
                <img src={selectedCountry.flagUrl} alt="" className="w-4 h-3 object-cover rounded-xs" />
                <span>{selectedCountry.dialCode}</span>
              </div>
              <input
                className="w-full bg-transparent px-3 py-2.5 text-sm text-bone-50 placeholder:text-bone-600 focus:outline-none"
                placeholder={`e.g. ${"3001234567".slice(0, selectedCountry.digits - 1)}`}
                value={f.phone}
                onChange={(e) => set("phone", e.target.value.replace(/[^\d\s-]/g, ""))}
              />
            </div>
          </div>

          {/* Invoice Currency with Flag Images */}
          <div className="relative sm:col-span-2">
            <label className={labelStyle}>Invoice Currency</label>
            <button
              type="button"
              className={`${field} flex items-center justify-between text-left cursor-pointer`}
              onClick={() => {
                setShowCurrencyMenu(!showCurrencyMenu);
                setShowCountryMenu(false);
                setShowCityMenu(false);
                setShowPlatformMenu(false);
              }}
            >
              <span className="flex items-center gap-2">
                <img src={selectedCurrObj.flagUrl} alt="" className="w-5 h-3.5 object-cover rounded-xs shrink-0" />
                <span className="font-mono font-medium text-lime-400">{selectedCurrObj.code}</span>
                <span className="text-bone-400 text-xs">— {selectedCurrObj.label}</span>
              </span>
              <ChevronDown className="h-4 w-4 text-bone-400 shrink-0" />
            </button>

            {/* Currency Dropdown Menu */}
            {showCurrencyMenu && (
              <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-ink-600 bg-ink-900 p-1.5 shadow-xl max-h-56 overflow-y-auto">
                {CURRENCIES.map((curr) => (
                  <button
                    key={curr.code}
                    type="button"
                    className={`flex w-full items-center justify-between rounded px-3 py-2 text-xs transition-colors cursor-pointer ${
                      f.preferred_currency === curr.code
                        ? "bg-lime-400/10 text-lime-400 font-medium"
                        : "text-bone-200 hover:bg-ink-800"
                    }`}
                    onClick={() => {
                      set("preferred_currency", curr.code);
                      setShowCurrencyMenu(false);
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <img src={curr.flagUrl} alt="" className="w-5 h-3.5 object-cover rounded-xs shrink-0" />
                      <span className="font-mono font-semibold">{curr.code}</span>
                      <span className="text-bone-400">{curr.label}</span>
                    </span>
                    {f.preferred_currency === curr.code && <Check className="h-4 w-4 text-lime-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tax / NTN Number */}
          <div>
            <label className={labelStyle}>Tax / NTN Number</label>
            <input
              className={field}
              placeholder="e.g. 1234567-8"
              value={f.tax_id}
              onChange={(e) => set("tax_id", e.target.value)}
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-7 flex items-center justify-end gap-3 border-t border-ink-600 pt-4">
          <button
            type="button"
            className="btn h-10 px-4 text-xs cursor-pointer"
            onClick={() => setOpen(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary h-10 px-5 text-xs cursor-pointer"
            onClick={save}
            disabled={pending}
          >
            {pending ? "Saving & Generating Credentials…" : "Add Client & Create Portal"}
          </button>
        </div>
      </div>
    </div>
  );
}
