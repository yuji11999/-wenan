const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

(async () => {
  const prisma = new PrismaClient();
  try {
    const u = await prisma.user.findUnique({ where: { username: 'admin' } });
    if (!u) return console.log('no admin');
    const ok = await bcrypt.compare('admin123', u.password);
    console.log('bcrypt compare result:', ok);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();

