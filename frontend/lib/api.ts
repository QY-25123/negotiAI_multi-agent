const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Company {
  id: string; name: string; type: string; industry: string;
  description: string; avatar_color: string; logo_initials: string;
  website?: string; contact_email?: string; created_at: string;
  listing_count?: number; negotiation_count?: number;
}

export interface ServiceListing {
  id: string; company_id: string; service_type: string; title: string;
  description: string; terms_json: string; min_price?: number; max_price?: number;
  location?: string; status: string; created_at: string; company?: Company;
}

export interface NegotiationMessage {
  id: string; negotiation_id: string; round_number: number;
  from_party: "buyer" | "seller"; action: string;
  price_per_unit?: number; duration_days?: number; format_type?: string;
  message: string; terms_json: string; created_at: string;
}

export interface Contract {
  id: string; negotiation_id: string; listing_title: string;
  terms_json: string; total_value: number; created_at: string;
}

export interface Negotiation {
  id: string; title: string; service_type: string;
  status: string; outcome: string;
  failure_reason?: string; max_rounds: number;
  round_count: number;
  final_value?: number; created_at: string; completed_at?: string;
  seller: { id: string; name: string; avatar_color: string; logo_initials: string };
  buyer: { id: string; name: string; avatar_color: string; logo_initials: string };
  messages?: NegotiationMessage[];
  contract?: Contract;
  pending_terms_json?: string;
  buyer_config_json?: string;
}

export interface Stats {
  total_companies: number; total_listings: number;
  total_negotiations: number; completed_negotiations: number;
  total_value_closed: number; avg_rounds_to_agreement: number;
}

export interface ActivityItem {
  type: string; description: string; negotiation_id?: string; created_at: string;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  apiBase: API_BASE,
  companies: {
    list: () => apiFetch<Company[]>("/api/v1/companies"),
    get: (id: string) => apiFetch<Company>(`/api/v1/companies/${id}`),
    create: (data: Partial<Company>) =>
      apiFetch<Company>("/api/v1/companies", { method: "POST", body: JSON.stringify(data) }),
  },
  listings: {
    list: (serviceType?: string) => {
      const qs = serviceType ? `?service_type=${serviceType}` : "";
      return apiFetch<ServiceListing[]>(`/api/v1/listings${qs}`);
    },
    get: (id: string) => apiFetch<ServiceListing>(`/api/v1/listings/${id}`),
    create: (data: {
      company_id: string; service_type: string; title: string;
      description?: string; min_price?: number; max_price?: number; location?: string;
    }) => apiFetch<ServiceListing>("/api/v1/listings", { method: "POST", body: JSON.stringify(data) }),
  },
  negotiations: {
    list: (params?: { status?: string; service_type?: string }) => {
      const qs = params ? "?" + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString() : "";
      return apiFetch<Negotiation[]>(`/api/v1/negotiations${qs}`);
    },
    get: (id: string) => apiFetch<Negotiation>(`/api/v1/negotiations/${id}`),
    start: (data: { listing_id: string; buyer_company_id: string; target_price_per_unit?: number; max_budget_per_unit: number; preferred_duration_days: number; start_date: string }) =>
      apiFetch<{ negotiation_id: string }>("/api/v1/negotiations", { method: "POST", body: JSON.stringify(data) }),
    review: (negotiationId: string, action: "approve" | "renegotiate", overrides?: Record<string, number>) =>
      apiFetch<{ status: string; contract_id?: string; negotiation_id?: string }>(
        `/api/v1/negotiations/${negotiationId}/review`,
        { method: "POST", body: JSON.stringify({ action, overrides }) }
      ),
  },
  stats: {
    get: () => apiFetch<Stats>("/api/v1/stats"),
    activity: () => apiFetch<ActivityItem[]>("/api/v1/activity"),
  },
};

export { API_BASE };
