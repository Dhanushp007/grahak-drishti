# Browser E2E

The demo flow test expects the API, seeded database, citizen web app, and admin
dashboard to be running. Set `CITIZEN_BASE_URL` and `ADMIN_BASE_URL` when the
apps are not using their default local ports.

```powershell
npx playwright install chromium
npx playwright test
```