import { expect, test, type Page } from '@playwright/test'

// Two people on one device: the first open of the day asks who's working
// out. Profiles are seeded straight into localStorage (the app reads them
// synchronously at startup), then the page reloads to "open" the app.
async function seedTwoProfiles(page: Page, lastPicked: string | null) {
  await page.goto('/')
  await page.evaluate((picked) => {
    localStorage.setItem(
      'workout-app:profiles',
      JSON.stringify({
        profiles: [
          { id: 'default', name: 'Me' },
          { id: 'kay12345', name: 'Kay' },
        ],
        activeId: 'default',
      })
    )
    if (picked) localStorage.setItem('workout-app:profile-picked', picked)
    else localStorage.removeItem('workout-app:profile-picked')
  }, lastPicked)
  await page.reload()
}

const picker = (page: Page) => page.getByRole('dialog', { name: "Who's working out?" })

test("the first open of the day asks who's working out; picking switches, then it stays quiet", async ({ page }) => {
  await seedTwoProfiles(page, '2000-01-01')
  await expect(picker(page)).toBeVisible()
  // Focus starts on the first person, and every choice is a big target.
  await expect(picker(page).getByRole('button', { name: /Me/ })).toBeFocused()
  const box = await picker(page).getByRole('button', { name: /Kay/ }).boundingBox()
  expect(box!.height).toBeGreaterThanOrEqual(44)

  await Promise.all([page.waitForEvent('load'), picker(page).getByRole('button', { name: /Kay/ }).click()])
  await expect(picker(page)).toBeHidden()
  await page.goto('/#/settings')
  await expect(page.getByRole('button', { name: /Profile: Kay/ })).toBeVisible()

  // Same day: opening again doesn't ask.
  await page.goto('about:blank')
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Good/ })).toBeVisible()
  await expect(picker(page)).toBeHidden()
})

test('choosing the person already active just closes the picker', async ({ page }) => {
  await seedTwoProfiles(page, null)
  await picker(page).getByRole('button', { name: /Me/ }).click()
  await expect(picker(page)).toBeHidden()
  await page.goto('/#/settings')
  await expect(page.getByRole('button', { name: /Profile: Me/ })).toBeVisible()
})

test('one person never sees the picker, and a session link is never covered', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: /Good/ })).toBeVisible()
  await expect(picker(page)).toBeHidden()

  await seedTwoProfiles(page, '2000-01-01')
  await page.goto('about:blank')
  await page.goto('/#/session/not-a-real-session')
  await page.waitForTimeout(500)
  await expect(picker(page)).toBeHidden()
})
