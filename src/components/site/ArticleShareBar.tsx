"use client";

import { useState } from "react";
import { Link2, Check, Share2 } from "lucide-react";
import { toast } from "sonner";
import { FaXTwitter, FaLinkedinIn } from "react-icons/fa6";

export default function ArticleShareBar({
  title,
  slug,
}: {
  title: string;
  slug: string;
}) {
  const [copied, setCopied] = useState(false);

  const shareUrl =
    typeof window !== "undefined"
      ? window.location.href
      : `https://nexdesk.agency/blog/${slug}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Article link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleTwitterShare = () => {
    const text = encodeURIComponent(`"${title}" by @mahmadcoder on @nexdesk`);
    const url = encodeURIComponent(shareUrl);
    window.open(
      `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const handleLinkedInShare = () => {
    const url = encodeURIComponent(shareUrl);
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-4 px-6 rounded-2xl border border-ink-700 bg-ink-900/60 my-10">
      <div className="flex items-center gap-2 text-xs font-mono text-bone-300">
        <Share2 size={14} className="text-lime-400" />
        <span>Share this insight</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleCopy}
          className="btn h-8 px-3 text-xs bg-ink-800 border-ink-600 text-bone-200 hover:text-bone-50 hover:border-lime-400/40 cursor-pointer inline-flex items-center gap-1.5 rounded-lg"
          title="Copy link"
        >
          {copied ? (
            <>
              <Check size={13} className="text-lime-400" />
              <span className="text-lime-400">Copied</span>
            </>
          ) : (
            <>
              <Link2 size={13} />
              <span>Copy link</span>
            </>
          )}
        </button>

        <button
          onClick={handleTwitterShare}
          className="h-8 w-8 rounded-lg bg-ink-800 border border-ink-600 hover:border-lime-400/40 text-bone-300 hover:text-bone-50 flex items-center justify-center transition-colors cursor-pointer"
          title="Share on X (Twitter)"
        >
          <FaXTwitter size={12} />
        </button>

        <button
          onClick={handleLinkedInShare}
          className="h-8 w-8 rounded-lg bg-ink-800 border border-ink-600 hover:border-lime-400/40 text-bone-300 hover:text-bone-50 flex items-center justify-center transition-colors cursor-pointer"
          title="Share on LinkedIn"
        >
          <FaLinkedinIn size={12} />
        </button>
      </div>
    </div>
  );
}
