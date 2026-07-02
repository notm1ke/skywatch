import { Duration } from "effect";

export class RateLimiter {
	private lastRequest = 0;
	private throttle: number;
	private queue: Promise<void> = Promise.resolve();
	
	constructor(throttle: Duration.DurationInput) {
		this.throttle = Duration
			.decode(throttle)
			.pipe(Duration.toMillis);
	}
	
	async submit<T>(task: () => Promise<T>): Promise<T> {
		this.queue = this.queue.then(async () => {
			const now = Date.now();
			const delta = now - this.lastRequest;
			const remaining = Math.max(0, this.throttle - delta);
			if (remaining > 0) await new Promise(
				resolve => setTimeout(resolve, remaining)
			);
			
			this.lastRequest = Date.now();
		});
		
		await this.queue;
		return task();
	}
}