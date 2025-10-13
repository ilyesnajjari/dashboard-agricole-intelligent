import { test, expect } from '@playwright/test'

test.describe('Dashboard smoke', () => {
  test('home loads and nav links exist', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Dashboard Agricole Intelligent')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Produits' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Récoltes' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ventes' })).toBeVisible()
  })
})
