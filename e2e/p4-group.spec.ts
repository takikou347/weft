import { test, expect, type Page } from "@playwright/test";

// P4 グループ応用: 装飾つき日記・写真→アルバム・立替精算(F-04-4, F-07-2, F-07-6, F-10-2)

const runId = Date.now();
const alice = {
  email: `p4-alice-${runId}@example.com`,
  password: `pw-p4-a-${runId}`,
  displayName: "あやめ",
};
const bob = {
  email: `p4-bob-${runId}@example.com`,
  password: `pw-p4-b-${runId}`,
  displayName: "ぼたん",
};

const groupName = `旅の会 ${runId}`;
const diaryTitle = `渓谷の一日 ${runId}`;

let groupUrl = "";
let inviteToken = "";

// 1x1 の最小PNG
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

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

test("装飾つきの日記を書き、写真を追加し、グループへ共有する", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signup(page, alice);

  // 装飾(便箋+花丸)つきの日記(F-04-4 / F-10-2)
  await page.goto("/items/new?type=diary");
  await page.getByLabel("題(なくてもかまいません)").fill(diaryTitle);
  await page.getByLabel("本文").fill("紅葉がみごとだった");
  await page.getByLabel("便箋").check();
  await page.getByLabel("花丸").check();
  await page.getByRole("button", { name: "保存する" }).click();
  await page.waitForURL(/\/days\//);

  // 日記詳細ではんこが見える
  await page.getByText(diaryTitle).first().click();
  await expect(page.getByLabel("はんこ")).toHaveText("花丸");

  // 写真をアップロードする(クライアント圧縮→Storage→photoアイテム)F-04-1
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: "valley.png",
    mimeType: "image/png",
    buffer: TINY_PNG,
  });
  await expect(page.locator("img").first()).toBeVisible({ timeout: 15000 });

  // グループを作って招待を発行
  await page.goto("/spaces/new");
  await page.getByLabel("スペース名").fill(groupName);
  await page.getByRole("button", { name: "作成する" }).click();
  await page.waitForURL(/\/spaces\/[0-9a-f-]+$/);
  groupUrl = new URL(page.url()).pathname;
  await page.goto(`${groupUrl}/members`);
  await page
    .getByRole("button", { name: "新しい招待リンクを作成する" })
    .click();
  await page.waitForURL(`${groupUrl}/members`);
  inviteToken = (await page.locator("code").first().textContent())!
    .trim()
    .replace("/invite/", "");

  // 日記と写真を共有する
  await page.goto("/");
  await page.getByText(diaryTitle).first().click();
  await page.getByRole("button", { name: "共有する" }).click();
  await expect(page.getByText("共有を解除する")).toBeVisible();
  // 結びついた写真アイテムへ移動して共有する
  await page
    .locator("a")
    .filter({ has: page.locator('img[alt="valley"]') })
    .first()
    .click();
  await page.getByRole("button", { name: "共有する" }).click();
  await expect(page.getByText("共有を解除する")).toBeVisible();

  await context.close();
});

test("メンバーはアルバムで写真と日記を見られる", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signup(page, bob);

  await page.goto(`/invite/${inviteToken}`);
  await page.getByRole("button", { name: "参加する" }).click();
  await page.waitForURL(new RegExp(`${groupUrl}$`));

  await page.goto(`${groupUrl}/album`);
  // 写真(署名付きURL)と日記が見える(F-07-2)
  await expect(page.locator("img").first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(diaryTitle).first()).toBeVisible();

  await context.close();
});

test("立替を記録すると精算案が出る", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(bob.email);
  await page.getByLabel("パスワード").fill(bob.password);
  await page.getByRole("button", { name: "ログイン" }).click();
  await page.waitForURL("/");

  await page.goto(`${groupUrl}/settlements`);
  await page.getByLabel("なんの立替か").fill("宿代");
  await page.getByLabel("金額(円)").fill("24000");
  // 払った人=ぼたん(自分)、割り勘は全員(既定でチェック済み)
  await page.getByRole("button", { name: "記録する" }).click();
  await page.waitForURL(`${groupUrl}/settlements`);

  // 精算案: あやめ→ぼたん 12000円(F-07-6)
  await expect(page.getByText("宿代")).toBeVisible();
  const plan = page.locator("ul").first();
  await expect(plan.getByText("12,000円")).toBeVisible();
  await expect(plan.getByText("あやめ")).toBeVisible();

  // 精算済みにできる
  await page.getByRole("button", { name: "精算済みにする" }).click();
  await page.waitForURL(`${groupUrl}/settlements`);
  await expect(page.getByText("精算済み", { exact: false }).first()).toBeVisible();

  await context.close();
});
