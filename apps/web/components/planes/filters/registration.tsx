import { cn } from "cnfast";
import { Loader, Search } from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { Kbd } from "~/components/ui/kbd";
import { useKeyHandler } from "~/hooks/use-key-handler";

type RegistrationSearchProps = {
	value: string;
	onChange: (value: string) => void;
	loading?: boolean;
	className?: string;
	inputClassName?: string;
};

export const RegistrationSearch: React.FC<RegistrationSearchProps> = ({ value, onChange, loading = false, className, inputClassName }) => {
	const inputRef = useRef<HTMLInputElement>(null);
	const [focused, setFocused] = useState(false);

	useKeyHandler({
		"Slash": () => {
			if (!focused) {
				inputRef.current?.focus();
			}
		},
		"Escape": () => {
			if (focused) {
				inputRef.current?.blur();
			}
		},
	});

	return (
		<div className={cn("flex items-center relative font-mono tracking-tight text-sm w-72 h-full grow", className)}>
			<div className="flex sm:hidden absolute left-4 top-0 bottom-0 items-center justify-center pointer-events-none">
				<Search className="size-3.5 text-muted-foreground" />
			</div>
			<input
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				placeholder="Search by registration"
				className={cn("w-full h-full pl-10 sm:pl-4 pr-10 peer/input", inputClassName)}
				ref={inputRef}
			/>

			{loading && (
				<motion.div
					className="absolute right-2 flex items-center justify-center pointer-events-none"
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.2 }}
				>
					<Loader className="size-4 animate-spin duration-200" />
				</motion.div>
			)}
			
			{!loading && (
				<>
					<div className="hidden sm:flex absolute right-2 top-0 bottom-0 items-center justify-center pointer-events-none peer-focus/input:opacity-0 transition-opacity duration-200">
						<Kbd>/</Kbd>
					</div>
					
					<div className="hidden sm:flex absolute right-2 top-0 bottom-0 items-center justify-center pointer-events-none opacity-0 peer-focus/input:opacity-100 transition-opacity duration-200">
						<Kbd>Esc</Kbd>
					</div>
				</>
			)}
		</div>
	)
}