export interface InitialAdminCredentials {
  username: string;
  password: string;
}

export function resolveInitialAdminCredentials(
  env: NodeJS.ProcessEnv = process.env,
): InitialAdminCredentials {
  const username = env.ADMIN_USERNAME?.trim() || 'admin';
  const password = env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error(
      'ADMIN_PASSWORD is required. Example: ADMIN_PASSWORD="$(openssl rand -hex 24)" npm run create-admin',
    );
  }

  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters long.');
  }

  return { username, password };
}
