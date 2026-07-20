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
  await page.getByRole("button", { name: "新規登録" }).click();
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

test("共有とコメントでアプリ内通知が届く", async ({ browser }) => {
  // A: グループ作成 → 招待 → 日記を共有する
  const aCtx = await browser.newContext();
  const aPage = await aCtx.newPage();
  await signup(aPage, alice);

  await aPage.goto("/spaces/new");
  await aPage.getByLabel("スペース名").fill(groupName);
  await aPage.getByRole("button", { name: "作成する" }).click();
  await aPage.waitForURL(/\/spaces\/[0-9a-f-]+$/);
  const groupUrl = new URL(aPage.url()).pathname;
  await aPage.goto(`${groupUrl}/members`);
  await aPage
    .getByRole("button", { name: "新しい招待リンクを作成する" })
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
  await bPage.getByRole("button", { name: "参加する" }).click();
  await bPage.waitForURL(new RegExp(`${groupUrl}$`));

  // A が日記を書いて共有する → B に「共有しました」の通知(F-11-1)
  await aPage.goto("/items/new?type=diary");
  await aPage.getByLabel("タイトル(任意)").fill(diaryTitle);
  await aPage.getByRole("button", { name: "保存する" }).click();
  await aPage.waitForURL(/\/days\//);
  await aPage.getByText(diaryTitle).first().click();
  await aPage.getByRole("button", { name: "共有する" }).click();
  await expect(aPage.getByText("共有を解除する")).toBeVisible();

  await bPage.goto("/notifications");
  await expect(
    bPage.getByText("あづさ さんが記録を共有しました").first(),
  ).toBeVisible();

  // B がコメント → A に「コメントしました」の通知
  await bPage.goto(groupUrl);
  await bPage.getByText(diaryTitle).first().click();
  await bPage.getByLabel("コメント").fill("よい一日ですね");
  await bPage.getByRole("button", { name: "コメントする" }).click();
  // コメント登録の完了(画面反映)を待ってから A 側を確認する
  await expect(bPage.getByText("よい一日ですね").first()).toBeVisible();

  await aPage.goto("/notifications");
  await expect(
    aPage.getByText("ばん さんがコメントしました").first(),
  ).toBeVisible();

  // 既読化
  await aPage
    .getByRole("button", { name: "すべて既読にする" })
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
  await page.getByRole("button", { name: "保存する" }).click();
  await page.waitForURL(/\/days\//);

  // 退会(F-01-5)
  await page.goto("/account");
  await page
    .getByLabel("確認のため「退会」と入力してください")
    .fill("退会");
  await page.getByRole("button", { name: "退会する" }).click();
  await page.waitForURL(/\/login/);

  // ログインできない(アカウントが消えている)
  await page.getByLabel("メールアドレス").fill(leaver.email);
  await page.getByLabel("パスワード").fill(leaver.password);
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(
    page.getByText("メールアドレスまたはパスワードが違います。"),
  ).toBeVisible();

  await ctx.close();
});
