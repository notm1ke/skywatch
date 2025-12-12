import { Metadata, Viewport } from "next";
import { Header } from "~/components/header";
import { AirportProvider } from "~/components/airport-provider";
import { AirspaceProvider } from "~/components/airspace/provider";

const showDevTitle = process.env.NODE_ENV === 'development';

export const metadata: Metadata = {
	title: {
		default: `Skywatch ${showDevTitle ? '(Dev)' : ''}`,
		template: "Skywatch | %s",
	},
	description: "There is no description for this page.",
	applicationName: "Skywatch",
};

export const viewport: Viewport = {
	width: 'device-width',
	initialScale: 1,
	maximumScale: 1
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
	return (
		<AirportProvider>
			<AirspaceProvider>
				<div className="max-w-[1700px] mx-auto border">
					<Header />
					<main>{children}</main>
				</div>
			</AirspaceProvider>
		</AirportProvider>
	);
}