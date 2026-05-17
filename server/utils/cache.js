const redisClient = require('../config/redis');

const isReady = () => redisClient?.isReady;

const cacheGet = async (key) => {
  try {
    if (!isReady()) return null;
    const cached = await redisClient.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn(`Cache read skipped for ${key}:`, error.message);
    return null;
  }
};

const cacheSet = async (key, value, seconds = 300) => {
  try {
    if (!isReady()) return;
    await redisClient.set(key, JSON.stringify(value), { EX: seconds });
  } catch (error) {
    console.warn(`Cache write skipped for ${key}:`, error.message);
  }
};

const cacheDel = async (...keys) => {
  try {
    if (!isReady() || keys.length === 0) return;
    await redisClient.del(keys);
  } catch (error) {
    console.warn(`Cache delete skipped for ${keys.join(', ')}:`, error.message);
  }
};

module.exports = {
  cacheGet,
  cacheSet,
  cacheDel,
};
