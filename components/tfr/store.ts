import { create } from "zustand/react";
import { Tfr } from "~/lib/aviation/tfr";

type TfrInteractivityStore = {
	active: Tfr | null;
	clickRow: (active: Tfr | null) => void;
	close: () => void;
};

export const useTfrInteractivity = create<TfrInteractivityStore>((set) => ({
	active: null,
	clickRow: (active: Tfr | null) => set({ active }),
	close: () => set({ active: null }),
}));