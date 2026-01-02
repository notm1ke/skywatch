import { Badge } from "./ui/badge";
import { orpc } from "~/lib/gateway";
import { getUrlDomain } from "~/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { CircleCheck, CircleX, Link, Loader } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

const GatewayStatus: React.FC = () => {
	const { data, isLoading, error } = useQuery(orpc.health.queryOptions({
		staleTime: 30000,
	}));
	
	return (
		<div className="flex flex-row justify-between w-52">
			<div className="font-semibold">Gateway</div>
			<div className="flex flex-row items-center gap-1.5">
				{getUrlDomain(process.env.NEXT_PUBLIC_GATEWAY_URL!)}
				{isLoading && <Loader className="size-3.5 animate-spin" />}
				{!isLoading && error && <CircleX className="size-3.5 fill-red-400" />}
				{!error && data?.status === "ok" && <CircleCheck className="size-3.5 fill-green-400" />}
			</div>
		</div>
	)
}

export const HeaderEnvBadge: React.FC = () => {
	const env = process.env.NEXT_PUBLIC_VERCEL_TARGET_ENV ?? process.env.NEXT_PUBLIC_VERCEL_ENV;
	const repoUrl = `https://github.com/${process.env.NEXT_PUBLIC_VERCEL_GIT_REPO_OWNER}/${process.env.NEXT_PUBLIC_VERCEL_GIT_REPO_SLUG}`;
	
	if (env === "development") return (
		<Badge variant="destructive">DEV</Badge>
	);
	
	if (env === "preview") return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Badge variant="blue">PREVIEW</Badge>
			</TooltipTrigger>
			<TooltipContent side="bottom">
				<div className="font-mono tracking-tighter flex flex-col space-y-2">
					<GatewayStatus />
					
					<div className="flex flex-row justify-between">
						<div className="font-semibold">Analytics</div>
						<div className="flex flex-row gap-1.5 items-center">
							{getUrlDomain(process.env.NEXT_PUBLIC_OPENPANEL_API_URL!)}
							{process.env.NEXT_PUBLIC_OPENPANEL_ENABLED === "true"
								? <CircleCheck className="size-3.5 fill-green-400" />
								: <CircleX className="size-3.5 fill-red-400" />}
						</div>
					</div>
				
					<div className="flex flex-row justify-between">
						<div className="font-semibold">Environment</div>
						<div>{process.env.NEXT_PUBLIC_VERCEL_TARGET_ENV ?? process.env.NEXT_PUBLIC_VERCEL_ENV}</div>
					</div>
					
					{process.env.NEXT_PUBLIC_VERCEL_AUTHOR_NAME && (
						<div className="flex flex-row justify-between">
							<div className="font-semibold">Author</div>
							<div>{process.env.NEXT_PUBLIC_VERCEL_AUTHOR_NAME}</div>
						</div>
					)}
					
					{process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF && (
						<div className="flex flex-row justify-between">
							<div className="font-semibold">Branch</div>
							<div className="flex flex-row space-x-2">
								<a
									href={`${repoUrl}/tree/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF}`}
									target="_blank"
									rel="noopener noreferrer"
									className="text-blue-400 flex gap-2"
								>
									{process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF}
									<Link className="size-3.5 text-blue-400" />
								</a>
							</div>
						</div>
					)}
					
					{process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA && (
						<div className="flex flex-row justify-between">
							<div className="font-semibold">Commit</div>
							<div>
								<a
									href={`${repoUrl}/commit/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA}`}
									target="_blank"
									rel="noopener noreferrer"
									className="text-blue-400 flex gap-2"
								>
									{process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 7)}
									<Link className="size-3.5 text-blue-400" />
								</a>
							</div>
						</div>
					)}
					
					{process.env.NEXT_PUBLIC_VERCEL_GIT_PULL_REQUEST_ID && (
						<div className="flex flex-row justify-between">
							<div className="font-semibold">Pull Request</div>
							<div className="flex flex-row space-x-2">
								<a
									href={`${repoUrl}/pull/${process.env.NEXT_PUBLIC_VERCEL_GIT_PULL_REQUEST_ID}`}
									target="_blank"
									rel="noopener noreferrer"
									className="text-blue-400 flex gap-2"
								>
									#{process.env.NEXT_PUBLIC_VERCEL_GIT_PULL_REQUEST_ID}
									<Link className="size-3.5 text-blue-400" />
								</a>
							</div>
						</div>
					)}
				</div>
			</TooltipContent>
		</Tooltip>
	)
	
	return null;
}