export type CommonAirlineType = typeof CommonAirlines[number];

const CommonAirlines = [
	"AAL", "SWA", "DAL", "UAL", "FDX", "ASA", "JBU", "UPS", "NKS",
	"FFT", "AAY", "HAL", "BAW", "DLH", "UAE", "QTR", "ACA", "AFR",
	"KLM", "ANA", "THY", "CPA", "SIA", "EVA", "ETH"
] as const;

// todo