"use client";

import React from "react";

import { toast } from "sonner";
import { useCallback } from "react";
import { unwrap } from "~/lib/actions";
import { AirportAdvisory, fetchAirspaceStatus, fetchCompositeAirspaceData, PlannedAirportEvent } from "~/lib/faa";

import {
	createContext,
	useContext,
	useEffect,
	useMemo,
	useState
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
	const [advisories, setAdvisories] = useState<AirportAdvisory[]>([]);
	const [planned, setPlanned] = useState<PlannedAirportEvent[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<Error | null>(null);

	const refresh = useCallback(() => {
		setLoading(true);
		fetchCompositeAirspaceData()
			.then(unwrap)
			.then(res => {
				setAdvisories(res.status!);
				setPlanned(res.planned!);
				setError(null);
			})
			.catch(err => {
				setError(err);
				toast('Error fetching airspace status', {
					description: err.message,
					action: {
						label: "Retry",
						onClick: refresh
					}
				});
			})
			.finally(() => setLoading(false));
	}, []);
	
	useEffect(() => {
		refresh();
	}, []);

	const value = useMemo(
		() => ({
			advisories,
			planned,
			loading,
			error,
			refresh,
		}),
		[advisories, planned, loading, error, refresh],
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