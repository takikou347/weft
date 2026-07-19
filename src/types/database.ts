// supabase/migrations/ のスキーマに対応する型定義。
// スキーマ変更時はこのファイルも更新すること(将来 supabase gen types に置き換え予定)。

export type SpaceType = "personal" | "group" | "organization" | "project";
export type SpaceRole = "owner" | "admin" | "member";
export type ItemType =
  | "event"
  | "diary"
  | "expense"
  | "task"
  | "document"
  | "photo";

export type Profile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Space = {
  id: string;
  type: SpaceType;
  name: string;
  parent_space_id: string | null;
  settings: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type SpaceMember = {
  space_id: string;
  user_id: string;
  role: SpaceRole;
  joined_at: string;
};

export type Item = {
  id: string;
  type: ItemType;
  owner_id: string;
  origin_space_id: string;
  occurred_on: string;
  title: string | null;
  body: string | null;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ItemShare = {
  item_id: string;
  space_id: string;
  shared_by: string;
  shared_at: string;
};

export type Link = {
  item_id_a: string;
  item_id_b: string;
  created_by: string;
  created_at: string;
};

export type ExpenseCategory = {
  id: string;
  user_id: string;
  name: string;
  position: number;
  created_at: string;
};

// items.payload の type 別の形
export type EventPayload = {
  all_day?: boolean;
  start_time?: string; // "HH:MM"
  end_time?: string;
  place?: string;
  memo?: string;
};

export type ExpensePayload = {
  amount: number; // 常に正の値
  kind: "income" | "expense";
  category: string;
};

export type TaskPayload = {
  status: "todo" | "doing" | "done";
};

export type DiaryPayload = {
  tags?: string[];
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: never;
        Update: Partial<Pick<Profile, "display_name" | "avatar_url">>;
        Relationships: [];
      };
      spaces: {
        Row: Space;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      space_members: {
        Row: SpaceMember;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      items: {
        Row: Item;
        Insert: {
          type: ItemType;
          owner_id: string;
          origin_space_id: string;
          occurred_on: string;
          title?: string | null;
          body?: string | null;
          payload?: Record<string, unknown>;
        };
        Update: Partial<{
          occurred_on: string;
          title: string | null;
          body: string | null;
          payload: Record<string, unknown>;
        }>;
        Relationships: [];
      };
      item_shares: {
        Row: ItemShare;
        Insert: {
          item_id: string;
          space_id: string;
          shared_by: string;
        };
        Update: never;
        Relationships: [];
      };
      links: {
        Row: Link;
        Insert: {
          item_id_a: string;
          item_id_b: string;
          created_by: string;
        };
        Update: never;
        Relationships: [];
      };
      expense_categories: {
        Row: ExpenseCategory;
        Insert: {
          user_id: string;
          name: string;
          position?: number;
        };
        Update: Partial<Pick<ExpenseCategory, "name" | "position">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      expense_monthly_summary: {
        Args: { target_month: string };
        Returns: {
          category: string;
          kind: string;
          total: number;
          entry_count: number;
        }[];
      };
    };
    Enums: {
      space_type: SpaceType;
      space_role: SpaceRole;
      item_type: ItemType;
    };
  };
};
