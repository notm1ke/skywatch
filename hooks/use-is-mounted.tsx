import { useEffect, useRef, useState } from "react";

export const useIsMounted = () => {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
		return () => setMounted(false);
	}, []);

	return mounted;
};
