"use client";
import { useState, useEffect } from "react";
import { NegotiationMessage } from "@/lib/api";
import { API_BASE } from "@/lib/api";

export function useNegotiationStream(negotiationId: string, initialMessages: NegotiationMessage[] = [], enabled = true) {
  const [messages, setMessages] = useState<NegotiationMessage[]>(initialMessages);
  const [thinking, setThinking] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!enabled) return;
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

  return { messages, thinking, outcome, connected };
}
