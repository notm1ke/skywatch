import { create } from "zustand";
import { persist } from "zustand/middleware";

type TrafficFlowState = {
	watchedAircraft: string[];
	toggleWatchedAircraft: (icao: string) => void;
}

export const useTrafficFlowPrefs = create<TrafficFlowState>()(
	persist(
		(set) => ({
			watchedAircraft: Array<string>(),
			toggleWatchedAircraft: (icao: string) => set(state => {
				let watchedAircraft = state.watchedAircraft;
				if (state.watchedAircraft.includes(icao)) watchedAircraft = [...state.watchedAircraft.filter(id => id !== icao)];
				else watchedAircraft = [...state.watchedAircraft, icao];
				return { ...state, watchedAircraft };
			})
		}),
		{
			name: "skywatch-traffic-flow",
			partialize: store => ({
				watchedAircraft: store.watchedAircraft,
			}),
		}
	)
);