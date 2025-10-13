const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkPrompts() {
  console.log('🔍 检查数据库中的提示词配置...\n');

  try {
    const prompts = await prisma.setting.findMany({
      where: { 
        key: { 
          in: [
            'prompt.system', 
            'prompt.deconstruct', 
            'prompt.analyze', 
            'prompt.rewriteStructure',
            'prompt.rewriteStyle',
            'prompt.rewriteHook',
            'prompt.rewriteMixed'
          ] 
        } 
      }
    });

    prompts.forEach(p => {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📝 ${p.key}`);
      console.log(`${'='.repeat(80)}`);
      console.log(p.value);
      console.log(`\n长度: ${p.value.length} 字符`);
      
      // 检查是否包含占位符
      const hasReference = p.value.includes('{{reference}}');
      const hasNewContent = p.value.includes('{{newContent}}');
      const hasContent = p.value.includes('{{content}}');
      
      if (hasReference || hasNewContent || hasContent) {
        console.log('✅ 包含占位符:', 
          hasReference ? '{{reference}}' : '', 
          hasNewContent ? '{{newContent}}' : '',
          hasContent ? '{{content}}' : ''
        );
      } else if (p.key.startsWith('prompt.rewrite')) {
        console.log('⚠️  警告: 仿写提示词缺少占位符！');
      }
    });

    console.log(`\n\n📊 总计: ${prompts.length} 个提示词配置`);
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

checkPrompts()
  .then(() => {
    console.log('\n✅ 检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ 检查失败:', error);
    process.exit(1);
  });

