import { test, expect, type Page, type BrowserContext } from "@playwright/test";

// P3 共有の通し確認とRLS分離:
// グループ作成 → 招待 → 共有 → フィード・コメント・リアクション → 共有解除(F-02, F-06, F-07)

const runId = Date.now();
const alice = {
  email: `p3-alice-${runId}@example.com`,
  password: `pw-p3-a-${runId}`,
  displayName: "あさひ",
};
const bob = {
  email: `p3-bob-${runId}@example.com`,
  password: `pw-p3-b-${runId}`,
  displayName: "ばんり",
};
const carol = {
  email: `p3-carol-${runId}@example.com`,
  password: `pw-p3-c-${runId}`,
  displayName: "こはる",
};

const groupName = `山の会 ${runId}`;
const diaryTitle = `山頂の朝 ${runId}`;
const secretTitle = `ひみつの日記 ${runId}`;
const commentBody = `よい眺めですね ${runId}`;

let inviteToken = "";
let groupUrl = "";

test.describe.configure({ mode: "serial" });

async function signup(
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

async function login(
  page: Page,
  user: { email: string; password: string },
) {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(user.email);
  await page.getByLabel("パスワード").fill(user.password);
  await page.getByRole("button", { name: "ログイン" }).click();
  await page.waitForURL("/");
}

async function newUserContext(
  browser: { newContext(): Promise<BrowserContext> },
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  return { context, page };
}

test("Aがグループを作り、招待を発行し、日記を共有する", async ({
  browser,
}) => {
  const { context, page } = await newUserContext(browser);
  await signup(page, alice);

  // 日記2件(共有する1件・しない1件)
  for (const title of [diaryTitle, secretTitle]) {
    await page.goto("/items/new?type=diary");
    await page.getByLabel("タイトル(任意)").fill(title);
    await page.getByRole("button", { name: "保存する" }).click();
    await page.waitForURL(/\/days\//);
  }

  // グループ作成(F-02-1)
  await page.goto("/spaces/new");
  await page.getByLabel("スペース名").fill(groupName);
  await page.getByRole("button", { name: "作成する" }).click();
  await page.waitForURL(/\/spaces\/[0-9a-f-]+$/);
  groupUrl = new URL(page.url()).pathname;

  // 招待の発行(F-02-3)
  await page.goto(`${groupUrl}/members`);
  await page
    .getByRole("button", { name: "新しい招待リンクを作成する" })
    .click();
  await page.waitForURL(`${groupUrl}/members`);
  const tokenText = await page.locator("code").first().textContent();
  inviteToken = tokenText!.trim().replace("/invite/", "");
  expect(inviteToken.length).toBeGreaterThan(10);

  // 日記を共有する(F-06-1)
  await page.goto("/");
  await page.getByText(diaryTitle).first().click();
  await page.getByRole("button", { name: "共有する" }).click();
  await expect(page.getByText("共有先:")).toBeVisible();
  await expect(page.getByText("共有を解除する")).toBeVisible();

  await context.close();
});

test("Bが招待から参加し、共有された日記だけが見える", async ({ browser }) => {
  const { context, page } = await newUserContext(browser);
  await signup(page, bob);

  // 招待の受諾(F-02-3)
  await page.goto(`/invite/${inviteToken}`);
  await expect(page.getByText(groupName)).toBeVisible();
  await page.getByRole("button", { name: "参加する" }).click();
  await page.waitForURL(new RegExp(`${groupUrl}$`));

  // フィード(F-07-3)に共有された日記が載る
  await expect(page.getByText(diaryTitle).first()).toBeVisible();
  await expect(page.getByText("あさひ さんより").first()).toBeVisible();
  // 共有されていない日記は載らない(不変条件1)
  await expect(page.getByText(secretTitle)).toHaveCount(0);

  // コメント(F-07-4)とリアクション(F-07-5)
  await page.getByText(diaryTitle).first().click();
  await page.getByLabel("コメント").fill(commentBody);
  await page.getByRole("button", { name: "コメントする" }).click();
  await expect(page.getByText(commentBody)).toBeVisible();
  await page.getByRole("button", { name: "🌸" }).click();
  await expect(page.getByRole("button", { name: "🌸 1" })).toBeVisible();

  // Bの個人カレンダーにレイヤーが出る(F-03-3)
  await page.goto("/calendar");
  await expect(page.getByText(groupName)).toBeVisible();

  await context.close();
});

test("第三者Cにはグループもアイテムも一切見えない", async ({ browser }) => {
  const { context, page } = await newUserContext(browser);
  await signup(page, carol);

  // グループページはRLSで404(存在自体を隠す)
  await page.goto(groupUrl);
  await expect(page.getByText("404")).toBeVisible();

  // スペース一覧にも出ない
  await page.goto("/spaces");
  await expect(page.getByText(groupName)).toHaveCount(0);

  await context.close();
});

test("Aが共有を解除すると、Bのフィードから消える(元データは残る)", async ({
  browser,
}) => {
  const a = await newUserContext(browser);
  await login(a.page, alice);
  await a.page.goto("/");
  await a.page.getByText(diaryTitle).first().click();
  await a.page.getByRole("button", { name: "共有を解除する" }).click();
  await expect(a.page.getByText("この記録は、あなたにしか見えません。")).toBeVisible();
  // 元データは作成者に残る(不変条件2)
  await expect(a.page.getByText(diaryTitle).first()).toBeVisible();
  await a.context.close();

  const b = await newUserContext(browser);
  await login(b.page, bob);
  await b.page.goto(groupUrl);
  await expect(b.page.getByText(diaryTitle)).toHaveCount(0);
  await b.context.close();
});
