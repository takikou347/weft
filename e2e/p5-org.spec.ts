import { test, expect, type Page } from "@playwright/test";

// P5 組織・プロジェクト: 作成→メンバー追加→タスク→予実→ナレッジ(F-02-2, F-08)
// および §6.3「組織メンバーでもプロジェクト非メンバーには中身が見えない」

const runId = Date.now();
const lead = {
  email: `p5-lead-${runId}@example.com`,
  password: `pw-p5-l-${runId}`,
  displayName: "リーダー",
};
const member = {
  email: `p5-member-${runId}@example.com`,
  password: `pw-p5-m-${runId}`,
  displayName: "メンバー",
};
const outsider = {
  email: `p5-out-${runId}@example.com`,
  password: `pw-p5-o-${runId}`,
  displayName: "ソトノヒト",
};

const orgName = `文具堂 ${runId}`;
const projectName = `新柄手帳 ${runId}`;
const taskTitle = `紙の選定 ${runId}`;
const docTitle = `打合せおぼえ ${runId}`;

let orgUrl = "";
let projectUrl = "";
let orgInvite = "";

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

async function login(page: Page, user: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(user.email);
  await page.getByLabel("パスワード").fill(user.password);
  await page.getByRole("button", { name: "ログイン" }).click();
  await page.waitForURL("/");
}

test("組織とプロジェクトを作り、タスクと予算と文書を整える", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signup(page, lead);

  // 組織の作成(F-02-1)
  await page.goto("/spaces/new");
  await page.getByLabel(/組織/).check();
  await page.getByLabel("スペース名").fill(orgName);
  await page.getByRole("button", { name: "作成する" }).click();
  await page.waitForURL(/\/spaces\/[0-9a-f-]+$/);
  orgUrl = new URL(page.url()).pathname;

  // 組織の招待(メンバー用)
  await page.goto(`${orgUrl}/members`);
  await page
    .getByRole("button", { name: "新しい招待リンクを作成する" })
    .click();
  await page.waitForURL(`${orgUrl}/members`);
  orgInvite = (await page.locator("code").first().textContent())!
    .trim()
    .replace("/invite/", "");

  // プロジェクトの作成(F-02-2)
  await page.goto(`${orgUrl}/projects`);
  await page.getByPlaceholder("プロジェクト名").fill(projectName);
  await page.getByRole("button", { name: "作成する" }).click();
  await page.waitForURL(/\/spaces\/[0-9a-f-]+$/);
  projectUrl = new URL(page.url()).pathname;

  // タスク(F-08-2)
  await page.goto(`${projectUrl}/tasks`);
  await page.getByLabel("タスク名").fill(taskTitle);
  await page.getByRole("button", { name: "追加する" }).click();
  await page.waitForURL(`${projectUrl}/tasks`);
  await expect(page.getByText(taskTitle)).toBeVisible();

  // 予算(F-08-3)
  await page.goto(`${projectUrl}/budget`);
  await page.getByLabel("予算総額(円)").fill("100000");
  await page.getByRole("button", { name: "保存する" }).click();
  await page.waitForURL(`${projectUrl}/budget`);
  await expect(page.getByText("100,000円").first()).toBeVisible();

  // 文書(F-08-4)
  await page.goto(`${projectUrl}/docs`);
  await page.getByLabel("題").fill(docTitle);
  await page.getByLabel("本文").fill("中紙は生成り80g/㎡でいく");
  await page.getByRole("button", { name: "保存する" }).click();
  await page.waitForURL(`${projectUrl}/docs`);
  await expect(page.getByText(docTitle)).toBeVisible();

  await context.close();
});

test("組織のメンバーでも、プロジェクトに入るまでは中身が見えない", async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signup(page, member);

  // 組織へ参加
  await page.goto(`/invite/${orgInvite}`);
  await page.getByRole("button", { name: "参加する" }).click();
  await page.waitForURL(new RegExp(`${orgUrl}$`));

  // プロジェクトのページはRLSで404(§6.3)
  await page.goto(`${projectUrl}/tasks`);
  await expect(page.getByText("404")).toBeVisible();

  await context.close();
});

test("プロジェクトに加えられると、タスクの担当者として動ける", async ({
  browser,
}) => {
  // リーダーがメンバーをプロジェクトへ加える
  const leadCtx = await browser.newContext();
  const leadPage = await leadCtx.newPage();
  await login(leadPage, lead);
  await leadPage.goto(`${projectUrl}/members`);
  await leadPage.getByRole("button", { name: "加える" }).click();
  await leadPage.waitForURL(`${projectUrl}/members`);
  await expect(leadPage.getByText("メンバー").first()).toBeVisible();
  await leadCtx.close();

  // メンバーはタスクを見て、ステータスを動かせる(update_task_status RPC)
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await login(page, member);
  await page.goto(`${projectUrl}/tasks`);
  await expect(page.getByText(taskTitle)).toBeVisible();

  // メンバーは作成者でも担当者でもないため動かせない(ボタンが出ない)
  await expect(page.getByRole("button", { name: "進行中へ" })).toHaveCount(
    0,
  );

  // 自分のタスクを作れば動かせる
  await page.getByLabel("タスク名").fill(`図案おこし ${runId}`);
  await page.getByRole("button", { name: "追加する" }).click();
  await page.waitForURL(`${projectUrl}/tasks`);
  await page
    .getByRole("button", { name: "進行中へ" })
    .first()
    .click();
  await page.waitForURL(`${projectUrl}/tasks`);
  const doingSection = page
    .locator("section")
    .filter({ hasText: "進行中" })
    .first();
  await expect(doingSection.getByText(`図案おこし ${runId}`)).toBeVisible();

  // 組織ダッシュボードにプロジェクトが載る(F-08-5)
  await page.goto(`${orgUrl}/projects`);
  await expect(page.getByText(projectName).first()).toBeVisible();
  await expect(page.getByText("予算 100,000円").first()).toBeVisible();

  await ctx.close();
});

test("部外者には組織もプロジェクトも見えない", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await signup(page, outsider);

  await page.goto(orgUrl);
  await expect(page.getByText("404")).toBeVisible();
  await page.goto(projectUrl);
  await expect(page.getByText("404")).toBeVisible();

  await context.close();
});
