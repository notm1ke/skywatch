"use client";

import { cn } from "cnfast";
import { useId } from "react";

interface RssPulseIconProps {
	className?: string;
	accentColor?: string;
	duration?: number;
}

export const RssPulseIcon: React.FC<RssPulseIconProps> = ({
	className,
	accentColor = "#f97316",
	duration = 3,
}) => {
	const uid = useId().replace(/[^a-zA-Z0-9]/g, "");

	return (
		<>
			<style>{`
				@keyframes ${uid}dot {
					0%, 3%   { stroke: currentColor; fill: currentColor; }
					8%       { stroke: ${accentColor}; fill: ${accentColor}; }
					16%      { stroke: ${accentColor}; fill: ${accentColor}; }
					23%      { stroke: currentColor; fill: currentColor; }
					100%     { stroke: currentColor; fill: currentColor; }
				}
				@keyframes ${uid}arc1 {
					0%, 11%  { stroke: currentColor; }
					16%      { stroke: ${accentColor}; }
					24%      { stroke: ${accentColor}; }
					31%      { stroke: currentColor; }
					100%     { stroke: currentColor; }
				}
				@keyframes ${uid}arc2 {
					0%, 21%  { stroke: currentColor; }
					26%      { stroke: ${accentColor}; }
					34%      { stroke: ${accentColor}; }
					43%      { stroke: currentColor; }
					100%     { stroke: currentColor; }
				}
			`}</style>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="24"
				height="24"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				className={cn(className)}
			>
				<circle
					cx="5"
					cy="19"
					r="1"
					fill="currentColor"
					style={{ animation: `${uid}dot ${duration}s linear infinite` }}
				/>
				<path
					d="M4 11a9 9 0 0 1 9 9"
					style={{ animation: `${uid}arc1 ${duration}s linear infinite` }}
				/>
				<path
					d="M4 4a16 16 0 0 1 16 16"
					style={{ animation: `${uid}arc2 ${duration}s linear infinite` }}
				/>
			</svg>
		</>
	);
};
