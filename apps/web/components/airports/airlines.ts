export const AIRLINES = {
	UA: { name: "United", logo: "/airlines/ua.svg" },
	DL: { name: "Delta", logo: "/airlines/dl.svg" },
	AA: { name: "American", logo: "/airlines/aa.svg" },
	B6: { name: "JetBlue", logo: "/airlines/b6.png" },
	WN: { name: "Southwest", logo: "/airlines/wn.svg" },
	AS: { name: "Alaska", logo: "/airlines/as.svg" },
	MX: { name: "Breeze", logo: "/airlines/mx.svg" },
	XP: { name: "Avelo", logo: "/airlines/xp.svg" },
	G4: { name: "Allegiant", logo: "/airlines/g4.svg" },
	F9: { name: "Frontier", logo: "/airlines/f9.svg" },
} as const;

export type AirlineCode = keyof typeof AIRLINES;
