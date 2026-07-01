import { BadRequestException } from '@nestjs/common';
import { promises as dns } from 'dns';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';

const PRIVATE_ERROR = '不允许使用内网或本机AI API地址';

export function isBlockedIp(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const mappedIpv4 = host.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (mappedIpv4) {
    return isBlockedIp(mappedIpv4[1]);
  }
  const mappedIpv4Hex = host.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (mappedIpv4Hex) {
    const high = Number.parseInt(mappedIpv4Hex[1], 16);
    const low = Number.parseInt(mappedIpv4Hex[2], 16);
    if (Number.isNaN(high) || Number.isNaN(low)) {
      return false;
    }
    return isBlockedIp(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
  }

  if (host.includes(':')) {
    if (host === '::1' || host === '::') {
      return true;
    }

    const firstHextet = Number.parseInt(host.split(':')[0], 16);
    if (!Number.isNaN(firstHextet)) {
      return (
        (firstHextet & 0xfe00) === 0xfc00 || // fc00::/7 unique local
        (firstHextet & 0xffc0) === 0xfe80 || // fe80::/10 link local
        (firstHextet & 0xff00) === 0xff00 // ff00::/8 multicast
      );
    }
  }

  const parts = host.split('.').map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return false;
  }

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 0 || b === 168)) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && parts[2] === 100) ||
    (a === 203 && b === 0 && parts[2] === 113) ||
    a >= 224
  );
}

export async function assertSafeHttpUrl(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new BadRequestException('AI API地址格式不正确');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new BadRequestException('AI API地址仅支持HTTP或HTTPS协议');
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    hostname === 'localhost' ||
    hostname === 'metadata.google.internal' ||
    hostname.endsWith('.localhost') ||
    isBlockedIp(hostname)
  ) {
    throw new BadRequestException(PRIVATE_ERROR);
  }

  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  if (records.some((record) => isBlockedIp(record.address))) {
    throw new BadRequestException(PRIVATE_ERROR);
  }
}

function createSafeLookup() {
  return async (hostname: string, options: any, callback: any) => {
    try {
      const records = await dns.lookup(hostname, { all: true, verbatim: true });
      if (records.some((record) => isBlockedIp(record.address))) {
        throw new BadRequestException(PRIVATE_ERROR);
      }

      const family = typeof options === 'object' ? options.family : undefined;
      const candidates = family ? records.filter((record) => record.family === family) : records;
      const selected = candidates[0] || records[0];

      if (options?.all) {
        callback(null, candidates.length > 0 ? candidates : records);
      } else {
        callback(null, selected.address, selected.family);
      }
    } catch (error) {
      callback(error);
    }
  };
}

export function createSafeAxiosAgents() {
  return {
    httpAgent: new HttpAgent({ lookup: createSafeLookup() as any }),
    httpsAgent: new HttpsAgent({ lookup: createSafeLookup() as any }),
  };
}
