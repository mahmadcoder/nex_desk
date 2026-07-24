"use client";

import { useState } from "react";
import BroadcastModal from "@/components/admin/BroadcastModal";
import { Mail, Send, Download, Search, CheckCircle, XCircle } from "lucide-react";

interface Subscriber {
  id: string;
  email: string;
  source: string;
  is_active: boolean;
  created_at: string;
}

export default function SubscribersClient({ subscribers }: { subscribers: Subscriber[] }) {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const filtered = subscribers.filter((s) =>
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const exportCSV = () => {
    const headers = "ID,Email,Source,Active,SubscribedAt\n";
    const rows = subscribers
      .map((s) => `"${s.id}","${s.email}","${s.source}","${s.is_active}","${s.created_at}"`)
      .join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nexdesk_subscribers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-ink-600 pb-6">
        <div>
          <span className="mono-tag text-lime-400">Newsletter Management</span>
          <h1 className="mt-1 text-2xl font-semibold text-bone-50">Subscribers ({subscribers.length})</h1>
          <p className="mt-1 text-xs text-bone-400">
            View mailing list subscribers and launch newsletter campaigns
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={exportCSV} className="btn h-9 px-3 text-xs flex items-center gap-2">
            <Download size={14} />
            Export CSV
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="btn btn-primary h-9 px-4 text-xs flex items-center gap-2"
          >
            <Send size={14} />
            Send Broadcast Campaign
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-bone-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter subscribers by email..."
          className="w-full rounded-lg border border-ink-600 bg-ink-800/80 pl-9 pr-4 py-2 text-xs text-bone-50 placeholder:text-bone-500 focus:border-lime-400 focus:outline-none"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden border-ink-600 p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-ink-800/60 border-b border-ink-600 text-bone-400 mono-tag">
              <tr>
                <th className="p-4">Email Address</th>
                <th className="p-4">Source</th>
                <th className="p-4">Status</th>
                <th className="p-4">Subscribed On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-700/60 text-bone-200">
              {filtered.length ? (
                filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-ink-800/40 transition-colors">
                    <td className="p-4 font-mono font-medium text-bone-50">{s.email}</td>
                    <td className="p-4 text-bone-400">{s.source || "website_footer"}</td>
                    <td className="p-4">
                      {s.is_active ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-400/10 px-2.5 py-0.5 text-[11px] font-medium text-lime-400 border border-lime-500/20">
                          <CheckCircle size={12} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-0.5 text-[11px] font-medium text-rose-400 border border-rose-500/20">
                          <XCircle size={12} /> Unsubscribed
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-bone-400">
                      {new Date(s.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-bone-400">
                    No subscribers found matching your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Broadcast Modal */}
      <BroadcastModal
        subscribers={subscribers}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
