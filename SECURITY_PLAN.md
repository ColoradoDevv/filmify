# Security Hardening Plan

## 1. Database Security (Critical)
- **Vulnerability**: Potential Privilege Escalation via Mass Assignment on `profiles` table.
- **Fix**: Update RLS policies for `profiles` to explicitly restrict which columns can be updated by the user. Users should NOT be able to update their own `role`.

## 2. Middleware Hardening
- **Vulnerability**: Missing security headers, potential IP spoofing.
- **Fix**: 
    - Add standard security headers (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Content-Security-Policy).
    - Ensure `x-forwarded-for` is handled correctly (though Vercel handles this well, explicit checks are better).

## 3. API Security
- **Vulnerability**: No rate limiting on `/api/contact`.
- **Fix**: Implement a simple server-side rate limiter (using Upstash Redis if available, or a simple in-memory/database check if not). Since I don't see Redis configured, I will use a database-backed rate limiter or a simple timestamp check in the `ip_bans` or a new `rate_limits` table.
