import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { resolveInitialAdminCredentials } from './admin-credentials';

const prisma = new PrismaClient();

async function main() {
  const { username, password } = resolveInitialAdminCredentials();

  // 查找管理员账号
  const admin = await prisma.user.findUnique({
    where: { username },
  });

  if (!admin) {
    console.log('管理员账号不存在，正在创建...');
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        role: 'admin',
        status: 'approved',
      },
    });
    
    console.log('✓ 管理员账号创建成功！');
  } else {
    console.log('管理员账号已存在，正在重置密码...');
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await prisma.user.update({
      where: { username },
      data: {
        password: hashedPassword,
        role: 'admin',
        status: 'approved',
      },
    });
    
    console.log('✓ 管理员密码重置成功！');
  }

  console.log('');
  console.log('========================================');
  console.log('  管理员账号信息');
  console.log('========================================');
  console.log('用户名:', username);
  console.log('角色: admin');
  console.log('状态: approved');
  console.log('========================================');
  console.log('');
  console.log('请使用你本次提供的 ADMIN_PASSWORD 登录，并立即修改密码！');
}

main()
  .catch((e) => {
    console.error('错误:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
