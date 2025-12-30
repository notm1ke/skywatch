import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	logging: {
		fetches: {
			fullUrl: true
		}
	},
	transpilePackages: ["@skywatch/gateway"]
};

export default nextConfig;
