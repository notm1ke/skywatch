"use client";

import React from "react";

import { unwrap } from "~/lib/actions";
import { AirportWithJoins, fetchAirports } from "~/lib/airports";

import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState
} from "react";

interface AirportContextType {
	airports: AirportWithJoins[];
	loading: boolean;
	error: Error | null;
}

const AirportContext = createContext<AirportContextType | undefined>(undefined);

export const AirportProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [airports, setAirports] = useState<AirportWithJoins[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		fetchAirports()
			.then(unwrap)
			.then(res => {
				setAirports(res);
				setError(null);
			})
			.catch(err => setError(err as Error))
			.finally(() => setLoading(false));
	}, []);

	const value = useMemo(
		() => ({
			airports,
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