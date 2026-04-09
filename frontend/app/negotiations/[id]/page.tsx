"use client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api, NegotiationMessage } from "@/lib/api";
import { formatCurrency, timeAgo, SERVICE_COLORS, ACTION_CONFIG } from "@/lib/utils";
import { CompanyAvatar } from "@/components/ui/CompanyAvatar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useReplay } from "@/hooks/useReplay";
import { useNegotiationStream, PendingTerms } from "@/hooks/useNegotiationStream";
import { CheckCircle2, XCircle, Zap, Clock, Download, UserCheck, RefreshCw, Loader2, AlertTriangle, X } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

// Thinking indicator component
function ThinkingIndicator({ party, color }: { party: string; color: string }) {
  const isLeft = party === "seller";
  return (
    <div className={`flex ${isLeft ? "justify-start" : "justify-end"} mb-4 animate-fade-up`}>
      <div className={`flex items-center gap-3 max-w-[75%] ${isLeft ? "" : "flex-row-reverse"}`}>
        <div className="flex gap-1 px-4 py-3 rounded-2xl border"
          style={{ backgroundColor: `${color}15`, borderColor: `${color}30` }}>
          <span className="thinking-dot" style={{ backgroundColor: color }} />
          <span className="thinking-dot" style={{ backgroundColor: color }} />
          <span className="thinking-dot" style={{ backgroundColor: color }} />
        </div>
        <span className="text-xs text-[#64748b]">thinking...</span>
      </div>
    </div>
  );
}

// Message bubble
function MessageBubble({ msg, sellerName, buyerName, sellerColor, buyerColor }: {
  msg: NegotiationMessage; sellerName: string; buyerName: string; sellerColor: string; buyerColor: string;
}) {
  const isSeller = msg.from_party === "seller";
  const color = isSeller ? sellerColor : buyerColor;
  const name = isSeller ? sellerName : buyerName;
  const action = ACTION_CONFIG[msg.action] || ACTION_CONFIG.proposal;
  let terms: Record<string, unknown> = {};
  try { terms = JSON.parse(msg.terms_json); } catch { /* ignore */ }

  return (
    <div className={`flex mb-5 ${isSeller ? "justify-start animate-slide-in-left" : "justify-end animate-slide-in-right"}`}>
      <div className={`flex gap-3 max-w-[80%] ${isSeller ? "" : "flex-row-reverse"}`}>
        <div className="mt-1 shrink-0">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: color }}>{name.slice(0, 2).toUpperCase()}</div>
        </div>
        <div>
          {/* Header */}
          <div className={`flex items-center gap-2 mb-1.5 ${isSeller ? "" : "flex-row-reverse"}`}>
            <span className="text-xs font-semibold text-[#e2e8f0]">{name}</span>
            <span className="text-[10px] text-[#64748b] bg-[#1e1e2e] px-1.5 py-0.5 rounded">Round {msg.round_number}</span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ color: action.color, backgroundColor: action.bg }}>
              {action.label}
            </span>
          </div>
          {/* Bubble */}
          <div className="rounded-2xl px-4 py-3"
            style={{
              backgroundColor: `${color}12`,
              borderLeft: isSeller ? `2px solid ${color}` : "none",
              borderRight: !isSeller ? `2px solid ${color}` : "none",
            }}>
            <p className="text-sm text-[#e2e8f0] leading-relaxed">{msg.message}</p>
            {/* Terms chips */}
            {(msg.price_per_unit || msg.duration_days) && (
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-white/5">
                {msg.price_per_unit && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: `${color}25`, color }}>
                    ${msg.price_per_unit}/unit
                  </span>
                )}
                {msg.duration_days && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#1e1e2e] text-[#94a3b8]">
                    {msg.duration_days} days
                  </span>
                )}
                {msg.format_type && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#1e1e2e] text-[#94a3b8]">
                    {msg.format_type}
                  </span>
                )}
                {typeof terms.staff_count === "number" && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-[#1e1e2e] text-[#94a3b8]">
                    {terms.staff_count} staff
                  </span>
                )}
                {typeof terms.sponsorship_amount === "number" && (
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ backgroundColor: `${color}25`, color }}>
                    {formatCurrency(terms.sponsorship_amount as number)}
                  </span>
                )}
              </div>
            )}
          </div>
          <p className="text-[10px] text-[#64748b] mt-1 px-1">{timeAgo(msg.created_at)}</p>
        </div>
      </div>
    </div>
  );
}

