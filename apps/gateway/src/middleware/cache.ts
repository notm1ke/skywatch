import { z } from "zod/v4";
import { os } from "@orpc/server";
import { Duration } from "effect";
import { safeJsonParse } from "@/utils";
import { redis } from "@/services/redis";

type CacheKeyGenerator<TInput> = (input: TInput) => string;

type UseCache<TInput> = (input: TInput) => boolean;

export const cache = <TInput extends Record<string, any>, TOutput>(
	key: CacheKeyGenerator<TInput> | string,
	ttl: Duration.DurationInput,
	schema: z.ZodType<TOutput>,
	enableFn: UseCache<TInput> = () => true
) => os.middleware(async ({ next }, input, output) => {
	if (!enableFn(input as TInput)) {
		const result = await next(input as TInput);
		return output(result.output as TOutput);
	}
	
	const cacheKey = typeof key === "string" ? key : key(input as TInput);
	const cached = await redis.get(cacheKey);
	if (cached) {
		const parsed = schema.safeParse(safeJsonParse(cached));
		if (parsed.success) return output(parsed.data as TOutput);
	}

	const result = await next(input as TInput);
	redis.set(
		cacheKey,
		JSON.stringify(result.output),
		'EX', Duration
			.decode(ttl)
			.pipe(Duration.toSeconds)
	);

	return output(result.output as TOutput);
});
