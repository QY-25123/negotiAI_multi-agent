"use client";
import { useState, useEffect } from "react";
import { NegotiationMessage } from "@/lib/api";
import { API_BASE } from "@/lib/api";

export interface PendingTerms {
  ad_space_id?: string;
  format?: string;
  duration_days?: number;
  price_per_day?: number;
  start_date?: string;
  special_conditions?: string;
}

export function useNegotiationStream(negotiationId: string, initialMessages: NegotiationMessage[] = [], enabled = true) {
  const [messages, setMessages] = useState<NegotiationMessage[]>(initialMessages);
  const [thinking, setThinking] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [pendingTerms, setPendingTerms] = useState<PendingTerms | null>(null);
  const [proposedValue, setProposedValue] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    // Reset pending state when stream re-opens (e.g. after renegotiate)
    setPendingTerms(null);
    setProposedValue(null);
    const es = new EventSource(`${API_BASE}/api/v1/negotiations/${negotiationId}/stream`);
    setConnected(true);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "thinking") { setThinking(data.party); }
        else if (data.type === "message") {
          setThinking(null);
          setMessages(prev => {
            if (prev.find(m => m.id === data.id)) return prev;
            return [...prev, { ...data, id: data.id || String(Math.random()) }];
          });
        } else if (data.type === "pending_review") {
          setThinking(null);
          setPendingTerms(data.terms || null);
          setProposedValue(data.proposed_value ?? null);
          setConnected(false);
          es.close();
        } else if (data.type === "complete") {
          setThinking(null);
          setOutcome(data.outcome);
          setConnected(false);
          es.close();
        } else if (data.type === "error") {
          setConnected(false);
          es.close();
        }
      } catch {
        // ignore parse errors
      }
    };
    es.onerror = () => { setConnected(false); es.close(); };
    return () => { es.close(); setConnected(false); };
  }, [negotiationId, enabled]);

  return { messages, thinking, outcome, connected, pendingTerms, proposedValue };
}
