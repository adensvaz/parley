# parley-web

Next.js frontend: marketing site, **manager dashboard** (reads `parley-analytics-service`), team/seat
management, and the Stripe billing portal (`parley-billing-service`). Clerk for auth. Talks only to the
gateway/services over HTTPS — never the DB directly.
