export interface IntelEvent {
  id: number;
  source: string;
  indicator: string;
  severity: string;
  created_at: string;
}

export interface Asset {
  id: number;
  name: string;
  type: string;
  owner: string;
  ip: string;
  hostname: string;
  criticality: string;
  data_sensitivity: string;
  risk: {
    score: number;
    explanation: string;
  };
  recent_intel: IntelEvent[];
}

export interface Stats {
  assets: number;
  intel_events: number;
  risk_items: number;
}

export interface Version {
  commit: string;
  built_at: string;
}
