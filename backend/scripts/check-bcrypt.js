const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

(async () => {
  const prisma = new PrismaClient();
  try {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD;

    if (!password) {
      throw new Error('ADMIN_PASSWORD is required for bcrypt checking.');
    }

    const u = await prisma.user.findUnique({ where: { username } });
    if (!u) return console.log('no admin');
    const ok = await bcrypt.compare(password, u.password);
    console.log('bcrypt compare result:', ok);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();
