"use client";

import { orpc } from "~/lib/gateway";
import { useQuery } from "@tanstack/react-query";
import { AirportWithJoins } from "@skywatch/gateway/schemas";

import {
	createContext,
	useContext,
	useMemo
} from "react";

interface AirportContextType {
	airports: AirportWithJoins[];
	loading: boolean;
	error: Error | null;
}

const AirportContext = createContext<AirportContextType | undefined>(undefined);

export const AirportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const { data: airports, isLoading: loading, error } = useQuery(orpc.airports.findAll.queryOptions({
		queryKey: ['airports']
	}));

	const value = useMemo(
		() => ({
			airports: airports ?? [],
			loading,
			error,
		}),
		[airports, loading, error],
	);

	return (
		<AirportContext.Provider value={value}>
			{children}
		</AirportContext.Provider>
	);
};

export const useAirports = (): AirportContextType => {
	const context = useContext(AirportContext);
	if (context === undefined) {
		throw new Error("useAirports must be used within an AirportProvider");
	}
	
	return context;
};