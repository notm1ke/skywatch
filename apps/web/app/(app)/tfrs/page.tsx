import { Metadata } from "next";
import { TfrsTab } from "~/components/tfr";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
export const metadata: Metadata = {
	title: "TFRs",
	description: "Monitoring temporary flight restrictions across the US airspace system.",
};

export default async function TfrsPage() {
	return <TfrsTab />
}