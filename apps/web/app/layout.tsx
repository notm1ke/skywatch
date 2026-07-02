import { cn } from "cnfast";
import type { Metadata } from "next";
import { Toaster } from "~/components/ui/sonner";
import { Geist, Geist_Mono } from "next/font/google";
import { OpenPanelComponent } from "@openpanel/nextjs";
import { TooltipProvider } from "~/components/ui/tooltip";
import { QueryProvider } from "~/components/query-provider";
import { MobileProvider } from "~/components/mobile-provider";
import { ThemeProvider } from "~/components/ui/theme-provider";

import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Skywatch",
	description: "United States Airspace Monitoring",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={cn(
					"antialiased overscroll-none",
					geistSans.variable,
					geistMono.variable
				)}
			>
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<MobileProvider>
						<QueryProvider>
							<TooltipProvider>
								{children}
								<Toaster />
							</TooltipProvider>
						</QueryProvider>
						<OpenPanelComponent
							apiUrl={process.env.NEXT_PUBLIC_OPENPANEL_API_URL!}
							cdnUrl={process.env.NEXT_PUBLIC_OPENPANEL_CDN_URL!}
							clientId={process.env.NEXT_PUBLIC_OPENPANEL_CLIENT_ID!}
							disabled={!process.env.NEXT_PUBLIC_OPENPANEL_ENABLED}
							trackScreenViews
							trackOutgoingLinks
							trackAttributes
						/>
					</MobileProvider>
				</ThemeProvider>
			</body>
		</html>
	);
}
