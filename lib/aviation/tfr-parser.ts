import { load } from "cheerio";

type CoordinatePoint = {
  lat: string;
  lon: string;
}

type CircularArea = {
  name: string;                // "Area A", "Area B", etc.
  center: string;              // Full center description text
  center_lat: string;          // Parsed from "Latitude: ..."
  center_lon: string;          // Parsed from "Longitude: ..."
  radius: string;              // e.g. "32 nautical miles"
  altitude: string;            // e.g. "From the surface up to and including 17999 feet MSL"
  effective_dates: string[];   // "From ... UTC (... EST)", "To ... UTC (... EST)"
}

export type PolygonArea = {
  points: CoordinatePoint[];   // Sequence of lat/lon vertices
  altitude: string;            // Same format as CircularArea.altitude
  effective_dates: string[];   // Same format as CircularArea.effective_dates
}

export type AffectedAreas = {
  areas: Array<CircularArea | PolygonArea>;
  airspace_definition?: CoordinatePoint[]; 
  altitude?: string;
  effective_dates?: string[];
}

export type TfrTextParsed = {
	// Identifiers
	notam_id: string | null;     // e.g. "5/9747"
	notam_number?: string;       // e.g. "FDC 5/9747"

	// Core metadata (header table)
	issue_date?: string;                 // "December 16, 2025 at 1624 UTC"
	location?: string;                   // "Rocky Mount, North Carolina"
	beginning_date_and_time?: string;    // "December 20, 2025 at 0100 UTC"
	ending_date_and_time?: string;       // "December 20, 2025 at 0430 UTC"
	reason_for_notam?: string;           // "Temporary flight restrictions for VIP Movement"
	type?: string;                       // "VIP", "Hazards", "Special", etc.
	replaced_notams?: string;            // "5/9724: To update NMR in the NOTAM text"
	pilots_may_contact?: string;         // when present in header

	// Text-only NOTAM content (DC SFRA style), preserved for <pre>
	full_notam_text?: string;

	// Affected airspace
	affected_areas?: AffectedAreas;

	// Operating restrictions / requirements block (DL/DT content), preserved with newlines
	operating_restrictions?: string;

	// "Other Information" section
	artcc?: string;              // "ZDC - Washington Center"
	point_of_contact?: string;   // e.g. "SKAGIT COUNTY EOC AIR OPS"
	telephone?: string;          // e.g. "253-312-4301"
	frequency?: string;          // e.g. "126.65"
	authority?: string;          // e.g. "Title 14 CFR section 91.141"
}

