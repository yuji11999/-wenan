import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { resolveInitialAdminCredentials } from './admin-credentials';

const prisma = new PrismaClient();

async function main() {
  const { username, password } = resolveInitialAdminCredentials();

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
  console.log('请使用部署脚本生成的初始密码登录，并立即修改密码！');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
