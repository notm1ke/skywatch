"use client";

import React from "react";

import { orpc } from "~/lib/gateway";
import { useQuery } from "@tanstack/react-query";
import { AirportAdvisory, PlannedAirportEvent } from "~/lib/schemas";

import {
	createContext,
	useContext,
	useMemo,
} from "react";

interface AirspaceContextType {
	advisories: AirportAdvisory[];
	planned: PlannedAirportEvent[];
	loading: boolean;
	error: Error | null;
	refresh: () => void;
}

const AirspaceContext = createContext<AirspaceContextType | undefined>(undefined);

export const AirspaceProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const { data, isLoading: loading, error, refetch: refresh } = useQuery(orpc.airspace.advisories.all.queryOptions());
	const value = useMemo(
		() => ({
			advisories: data?.active ?? [],
			planned: data?.planned ?? [],
			loading,
			error,
			refresh,
		}),
		[data, loading, error, refresh],
	);

	return (
		<AirspaceContext.Provider value={value}>
			{children}
		</AirspaceContext.Provider>
	);
};

export const useAirspace = (): AirspaceContextType => {
	const context = useContext(AirspaceContext);
	if (context === undefined) {
		throw new Error("useAirspace must be used within an AirspaceProvider");
	}
	return context;
};