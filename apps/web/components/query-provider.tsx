"use client";

import { ReactNode, useState } from "react";
import { StandardRPCJsonSerializer } from "@orpc/client/standard";
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const serializer = new StandardRPCJsonSerializer();

export function QueryProvider({ children }: { children: ReactNode }) {
	const [queryClient] = useState(() => new QueryClient({
		defaultOptions: {
			queries: {
				refetchOnWindowFocus: false,
				staleTime: 60 * 1000,
				queryKeyHashFn(queryKey) {
					const [json, meta] = serializer.serialize(queryKey)
					return JSON.stringify({ json, meta })
				},
			},
			dehydrate: {
				serializeData(data) {
					const [json, meta] = serializer.serialize(data)
					return { json, meta }
				}
			},
			hydrate: {
				deserializeData(data) {
					return serializer.deserialize(data.json, data.meta)
				}
			},
		}
	}));

	return (
		<QueryClientProvider client={queryClient}>
			{children}
			{process.env.NODE_ENV === 'development' && (
				<ReactQueryDevtools initialIsOpen={false} />
			)}
		</QueryClientProvider>
	);
}
