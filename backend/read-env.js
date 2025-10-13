const fs = require('fs');
const path = require('path');

try {
  const envPath = path.join(__dirname, '.env');
  const content = fs.readFileSync(envPath, 'utf8');
  console.log('=== .env 文件内容 ===');
  console.log(content);
  console.log('=== 文件读取成功 ===');
} catch (error) {
  console.error('读取失败:', error.message);
}







