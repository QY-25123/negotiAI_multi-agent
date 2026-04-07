"use client";
import { useState, useEffect } from "react";
import { NegotiationMessage } from "@/lib/api";

function sleep(ms: number) { return new Promise<void>(r => setTimeout(r, ms)); }

export function useReplay(messages: NegotiationMessage[], autoStart = true) {
  const [visible, setVisible] = useState<NegotiationMessage[]>([]);
  const [thinking, setThinking] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!autoStart || messages.length === 0) return;
    let cancelled = false;
    const run = async () => {
      for (let i = 0; i < messages.length; i++) {
        if (cancelled) return;
        setThinking(messages[i].from_party);
        await sleep(800);
        if (cancelled) return;
        setThinking(null);
        setVisible(prev => [...prev, messages[i]]);
        if (i < messages.length - 1) await sleep(500);
      }
      setDone(true);
    };
    run();
    return () => { cancelled = true; };
  }, [messages, autoStart]);

  return { visible, thinking, done };
}
