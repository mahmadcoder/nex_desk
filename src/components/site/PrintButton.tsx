"use client";

import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="btn gap-2 cursor-pointer transition-all hover:border-bone-400 hover:text-bone-50"
    >
      <Printer size={15} /> Print or save as PDF
    </button>
  );
}
