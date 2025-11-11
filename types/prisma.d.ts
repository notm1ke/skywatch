declare global {
	namespace PrismaJson {
		type TrafficFlowCounts = {
			type: string;
			name: string;
			count: number;
		}[];
		
		type TrafficFlowFlights = {
			acid: string;
			type: string;
			origin: string;
			destination: string;
			etd: string;
			ete: string;
			departureCenter: string;
			majorAirline: string;
		}[];
	}
}

export {};
