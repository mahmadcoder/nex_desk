import React from "react";
import {
  FaLinkedin,
  FaFacebook,
  FaInstagram,
  FaXTwitter,
  FaYoutube,
  FaWhatsapp,
  FaDribbble,
  FaBehance,
} from "react-icons/fa6";
import { SiFiverr, SiUpwork } from "react-icons/si";
import { Globe, Users, Mail, Edit3 } from "lucide-react";

export function PlatformIcon({ id, className = "w-4 h-4" }: { id: string; className?: string }) {
  switch (id?.toLowerCase()) {
    case "linkedin":
      return <FaLinkedin className={`${className} text-[#0A66C2]`} />;

    case "fiverr":
      return <SiFiverr className={`${className} text-[#1DBF73]`} />;

    case "upwork":
      return <SiUpwork className={`${className} text-[#14A800]`} />;

    case "instagram":
      return <FaInstagram className={`${className} text-[#E4405F]`} />;

    case "facebook":
      return <FaFacebook className={`${className} text-[#1877F2]`} />;

    case "website":
      return <Globe className={`${className} text-[#38BDF8]`} />;

    case "dribbble_behance":
    case "dribbble":
      return <FaDribbble className={`${className} text-[#EA4C89]`} />;

    case "behance":
      return <FaBehance className={`${className} text-[#1769FF]`} />;

    case "twitter":
    case "x":
      return <FaXTwitter className={`${className} text-white`} />;

    case "youtube_tiktok":
    case "youtube":
    case "tiktok":
      return <FaYoutube className={`${className} text-[#FF0000]`} />;

    case "referral":
      return <Users className={`${className} text-[#A855F7]`} />;

    case "cold_outreach":
      return <Mail className={`${className} text-[#F59E0B]`} />;

    case "whatsapp":
      return <FaWhatsapp className={`${className} text-[#25D366]`} />;

    default:
      return <Edit3 className={`${className} text-[#8B5CF6]`} />;
  }
}
