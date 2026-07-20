import { test, expect, type Page } from "@playwright/test";

// P2 個人コアの通し確認:
// 予定 → 派生導線で日記(自動リンク)→ その日ページ → 家計簿集計(F-03/F-04/F-05/F-09)

const runId = Date.now();
const user = {
  email: `p2-${runId}@example.com`,
  password: `pw-p2-${runId}`,
  displayName: "つむぎ",
};

const eventTitle = `温泉旅行 ${runId}`;
const diaryBody = `よい湯だった ${runId}`;

test.describe.configure({ mode: "serial" });

async function signupViaUi(page: Page) {
  await page.goto("/signup");
  await page.getByLabel("表示名").fill(user.displayName);
  await page.getByLabel("メールアドレス").fill(user.email);
  await page.getByLabel("パスワード(8文字以上)").fill(user.password);
  await page.getByRole("button", { name: "新規登録" }).click();
  await page.waitForURL("/");
}

test("予定を作成し、その日ページに表示される", async ({ page }) => {
  await signupViaUi(page);

  await page.goto("/items/new?type=event");
  await page.getByLabel("タイトル").fill(eventTitle);
  await page.getByLabel("開始").fill("10:30");
  await page.getByLabel("場所").fill("城崎");
  await page.getByRole("button", { name: "保存する" }).click();
  await page.waitForURL(/\/days\/\d{4}-\d{2}-\d{2}/);

  await expect(page.getByText(eventTitle)).toBeVisible();
  await expect(page.getByRole("heading", { name: "予定" })).toBeVisible();
});

test("予定の派生導線から日記を書くと自動で双方向リンクされる", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(user.email);
  await page.getByLabel("パスワード").fill(user.password);
  await page.getByRole("button", { name: "ログイン" }).click();
  await page.waitForURL("/");

  // 予定詳細 → 「この日の日記を書く」(F-03-4)
  await page.getByText(eventTitle).first().click();
  await page.getByRole("link", { name: "この日の日記を書く" }).click();
  await page.getByLabel("本文").fill(diaryBody);
  await page.getByRole("button", { name: "保存する" }).click();
  await page.waitForURL(/\/days\/\d{4}-\d{2}-\d{2}/);

  // 日記詳細に予定がバックリンクされている(F-09-2/F-09-3)
  await page.getByText(diaryBody.slice(0, 10)).first().click();
  await expect(
    page.getByRole("heading", { name: "結びついた記録" }),
  ).toBeVisible();
  await expect(page.getByText(eventTitle).first()).toBeVisible();

  // 予定側から見ても日記が結びついている(双方向)
  await page.getByText(eventTitle).first().click();
  await expect(page.getByText(diaryBody.slice(0, 10)).first()).toBeVisible();
});

test("収支をつけると月次集計に反映される", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(user.email);
  await page.getByLabel("パスワード").fill(user.password);
  await page.getByRole("button", { name: "ログイン" }).click();
  await page.waitForURL("/");

  await page.goto("/items/new?type=expense");
  await page.getByLabel("金額(円)").fill("2980");
  await page.getByLabel("費目").fill("交通");
  await page.getByLabel("メモ(任意)").fill("特急券");
  await page.getByRole("button", { name: "保存する" }).click();
  await page.waitForURL(/\/days\/\d{4}-\d{2}-\d{2}/);

  await page.goto("/expenses");
  await expect(page.getByText("2,980円").first()).toBeVisible();
  await expect(page.getByText("交通").first()).toBeVisible();
});

test("カレンダー月表示から今日のページへたどれる", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill(user.email);
  await page.getByLabel("パスワード").fill(user.password);
  await page.getByRole("button", { name: "ログイン" }).click();
  await page.waitForURL("/");

  await page.goto("/calendar");
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  await page.locator(`a[href="/days/${iso}"]`).click();
  await page.waitForURL(`/days/${iso}`);
  await expect(page.getByText(eventTitle).first()).toBeVisible();
});
