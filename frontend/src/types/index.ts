export type Theme = "light" | "dark";

export type SessionItem = {
  session_id: string;
  work_dir_hash: string;
  work_dir?: string | null;
  title?: string | null;
  session_dir?: string;
  wire_path?: string;
  created_at?: number | null;
  updated_at?: number | null;
  has_error?: boolean;
};

export type SessionSummary = {
  session_id: string;
  title?: string | null;
  work_dir?: string | null;
  duration_ms: number;
  total_turns: number;
  total_tokens: number;
  has_error: boolean;
};

export type SessionsResponse = {
  share_dir: string;
  sessions: SessionItem[];
  pagination?: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
};

export type StreamMessage =
  | { type: "meta"; time: string; session_id: string }
  | { type: "wire"; time: string; event: Record<string, unknown>; next_offset?: number };

export type StatisticsResponse = {
  total_sessions: number;
  total_turns: number;
  total_tokens: number;
  total_duration_ms: number;
  daily_usage: Array<{ date: string; sessions: number; turns: number }>;
  tool_usage: Array<{ tool: string; calls: number; errors: number }>;
  top_projects: Array<{ work_dir: string; sessions: number; turns: number }>;
};

export type TurnGroup = {
  turnIndex: number;
  beginEvent?: StreamMessage;
  events: StreamMessage[];
};

