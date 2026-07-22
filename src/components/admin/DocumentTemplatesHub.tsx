"use client";

import { useState, useMemo } from "react";
import { AGENCY_TEMPLATES, type AgencyTemplate } from "@/lib/templates";
import { Badge, Table, Empty } from "@/components/admin/ui";
import {
  FileText,
  Shield,
  Layers,
  CheckCircle,
  Award,
  PlusCircle,
  Send,
  Download,
  Copy,
  Search,
  Eye,
  X,
  FileSpreadsheet,
  FileType,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export default function DocumentTemplatesHub({
  clientDocs,
}: {
  clientDocs: any[];
}) {
  const [activeTab, setActiveTab] = useState<"templates" | "history">("templates");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [selectedTemplate, setSelectedTemplate] = useState<AgencyTemplate | null>(null);
  const [customText, setCustomText] = useState("");
  const [loadingPdfId, setLoadingPdfId] = useState<string | null>(null);

  const categories = ["All", "Agreements", "Contracts", "Letters", "Proposals"];

  const filteredTemplates = useMemo(() => {
    return AGENCY_TEMPLATES.filter((t) => {
      const matchesCategory = categoryFilter === "All" || t.category === categoryFilter;
      const matchesSearch =
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [search, categoryFilter]);

  const handleOpenModal = (t: AgencyTemplate) => {
    setSelectedTemplate(t);
    const d = new Date().toLocaleDateString("en-GB");
    const yr = new Date().getFullYear().toString();
    const formatted = t.textContent
      .replace(/{{DATE}}/g, d)
      .replace(/{{YEAR}}/g, yr);
    setCustomText(formatted);
  };

  const handleCopyText = (txt: string) => {
    navigator.clipboard.writeText(txt);
    toast.success("Template text copied to clipboard!");
  };

  // Generate & Download Styled Word (.doc) File with 100% Word/WPS Office compatibility
  const handleDownloadStyledDoc = (tTitle: string, textContentToSave: string) => {
    const lines = textContentToSave.split("\n").map((l) => l.trim()).filter(Boolean);

    const bodyHtml = lines
      .map((line) => {
        if (line.startsWith("===") || line.startsWith("---")) return "";
        const lower = line.toLowerCase();
        if (
          lower.startsWith("nex desk — master") ||
          lower.startsWith("master software services") ||
          lower.startsWith("certificate of project completion") ||
          lower.startsWith("mutual non-disclosure agreement") ||
          lower.startsWith("statement of work") ||
          lower.startsWith("project handover") ||
          lower.startsWith("scope change order")
        ) {
          return "";
        }

        const isHeading =
          line.endsWith(":") ||
          /^[0-9]+\./.test(line) ||
          (line === line.toUpperCase() && line.length < 45);

        if (isHeading) {
          return `<h3 style="color:#09090b; font-size:14px; font-weight:bold; margin-top:20px; margin-bottom:6px; border-bottom:2px solid #65a30d; padding-bottom:3px; font-family:Arial, sans-serif;">${line}</h3>`;
        }
        return `<p style="font-size:11px; line-height:1.6; color:#27272a; margin-bottom:8px; font-family:Arial, sans-serif;">${line}</p>`;
      })
      .join("");

    const fullHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset='utf-8'>
        <title>${tTitle}</title>
      </head>
      <body style="font-family: Arial, sans-serif; padding: 30px; color: #27272a; background-color: #ffffff;">
        
        <!-- Header Branding Table -->
        <table width="100%" cellpadding="0" cellspacing="0" style="width:100%; border-bottom: 3px solid #65a30d; padding-bottom: 12px; margin-bottom: 20px;">
          <tr>
            <td valign="top" style="width: 55%;">
              <div style="font-size: 22px; font-weight: bold; color: #09090b; font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: -0.5px;">NEX DESK</div>
              <div style="font-size: 10px; font-weight: bold; color: #65a30d; font-family: Arial, sans-serif; text-transform: uppercase; margin-top: 2px;">Software Agency & AI Solutions</div>
            </td>
            <td valign="top" style="width: 45%; text-align: right; font-size: 10px; color: #52525b; font-family: Arial, sans-serif; line-height: 1.5;">
              <div><strong>Website:</strong> nexdesk.agency</div>
              <div><strong>Email:</strong> hello@nexdesk.agency</div>
              <div><strong>WhatsApp:</strong> +92 300 1234567</div>
              <div>Multan, Pakistan</div>
            </td>
          </tr>
        </table>

        <!-- Document Metadata Bar -->
        <div style="background-color: #f4f4f5; border-left: 4px solid #65a30d; padding: 10px 14px; font-size: 11px; font-family: Arial, sans-serif; color: #18181b; margin-bottom: 22px;">
          <strong>DOCUMENT:</strong> ${tTitle.toUpperCase()} &nbsp;|&nbsp; 
          <strong>DATE:</strong> ${new Date().toLocaleDateString("en-GB")} &nbsp;|&nbsp; 
          <strong>ISSUER:</strong> NEX DESK SOFTWARE AGENCY
        </div>

        <!-- Document Body Content -->
        <div class="content">
          ${bodyHtml}
        </div>

        <!-- Signatures Table -->
        <table width="100%" cellpadding="0" cellspacing="0" style="width: 100%; margin-top: 40px; border-top: 1px solid #e4e4e7; padding-top: 20px;">
          <tr>
            <td valign="top" style="width: 45%;">
              <div style="border-bottom: 1px solid #a1a1aa; height: 35px; margin-bottom: 8px;"></div>
              <strong style="font-size: 11px; font-family: Arial, sans-serif;">Authorized Representative</strong><br>
              <span style="font-size: 10px; color: #71717a; font-family: Arial, sans-serif;">Nex Desk Software Agency</span>
            </td>
            <td style="width: 10%;"></td>
            <td valign="top" style="width: 45%;">
              <div style="border-bottom: 1px solid #a1a1aa; height: 35px; margin-bottom: 8px;"></div>
              <strong style="font-size: 11px; font-family: Arial, sans-serif;">Client Acceptance & Sign-Off</strong><br>
              <span style="font-size: 10px; color: #71717a; font-family: Arial, sans-serif;">Client Organization</span>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(["\ufeff" + fullHtml], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${tTitle.toLowerCase().replace(/[^a-z0-9]/g, "_")}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${tTitle} Word (.doc) File!`);
  };

  // Generate & Download Vector PDF File via API
  const handleDownloadPdf = async (t: AgencyTemplate, textContentToSave?: string) => {
    const content = textContentToSave || t.textContent;
    setLoadingPdfId(t.id);
    try {
      const res = await fetch("/api/documents/template/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t.title,
          badge: t.badge,
          content,
        }),
      });

      if (!res.ok) throw new Error("Failed to generate PDF");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${t.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${t.title} PDF!`);
    } catch {
      toast.error("Couldn't generate PDF file. Try again.");
    } finally {
      setLoadingPdfId(null);
    }
  };

  const renderTemplateIcon = (id: string) => {
    switch (id) {
      case "master_agreement":
        return <FileText className="h-5 w-5 text-lime-400" />;
      case "nda":
        return <Shield className="h-5 w-5 text-sky-400" />;
      case "sow":
        return <Layers className="h-5 w-5 text-amber-400" />;
      case "handover_letter":
        return <CheckCircle className="h-5 w-5 text-emerald-400" />;
      case "completion_cert":
        return <Award className="h-5 w-5 text-purple-400" />;
      case "change_order":
        return <PlusCircle className="h-5 w-5 text-rose-400" />;
      default:
        return <Send className="h-5 w-5 text-blue-400" />;
    }
  };

  return (
    <div>
      {/* Top Tab Switcher */}
      <div className="flex flex-wrap items-center gap-3 border-b border-ink-600 pb-4 mb-8">
        <button
          type="button"
          onClick={() => setActiveTab("templates")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            activeTab === "templates"
              ? "bg-lime-400 text-lime-950 font-semibold shadow"
              : "text-bone-400 hover:text-bone-50 hover:bg-ink-800"
          }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Agency Template Library</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
            activeTab === "history"
              ? "bg-lime-400 text-lime-950 font-semibold shadow"
              : "text-bone-400 hover:text-bone-50 hover:bg-ink-800"
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>Generated Client PDFs ({clientDocs.length})</span>
        </button>
      </div>

      {/* Tab 1: Agency Templates Library */}
      {activeTab === "templates" && (
        <div>
          {/* Search & Category Filter */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-bone-500" />
              <input
                type="text"
                placeholder="Search legal templates..."
                className="w-full rounded-lg border border-ink-500 bg-ink-800 pl-9 pr-4 py-2 text-sm text-bone-50 placeholder:text-bone-600 focus:border-lime-400 focus:outline-none"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                    categoryFilter === cat
                      ? "bg-ink-700 text-lime-400 border border-lime-400/40"
                      : "text-bone-400 hover:text-bone-100 hover:bg-ink-800"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Template Cards Grid */}
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((t) => (
              <div
                key={t.id}
                className="card p-6 flex flex-col justify-between hover:border-ink-500 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 rounded-lg bg-ink-950 border border-ink-600">
                      {renderTemplateIcon(t.id)}
                    </div>
                    <span className="mono-tag text-[10px] text-lime-400 bg-ink-950 px-2 py-1 rounded border border-ink-600">
                      {t.badge}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-bone-50 group-hover:text-lime-400 transition-colors">
                    {t.title}
                  </h3>
                  <p className="mt-2 text-xs text-bone-400 line-clamp-3 leading-relaxed">
                    {t.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-ink-600 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenModal(t)}
                    className="btn h-9 px-3 text-xs gap-1.5 w-full justify-center cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" /> View & Edit Content
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(t)}
                      disabled={loadingPdfId === t.id}
                      className="btn h-9 px-2 text-xs gap-1.5 text-lime-400 border-lime-400/40 hover:bg-lime-400/10 cursor-pointer justify-center"
                      title="Download Styled PDF"
                    >
                      {loadingPdfId === t.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      <span>PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDownloadStyledDoc(t.title, t.textContent)}
                      className="btn h-9 px-2 text-xs gap-1.5 text-sky-400 border-sky-400/40 hover:bg-sky-400/10 cursor-pointer justify-center"
                      title="Download Styled Word DOCS file"
                    >
                      <FileType className="h-3.5 w-3.5" />
                      <span>DOCS</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!filteredTemplates.length && (
            <div className="card p-12 text-center mt-6">
              <p className="text-sm text-bone-400">No template matches your search filter.</p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Generated Client Documents History */}
      {activeTab === "history" && (
        <div>
          {!clientDocs?.length ? (
            <Empty
              title="No generated documents yet"
              body="Agreements, invoices and receipts appear here as they are generated for clients."
            />
          ) : (
            <Table head={["Document Title", "Type", "Client", "File Size", "Created Date", ""]}>
              {clientDocs.map((d) => (
                <tr key={d.id} className="hover:bg-ink-700/30">
                  <td className="px-5 py-3 font-medium text-bone-100">{d.title}</td>
                  <td className="px-5 py-3">
                    <Badge>{d.type}</Badge>
                  </td>
                  <td className="px-5 py-3 text-bone-400 font-medium">
                    {(d.clients as any)?.name ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-bone-400 font-mono text-xs">
                    {Math.round((d.file_size ?? 0) / 1024)} KB
                  </td>
                  <td className="px-5 py-3 text-bone-400 text-xs">
                    {new Date(d.created_at).toLocaleString("en-GB")}
                  </td>
                  <td className="px-5 py-3 text-right">
                    {d.url && (
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mono-tag text-lime-400 hover:underline flex items-center gap-1 justify-end"
                      >
                        <Download className="h-3 w-3" /> PDF →
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </div>
      )}

      {/* View & Edit Template Modal */}
      {selectedTemplate && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-ink-950/80 p-4 backdrop-blur-sm overflow-y-auto"
          onClick={() => setSelectedTemplate(null)}
        >
          <div
            className="card w-full max-w-3xl p-6 relative bg-ink-900 border-ink-600 shadow-2xl my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-ink-600 pb-4">
              <div>
                <span className="mono-tag text-xs text-lime-400">{selectedTemplate.badge}</span>
                <h2 className="text-xl font-semibold text-bone-50 mt-1">{selectedTemplate.title}</h2>
              </div>
              <button
                type="button"
                className="rounded-lg p-1.5 text-bone-400 hover:bg-ink-800 hover:text-bone-50 transition-colors cursor-pointer"
                onClick={() => setSelectedTemplate(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4">
              <p className="text-xs text-bone-400 mb-2">
                Customize terms, client details, or prices directly below before downloading:
              </p>
              <textarea
                className="w-full h-80 rounded-lg border border-ink-600 bg-ink-950 p-4 font-mono text-xs text-bone-100 focus:border-lime-400 focus:outline-none resize-y leading-relaxed"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
              />
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink-600 pt-4">
              <button
                type="button"
                className="btn h-9 px-4 text-xs cursor-pointer"
                onClick={() => setSelectedTemplate(null)}
              >
                Close
              </button>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn h-9 px-3 text-xs gap-1.5 cursor-pointer"
                  onClick={() => handleCopyText(customText)}
                >
                  <Copy className="h-3.5 w-3.5" /> Copy Text
                </button>

                <button
                  type="button"
                  className="btn h-9 px-3 text-xs gap-1.5 text-sky-400 border-sky-400/40 hover:bg-sky-400/10 cursor-pointer"
                  onClick={() => handleDownloadStyledDoc(selectedTemplate.title, customText)}
                >
                  <FileType className="h-3.5 w-3.5" /> Download Styled DOCS
                </button>

                <button
                  type="button"
                  className="btn btn-primary h-9 px-4 text-xs gap-1.5 cursor-pointer"
                  onClick={() => handleDownloadPdf(selectedTemplate, customText)}
                  disabled={loadingPdfId === selectedTemplate.id}
                >
                  {loadingPdfId === selectedTemplate.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  <span>Download Styled PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
