import { expect, test, type Page } from '@playwright/test'
import { dismissWelcome, finishWorkout, openProgressMore } from './helpers'

async function heart(page: Page, id: string) {
  await page.goto('about:blank')
  await page.goto(`/#/exercise/${id}`)
  await dismissWelcome(page)
  await page.getByRole('button', { name: /^Heart / }).click()
  await expect(page.getByRole('button', { name: /^Un-heart / })).toBeVisible()
}

test('three hearts make Her mix, which starts like any routine', async ({ page }) => {
  await heart(page, 'fs.bodyweight-squat')
  await heart(page, 'fs.plank')
  await page.goto('about:blank')
  await page.goto('/')
  await expect(page.getByRole('heading').first()).toBeVisible()
  await expect(page.getByRole('link', { name: /^Her mix/ })).toHaveCount(0)

  await heart(page, 'fs.dead-bug')
  await page.goto('about:blank')
  await page.goto('/#/library')
  await expect(page.getByRole('link', { name: /^Her mix/ })).toBeVisible()
  await page.goto('about:blank')
  await page.goto('/')
  await page.getByRole('link', { name: /^Her mix/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Her mix' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Your workout' }).getByRole('listitem')).toHaveCount(3)
  await page.getByRole('button', { name: 'Start workout' }).click()
  await expect(page.getByRole('heading', { name: 'Bodyweight Squat' })).toBeVisible()
})

test('Her mix gone (fewer than three hearts): its Start link says not available', async ({ page }) => {
  await page.goto('/#/checkin/her-mix')
  await dismissWelcome(page)
  await expect(page.getByText("That workout isn't available.")).toBeVisible()
})

test('a finished Her mix keeps its name in history after an un-heart', async ({ page }) => {
  test.setTimeout(120_000)
  await heart(page, 'fs.bodyweight-squat')
  await heart(page, 'fs.plank')
  await heart(page, 'fs.dead-bug')
  await page.goto('about:blank')
  await page.goto('/#/checkin/her-mix')
  await page.getByRole('radio', { name: /^Short/ }).click()
  await page.getByRole('button', { name: 'Start workout' }).click()
  await finishWorkout(page)

  await page.goto('about:blank')
  await page.goto('/#/exercise/fs.plank')
  await page.getByRole('button', { name: /^Un-heart / }).click()
  await expect(page.getByRole('button', { name: /^Heart / })).toBeVisible()

  await page.goto('about:blank')
  await page.goto('/#/progress')
  await openProgressMore(page)
  await expect(page.getByText('Her mix', { exact: true }).first()).toBeVisible()
})
