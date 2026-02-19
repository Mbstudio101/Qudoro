# Supabase Auth Production Checklist (Qudoro)

1. Open: `Authentication -> URL Configuration`
2. Set `Site URL` to `https://qudoro.com`
3. Add Redirect URLs:
   - `https://qudoro.com/confirm-email`
   - `https://qudoro.com/reset-password`

4. Open: `Authentication -> Email Templates`
5. Confirm templates use Supabase variables:
   - Confirmation: `{{ .ConfirmationURL }}`
   - Recovery: `{{ .ConfirmationURL }}`

6. Open: `Authentication -> SMTP Settings`
7. Configure branded sender (recommended):
   - From email: `no-reply@qudoro.com`
   - From name: `Qudoro`
   - SMTP provider credentials

8. Open: `Authentication -> Rate Limits`
9. Tighten limits for:
   - Sign in attempts
   - OTP / email sends
   - Password recovery requests

10. Revoke leaked keys immediately if any were exposed in logs/chats:
    - Rotate `secret` key
    - Rotate publishable/anon keys if needed
    - Update app/env vars and redeploy
