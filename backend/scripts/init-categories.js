const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const defaultCategories = [
  { name: '科技互联网', value: 'tech', sortOrder: 1, isDefault: false },
  { name: '教育培训', value: 'education', sortOrder: 2, isDefault: false },
  { name: '生活方式', value: 'lifestyle', sortOrder: 3, isDefault: false },
  { name: '美食餐饮', value: 'food', sortOrder: 4, isDefault: false },
  { name: '时尚美妆', value: 'fashion', sortOrder: 5, isDefault: false },
  { name: '健康养生', value: 'health', sortOrder: 6, isDefault: false },
  { name: '金融理财', value: 'finance', sortOrder: 7, isDefault: false },
  { name: '娱乐影视', value: 'entertainment', sortOrder: 8, isDefault: false },
  { name: '房产家居', value: 'realestate', sortOrder: 9, isDefault: false },
  { name: '旅游出行', value: 'travel', sortOrder: 10, isDefault: false },
  { name: '其他', value: 'other', sortOrder: 999, isDefault: true },
];

async function initCategories() {
  console.log('开始初始化行业分类...\n');
  
  try {
    // 检查是否已有分类
    const count = await prisma.category.count();
    
    if (count > 0) {
      console.log(`数据库中已有 ${count} 个分类，跳过初始化`);
      console.log('\n当前分类列表：');
      const categories = await prisma.category.findMany({
        orderBy: { sortOrder: 'asc' }
      });
      categories.forEach(cat => {
        console.log(`  - ${cat.name} (${cat.value})${cat.isDefault ? ' [默认]' : ''}`);
      });
      return;
    }
    
    // 初始化默认分类
    console.log('数据库中没有分类，开始创建默认分类...\n');
    
    for (const category of defaultCategories) {
      await prisma.category.create({
        data: category
      });
      console.log(`✓ 创建分类: ${category.name} (${category.value})`);
    }
    
    console.log('\n✅ 默认分类初始化完成！');
    console.log(`共创建 ${defaultCategories.length} 个分类\n`);
    
  } catch (error) {
    console.error('❌ 初始化分类失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

initCategories();



