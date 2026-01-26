import { useRef, useState } from "react";
import { Kbd } from "~/components/ui/kbd";
import { useKeyHandler } from "~/hooks/use-key-handler";

type RegistrationSearchProps = {
	value: string;
	onChange: (value: string) => void;
};

export const RegistrationSearch: React.FC<RegistrationSearchProps> = ({ value, onChange }) => {
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
		<div className="flex items-center relative font-mono tracking-tight text-sm w-72 h-full grow">
			<input
				type="text"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onFocus={() => setFocused(true)}
				onBlur={() => setFocused(false)}
				placeholder="Search by registration"
				className="w-full h-full pl-4 pr-10 peer/input"
				ref={inputRef}
			/>

			<div className="absolute right-2 top-0 bottom-0 flex items-center justify-center pointer-events-none peer-focus/input:opacity-0 transition-opacity duration-200">
				<Kbd>/</Kbd>
			</div>
			
			<div className="absolute right-2 top-0 bottom-0 flex items-center justify-center pointer-events-none opacity-0 peer-focus/input:opacity-100 transition-opacity duration-200">
				<Kbd>Esc</Kbd>
			</div>
		</div>
	)
}