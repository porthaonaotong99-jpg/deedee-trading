import geoipLite from 'geoip-lite';

type GeoIPLiteResult = {
  range: [number, number];
  country: string;
  region: string;
  city: string;
  ll: [number, number];
  metro?: number;
  zip?: string;
};

interface GeoIPLiteAdapter {
  lookup(ip: string): GeoIPLiteResult | null;
}

const geoip: GeoIPLiteAdapter = geoipLite as unknown as GeoIPLiteAdapter;

export interface GeoLocation {
  country?: string;
  province?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  geo?: Record<string, unknown>;
}

export function lookupGeoLocation(ip: string): GeoLocation {
  if (
    !ip ||
    ip === '127.0.0.1' ||
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    ip.startsWith('172.')
  ) {
    return {};
  }
  const geo = geoip.lookup(ip);
  if (!geo) return {};
  return {
    country: geo.country,
    province: geo.region,
    district: geo.city,
    latitude: geo.ll[0],
    longitude: geo.ll[1],
    geo: geo as Record<string, unknown>,
  };
}
