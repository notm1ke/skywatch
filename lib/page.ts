import { create } from "zustand";

export type TabType =
	| "airspace"
	| "airports";

type PageControlState = {
	activeTab: TabType;
	setActiveTab: (tab: TabType) => void;
}

export const usePageControls = create<PageControlState>((set) => ({
	activeTab: "airspace",
	setActiveTab: (tab) => set({ activeTab: tab })
}));
