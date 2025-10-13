const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function initPrompts() {
  console.log('🚀 开始初始化提示词配置...');

  const defaults = {
    'prompt.system': '你是短视频文案分析与创作专家。请务必只返回JSON格式的数据，不要包含任何额外的文字、解释或Markdown格式。',
    'prompt.deconstruct': '请帮我分析这段文案的核心话题、吸引人的开头钩子、文案中的金句亮点、广告植入方式等关键要素。\n\n文案内容：\n{{content}}\n\n【重要】请只返回JSON格式，不要有任何其他内容。JSON格式如下：\n{\n  "topic": "核心话题",\n  "hook": "开头钩子",\n  "goldenSentence": "金句亮点",\n  "adPlacement": "广告植入方式",\n  "content": "核心内容总结",\n  "tags": ["标签1", "标签2"]\n}',
    'prompt.analyze': '请分析这个文案为什么可能成为爆款，包括它的优点、吸引人的地方，以及可以改进的建议。\n\n文案内容：\n{{content}}\n\n【重要】请只返回JSON格式，不要有任何其他内容。JSON格式如下：\n{\n  "topic": "核心话题",\n  "hook": "开头钩子",\n  "goldenSentence": "金句",\n  "adPlacement": "广告植入",\n  "fireReasons": ["火的原因1", "火的原因2", "火的原因3"],\n  "suggestions": ["改进建议1", "改进建议2", "改进建议3"]\n}',
    'prompt.rewriteStructure': '请严格保持参考文案的段落结构、句式长度和节奏，只替换核心内容和细节描述。\n\n参考文案：\n{{reference}}\n\n新的核心内容：\n{{newContent}}\n\n【重要】请只返回JSON格式，不要有任何其他内容。JSON格式如下：\n{\n  "title": "文案标题",\n  "content": "完整的仿写内容",\n  "highlights": ["亮点1", "亮点2", "亮点3"]\n}',
    'prompt.rewriteStyle': '请学习参考文案的语气、用词风格、表达方式和情绪基调，用新内容创作一个风格相同的文案。\n\n参考文案：\n{{reference}}\n\n新的核心内容：\n{{newContent}}\n\n【重要】请只返回JSON格式，不要有任何其他内容。JSON格式如下：\n{\n  "title": "文案标题",\n  "content": "完整的仿写内容",\n  "highlights": ["亮点1", "亮点2", "亮点3"]\n}',
    'prompt.rewriteHook': '请重点学习参考文案的开头钩子设计和吸引用户的方式，用新内容创作一个同样吸引人的文案。\n\n参考文案：\n{{reference}}\n\n新的核心内容：\n{{newContent}}\n\n【重要】请只返回JSON格式，不要有任何其他内容。JSON格式如下：\n{\n  "title": "文案标题",\n  "content": "完整的仿写内容",\n  "highlights": ["亮点1", "亮点2", "亮点3"]\n}',
    'prompt.rewriteMixed': '请综合考虑参考文案的结构、风格和钩子，灵活组合创作，在保持核心吸引力的同时融入新内容。\n\n参考文案：\n{{reference}}\n\n新的核心内容：\n{{newContent}}\n\n【重要】请只返回JSON格式，不要有任何其他内容。JSON格式如下：\n{\n  "title": "文案标题",\n  "content": "完整的仿写内容",\n  "highlights": ["亮点1", "亮点2", "亮点3"]\n}'
  };

  try {
    // 检查现有配置
    const existing = await prisma.setting.findMany({
      where: { key: { in: Object.keys(defaults) } }
    });
    
    const existingKeys = new Set(existing.map(e => e.key));
    console.log('📋 现有配置:', Array.from(existingKeys));

    // 插入缺失的配置
    let insertedCount = 0;
    let updatedCount = 0;
    
    for (const [key, value] of Object.entries(defaults)) {
      if (existingKeys.has(key)) {
        console.log(`⏭️  跳过已存在: ${key}`);
        continue;
      }
      
      await prisma.setting.upsert({
        where: { key },
        create: { key, value },
        update: { value }
      });
      
      insertedCount++;
      console.log(`✅ 已初始化: ${key}`);
    }

    console.log(`\n🎉 初始化完成！`);
    console.log(`   - 新增: ${insertedCount} 项`);
    console.log(`   - 跳过: ${existingKeys.size} 项`);
    
    // 验证最终结果
    const final = await prisma.setting.findMany({
      where: { key: { in: Object.keys(defaults) } }
    });
    console.log(`\n📊 数据库中现有提示词配置: ${final.length} 项`);
    
  } catch (error) {
    console.error('❌ 初始化失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

initPrompts()
  .then(() => {
    console.log('✅ 脚本执行成功');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });

