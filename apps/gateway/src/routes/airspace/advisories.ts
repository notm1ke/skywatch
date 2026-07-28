import axios from "axios";
import moment from "moment-timezone";

import { z } from "zod/v4";
import { load } from "cheerio";
import { ORPCError } from "@orpc/client";
import { cache } from "@/middleware/cache";
import { base, iataInput, airspaceInput } from "@/utils";
import { AirspaceAdvisory, Airspaces } from "@/schemas";
import { injectAirportByIata } from "@/middleware/airport-by-iata";

const AirspaceAdvisories = z.array(AirspaceAdvisory);
const advisoryTableSelector = ".mainArea > table > tbody > tr > td > table > tbody > tr";

const all = base
	.input(airspaceInput)
	.use(cache(
		input => `__airspace:advisories:${input.airspace ?? "any"}`,
		"5 minutes",
		AirspaceAdvisories,
	))
	.handler(async ({ input: { airspace } }) => {
		const fresh = await fetchAdvisories();
		if (!airspace) return fresh;
		return fresh.filter(adv => adv.facilities.includes(airspace));
	})
	.callable();

const fetchAdvisories = async () => await axios
	.get(createAdvisoriesUrl())
	.then(res => res.data)
	.then(load)
	.then($ => ({ $, rows: $(advisoryTableSelector).slice(2, -2) }))
	.then(({ $, rows }) => rows
		.map((_i, element) => {
			const $row = $(element);
			const $cells = $row.find('td');
			const row = {
				advisoryUrl: "https://www.fly.faa.gov" + $cells.eq(0).find("a").attr("href"),
				advisoryNumber: parseInt($cells.eq(0).text().trim()),
				facilities: $cells.eq(1).text().trim().split("/"),
				date: $cells.eq(2).text().trim(),
				brief: $cells.eq(3).text().trim(),
				createdAt: moment($cells.eq(4).text().trim(), "MM/DD/YYYY hh:mm").format("MMM Do, YYYY [at] h:mm A")
			};
				
			const parsed = AirspaceAdvisory.safeParse(row);
			return parsed.success ? parsed.data : null;
		})
		.filter(Boolean)
		.toArray() as z.infer<typeof AirspaceAdvisories>
	).catch(() => {
		throw new ORPCError("UPSTREAM_ERROR");
	});

const createAdvisoriesUrl = () => {
	const date = moment().format('yyyy-MM-DD');
	const url = new URL("https://www.fly.faa.gov/adv/adv_list");
	url.searchParams.append('whichAdvisories', 'ATCSCC');
	url.searchParams.append('advisoryCategory', 'All');
	url.searchParams.append('date', date);
	url.searchParams.append('airflow', 'true');
	url.searchParams.append('_airflow', 'on');
	url.searchParams.append('ctop', 'true');
	url.searchParams.append('_ctop', 'on');
	url.searchParams.append('gStop', 'true');
	url.searchParams.append('_gStop', 'on');
	url.searchParams.append('gDelay', 'true');
	url.searchParams.append('_gDelay', 'on');
	url.searchParams.append('route', 'true');
	url.searchParams.append('_route', 'on');
	url.searchParams.append('other', 'true');
	url.searchParams.append('_other', 'on');
	return url.toString();
}

const advisoryDetailsInput = z.object({
	advisoryNumber: z.number()
});

const details = base
	.input(advisoryDetailsInput)
	.use(cache<
		z.infer<typeof advisoryDetailsInput>,
		string
	>(
		({ advisoryNumber }) => `__airspace:advisories:${advisoryNumber}`,
		"2 minutes",
		z.string()
	))
	.handler(async ({ input: { advisoryNumber } }) => await axios
		.get(createAdvisoryDetailsUrl(advisoryNumber))
		.then(res => res.data)
		.then(load)
		.then($ => $(".val > pre").text())
		.catch(() => {
			throw new ORPCError("UPSTREAM_ERROR");
		})
	);

const createAdvisoryDetailsUrl = (advisoryNumber: number) => {
	const date = moment().format('MMDDyyyy');
	const url = new URL("https://www.fly.faa.gov/adv/adv_otherdis");
	
	url.searchParams.set("adv_date", date);
	url.searchParams.set("advn", advisoryNumber.toString());
	return url.toString();
}

const airportRelated = base
	.input(iataInput)
	.use(injectAirportByIata())
	.handler(async ({ context: { airport } }) => {
		const advisories = await all({});
		if (!advisories) return [];
		return advisories.filter(advisory => advisory.facilities.includes(airport.iata_code) || advisory.facilities.includes(airport.artcc));
	})

export const advisories = {
	all, airportRelated, details
}