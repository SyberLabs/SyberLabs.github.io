# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: cart.spec.ts >> cart applies SAVE10 exactly once
- Location: tests/flows/cart.spec.ts:6:1

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  getByTestId('cart-total')
Expected: "$90.00"
Received: "$80.00"
Timeout:  5000ms

Call log:
  - Expect "toHaveText" getByTestId('cart-total') with timeout 5000ms
  - waiting for getByTestId('cart-total')
    14 × locator resolved to <dd class="total" data-testid="cart-total">$80.00</dd>
       - unexpected value "$80.00"

```

```yaml
- definition: $80.00
```

# Test source

```ts
  1  | // Cart: subtotal, one SAVE10 discount, total; a second apply must not stack.
  2  | // Expected values are hardcoded known outcomes, never computed from app code.
  3  | import { expect, test } from "@playwright/test";
  4  | import { APP_ROUTES, TESTIDS } from "../../shared/contract.ts";
  5  | 
  6  | test("cart applies SAVE10 exactly once", async ({ page }) => {
  7  |   const id = (t: string) => page.getByTestId(t);
  8  |   await page.goto(APP_ROUTES.cart);
  9  |   await expect(id(TESTIDS.cartSubtotal)).toHaveText("$100.00");
  10 | 
  11 |   await id(TESTIDS.couponInput).fill("SAVE10");
  12 |   await id(TESTIDS.couponApply).click();
  13 |   await expect(id(TESTIDS.cartSubtotal)).toHaveText("$100.00");
  14 |   await expect(id(TESTIDS.cartDiscount)).toHaveText("$10.00");
> 15 |   await expect(id(TESTIDS.cartTotal)).toHaveText("$90.00");
     |                                       ^ Error: expect(locator).toHaveText(expected) failed
  16 | 
  17 |   await id(TESTIDS.couponInput).fill("SAVE10");
  18 |   await id(TESTIDS.couponApply).click();
  19 |   await expect(id(TESTIDS.cartDiscount)).toHaveText("$10.00");
  20 |   await expect(id(TESTIDS.cartTotal)).toHaveText("$90.00");
  21 | });
  22 | 
```