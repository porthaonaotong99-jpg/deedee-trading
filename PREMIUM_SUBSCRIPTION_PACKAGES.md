# Premium Subscription Packages

This document describes the new server-authoritative subscription package system for Premium Membership.

## Rationale
Previously, the client supplied `subscription.duration` and optional `fee` when applying for a premium membership. This presented several problems:
- Trust boundary violation: client could manipulate fee.
- Difficulty adjusting pricing centrally.
- Swagger/API complexity with inline structures.

The new design introduces a `subscription_packages` table. Each package row defines:
- `id` (UUID)
- `service_type` (currently only `premium_membership` supported here)
- `duration_months` (3, 6, 12, etc.)
- `price` + `currency`
- `description`
- `active` flag for soft-retirement of packages

The client now submits only:
```
POST /customers/services/premium-membership/apply
{
  "service_type": "premium_membership",
  "package_id": "<uuid>",
  "payment_slip": { ... }
}
```

The backend loads the package, validates it is active, derives the duration and fee, and ensures the slip payment matches the canonical price.

## Migration
A TypeORM migration `1733330000000-create-subscription-packages.ts` creates the table and seeds default 3/6/12-month packages if they do not already exist.

## Backward Compatibility
The DTO keeps a deprecated `subscription` field temporarily. Any logic now ignores it in favor of `package_id`. Plan removal after all clients are updated. Recommended deprecation window: 1 release.

## Validation Flow
1. Verify customer has no existing active premium membership.
2. Fetch package by `id`, `service_type=premium_membership`, `active=true`.
3. Map `duration_months` to enum `SubscriptionDuration` (reject unsupported values).
4. Convert numeric string `price` to number; validate `payment_slip.payment_amount` matches (±0.01 tolerance for floating point).
5. Apply service with derived duration & fee; create pending payment record with slip data.

## Operational Notes
- Adjust or add new packages via SQL or an admin UI (future enhancement). Set `active=false` to retire packages without breaking historical records.
- Price changes: create a new package row instead of updating historical one if you need auditability; or update in-place if audit isn't required (decide policy).
- Consider unique constraint `(service_type, duration_months, active)` if you want to disallow multiple active packages for the same duration.

## Future Enhancements
- Introduce `version` or `effective_from` fields for scheduled pricing changes.
- Expose `GET /public/subscription-packages?service_type=premium_membership` for clients to dynamically fetch offerings.
- Add audit logging around package creation/modification.
- Add caching layer (e.g., Redis) if package list grows or is requested frequently.

## Removal Plan for Deprecated Field
Target removal steps:
1. Mark `subscription` field as deprecated in Swagger (already documented).
2. After N days/releases, remove field from DTO and controller examples.
3. Remove any fallback logic (currently none) and cleanup docs.

---
This system improves pricing integrity, central governance, and clarity of the premium membership application flow.
