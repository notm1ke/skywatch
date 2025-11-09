import { AirportProvider } from "~/components/airport-provider";
import { AirspaceProvider } from "~/components/airspace/provider";
import { Header } from "~/components/header";

const showDevTitle = process.env.NODE_ENV === 'development';

export const metadata = {
	title: {
		default: `Skywatch ${showDevTitle ? '(Dev)' : ''}`,
		template: "Skywatch | %s",
	},
	description: "There is no description for this page.",
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