# Supabase Edge Functions Workflow

This project uses Supabase Edge Functions for auth email delivery.

## Function

- `auth-mailer`

## Required secrets

- `RESEND_API_KEY` (optional in development; function runs in no-op mode without it)
- `AUTH_MAIL_FROM` (optional; defaults to `OfferFlow <noreply@offerflow.ai>`)
- `APP_URL` (recommended; used to build verify/reset links)

## Secret sync workflow (recommended)

Use Supabase dashboard or CLI:

```bash
supabase functions secrets set \
  RESEND_API_KEY=... \
  AUTH_MAIL_FROM="OfferFlow <noreply@offerflow.ai>" \
  APP_URL="https://your-client-app"
```

Then deploy:

```bash
supabase functions deploy auth-mailer --no-verify-jwt=false
```
