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

export type Invitation = {
  id: string;
  space_id: string;
  token: string;
  expires_at: string;
  created_by: string;
  created_at: string;
};

export type Comment = {
  id: string;
  item_id: string;
  space_id: string;
  author_id: string;
  body: string;
  created_at: string;
};

export type Reaction = {
  item_id: string;
  space_id: string;
  user_id: string;
  emoji: string;
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
  assignee?: string; // user_id(プロジェクトタスクの担当者)
};

export type ProjectMeta = {
  space_id: string;
  status: "planned" | "active" | "done";
  start_on: string | null;
  end_on: string | null;
  budget_total: number;
  updated_at: string;
};

export type Budget = {
  id: string;
  space_id: string;
  category: string;
  planned_amount: number;
  period: string | null;
  created_at: string;
};

export type DiaryPayload = {
  tags?: string[];
  // F-04-4 / F-10-2 装飾(基本セット)
  decoration?: {
    paper?: "plain" | "lined" | "grid" | "washi";
    stamp?: string;
  };
};

export type PhotoPayload = {
  path: string; // storage 'photos' バケット内のパス({user_id}/{uuid}.jpg)
  width?: number;
  height?: number;
};

export type Settlement = {
  id: string;
  space_id: string;
  event_item_id: string | null;
  title: string;
  payer_id: string;
  amount: number;
  participants: string[];
  status: "open" | "settled";
  created_by: string;
  created_at: string;
  updated_at: string;
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
        Update: Partial<Pick<Space, "name" | "settings">>;
        Relationships: [];
      };
      space_members: {
        Row: SpaceMember;
        Insert: never;
        Update: Partial<Pick<SpaceMember, "role">>;
        Relationships: [];
      };
      invitations: {
        Row: Invitation;
        Insert: {
          space_id: string;
          created_by: string;
          expires_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      comments: {
        Row: Comment;
        Insert: {
          item_id: string;
          space_id: string;
          author_id: string;
          body: string;
        };
        Update: never;
        Relationships: [];
      };
      reactions: {
        Row: Reaction;
        Insert: {
          item_id: string;
          space_id: string;
          user_id: string;
          emoji: string;
        };
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
      projects_meta: {
        Row: ProjectMeta;
        Insert: never;
        Update: Partial<
          Pick<ProjectMeta, "status" | "start_on" | "end_on" | "budget_total">
        >;
        Relationships: [];
      };
      budgets: {
        Row: Budget;
        Insert: {
          space_id: string;
          category: string;
          planned_amount: number;
          period?: string | null;
        };
        Update: Partial<Pick<Budget, "planned_amount" | "period">>;
        Relationships: [];
      };
      settlements: {
        Row: Settlement;
        Insert: {
          space_id: string;
          event_item_id?: string | null;
          title: string;
          payer_id: string;
          amount: number;
          participants: string[];
          created_by: string;
        };
        Update: Partial<Pick<Settlement, "status" | "title" | "amount">>;
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
      create_group: {
        Args: { group_name: string };
        Returns: string;
      };
      accept_invitation: {
        Args: { invite_token: string };
        Returns: string;
      };
      invitation_preview: {
        Args: { invite_token: string };
        Returns: {
          space_name: string;
          space_type: SpaceType;
          expired: boolean;
        }[];
      };
      create_organization: {
        Args: { org_name: string };
        Returns: string;
      };
      create_project: {
        Args: { org_id: string; project_name: string };
        Returns: string;
      };
      add_project_member: {
        Args: { project_id: string; target_user_id: string };
        Returns: undefined;
      };
      update_task_status: {
        Args: { target_item_id: string; new_status: string };
        Returns: undefined;
      };
      space_expense_summary: {
        Args: { target_space_id: string };
        Returns: {
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
