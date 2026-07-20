import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// RLS分離テスト(必須):
// ユーザーAの非共有アイテムが、ユーザーBには UI からも API 直叩きでも
// 一切見えないことを検証する(不変条件1・5、§6.3)

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const runId = Date.now();
const alice = {
  email: `alice-${runId}@example.com`,
  password: `pw-alice-${runId}`,
  displayName: "あきこ",
};
const bob = {
  email: `bob-${runId}@example.com`,
  password: `pw-bob-${runId}`,
  displayName: "ぼたん",
};

const aliceDiary = {
  title: `Aだけの日記 ${runId}`,
  body: "これはAにしか見えないはずの本文",
};

test.describe.configure({ mode: "serial" });

async function signupViaUi(
  page: Page,
  user: { email: string; password: string; displayName: string },
) {
  await page.goto("/signup");
  await page.getByLabel("表示名").fill(user.displayName);
  await page.getByLabel("メールアドレス").fill(user.email);
  await page.getByLabel("パスワード(8文字以上)").fill(user.password);
  await page.getByRole("button", { name: "新規登録" }).click();
  await page.waitForURL("/");
}

test("ユーザーAが記録を作成し、自分では見える", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await signupViaUi(page, alice);

  await page.getByRole("link", { name: "記録する" }).click();
  await page.getByLabel("題(なくてもかまいません)").fill(aliceDiary.title);
  await page.getByLabel("本文").fill(aliceDiary.body);
  await page.getByRole("button", { name: "保存する" }).click();
  await page.waitForURL(/\/days\/\d{4}-\d{2}-\d{2}/);

  await page.goto("/");
  await expect(page.getByText(aliceDiary.title).first()).toBeVisible();
  await expect(page.getByText(aliceDiary.body).first()).toBeVisible();

  await context.close();
});

test("ユーザーBのUIには、Aの非共有アイテムが一切表示されない", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await signupViaUi(page, bob);

  // B のホームは空であること(A のアイテムが混ざらないこと)
  await expect(page.getByText("まだ記録がありません。")).toBeVisible();
  await expect(page.getByText(aliceDiary.title)).toHaveCount(0);
  await expect(page.getByText(aliceDiary.body)).toHaveCount(0);

  await context.close();
});

test("APIを直接叩いても、BからはAのアイテムが見えない", async () => {
  // A として自分のアイテムIDを取得
  const aliceClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const aliceAuth = await aliceClient.auth.signInWithPassword({
    email: alice.email,
    password: alice.password,
  });
  expect(aliceAuth.error).toBeNull();

  const aliceItems = await aliceClient
    .from("items")
    .select("id, title")
    .eq("title", aliceDiary.title);
  expect(aliceItems.error).toBeNull();
  expect(aliceItems.data).toHaveLength(1);
  const targetId = aliceItems.data![0].id as string;

  // B のセッションで同じデータへアクセスする
  const bobClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const bobAuth = await bobClient.auth.signInWithPassword({
    email: bob.email,
    password: bob.password,
  });
  expect(bobAuth.error).toBeNull();

  // 一覧: B には B 自身のアイテムしか返らない(この時点では0件)
  const bobList = await bobClient.from("items").select("id");
  expect(bobList.error).toBeNull();
  expect(bobList.data).toHaveLength(0);

  // ID直指定でも読めない(存在も分からない)
  const byId = await bobClient.from("items").select("*").eq("id", targetId);
  expect(byId.error).toBeNull();
  expect(byId.data).toHaveLength(0);

  // 更新も一切効かない
  await bobClient.from("items").update({ title: "改ざん" }).eq("id", targetId);
  const after = await aliceClient
    .from("items")
    .select("title")
    .eq("id", targetId)
    .single();
  expect(after.data?.title).toBe(aliceDiary.title);

  // B は A のアイテムを自分のスペースへ共有することもできない
  const bobSpaces = await bobClient.from("spaces").select("id, type");
  expect(bobSpaces.error).toBeNull();
  expect(bobSpaces.data).toHaveLength(1); // 自分の個人スペースのみ見える
  const shareAttempt = await bobClient.from("item_shares").insert({
    item_id: targetId,
    space_id: bobSpaces.data![0].id,
    shared_by: bobAuth.data.user!.id,
  });
  expect(shareAttempt.error).not.toBeNull(); // RLSで拒否される

  // A のスペース・プロフィールも B には見えない
  const bobProfiles = await bobClient.from("profiles").select("id");
  expect(bobProfiles.error).toBeNull();
  expect(bobProfiles.data).toHaveLength(1); // 自分のみ
});

test("匿名(未ログイン)ではアプリにもデータにも到達できない", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  // UI: 未ログインはログイン画面へ
  await page.goto("/");
  await page.waitForURL("/login");

  // API: anon キーのままでは何も読めない
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const items = await anonClient.from("items").select("id");
  expect(items.data ?? []).toHaveLength(0);
  const spaces = await anonClient.from("spaces").select("id");
  expect(spaces.data ?? []).toHaveLength(0);

  await context.close();
});
