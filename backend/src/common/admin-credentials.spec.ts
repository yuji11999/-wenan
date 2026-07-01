import { resolveInitialAdminCredentials } from '../../scripts/admin-credentials';

describe('resolveInitialAdminCredentials', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('requires an explicit admin password', () => {
    delete process.env.ADMIN_PASSWORD;

    expect(() => resolveInitialAdminCredentials()).toThrow(
      'ADMIN_PASSWORD is required',
    );
  });

  it('rejects weak admin passwords', () => {
    process.env.ADMIN_PASSWORD = 'admin123';

    expect(() => resolveInitialAdminCredentials()).toThrow(
      'ADMIN_PASSWORD must be at least 12 characters',
    );
  });

  it('defaults the admin username and accepts a strong password', () => {
    process.env.ADMIN_PASSWORD = 'strong-random-password-2026';

    expect(resolveInitialAdminCredentials()).toEqual({
      username: 'admin',
      password: 'strong-random-password-2026',
    });
  });
});
