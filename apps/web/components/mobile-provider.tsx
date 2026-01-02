"use client";

import {
	createContext,
	useContext,
	useEffect,
	useState
} from "react";

interface MobileContextType {
	mobile?: boolean;
	pending: boolean;
}

const MOBILE_BREAKPOINT = 768;

const MobileContext = createContext<MobileContextType | undefined>(undefined);

export const MobileProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const [mobile, setMobile] = useState<boolean | undefined>(
		undefined,
	);

	useEffect(() => {
		const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
		const onChange = () => setMobile(window.innerWidth < MOBILE_BREAKPOINT);
		mql.addEventListener("change", onChange);
		setMobile(window.innerWidth < MOBILE_BREAKPOINT);

		return () => mql.removeEventListener("change", onChange);
	}, []);

	return (
		<MobileContext.Provider value={{ mobile, pending: mobile === undefined }}>
			{children}
		</MobileContext.Provider>
	);
};

export const useMobile = (): MobileContextType => {
	const context = useContext(MobileContext);
	if (context === undefined) {
		throw new Error("useMobile must be used within an MobileProvider");
	}
	return context;
};