export const parseTfrText = (
	htmlString: string,
	notamId: string | null = null,
): TfrTextParsed => {
	const $ = load(htmlString);
	const result: Partial<TfrTextParsed> = { notam_id: notamId };

	// Header
	$('tr[bgcolor="#1E90FF"] font[size="3"]').each((i, el) => {
		const text = $(el).text().trim();
		if (text.includes("FDC")) {
			result.notam_number = text;
		}
	});

	// Metadata Rows
	$('td[colspan="3"][align="left"] font[size="2"]').each((i, labelFont) => {
		const labelText = $(labelFont)
			.text()
			.trim()
			.replace(/[:\s]*$/, "");
		
		if (labelText) {
			const $row = $(labelFont).closest("tr");
			const $valueFont = $row
				.find("td")
				.last()
				.find('font[size="2"]')
				.first();

			const valueText = $valueFont.text().trim();
			if (valueText && !valueText.includes("blank.gif")) {
				const key = labelText.toLowerCase().replace(/\s+/g, "_");
				// @ts-expect-error catch all
				result[key] = valueText;
			}
		}
	});

	// Full Notam Text
	const $notamTextCell = $('td[colspan="3"]:has(p:contains("traditional NOTAM text"))');
	if ($notamTextCell.length) {
		let fullNotamText = "";
		$notamTextCell.find("p").each((i, p) => {
			const pText = $(p).text().trim();
			if (pText && (pText.includes("FDC") || pText.includes("PART"))) {
				fullNotamText += pText + "\n\n";
			}
		});
		fullNotamText = fullNotamText
			.replace(/2509031510-PERM END PART \d+ OF \d+\s*/g, "\nPART ")
			.trim();
		result.full_notam_text = fullNotamText;
	}

	// Affected areas
	result.affected_areas = undefined;
	const $areasSection = $('a[name="areas"]').closest("tr");
	if ($areasSection.length) {
		result.affected_areas = { areas: [] };

		let currentArea: any | null = null;

		// Find all Area headers and parse sequentially
		$areasSection.nextAll().each((i, element) => {
			const $element = $(element);
			const text = $element.text().trim();

			// New area starts with "Area A", "Area B", etc.
			if (text.match(/Area [A-Z]/)) {
				currentArea = {
					name: text.match(/Area [A-Z]/)?.at(0) ?? "",
					center: "",
					center_lat: "",
					center_lon: "",
					radius: "",
					altitude: "",
					effective_dates: [],
				};
				
				result.affected_areas!.areas.push(currentArea);
				return;
			}

			if (currentArea) {
				// Center (contains "Latitude:", "Longitude:")
				if (text.includes("Latitude:") || text.includes("Longitude:")) {
					const centerFont = $element.find("font").last();
					currentArea.center = centerFont.text().trim();

					// Extract lat/lon
					const latMatch = centerFont.text().match(/Latitude:\s*([^,]+)/);
					const lonMatch = centerFont.text().match(/Longitude:\s*([^)]+)/);
					if (latMatch) currentArea.center_lat = latMatch[1].trim();
					if (lonMatch) currentArea.center_lon = lonMatch[1].trim();
				}

				// Radius
				else if (text.includes("Radius:")) {
					const radiusFont = $element.find("font").last();
					currentArea.radius = radiusFont.text().trim();
				}

				// Altitude
				else if (text.includes("Altitude:")) {
					const altitudeFont = $element.find("font").last();
					currentArea.altitude = altitudeFont.text().trim();
				}

				// Effective dates (contains UTC)
				else if (text.includes("UTC")) {
					const dateFont = $element.find("font").text().trim();
					if (dateFont.includes("From") || dateFont.includes("To")) {
						currentArea.effective_dates.push(dateFont);
					}
				}
			}
		});

		// Fallback for polygon coordinates (older format)
		if (result.affected_areas.areas.length === 0) {
			result.affected_areas.airspace_definition = [];
			result.affected_areas.airspace_definition = $areasSection
				.nextAll()
				.find('table table tr font:contains("From:")')
				.closest("tr")
				.map((i, row) => {
					const $row = $(row);
					const lat = $row.find("td").eq(3).find("font").text().trim();
					const lon = $row.find("td").eq(4).find("font").text().trim();
					return lat && lon ? { lat, lon } : null;
				})
				.get()
				.filter(Boolean);
		}
	}

	// Operating Restrictions
	const $restrictionsSection = $('a[name="restrictions"]')
		.closest("tr")
		.nextAll("tr");
	
	if ($restrictionsSection.length) {
		let restrictionsText = "";

		// Capture general restriction text first (e.g. "No pilots may operate...")
		const $generalText = $restrictionsSection
			.find('font:contains("No pilots may operate")')
			.closest("tr");
		if ($generalText.length) {
			restrictionsText += $generalText.find("font").text().trim() + "\n\n";
		}

		// Find the DL container in restrictions section
		const $dl = $restrictionsSection.find("dl").first();
		if ($dl.length) {
			// Get DT header (e.g. "EXC AS SPECIFIED BLW...")
			const $dt = $dl.find("dt").first();
			if ($dt.length) {
				restrictionsText += $dt.text().trim() + "\n\n";
			}

			// Method 1: Check for OL/LI structure first (Mayport NOTAM style)
			const $ol = $dl.find("ol").first();
			if ($ol.length && $ol.find("li").length > 0) {
				$ol.find("li").each((i, li) => {
					restrictionsText += `${i + 1}. ${$(li).text().trim()}\n\n`;
				});
			}
			// Method 2: Multiple DT items (VIP TFR style like 5/9747)
			else if ($dl.find("dt").length > 1) {
				$dl.find("dt").each((i, dt) => {
					const dtText = $(dt).text().trim();
					if (dtText && !dtText.includes("EXC AS SPECIFIED")) {
						// Skip main header
						restrictionsText += `${String.fromCharCode(65 + i)}. ${dtText}\n\n`;
					}
				});
			}
			// Method 3: Fallback - extract all LI or preserve original structure
			else {
				const $lis = $dl.find("li");
				if ($lis.length > 0) {
					$lis.each((i, li) => {
						restrictionsText += `${i + 1}. ${$(li).text().trim()}\n\n`;
					});
				} else {
					// Preserve original text structure with cleaned newlines
					const fullText = $dl
						.html()
						?.replace(/<br\s*\/?>/gi, "\n")
						.replace(/<\/?(font|span|b|i|u)[^>]*>/gi, "")
						.replace(/<[^>]+>/g, " ")
						.replace(/\s+/g, " ")
						.trim() ?? "";
					
					restrictionsText += fullText.replace(/\. /g, ".\n\n");
				}
			}
		}

		if (restrictionsText.trim()) {
			result.operating_restrictions = restrictionsText.trim();
		}
	}

	// Other Info Section
	$('a[name="other"]')
		.closest("tr")
		.nextAll("tr")
		.each((i, row) => {
			const $row = $(row);
			const $labelCell = $row.find('td[colspan="2"] font[size="2"]');

			if ($labelCell.length) {
				const labelText = $labelCell
					.text()
					.trim()
					.replace(/[:\s]*$/, "");
				const $valueCell = $row.find("td").last();
				const valueText = $valueCell.text().trim();

				if (labelText && valueText && !valueText.includes("blank.gif")) {
					const key = labelText.toLowerCase().replace(/\s+/g, "_");
					// @ts-expect-error catch all
					result[key] = valueText;
				}
			}
		});

	return result as TfrTextParsed;
};