import { PlaneRegistration } from "@/schemas";
import { capitalizeFirst } from "~/lib/utils";

const RegistrantTypes: Record<string, string> = {
	"1": "Individual",
	"2": "Partnership",
	"3": "Corporation",
	"4": "Co-Owned",
	"5": "Government",
	"7": "LLC",
	"8": "Non-Citizen Corporation",
	"9": "Non-Citizen Co-Owned",
};

const RegistrationStatuses: Record<string, string> = {
	"V": "Valid",
	"N": "Not Valid",
	"D": "Expired",
	"T": "Triennial",
	"X": "Expired (Non-Citizen)",
};

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<div>
			<div className="text-xs text-muted-foreground">{label}</div>
			<div className="text-sm">{value ?? "—"}</div>
		</div>
	);
}

const formatDate = (d: Date | null | undefined) =>
	d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : null;

const title = (s: string) => capitalizeFirst(s.toLowerCase());

export const RegistrantInfo: React.FC<{ registration: PlaneRegistration }> = ({ registration }) => {
	const registrantType = RegistrantTypes[registration.registrant_type] ?? registration.registrant_type;
	const status = RegistrationStatuses[registration.status] ?? registration.status;

	const addressLine1 = title(registration.owner_street);
	const addressLine2 = registration.owner_street2 ? title(registration.owner_street2) : null;
	const cityStateZip = `${title(registration.owner_city)}, ${registration.owner_state} ${registration.owner_zip_code}`;

	return (
		<div className="grid grid-cols-3 gap-x-4 gap-y-3">
			{registration.fractionally_owned ? (
				<div className="col-span-2">
					<div className="text-xs text-muted-foreground">Owners</div>
					<div className="text-sm flex flex-col gap-0.5">
						{registration.owner_names.map((name, i) => (
							<span key={i}>{title(name)}</span>
						))}
					</div>
				</div>
			) : (
				<InfoRow label="Owner" value={title(registration.owner_name)} />
			)}

			<InfoRow label="Type" value={registrantType} />
			<InfoRow label="Status" value={status} />
			
			<div>
				<div className="text-xs text-muted-foreground">Address</div>
				<div className="text-sm">
					<div>{addressLine1}</div>
					{addressLine2 && <div>{addressLine2}</div>}
					<div>{cityStateZip}</div>
				</div>
			</div>

			<InfoRow label="Country" value={registration.owner_country} />

			<InfoRow label="Cert Type" value={registration.cert_type} />
			
			<InfoRow label="Last Action" value={formatDate(registration.last_action_date)} />
			<InfoRow label="Expires" value={formatDate(registration.expiration_date)} />

			{registration.cert_issue_date && (
				<InfoRow label="Cert Issued" value={formatDate(registration.cert_issue_date)} />
			)}
			
			{registration.kit_manufacturer && (
				<div className="col-span-2">
					<InfoRow
						label="Kit"
						value={`${title(registration.kit_manufacturer)}${registration.kit_model ? ` ${registration.kit_model}` : ''}`}
					/>
				</div>
			)}
		</div>
	);
}
