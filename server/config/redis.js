const redis = require('redis');

// Create Redis client using environment variable or fallback to localhost
const client = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379', // Example: redis://:password@host:6379
});

// Handle connection errors
client.on('error', (err) => {
  console.error('Redis Client Error:', err);
});

// Async function to connect Redis and log success
(async () => {
  try {
    await client.connect();
    console.log('✅ Connected to Redis');
  } catch (err) {
    console.error('❌ Redis connection failed:', err);
  }
})();

// Export the client
module.exports = client;
