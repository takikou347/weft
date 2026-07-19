import { test, expect, type Page } from "@playwright/test";

// P6 公開準備: 規約・プライバシー、アプリ内通知(F-11-1)、退会(F-01-5)

const runId = Date.now();
const alice = {
  email: `p6-alice-${runId}@example.com`,
  password: `pw-p6-a-${runId}`,
  displayName: "あづさ",
};
const bob = {
  email: `p6-bob-${runId}@example.com`,
  password: `pw-p6-b-${runId}`,
  displayName: "ばん",
};
const leaver = {
  email: `p6-leaver-${runId}@example.com`,
  password: `pw-p6-l-${runId}`,
  displayName: "さらば",
};

const groupName = `文通の会 ${runId}`;
const diaryTitle = `手紙を書いた日 ${runId}`;

let inviteToken = "";

test.describe.configure({ mode: "serial" });

async function signup(
  page: Page,
  user: { email: string; password: string; displayName: string },
) {
  await page.goto("/signup");
  await page.getByLabel("表示名").fill(user.displayName);
  await page.getByLabel("メールアドレス").fill(user.email);
  await page.getByLabel("パスワード(8文字以上)").fill(user.password);
  await page.getByRole("button", { name: "帳面をつくる" }).click();
  await page.waitForURL("/");
}

test("利用規約とプライバシーポリシーはログインなしで読める", async ({
  page,
}) => {
  await page.goto("/terms");
  await expect(page.getByRole("heading", { name: "利用規約" })).toBeVisible();
  await expect(page.getByText("送金・決済・資金の移動は一切行いません")).toBeVisible();

  await page.goto("/privacy");
  await expect(
    page.getByRole("heading", { name: "プライバシーポリシー" }),
  ).toBeVisible();
  await expect(page.getByText("広告配信は行いません")).toBeVisible();
});

test("共有とコメントで便り(アプリ内通知)が届く", async ({ browser }) => {
  // A: グループ作成 → 招待 → 日記を差し出す
  const aCtx = await browser.newContext();
  const aPage = await aCtx.newPage();
  await signup(aPage, alice);

  await aPage.goto("/spaces/new");
  await aPage.getByLabel("つどいの名前").fill(groupName);
  await aPage.getByRole("button", { name: "つくる" }).click();
  await aPage.waitForURL(/\/spaces\/[0-9a-f-]+$/);
  const groupUrl = new URL(aPage.url()).pathname;
  await aPage.goto(`${groupUrl}/members`);
  await aPage
    .getByRole("button", { name: "あたらしい招待状をしたためる" })
    .click();
  await aPage.waitForURL(`${groupUrl}/members`);
  inviteToken = (await aPage.locator("code").first().textContent())!
    .trim()
    .replace("/invite/", "");

  // B が参加(この時点では通知なし)
  const bCtx = await browser.newContext();
  const bPage = await bCtx.newPage();
  await signup(bPage, bob);
  await bPage.goto(`/invite/${inviteToken}`);
  await bPage.getByRole("button", { name: "なかまに入る" }).click();
  await bPage.waitForURL(new RegExp(`${groupUrl}$`));

  // A が日記を書いて差し出す → B に「差し出しました」の便り(F-11-1)
  await aPage.goto("/items/new?type=diary");
  await aPage.getByLabel("題(なくてもかまいません)").fill(diaryTitle);
  await aPage.getByRole("button", { name: "帳面に記す" }).click();
  await aPage.waitForURL(/\/days\//);
  await aPage.getByText(diaryTitle).first().click();
  await aPage.getByRole("button", { name: "差し出す" }).click();
  await expect(aPage.getByText("取り下げる")).toBeVisible();

  await bPage.goto("/notifications");
  await expect(
    bPage.getByText("あづさ さんが記録を差し出しました").first(),
  ).toBeVisible();

  // B がコメント → A に「ひとこと添えました」の便り
  await bPage.goto(groupUrl);
  await bPage.getByText(diaryTitle).first().click();
  await bPage.getByLabel("ひとこと添える").fill("よい一日ですね");
  await bPage.getByRole("button", { name: "書き込む" }).click();

  await aPage.goto("/notifications");
  await expect(
    aPage.getByText("ばん さんがひとこと添えました").first(),
  ).toBeVisible();

  // 既読化
  await aPage
    .getByRole("button", { name: "すべて読んだことにする" })
    .click();
  await aPage.waitForURL("/notifications");
  await expect(aPage.getByLabel("未読")).toHaveCount(0);

  await aCtx.close();
  await bCtx.close();
});

test("退会すると全データが消え、ログインできなくなる", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await signup(page, leaver);

  // 記録をひとつ作る
  await page.goto("/items/new?type=diary");
  await page.getByLabel("本文").fill("最初で最後の記録");
  await page.getByRole("button", { name: "帳面に記す" }).click();
  await page.waitForURL(/\/days\//);

  // 退会(F-01-5)
  await page.goto("/account");
  await page
    .getByLabel("よろしければ、確認のことば「とじる」を入れてください")
    .fill("とじる");
  await page.getByRole("button", { name: "帳面をとじて退会する" }).click();
  await page.waitForURL(/\/login/);

  // ログインできない(アカウントが消えている)
  await page.getByLabel("メールアドレス").fill(leaver.email);
  await page.getByLabel("パスワード").fill(leaver.password);
  await page.getByRole("button", { name: "ひらく" }).click();
  await expect(
    page.getByText("メールアドレスまたはパスワードが違います。"),
  ).toBeVisible();

  await ctx.close();
});
