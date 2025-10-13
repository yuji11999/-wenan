import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'admin123';

  // 检查管理员是否已存在
  const existingAdmin = await prisma.user.findUnique({
    where: { username },
  });

  if (existingAdmin) {
    console.log('管理员账号已存在');
    return;
  }

  // 创建管理员账号
  const hashedPassword = await bcrypt.hash(password, 10);
  
  const admin = await prisma.user.create({
    data: {
      username,
      password: hashedPassword,
      role: 'admin',
      status: 'approved', // 管理员直接审核通过
    },
  });

  console.log('管理员账号创建成功！');
  console.log('用户名:', username);
  console.log('密码:', password);
  console.log('请登录后立即修改密码！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

