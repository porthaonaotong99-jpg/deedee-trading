import * as crypto from 'crypto';

export interface ParsedDeviceInfo {
  userAgent?: string;
  ipAddress?: string;
  deviceId?: string;
  deviceName?: string;
  metadata?: Record<string, unknown>;
  country?: string;
  province?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
}

// Using official type definitions from @types/ua-parser-js eliminates unsafe access.

export function parseDeviceContext(params: {
  userAgent?: string;
  ipAddress?: string;
  providedDeviceId?: string;
  providedDeviceName?: string;
  country?: string;
  province?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
}): ParsedDeviceInfo {
  const {
    userAgent,
    ipAddress,
    providedDeviceId,
    providedDeviceName,
    country,
    province,
    district,
    latitude,
    longitude,
  } = params;
  if (!userAgent) return {};

  // Simple regex-based parsing (avoids external parser & unsafe type warnings)
  const browserMatchers: { name: string; regex: RegExp }[] = [
    { name: 'Edge', regex: /Edg\/([0-9.]+)/ },
    { name: 'Chrome', regex: /Chrome\/([0-9.]+)/ },
    { name: 'Firefox', regex: /Firefox\/([0-9.]+)/ },
    { name: 'Safari', regex: /Version\/([0-9.]+)\s+Safari/ },
    { name: 'Opera', regex: /OPR\/([0-9.]+)/ },
    { name: 'IE', regex: /Trident.*rv:([0-9.]+)/ },
  ];
  let browserName = 'UnknownBrowser';
  let browserVersion = '';
  for (const m of browserMatchers) {
    const match = userAgent.match(m.regex);
    if (match) {
      browserName = m.name;
      browserVersion = match[1];
      break;
    }
  }

  const osMatchers: { name: string; regex: RegExp }[] = [
    { name: 'Windows', regex: /Windows NT [0-9.]+/ },
    { name: 'iOS', regex: /iPhone OS [0-9_]+|iPad; CPU OS [0-9_]+/ },
    { name: 'macOS', regex: /Mac OS X [0-9_]+/ },
    { name: 'Android', regex: /Android [0-9.]+/ },
    { name: 'Linux', regex: /Linux/ },
  ];
  let osName = 'UnknownOS';
  for (const m of osMatchers) {
    if (m.regex.test(userAgent)) {
      osName = m.name;
      break;
    }
  }

  // Device inference (very light-weight)
  let deviceType = 'desktop';
  if (/Mobi|Android/i.test(userAgent)) deviceType = 'mobile';
  else if (/Tablet|iPad/i.test(userAgent)) deviceType = 'tablet';

  let deviceModel = '';
  if (/iPhone/.test(userAgent)) deviceModel = 'iPhone';
  else if (/iPad/.test(userAgent)) deviceModel = 'iPad';
  else if (/Android/.test(userAgent)) deviceModel = 'Android Device';

  const deviceVendor = /Apple/.test(userAgent)
    ? 'Apple'
    : /Samsung/i.test(userAgent)
      ? 'Samsung'
      : /Huawei/i.test(userAgent)
        ? 'Huawei'
        : '';

  const deviceName =
    providedDeviceName ||
    [deviceVendor, deviceModel].filter(Boolean).join(' ') ||
    `${browserName} on ${osName}`;

  const fingerprintSource = `${userAgent}|${ipAddress || ''}|${deviceVendor}|${deviceModel}|${browserName}|${osName}`;
  const derivedDeviceId = crypto
    .createHash('sha256')
    .update(fingerprintSource)
    .digest('hex')
    .slice(0, 32);
  const deviceId = providedDeviceId || derivedDeviceId;

  const metadata: Record<string, unknown> = {
    browser: { name: browserName, version: browserVersion },
    os: { name: osName },
    device: { vendor: deviceVendor, model: deviceModel, type: deviceType },
    raw: { userAgent },
  };

  return {
    userAgent,
    ipAddress,
    deviceId,
    deviceName,
    metadata,
    country,
    province,
    district,
    latitude,
    longitude,
  };
}
