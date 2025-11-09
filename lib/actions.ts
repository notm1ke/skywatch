type BaseResponse = {
	success: boolean;
}

type ActionSuccessResponse<T> = BaseResponse & {
	data: T;
}

type ActionErrorResponse = BaseResponse & {
	message: string;
}

type ActionResponse<T> = ActionSuccessResponse<T> | ActionErrorResponse;

type Awaitable<T> = Awaited<T> | AwaitedError;

type AwaitedError = {
	status: string;
	cause: Error;
	message: string;
}

export const raise = (message: string) => ({
	message, success: false
});

export const ok = <T>(data: T) => ({
	data, success: true
});

export const okAsync = async <T, Err = Error>(
	promise: Promise<T>,
	except?: (cause: Err) => string
) => {
	console.time('okAsync');
	const awaited: Awaitable<T> = await promise.catch(err => ({
		status: "ERR_IN_PROMISE",
		cause: err,
		message: except
			? except(err)
			: err.message
	}));
	
	console.timeEnd('okAsync');
	if (isAwaitableErrored(awaited)) return raise(awaited.message);
	return { data: awaited, success: true };
}

const isAwaitableErrored = <T>(promise: Awaitable<T>): promise is AwaitedError => {
	return typeof promise === 'object'
		&& promise !== null
		&& 'status' in promise
		&& typeof promise.status === 'string'
		&& promise.status.startsWith('ERR_');
}

const isErrorResponse = <T>(response: ActionResponse<T>): response is ActionErrorResponse => {
	return !response.success || 'message' in response;
}

export const unwrap = <T>(response: ActionResponse<T>) => {
	if (isErrorResponse(response)) throw new Error(
		response.message || 'Unknown error'
	);
	
	return response.data;
}