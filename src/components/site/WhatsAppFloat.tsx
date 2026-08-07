"use client";

import { useEffect, useState } from "react";
import { FaWhatsapp } from "react-icons/fa6";
import { whatsappLink, CONTACT_WHATSAPP } from "@/lib/utils";
import { CONSENT_EVENT } from "./CookieBanner";

/**
 * One tap to a conversation.
 *
 * Clients in Pakistan and the Gulf open WhatsApp before they open a contact
 * form, and "roughly what would this cost" is a question people will type into
 * a chat and will never fill in a three-step wizard for. Before this the
 * marketing site had no working WhatsApp route at all — the only link on it
 * was a placeholder number in the footer.
 *
 * Marketing site only. Signed-in clients already have a WhatsApp link in the
 * portal footer; a float there would pull support conversations out of change
 * requests, where they get recorded and quoted, and into a chat where they do
 * not.
 */

/** The first line, so nobody has to think of one — the usual reason a chat never gets sent. */
const OPENER = "Hi Nex Desk — I saw your site and wanted to ask about a project.";

const CONSENT_KEY = "nd-cookie-consent";

export default function WhatsAppFloat() {
  // The cookie banner is a full-width bar pinned to the bottom. While it is up
  // this has to sit above it rather than across its buttons.
  const [bannerUp, setBannerUp] = useState(false);

  useEffect(() => {
    const check = () => setBannerUp(!window.localStorage.getItem(CONSENT_KEY));
    check();

    window.addEventListener(CONSENT_EVENT, check);
    return () => window.removeEventListener(CONSENT_EVENT, check);
  }, []);

  return (
    <a
      href={whatsappLink(CONTACT_WHATSAPP, OPENER)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Message us on WhatsApp"
      /* z-75: above the cookie banner (70) so it is never buried, below the
         exit nudge (80) so that dialog's backdrop still covers it. */
      className={`group fixed right-5 z-[75] flex items-center gap-0 overflow-hidden rounded-full bg-[#25D366] text-ink-950 shadow-lg shadow-ink-950/40 transition-[bottom,gap,padding] duration-300 hover:gap-2 sm:right-6 ${
        bannerUp ? "bottom-32 sm:bottom-28" : "bottom-5 sm:bottom-6"
      }`}
    >
      <span className="grid h-14 w-14 shrink-0 place-items-center">
        <FaWhatsapp size={28} />
      </span>

      {/* Label unrolls on hover at desktop widths. Hidden on touch, where there
          is no hover and the icon is universally understood anyway. */}
      <span className="hidden max-w-0 whitespace-nowrap text-sm font-semibold transition-[max-width,padding] duration-300 group-hover:max-w-[12rem] group-hover:pr-5 sm:block">
        Chat with us
      </span>
    </a>
  );
}
