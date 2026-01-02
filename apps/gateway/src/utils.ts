import { z } from "zod/v4";
import { os } from "@orpc/server";

export const base = os.errors({
	UPSTREAM_ERROR: {},
	NO_DATA_ERROR: {}
});

export const iataInput = z.object({
	iata_code: z.string().min(3).max(3).toUpperCase()
});

export const corsOrigin = (origin: string | undefined) => {
	if (process.env.NODE_ENV === 'development') {
		return '*';
	}

	if (!origin) return '';
	const originObj = new URL(origin)
	const host = originObj.host.toLowerCase()
	if (host === 'skies.now' || host.endsWith('.skies.now')) {
		return originObj.origin;
	}

	return '';
}

export const formatFaaTime = (raw: string) => {
	if (!raw) return 'Today';
	const hour = (parseInt(raw.slice(0, 2)) % 12)
	return (hour === 0 ? '12' : hour.toString().padStart(2, '0')) + ':' + raw.slice(2) + ' ' + (raw < '1200' ? 'am' : 'pm');
}

export const capitalizeFirst = (input: string) =>
	input
		.split(' ')
		.map(word => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ');

export const padZero = (input: string) => {
	if (!/^[0-9]+$/g.test(input)) return input;

	const int = parseInt(input);
	if (isNaN(int)) return input;
	if (int < 10) return `0${int}`;

	return int.toString();
}
