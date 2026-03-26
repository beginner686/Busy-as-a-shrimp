import { expect, test } from "@playwright/test";

test("login page smoke", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "手机号登录" })).toBeVisible();
  await page.getByRole("button", { name: "登录" }).click();
  await expect(page.getByText("登录结果").or(page.getByText("登录失败"))).toBeVisible();
});

test("resource list page smoke", async ({ page }) => {
  await page.goto("/resource/list");
  await expect(page.getByRole("heading", { name: "资源列表" })).toBeVisible();
  await expect(
    page.getByText("资源 #").or(page.getByText("暂无资源")).or(page.getByText("资源加载失败"))
  ).toBeVisible();
});

test("match list confirm smoke", async ({ page }) => {
  await page.goto("/match/list");
  await expect(page.getByRole("heading", { name: "匹配列表" })).toBeVisible();
  await page.getByRole("button", { name: "发起匹配" }).click();
  await expect(page.getByText("任务已创建").or(page.getByText("匹配操作失败"))).toBeVisible();
});
