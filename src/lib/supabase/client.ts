import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

// ブラウザ用クライアント(anon キーのみ。写真アップロード等で使用)
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
