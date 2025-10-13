const fs = require('fs');
const path = require('path');

const envContent = `# 数据库配置（MySQL）
DATABASE_URL="mysql://root:root@localhost:3306/short_video_copywriting"

# JWT 配置
JWT_SECRET="your-secret-key-change-this-in-production-2024"
JWT_EXPIRES_IN="7d"

# 服务配置
PORT=3002
NODE_ENV=development

# OpenAI 配置 (可选，如果没有可以在前端系统设置中配置)
OPENAI_API_KEY=""
OPENAI_BASE_URL="https://api.openai.com/v1"
OPENAI_MODEL="gpt-3.5-turbo"
`;

const envPath = path.join(__dirname, '.env');
fs.writeFileSync(envPath, envContent, 'utf8');
console.log('✅ .env file created successfully at:', envPath);
console.log('\n请根据您的实际情况修改以下配置：');
console.log('1. DATABASE_URL - 数据库连接字符串');
console.log('2. JWT_SECRET - JWT密钥（生产环境请修改）');
console.log('3. OPENAI_API_KEY - OpenAI API密钥（可选）');