// ── Human-in-the-loop review panel ──────────────────────────────────────────

interface OverrideForm {
  buyer_max_price: string;
  buyer_target_price: string;
  seller_min_price_override: string;
  max_rounds: string;
}

function HumanReviewPanel({
  negotiationId,
  terms,
  proposedValue,
  sellerName,
  buyerName,
  buyerConfigJson,
  onActionComplete,
}: {
  negotiationId: string;
  terms: PendingTerms;
  proposedValue: number | null;
  sellerName: string;
  buyerName: string;
  buyerConfigJson?: string;
  onActionComplete: () => void;
}) {
  const [showOverride, setShowOverride] = useState(false);
  const [loading, setLoading] = useState<"approve" | "renegotiate" | null>(null);
  const [error, setError] = useState("");

  // Pre-fill overrides from original buyer config
  const originalConfig = (() => {
    try { return JSON.parse(buyerConfigJson || "{}"); } catch { return {}; }
  })();
  const [form, setForm] = useState<OverrideForm>({
    buyer_max_price: String(originalConfig.max_budget_per_unit || ""),
    buyer_target_price: String(originalConfig.target_price_per_unit || ""),
    seller_min_price_override: "",
    max_rounds: "8",
  });

  const handleApprove = async () => {
    setLoading("approve"); setError("");
    try {
      await api.negotiations.review(negotiationId, "approve");
      onActionComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to approve");
      setLoading(null);
    }
  };

  const handleRenegotiate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading("renegotiate"); setError("");
    const overrides: Record<string, number> = {};
    if (form.buyer_max_price) overrides.buyer_max_price = parseFloat(form.buyer_max_price);
    if (form.buyer_target_price) overrides.buyer_target_price = parseFloat(form.buyer_target_price);
    if (form.seller_min_price_override) overrides.seller_min_price_override = parseFloat(form.seller_min_price_override);
    if (form.max_rounds) overrides.max_rounds = parseInt(form.max_rounds);
    try {
      await api.negotiations.review(negotiationId, "renegotiate", overrides);
      onActionComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to re-trigger negotiation");
      setLoading(null);
    }
  };

  return (
    <div className="bg-[#0d1f2e] border border-[#f59e0b]/40 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#f59e0b]/20 flex items-center gap-3 bg-[#f59e0b]/10">
        <AlertTriangle className="w-5 h-5 text-[#f59e0b] shrink-0" />
        <div>
          <h3 className="text-sm font-bold text-[#fbbf24]">Awaiting Your Review</h3>
          <p className="text-xs text-[#92400e] mt-0.5">AI agents reached a deal — approve to finalise or override constraints and re-negotiate.</p>
        </div>
      </div>

      {/* Proposed terms */}
      <div className="p-5 space-y-2 text-sm">
        {terms.format && (
          <div className="flex justify-between"><span className="text-[#94a3b8]">Format</span><span className="text-[#e2e8f0]">{terms.format}</span></div>
        )}
        {terms.duration_days && (
          <div className="flex justify-between"><span className="text-[#94a3b8]">Duration</span><span className="text-[#e2e8f0]">{terms.duration_days} days</span></div>
        )}
        {terms.price_per_day && (
          <div className="flex justify-between"><span className="text-[#94a3b8]">Rate</span><span className="text-[#e2e8f0]">${terms.price_per_day}/day</span></div>
        )}
        {terms.start_date && (
          <div className="flex justify-between"><span className="text-[#94a3b8]">Start date</span><span className="text-[#e2e8f0]">{terms.start_date}</span></div>
        )}
        {proposedValue != null && (
          <div className="flex justify-between pt-2 border-t border-[#f59e0b]/20">
            <span className="font-semibold text-[#e2e8f0]">Total Value</span>
            <span className="text-xl font-bold text-[#f59e0b]">{formatCurrency(proposedValue)}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      {!showOverride ? (
        <div className="px-5 pb-5 space-y-2">
          {error && <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}
          <button
            onClick={handleApprove}
            disabled={loading !== null}
            className="w-full py-2.5 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading === "approve" ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
            Approve & Finalise Contract
          </button>
          <button
            onClick={() => setShowOverride(true)}
            disabled={loading !== null}
            className="w-full py-2.5 rounded-lg bg-[#f59e0b]/15 hover:bg-[#f59e0b]/25 text-[#fbbf24] border border-[#f59e0b]/30 text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <RefreshCw className="w-4 h-4" />
            Override Constraints & Re-negotiate
          </button>
        </div>
      ) : (
        <div className="px-5 pb-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-semibold text-[#fbbf24]">Override Constraint Boundaries</h4>
            <button onClick={() => setShowOverride(false)} className="p-1 rounded hover:bg-[#2a2a3e] transition-colors">
              <X className="w-3.5 h-3.5 text-[#64748b]" />
            </button>
          </div>
          <form onSubmit={handleRenegotiate} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-medium text-[#94a3b8] block mb-1">Buyer max (ceiling) *</label>
                <input type="number" min="0" step="0.01"
                  className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-2.5 py-2 text-xs text-[#e2e8f0] focus:outline-none focus:border-[#f59e0b]"
                  placeholder="e.g. 60" value={form.buyer_max_price}
                  onChange={e => setForm(f => ({ ...f, buyer_max_price: e.target.value }))} />
              </div>
              <div>
                <label className="text-[10px] font-medium text-[#94a3b8] block mb-1">Buyer target (opening)</label>
                <input type="number" min="0" step="0.01"
                  className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-2.5 py-2 text-xs text-[#e2e8f0] focus:outline-none focus:border-[#f59e0b]"
                  placeholder="e.g. 45" value={form.buyer_target_price}
                  onChange={e => setForm(f => ({ ...f, buyer_target_price: e.target.value }))} />
              </div>
              <div>
                <label className="text-[10px] font-medium text-[#94a3b8] block mb-1">Seller min (floor override)</label>
                <input type="number" min="0" step="0.01"
                  className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-2.5 py-2 text-xs text-[#e2e8f0] focus:outline-none focus:border-[#f59e0b]"
                  placeholder="leave blank = no change" value={form.seller_min_price_override}
                  onChange={e => setForm(f => ({ ...f, seller_min_price_override: e.target.value }))} />
              </div>
              <div>
                <label className="text-[10px] font-medium text-[#94a3b8] block mb-1">Max rounds</label>
                <input type="number" min="1" max="20"
                  className="w-full bg-[#0d0d14] border border-[#2a2a3e] rounded-lg px-2.5 py-2 text-xs text-[#e2e8f0] focus:outline-none focus:border-[#f59e0b]"
                  value={form.max_rounds}
                  onChange={e => setForm(f => ({ ...f, max_rounds: e.target.value }))} />
              </div>
            </div>
            {error && <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading !== null}
              className="w-full py-2.5 rounded-lg bg-[#f59e0b] hover:bg-[#d97706] text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
              {loading === "renegotiate" ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Re-trigger Negotiation
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function NegotiationDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: neg, isLoading } = useQuery({
    queryKey: ["negotiation", id],
    queryFn: () => api.negotiations.get(id),
    refetchInterval: (query) => {
      const s = query.state.data?.status;
      return s === "active" || s === "pending_review" ? 10000 : false;
    },
  });

  const isActive = neg?.status === "active";
  const isCompleted = neg?.status === "completed";
  const isPendingReview = neg?.status === "pending_review";

  // Replay for completed negotiations
  const { visible: replayMsgs, thinking: replayThinking } = useReplay(
    isCompleted ? (neg?.messages || []) : [],
    isCompleted
  );

  // SSE for active negotiations
  const { messages: streamMsgs, thinking: streamThinking, pendingTerms: streamPendingTerms, proposedValue: streamProposedValue } = useNegotiationStream(
    id, neg?.messages || [], isActive
  );

  // Resolve pending terms: prefer live SSE, fall back to DB field
  const activePendingTerms = streamPendingTerms || (
    isPendingReview && neg?.pending_terms_json
      ? (() => { try { return JSON.parse(neg.pending_terms_json!); } catch { return null; } })()
      : null
  );
  const activePendingValue = streamProposedValue || (
    activePendingTerms?.price_per_day && activePendingTerms?.duration_days
      ? activePendingTerms.price_per_day * activePendingTerms.duration_days
      : null
  );

  const handleReviewAction = () => {
    queryClient.invalidateQueries({ queryKey: ["negotiation", id] });
  };

  const displayMessages = isActive ? streamMsgs : (isPendingReview ? (neg?.messages || []) : replayMsgs);
  const thinkingParty = isActive ? streamThinking : (isPendingReview ? null : replayThinking);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages, thinkingParty]);

  // Price chart data
  const chartData = (neg?.messages || [])
    .filter(m => m.price_per_unit != null)
    .reduce((acc: Array<Record<string, unknown>>, m) => {
      const existing = acc.find(d => d.round === m.round_number);
      if (existing) { existing[m.from_party] = m.price_per_unit; return acc; }
      return [...acc, { round: m.round_number, [m.from_party]: m.price_per_unit }];
    }, []);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="h-8 bg-[#13131a] rounded-lg w-64 animate-pulse mb-4" />
        <div className="h-96 bg-[#13131a] rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!neg) return <div className="p-8 text-[#64748b]">Negotiation not found.</div>;

  const sellerColor = neg.seller.avatar_color || "#3b82f6";
  const buyerColor = neg.buyer.avatar_color || "#10b981";

  return (
    <div className="p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between mb-2">
          <h1 className="text-2xl font-bold text-[#e2e8f0] pr-4">{neg.title}</h1>
          <StatusBadge outcome={neg.outcome} status={neg.status} />
        </div>
        <div className="flex items-center gap-3 text-sm text-[#64748b]">
          <span className="font-medium" style={{ color: SERVICE_COLORS[neg.service_type] }}>{neg.service_type}</span>
          <span>·</span>
          <span>{neg.round_count} rounds</span>
          <span>·</span>
          <span>{timeAgo(neg.created_at)}</span>
          {neg.status === "active" && (
            <span className="flex items-center gap-1.5 text-[#f59e0b] font-medium">
              <span className="w-2 h-2 rounded-full bg-[#f59e0b] animate-pulse" /> Live AI Negotiation
            </span>
          )}
        </div>
      </div>

      {/* Party bar */}
      <div className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CompanyAvatar name={neg.seller.name} initials={neg.seller.logo_initials} color={sellerColor} size="md" />
          <div>
            <p className="text-sm font-semibold text-[#e2e8f0]">{neg.seller.name}</p>
            <p className="text-xs text-[#64748b]">Seller</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[#64748b]">
          <Zap className="w-4 h-4 text-[#6366f1]" />
          <span className="text-sm font-medium text-[#e2e8f0]">AI Negotiation</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-semibold text-[#e2e8f0]">{neg.buyer.name}</p>
            <p className="text-xs text-[#64748b]">Buyer</p>
          </div>
          <CompanyAvatar name={neg.buyer.name} initials={neg.buyer.logo_initials} color={buyerColor} size="md" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Chat thread — left */}
        <div className="lg:col-span-3">
          <div className="bg-[#13131a] border border-[#1e1e2e] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#1e1e2e] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[#e2e8f0]">Negotiation Thread</h3>
              {neg.status === "active" && (
                <div className="flex items-center gap-1.5 text-xs text-[#f59e0b]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse" /> Live
                </div>
              )}
            </div>
            <div className="p-5 min-h-[400px] max-h-[600px] overflow-y-auto">
              {displayMessages.length === 0 && !thinkingParty && (
                <div className="flex items-center justify-center h-32 text-[#64748b] text-sm">
                  {neg.status === "active" ? "Waiting for agents to start..." : "No messages yet"}
                </div>
              )}
              {displayMessages.map(msg => (
                <MessageBubble
                  key={msg.id} msg={msg}
                  sellerName={neg.seller.name} buyerName={neg.buyer.name}
                  sellerColor={sellerColor} buyerColor={buyerColor}
                />
              ))}
              {thinkingParty && (
                <ThinkingIndicator
                  party={thinkingParty}
                  color={thinkingParty === "seller" ? sellerColor : buyerColor}
                />
              )}
              <div ref={bottomRef} />
            </div>
            {/* Footer */}
            <div className="px-5 py-3 border-t border-[#1e1e2e] bg-[#0d0d14]">
              <p className="text-xs text-[#64748b] text-center flex items-center justify-center gap-1.5">
                <Zap className="w-3 h-3 text-[#6366f1]" />
                AI agents negotiate autonomously — no human input required
              </p>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Latest terms */}
          {displayMessages.length > 0 && (() => {
            const last = [...displayMessages].reverse().find(m => m.price_per_unit != null || m.duration_days != null);
            if (!last) return null;
            return (
              <div className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-4">
                <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3">Latest Proposed Terms</h3>
                <div className="space-y-2">
                  {last.price_per_unit && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#64748b]">Price / unit</span>
                      <span className="font-bold text-[#e2e8f0]">${last.price_per_unit}/day</span>
                    </div>
                  )}
                  {last.duration_days && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#64748b]">Duration</span>
                      <span className="font-semibold text-[#e2e8f0]">{last.duration_days} days</span>
                    </div>
                  )}
                  {last.format_type && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#64748b]">Format</span>
                      <span className="font-semibold text-[#e2e8f0]">{last.format_type}</span>
                    </div>
                  )}
                  {last.price_per_unit && last.duration_days && (
                    <div className="flex justify-between text-sm pt-2 border-t border-[#1e1e2e]">
                      <span className="text-[#64748b]">Est. Total</span>
                      <span className="font-bold text-[#6366f1]">{formatCurrency(last.price_per_unit * last.duration_days)}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Price convergence chart */}
          {chartData.length > 1 && (
            <div className="bg-[#13131a] border border-[#1e1e2e] rounded-xl p-4">
              <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3">Price Convergence</h3>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={chartData}>
                  <XAxis dataKey="round" tick={{ fontSize: 10, fill: "#64748b" }} label={{ value: "Round", position: "insideBottom", offset: -2, fontSize: 10, fill: "#64748b" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v: number) => `$${v}`} width={45} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#13131a", border: "1px solid #2a2a3e", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(v) => v != null ? [`$${v}`, undefined] : [`$0`, undefined]}
                  />
                  <Line type="monotone" dataKey="seller" stroke={sellerColor} strokeWidth={2} dot={{ fill: sellerColor, r: 4 }} name="Seller" />
                  <Line type="monotone" dataKey="buyer" stroke={buyerColor} strokeWidth={2} dot={{ fill: buyerColor, r: 4 }} name="Buyer" />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Human-in-the-loop review panel */}
          {activePendingTerms && (
            <HumanReviewPanel
              negotiationId={id}
              terms={activePendingTerms}
              proposedValue={activePendingValue}
              sellerName={neg.seller.name}
              buyerName={neg.buyer.name}
              buyerConfigJson={neg.buyer_config_json}
              onActionComplete={handleReviewAction}
            />
          )}

          {/* Contract card */}
          {neg.contract && neg.outcome === "agreement" && (
            <div className="bg-[#0d2e1a] border border-[#22c55e]/40 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-[#22c55e]" />
                  <h3 className="text-sm font-bold text-[#22c55e]">Contract Signed</h3>
                </div>
                <a
                  href={`${api.apiBase}/api/v1/contracts/${neg.contract.id}/pdf`}
                  download
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30 hover:bg-[#22c55e]/25 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </a>
              </div>
              <p className="text-sm font-semibold text-[#e2e8f0] mb-3">{neg.contract.listing_title}</p>
              {(() => {
                let t: { format?: string; duration_days?: number; price_per_day?: number; staff_count?: number; daily_rate_per_person?: number } = {};
                try { t = JSON.parse(neg.contract.terms_json); } catch { /* ignore */ }
                return (
                  <div className="space-y-2 text-sm">
                    {t.format && <div className="flex justify-between"><span className="text-[#64748b]">Format</span><span className="text-[#e2e8f0]">{t.format}</span></div>}
                    {t.duration_days && <div className="flex justify-between"><span className="text-[#64748b]">Duration</span><span className="text-[#e2e8f0]">{t.duration_days} days</span></div>}
                    {t.price_per_day && <div className="flex justify-between"><span className="text-[#64748b]">Rate</span><span className="text-[#e2e8f0]">${t.price_per_day}/day</span></div>}
                    {t.staff_count && <div className="flex justify-between"><span className="text-[#64748b]">Staff</span><span className="text-[#e2e8f0]">{t.staff_count} people</span></div>}
                    {t.daily_rate_per_person && <div className="flex justify-between"><span className="text-[#64748b]">Rate</span><span className="text-[#e2e8f0]">${t.daily_rate_per_person}/person/day</span></div>}
                    <div className="flex justify-between pt-2 border-t border-[#22c55e]/20">
                      <span className="font-semibold text-[#e2e8f0]">Total Value</span>
                      <span className="text-xl font-bold text-[#22c55e]">{formatCurrency(neg.contract.total_value)}</span>
                    </div>
                  </div>
                );
              })()}
              <p className="text-xs text-[#64748b] mt-3">Signed {timeAgo(neg.contract.created_at)}</p>
            </div>
          )}

          {/* No deal card */}
          {neg.outcome === "no_deal" && (
            <div className="bg-[#1a0d0d] border border-[#ef4444]/30 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="w-5 h-5 text-[#ef4444]" />
                <h3 className="text-sm font-bold text-[#ef4444]">No Agreement Reached</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#64748b]">Rounds used</span>
                  <span className="text-[#e2e8f0]">{neg.round_count} / {neg.max_rounds}</span>
                </div>
                {neg.failure_reason && (
                  <div className="mt-2 p-3 rounded-lg bg-[#ef4444]/10 border border-[#ef4444]/20">
                    <p className="text-xs text-[#fca5a5] leading-relaxed">{neg.failure_reason}</p>
                  </div>
                )}
                {!neg.failure_reason && (
                  <p className="text-[#94a3b8]">The parties could not bridge the gap between their positions.</p>
                )}
              </div>
            </div>
          )}

          {/* Active hint */}
          {neg.status === "active" && (
            <div className="bg-[#13131a] border border-[#6366f1]/30 rounded-xl p-4 flex items-start gap-3">
              <Clock className="w-4 h-4 text-[#6366f1] mt-0.5 shrink-0" />
              <p className="text-xs text-[#94a3b8]">AI agents are negotiating in real-time. Each round takes ~30 seconds. You can leave and return — the negotiation continues automatically.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
