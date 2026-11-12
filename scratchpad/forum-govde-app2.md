### 🏷️ Discussion Type

Bug

### 💬 Feature/Topic Area

Pages

### Body

Custom domain `app.mulkum360.com` (repo `fatihcalis07-commits/mulkum360-web`, legacy CNAME-file Pages) has had **no TLS certificate issued for 11+ hours**.

**What is verified / working:**
- Cloudflare CNAME `app` → `fatihcalis07-commits.github.io` added Nov 12 ~07:35 UTC (DNS-only, resolving correctly)
- Pages `status: built` within a minute; HTTP 200 serving the correct site, all assets 200
- Settings → Pages shows the domain verified; no CAA record at apex or subdomain, no DNSSEC

**What is stuck:**
- TLS: `app.mulkum360.com` still presents the default `*.github.io` certificate — checks at 11:35, 12:05, 12:35, 13:35, 16:50, 17:20, 19:20, 20:36 (UTC+3) all identical; `https_enforced: false` via the Pages API
- The owner performed the documented workaround at ~13:50 UTC: removed + re-added the custom domain in Settings → Pages and ticked Enforce HTTPS. GitHub re-verified the domain but the certificate job still has not started. 11 hours in.

**Control data points — same account, same day, same Cloudflare account:**
- `mulkum360.app` (apex, fresh Pages site) → certificate issued in **~5 minutes**
- `www.mulkum360.com` → was stuck 28 h, cleared and issued the following morning

So the ACME pipeline itself works for this account; the issuance job for `app.mulkum360.com` specifically appears to have never been enqueued.

**Request:** could someone manually re-trigger ACME issuance (or check the cert job) for `app.mulkum360.com`?

(Resubmission in template format of #212949, auto-closed as non-template; posted via gh CLI on behalf of the account owner. Teşekkürler!)