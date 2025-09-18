import { CustomerServiceType } from '../customers/entities/customer-service.entity';

/**
 * Declarative mapping of service -> intrinsic permissions the service grants.
 * These are the foundational permissions (business capabilities) that do NOT
 * need to be stored in the database and are considered static logic.
 *
 * Dynamic / additional permissions can still be added through the
 * service_permissions table and will be UNION'ed with these statics.
 */
export const SERVICE_PERMISSION_MATRIX: Record<
  CustomerServiceType,
  readonly string[]
> = {
  [CustomerServiceType.PREMIUM_MEMBERSHIP]: [
    'READ_NEWS',
    'SEARCH_STOCKS', // searching / viewing list & details
  ],
  [CustomerServiceType.PREMIUM_STOCK_PICKS]: [
    'READ_NEWS',
    'SEARCH_STOCKS',
    'ACCESS_PREMIUM_PICKS',
  ],
  [CustomerServiceType.INTERNATIONAL_STOCK_ACCOUNT]: [
    'READ_NEWS',
    'SEARCH_STOCKS',
    'BUY_STOCKS',
    'SELL_STOCKS',
  ],
  [CustomerServiceType.GUARANTEED_RETURNS]: [
    'READ_NEWS',
    'SEARCH_STOCKS',
    'GUARANTEED_RETURNS', // create / manage guaranteed investment positions
  ],
} as const;

/**
 * When a customer has multiple active services we take the UNION of all
 * provided permissions (both static matrix + DB dynamic permissions).
 */
export function deriveStaticPermissionsForServices(
  services: CustomerServiceType[],
): Set<string> {
  const perms = new Set<string>();
  for (const s of services) {
    const mapped = SERVICE_PERMISSION_MATRIX[s];
    if (mapped) {
      mapped.forEach((p) => perms.add(p));
    }
  }
  return perms;
}
