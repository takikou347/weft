// 画面設計書用スクリーンショット撮影スクリプト。
// 前提: mock-supabase.mjs(:54321)と本番ビルドのアプリ(:3000)が起動済み。
// 使い方: node scripts/design/capture-screens.mjs
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = "http://127.0.0.1:3000";
const OUT = new URL("../../docs/design/images/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

const CREDS = {
  tsumugi: { email: "tsumugi@example.com", password: "demo-tsumugi" },
  koharu: { email: "koharu@example.com", password: "demo-koharu" },
  matsuri: { email: "matsuri@example.com", password: "demo-matsuri" },
};

// file, persona(null=未ログイン), path, act(任意の操作), full(全画面/ビューポート)
const SHOTS = [
  // --- 認証・静的 ---
  { file: "auth-login", persona: null, path: "/login" },
  {
    file: "auth-login-error",
    persona: null,
    path: "/login",
    act: async (p) => {
      await p.getByLabel("メールアドレス").fill("tsumugi@example.com");
      await p.getByLabel("パスワード").fill("wrong-password");
      await p.getByRole("button", { name: "ひらく" }).click();
      await p.getByRole("alert").waitFor();
    },
  },
  { file: "auth-signup", persona: null, path: "/signup" },
  {
    file: "auth-signup-error",
    persona: null,
    path: "/signup",
    act: async (p) => {
      await p.getByLabel("表示名").fill("つむぎ");
      await p.getByLabel("メールアドレス").fill("tsumugi@example.com");
      await p.getByLabel("パスワード(8文字以上)").fill("demo-tsumugi");
      await p.getByRole("button", { name: "帳面をつくる" }).click();
      await p.getByRole("alert").waitFor();
    },
  },
  { file: "static-terms", persona: null, path: "/terms" },
  { file: "static-privacy", persona: null, path: "/privacy" },

  // --- ホーム(帳面) ---
  { file: "home-filled", persona: "tsumugi", path: "/" },
  { file: "home-empty", persona: "matsuri", path: "/" },

  // --- カレンダー ---
  { file: "calendar-month", persona: "tsumugi", path: "/calendar?view=month&month=2026-07" },
  {
    file: "calendar-month-layer-off",
    persona: "tsumugi",
    path: "/calendar?view=month&month=2026-07&hide=sp-yama",
  },
  { file: "calendar-week", persona: "tsumugi", path: "/calendar?view=week&date=2026-07-20" },
  { file: "calendar-list", persona: "tsumugi", path: "/calendar?view=list&month=2026-07" },
  { file: "calendar-empty", persona: "matsuri", path: "/calendar?view=month&month=2026-07" },

  // --- その日ページ ---
  { file: "day-filled", persona: "tsumugi", path: "/days/2026-07-20" },
  { file: "day-empty", persona: "tsumugi", path: "/days/2026-07-05" },

  // --- 記す(作成フォーム) ---
  { file: "item-new-diary", persona: "tsumugi", path: "/items/new?type=diary&date=2026-07-20" },
  { file: "item-new-event", persona: "tsumugi", path: "/items/new?type=event&date=2026-07-20" },
  { file: "item-new-expense", persona: "tsumugi", path: "/items/new?type=expense&date=2026-07-20" },
  { file: "item-new-task", persona: "tsumugi", path: "/items/new?type=task&date=2026-07-20" },
  {
    file: "item-new-validation-error",
    persona: "tsumugi",
    path: "/items/new?type=diary&date=2026-07-20",
    act: async (p) => {
      await p.getByRole("button", { name: "帳面に記す" }).click();
      await p.getByRole("alert").waitFor();
    },
  },

  // --- アイテム詳細・編集 ---
  { file: "item-detail-diary", persona: "tsumugi", path: "/items/d1" },
  { file: "item-detail-event", persona: "tsumugi", path: "/items/ev1" },
  { file: "item-detail-expense", persona: "tsumugi", path: "/items/ex4" },
  { file: "item-detail-photo", persona: "tsumugi", path: "/items/ph1" },
  {
    file: "item-detail-link-search",
    persona: "tsumugi",
    path: "/items/d2?q=%E6%B2%A2",
  },
  { file: "item-edit-diary", persona: "tsumugi", path: "/items/d1/edit" },
  { file: "item-detail-others", persona: "koharu", path: "/items/d1" },
  { file: "not-found", persona: "tsumugi", path: "/items/zzz" },

  // --- 家計 ---
  { file: "expenses-filled", persona: "tsumugi", path: "/expenses?month=2026-07" },
  { file: "expenses-empty", persona: "matsuri", path: "/expenses?month=2026-07" },

  // --- つながり(スペース) ---
  { file: "spaces-list", persona: "tsumugi", path: "/spaces" },
  { file: "spaces-empty", persona: "matsuri", path: "/spaces" },
  { file: "spaces-new", persona: "tsumugi", path: "/spaces/new" },

  // --- グループ ---
  { file: "space-feed", persona: "tsumugi", path: "/spaces/sp-yama" },
  { file: "space-item-comments", persona: "tsumugi", path: "/spaces/sp-yama/items/d1" },
  { file: "space-calendar", persona: "tsumugi", path: "/spaces/sp-yama/calendar?month=2026-07" },
  { file: "space-album", persona: "tsumugi", path: "/spaces/sp-yama/album" },
  { file: "space-settlements", persona: "tsumugi", path: "/spaces/sp-yama/settlements" },
  { file: "space-members-owner", persona: "tsumugi", path: "/spaces/sp-yama/members" },
  { file: "space-members-member", persona: "koharu", path: "/spaces/sp-yama/members" },
  { file: "space-settings-owner", persona: "tsumugi", path: "/spaces/sp-yama/settings" },
  { file: "space-settings-member", persona: "koharu", path: "/spaces/sp-yama/settings" },

  // --- 組織・プロジェクト ---
  { file: "org-projects", persona: "tsumugi", path: "/spaces/sp-bungudo/projects" },
  { file: "project-tasks", persona: "tsumugi", path: "/spaces/sp-techo/tasks" },
  { file: "project-budget", persona: "tsumugi", path: "/spaces/sp-techo/budget" },
  { file: "project-docs", persona: "tsumugi", path: "/spaces/sp-techo/docs" },
  { file: "project-doc-detail", persona: "tsumugi", path: "/spaces/sp-techo/items/pdoc1" },
  { file: "project-members", persona: "tsumugi", path: "/spaces/sp-techo/members" },

  // --- 招待 ---
  { file: "invite-valid", persona: "koharu", path: "/invite/demoinvitetoken0001" },
  { file: "invite-expired", persona: "koharu", path: "/invite/expiredtoken00000000" },
  { file: "invite-unknown", persona: "koharu", path: "/invite/no-such-token" },

  // --- 便り・アカウント ---
  { file: "notifications-filled", persona: "tsumugi", path: "/notifications" },
  { file: "notifications-empty", persona: "matsuri", path: "/notifications" },
  { file: "account", persona: "tsumugi", path: "/account" },
];

async function login(page, persona) {
  const cred = CREDS[persona];
  await page.goto(`${BASE}/login`);
  await page.getByLabel("メールアドレス").fill(cred.email);
  await page.getByLabel("パスワード").fill(cred.password);
  await page.getByRole("button", { name: "ひらく" }).click();
  await page.waitForURL(`${BASE}/`);
}

// 実行環境にプリインストールされたChromiumを使う(バージョン違いのDLを避ける)
const browser = await chromium.launch({
  executablePath:
    process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium",
});
const states = new Map(); // persona → storageState

let failed = 0;
for (const shot of SHOTS) {
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
    deviceScaleFactor: 2,
    storageState: shot.persona ? states.get(shot.persona) : undefined,
  });
  const page = await context.newPage();
  try {
    if (shot.persona && !states.has(shot.persona)) {
      await login(page, shot.persona);
      states.set(shot.persona, await context.storageState());
    }
    await page.goto(`${BASE}${shot.path}`, { waitUntil: "networkidle" });
    if (shot.act) await shot.act(page);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${OUT}${shot.file}.png`, fullPage: true });
    console.log(`ok  ${shot.file}`);
  } catch (err) {
    failed++;
    console.error(`NG  ${shot.file}: ${String(err).split("\n")[0]}`);
  } finally {
    await context.close();
  }
}

await browser.close();
console.log(failed === 0 ? "all captured" : `${failed} shot(s) failed`);
process.exit(failed === 0 ? 0 : 1);
