import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next"; 

const nextConfig: NextConfig = {
	logging: {
		fetches: {
			fullUrl: true
		}
	}
};

export default withWorkflow(nextConfig);
