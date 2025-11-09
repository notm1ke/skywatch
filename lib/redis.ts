import { RedisClient } from "bun";

const globalForRedis = global as unknown as {
	redis: RedisClient
};

export const redis = globalForRedis.redis || new RedisClient(process.env.REDIS_URL!);

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;