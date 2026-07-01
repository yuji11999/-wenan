const axios = require('axios');

async function testLogin() {
  try {
    const username = process.env.ADMIN_USERNAME || 'admin';
    const password = process.env.ADMIN_PASSWORD;

    if (!password) {
      throw new Error('ADMIN_PASSWORD is required for login testing.');
    }

    console.log(`Testing login with ${username}...\n`);
    
    const response = await axios.post('http://localhost:3002/auth/login', {
      username,
      password
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Login successful!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Login failed!');
    
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Error:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('No response received from server');
      console.log('Error:', error.message);
    } else {
      console.log('Error:', error.message);
    }
  }
}

testLogin();

