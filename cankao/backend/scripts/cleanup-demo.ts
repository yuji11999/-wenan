import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const userId = process.env.CLEAN_USER_ID // 可选：仅清理某个用户的数据

  console.log('=== 清理演示数据开始 ===')

  // 删除与文案相关的关系和分析
  if (userId) {
    const copyIds = (await prisma.copywriting.findMany({ where: { userId }, select: { id: true } })).map(c => c.id)
    await prisma.copywritingRelation.deleteMany({ where: { OR: [{ parentId: { in: copyIds } }, { childId: { in: copyIds } }] } })
    await prisma.copywritingAnalysis.deleteMany({ where: { copywritingId: { in: copyIds } } })
    await prisma.copywriting.deleteMany({ where: { id: { in: copyIds } } })
  } else {
    await prisma.copywritingRelation.deleteMany({})
    await prisma.copywritingAnalysis.deleteMany({})
    await prisma.copywriting.deleteMany({})
  }

  // 其他可能的演示数据表
  await prisma.material.deleteMany({})
  await prisma.trending.deleteMany({})

  console.log('✓ 清理完成')
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })




