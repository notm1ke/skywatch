import { z, ZodType } from "zod/v4";

export const GeoJson = <Props extends ZodType>(props: Props) => z.object({
	type: z.literal("FeatureCollection"),
	features: z.array(z.object({
		type: z.literal("Feature"),
		id: z.string().optional(),
		properties: props,
		geometry_name: z.string().optional(),
		geometry: z.object({
			type: z.enum([
				"Point",
				"Polygon"
			]),
			coordinates: z.union([
				z.array(z.number()).length(2),
				z.array(z.array(z.array(z.number()).length(2)))
			])
		})
	}))
});
