import { Metadata } from "next";
import { TfrsTab } from "~/components/tfr";

export const metadata: Metadata = {
	description: "Monitoring temporary flight restrictions across the US airspace system.",
};

export default async function TfrsPage() {
	return <TfrsTab />
}