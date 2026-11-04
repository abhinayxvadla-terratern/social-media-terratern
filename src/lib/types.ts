export type AdminRole = "owner" | "editor" | "viewer";

export interface AdminUser {
  user_id: string;
  role: AdminRole;
  created_at: string;
  email?: string;
}

export type PageStatus = "draft" | "live" | "paused" | "scheduled";
export type PageType = "quiz" | "lead_pdf" | "welcome" | "other";

export interface Page {
  id: string;
  name: string;
  slug: string;
  page_type: PageType;
  status: PageStatus;
  start_at: string | null;
  end_at: string | null;
  keyword: string | null;
  page_url: string | null;
  closed_message: string | null;
  closed_redirect_url: string | null;
  pdf_asset_id: string | null;
  page_key: string;
  allowed_origins: string[];
  created_at: string;
  updated_at: string;
  // Joined or calculated fields
  pdf_asset?: Asset | null;
  leads_count?: number;
  conversion_percentage?: number;
}

export interface Lead {
  id: string;
  page_id: string;
  name: string | null;
  email: string | null;
  phone_e164: string | null;
  country_code: string | null;
  source: string | null;
  keyword: string | null;
  post_id: string | null;
  utm: Record<string, any>;
  quiz_score: number | null;
  quiz_result: string | null;
  visitor_id: string | null;
  is_partial: boolean;
  consent: boolean;
  created_at: string;
  // Joined page info
  page?: Pick<Page, "id" | "name" | "slug">;
}

export type EventType = "view" | "start" | "answer" | "submit" | "download" | "repeat";

export interface FunnelEvent {
  id: string;
  page_id: string;
  visitor_id: string;
  lead_id: string | null;
  type: EventType;
  meta: Record<string, any>;
  created_at: string;
}

export interface Asset {
  id: string;
  name: string;
  storage_path: string;
  created_at: string;
}

export interface AppSetting {
  key: string;
  value: any;
  updated_at: string;
}

// Database view types
export interface PageStat {
  page_id: string;
  page_name: string;
  page_slug: string;
  page_type: PageType;
  status: PageStatus;
  views: number;
  starts: number;
  submits: number;
  downloads: number;
  leads: number;
  complete_leads: number;
  partial_leads: number;
  conversion_percentage: number;
}

export interface DailyTrend {
  report_date: string;
  page_id: string;
  page_name: string;
  page_slug: string;
  views: number;
  starts: number;
  submits: number;
  answers: number;
  downloads: number;
  leads: number;
  complete_leads: number;
  partial_leads: number;
  conversion_percentage: number;
}

export interface AnswerDropoff {
  page_id: string;
  page_name: string;
  page_slug: string;
  question_number: string;
  total_answers: number;
  unique_respondents: number;
  first_answered_at: string;
  last_answered_at: string;
}

export interface LeadsBySource {
  page_id: string;
  page_name: string;
  page_slug: string;
  source: string;
  keyword: string;
  total_leads: number;
  complete_leads: number;
  partial_leads: number;
  first_lead_at: string;
  last_lead_at: string;
}
