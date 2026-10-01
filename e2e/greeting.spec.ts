import { expect, test } from '@playwright/test'

test('the welcome card asks for a name, and Today greets that person by it', async ({ page }) => {
  await page.goto('/#/')
  const heading = page.getByRole('heading', { level: 1 })
  await expect(heading).toHaveText(/^Good (morning|afternoon|evening)$/)

  const field = page.getByLabel('What should Rae call you?')
  await expect(field).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled()
  await field.fill('Andrae')
  await page.getByRole('button', { name: 'Save', exact: true }).click()

  await expect(heading).toHaveText(/^Good (morning|afternoon|evening), Andrae$/)
  await expect(field).toBeHidden()

  // The name belongs to this profile and survives a reload.
  await page.goto('about:blank')
  await page.goto('/#/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/, Andrae$/)
  await expect(page.getByLabel('What should Rae call you?')).toBeHidden()
  await page.goto('/#/settings')
  await expect(page.getByText('Andrae').first()).toBeVisible()
})

test('the name is optional: Got it still dismisses the card without one', async ({ page }) => {
  await page.goto('/#/')
  await expect(page.getByLabel('What should Rae call you?')).toBeVisible()
  await page.getByRole('button', { name: 'Got it' }).click()
  await expect(page.getByLabel('What should Rae call you?')).toBeHidden()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/^Good (morning|afternoon|evening)$/)
})
