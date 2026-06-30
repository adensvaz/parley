# Security Policy

Report vulnerabilities privately to **security@parley.app** (not via public issues). We acknowledge
within 48 hours.

- Secrets live in the OS keychain (desktop) or a managed KMS (services) — never in source.
- Tenant data is isolated at the database layer via PostgreSQL Row-Level Security.
- PII is encrypted at rest; all transport is TLS.
