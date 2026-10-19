# Deployment and security

- Keep secrets in deployment settings or ignored `.env.local`; `.env.example`
  contains placeholders only. Use a random JWT secret, never `change-me`.
- Customer and admin access tokens are verified server-side. Administrative
  database roles are rechecked through a bounded 15-second cache; revocation
  can take that long to reach every process.
- Login, guest creation, recovery, OTP, invoice creation and payment checks have
  separate abuse limits. Commerce Express limits are process-local; distributed
  deployments need a shared limiter store for a global limit. Chatbot rate
  buckets already use PostgreSQL across instances.
- QPay receipt status is verified with QPay, not trusted from callback fields.
  Do not set a callback-signature secret unless your provider configuration
  actually sends the corresponding signature. Never use real merchant
  credentials in automated tests.
- Late money on cancelled orders requires manual resolution and is retained in
  payment history. Refund processing is not automated.
- Configure real public URLs, SMTP and CORS origins. `TRUST_PROXY` must reflect
  your actual proxy topology so rate limits use the correct client address.
- Uploads require admin authorization, restrict MIME types and size, limit
  provider concurrency, and clean temporary files after success/failure.
- Back up PostgreSQL and verify restoration in a separate environment. The app
  does not provision backups, monitoring or production secret rotation.
- Password-reset links and OTPs are single-use under concurrent submissions.
  Existing access tokens are not globally revoked by password reset; a future
  session-version/revocation mechanism is required for that guarantee.

See `APPLICATION_AUDIT.md` for the verification scope and remaining structural
limits. Automated checks do not establish universal production readiness.
