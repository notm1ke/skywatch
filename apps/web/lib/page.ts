import { create } from "zustand";

export type TabType =
	| "airspaces"
	| "airplanes"
	| "airports"
	| "routing"
	| "statistics"
	| "tfrs"
	| "waypoints";

type PageControlState = {
	activeTab: TabType;
	setActiveTab: (tab: TabType) => void;
}

export const usePageControls = create<PageControlState>((set) => ({
	activeTab: "airspaces",
	setActiveTab: (tab) => set({ activeTab: tab })
}));
