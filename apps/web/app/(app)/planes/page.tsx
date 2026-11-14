import { Metadata } from "next";
import { PlanesTab } from "~/components/planes";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
export const metadata: Metadata = {
	title: "Planes",
	description: "Explore all planes registered in the United States.",
};

export default async function PlanesPage() {
	return <PlanesTab />
}