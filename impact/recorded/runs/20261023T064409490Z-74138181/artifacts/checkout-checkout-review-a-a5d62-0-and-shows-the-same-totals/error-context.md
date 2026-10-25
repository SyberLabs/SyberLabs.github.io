# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: checkout.spec.ts >> checkout review applies SAVE10 and shows the same totals
- Location: tests/flows/checkout.spec.ts:6:1

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  getByTestId('review-total')
Expected: "$90.00"
Received: "$80.00"
Timeout:  5000ms

Call log:
  - Expect "toHaveText" getByTestId('review-total') with timeout 5000ms
  - waiting for getByTestId('review-total')
    14 × locator resolved to <dd class="total" data-testid="review-total">$80.00</dd>
       - unexpected value "$80.00"

```

```yaml
- definition: $80.00
```

# Test source

```ts
  1  | // Checkout review uses the same coupon form and shows the correct totals on its own page.
  2  | // It does not go through the cart flow, so a failure here is evidence about the review page.
  3  | import { expect, test } from "@playwright/test";
  4  | import { APP_ROUTES, TESTIDS } from "../../shared/contract.ts";
  5  | 
  6  | test("checkout review applies SAVE10 and shows the same totals", async ({ page }) => {
  7  |   const id = (t: string) => page.getByTestId(t);
  8  |   await page.goto(APP_ROUTES.checkout);
  9  |   await expect(id(TESTIDS.reviewSubtotal)).toHaveText("$100.00");
  10 |   await id(TESTIDS.couponInput).fill("SAVE10");
  11 |   await id(TESTIDS.couponApply).click();
  12 |   await expect(id(TESTIDS.reviewSubtotal)).toHaveText("$100.00");
  13 |   await expect(id(TESTIDS.reviewDiscount)).toHaveText("$10.00");
> 14 |   await expect(id(TESTIDS.reviewTotal)).toHaveText("$90.00");
     |                                         ^ Error: expect(locator).toHaveText(expected) failed
  15 |   await expect(page.getByRole("button", { name: /place order|pay|submit order/i })).toHaveCount(0);
  16 | });
  17 | 
```