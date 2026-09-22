"use client";

import React, { useState } from "react";
import { MockConnection } from "@/lib/activity/types";
import { X, Send, UserCheck, Check, Search } from "lucide-react";

interface ActivityInviteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  connections: MockConnection[];
  onSendInvites: (selectedConnectionIds: string[]) => void;
  activityTitle: string;
}

export function ActivityInviteDialog({
  isOpen,
  onClose,
  connections,
  onSendInvites,
  activityTitle,
}: ActivityInviteDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    connections.filter((c) => c.invited).map((c) => c.id)
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!isOpen) return null;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSend = () => {
    onSendInvites(selectedIds);
    setSentSuccess(true);
    setTimeout(() => {
      setSentSuccess(false);
      onClose();
    }, 1200);
  };

  const filteredConnections = connections.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.handle || c.username || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl p-6 relative space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <div>
            <h3 className="text-lg font-bold text-neutral-100">Invite Connections</h3>
            <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">
              Invite your network to <span className="text-[#C9A84A] font-medium">{activityTitle}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {sentSuccess ? (
          <div className="py-8 flex flex-col items-center justify-center space-y-3 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Check className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-neutral-100">Invitations Sent!</p>
            <p className="text-xs text-neutral-400">Selected connections have been invited to join.</p>
          </div>
        ) : (
          <>
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search connections..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-neutral-800 bg-neutral-950 text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-[#C9A84A]/50"
              />
            </div>

            {/* Connection List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {filteredConnections.length === 0 ? (
                <div className="text-center py-6 text-xs text-neutral-500">
                  No connections found.
                </div>
              ) : (
                filteredConnections.map((conn) => {
                  const isSelected = selectedIds.includes(conn.id);
                  return (
                    <div
                      key={conn.id}
                      onClick={() => toggleSelect(conn.id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isSelected
                          ? "border-[#C9A84A]/40 bg-[#C9A84A]/5"
                          : "border-neutral-800/60 bg-neutral-950/40 hover:bg-neutral-800/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Avatar */}
                        <div className="relative w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 overflow-hidden shrink-0 flex items-center justify-center text-xs font-semibold text-neutral-300">
                          {conn.avatar ? (
                            <img src={conn.avatar} alt={conn.name} className="w-full h-full object-cover" />
                          ) : (
                            conn.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-neutral-200">{conn.name}</div>
                          <div className="text-[11px] text-neutral-500">@{conn.handle || conn.username}</div>
                        </div>
                      </div>

                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          isSelected
                            ? "bg-[#C9A84A] border-[#C9A84A] text-neutral-950"
                            : "border-neutral-700 bg-neutral-900"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={selectedIds.length === 0}
                className="px-4 py-2 rounded-lg text-xs font-medium bg-[#C9A84A] hover:bg-[#b5953f] text-neutral-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Send Invites ({selectedIds.length})
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ActivityInviteDialog;
