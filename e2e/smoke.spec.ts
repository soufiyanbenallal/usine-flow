import { expect, test } from '@playwright/test'

test('login page renders', async ({ page }) => {
  await page.goto('/login')
  await expect(page).toHaveTitle(/UsineFlow/)
  await expect(page.locator('body')).toContainText(/connexion|se connecter/i)
})

test('PWA manifest is served and valid', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest')
  expect(res.ok()).toBe(true)
  const manifest = await res.json()
  expect(manifest.name).toBe('UsineFlow')
  expect(manifest.display).toBe('standalone')
  expect(manifest.icons.length).toBeGreaterThanOrEqual(2)
})

test('service worker and offline fallback are available', async ({ request }) => {
  expect((await request.get('/sw.js')).ok()).toBe(true)
  const offline = await request.get('/offline.html')
  expect(await offline.text()).toContain('hors ligne')
})

test('assistant API refuses unauthenticated calls', async ({ request }) => {
  const res = await request.post('/api/assistant', { data: { organizationId: 'x', messages: [{ role: 'user', content: 'bonjour' }] } })
  expect([401, 503]).toContain(res.status())
})
