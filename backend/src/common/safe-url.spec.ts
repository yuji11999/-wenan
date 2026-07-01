import { promises as dns } from 'dns';
import { assertSafeHttpUrl, createSafeAxiosAgents, isBlockedIp } from './safe-url';

jest.mock('dns', () => ({
  promises: {
    lookup: jest.fn(),
  },
}));

describe('safe-url', () => {
  const mockedLookup = dns.lookup as jest.Mock;

  beforeEach(() => {
    jest.resetAllMocks();
    mockedLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
  });

  it('rejects IPv4-mapped IPv6 loopback literals', async () => {
    await expect(assertSafeHttpUrl('http://[::ffff:127.0.0.1]:8080/v1')).rejects.toThrow(
      '不允许使用内网或本机AI API地址',
    );
  });

  it('rejects IPv6 link-local literals', async () => {
    await expect(assertSafeHttpUrl('http://[fe80::1]:8080/v1')).rejects.toThrow(
      '不允许使用内网或本机AI API地址',
    );
  });

  it('rejects hostnames resolving to IPv4-mapped IPv6 private addresses', async () => {
    mockedLookup.mockResolvedValue([{ address: '::ffff:10.0.0.5', family: 6 }]);

    await expect(assertSafeHttpUrl('https://api.example.com/v1')).rejects.toThrow(
      '不允许使用内网或本机AI API地址',
    );
  });

  it('rejects hostnames resolving to IPv6 link-local addresses', async () => {
    mockedLookup.mockResolvedValue([{ address: 'fe80::1', family: 6 }]);

    await expect(assertSafeHttpUrl('https://api.example.com/v1')).rejects.toThrow(
      '不允许使用内网或本机AI API地址',
    );
  });

  it('classifies carrier-grade NAT and reserved IPv4 ranges as blocked', () => {
    expect(isBlockedIp('100.64.0.1')).toBe(true);
    expect(isBlockedIp('198.18.0.1')).toBe(true);
    expect(isBlockedIp('240.0.0.1')).toBe(true);
  });

  it('validates DNS again through the axios agent lookup', async () => {
    mockedLookup.mockResolvedValue([{ address: '10.0.0.5', family: 4 }]);
    const { httpsAgent } = createSafeAxiosAgents();
    const lookup = (httpsAgent as any).options.lookup;

    await new Promise<void>((resolve) => {
      lookup('api.example.com', {}, (error: Error) => {
        expect(error.message).toContain('不允许使用内网或本机AI API地址');
        resolve();
      });
    });
  });
});
