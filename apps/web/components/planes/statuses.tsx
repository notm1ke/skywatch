import { SelectOption } from ".";

import {
	CircleCheckBig,
	CircleDashed,
	CircleDotDashed,
	ClockAlert,
	Flag,
	FlagOff,
	GraduationCap,
	MailQuestion,
	MailWarning,
	Receipt,
	UserMinus,
	UserX
} from "lucide-react";

export const ValidRegistrations = ["M", "T", "V", "2", "3", "4", "10", "11", "12"]

export const RegistrationStatuses: SelectOption[] = [
	{
		label: "Triennial Pending",
		value: "A",
		icon: CircleDashed,
		color: "yellow"
	},
	{
		label: "Expired Dealer",
		value: "D",
		icon: UserX,
		color: "red"
	},
	{
		label: "Enforcement Revoked",
		value: "E",
		icon: UserX,
		color: "red"
	},
	{
		label: "Valid - Dealer",
		value: "M",
		icon: CircleCheckBig,
		color: "green"
	},
	{
		label: "Flight Hrs Noncompliant",
		value: "N",
		icon: ClockAlert,
		color: "orange"
	},
	{
		label: "Pending",
		value: "R",
		icon: CircleDashed,
		color: "yellow"
	},
	{
		label: "Second Triennial Pending",
		value: "S",
		icon: CircleDashed,
		color: "yellow"
	},
	{
		label: "Valid - Trainee",
		value: "T",
		icon: GraduationCap,
		color: "green"
	},
	{
		label: "Valid",
		value: "V",
		icon: CircleCheckBig,
		color: "green"
	},
	{
		label: "Invalid",
		value: "W",
		icon: UserX,
		color: "red"
	},
	{
		label: "Enforcement Letter",
		value: "X",
		icon: MailWarning,
		color: "red"
	},
	{
		label: "Perm Reserved",
		value: "W",
		icon: Flag,
		color: "blue"
	},
	{
		label: "Triennial Undeliverable",
		value: "1",
		icon: MailQuestion,
		color: "orange"
	},
	{
		label: "N-Number Assigned",
		value: "2",
		icon: CircleDotDashed,
		color: "blue"
	},
	{
		label: "N-Number Assigned - Non-Type",
		value: "3",
		icon: CircleDotDashed,
		color: "blue"
	},
	{
		label: "N-Number Assigned - Import",
		value: "4",
		icon: CircleDotDashed,
		color: "blue"
	},
	{
		label: "Reserved N-Number",
		value: "5",
		icon: Flag,
		color: "blue"
	},
	{
		label: "Admin Cancelled",
		value: "6",
		icon: FlagOff,
		color: "red"
	},
	{
		label: "Sale Reported",
		value: "7",
		icon: Receipt,
		color: "indigo"
	},
	{
		label: "Triennial 2nd Attempt",
		value: "8",
		icon: MailQuestion,
		color: "orange"
	},
	{
		label: "Registration Revoked",
		value: "9",
		icon: UserX,
		color: "red"
	},
	{
		label: "Pending Cancellation",
		value: "10",
		icon: UserMinus,
		color: "orange"
	},
	{
		label: "Pending Cancellation - Non-Type",
		value: "11",
		icon: UserMinus,
		color: "orange"
	},
	{
		label: "Pending Cancellation - Import",
		value: "12",
		icon: UserMinus,
		color: "orange"
	},
	{
		label: "Registration Expired",
		value: "14",
		icon: UserX,
		color: "red"
	},
	{
		label: "Renewal Notice",
		value: "14",
		icon: MailWarning,
		color: "orange"
	},
	{
		label: "2nd Renewal Notice",
		value: "15",
		icon: MailWarning,
		color: "orange"
	},
	{
		label: "Expired - Pending Cancel",
		value: "16",
		icon: MailWarning,
		color: "orange"
	},
	{
		label: "Sale Reported - Pending Cancel",
		value: "17",
		icon: Receipt,
		color: "orange"
	},
	{
		label: "Sale Reported - Cancelled",
		value: "18",
		icon: Receipt,
		color: "red"
	},
	{
		label: "Pending Cancellation",
		value: "19",
		icon: UserMinus,
		color: "orange"
	},
	{
		label: "Pending Registration - Cancelled",
		value: "20",
		icon: UserX,
		color: "red"
	},
	{
		label: "Revoked - Pending Cancellation",
		value: "21",
		icon: UserX,
		color: "red"
	},
	{
		label: "Revoked - Cancelled",
		value: "22",
		icon: UserX,
		color: "red"
	},
	{
		label: "Expired Dealer - Pending Cancel",
		value: "23",
		icon: UserX,
		color: "red"
	},
	{
		label: "3rd Renewal Notice",
		value: "24",
		icon: MailQuestion,
		color: "orange"
	},
	{
		label: "1st Renewal Notice",
		value: "25",
		icon: MailQuestion,
		color: "orange"
	},
	{
		label: "2nd Renewal Notice",
		value: "26",
		icon: MailQuestion,
		color: "orange"
	},
	{
		label: "Registration Expired",
		value: "27",
		icon: UserX,
		color: "red"
	},
	{
		label: "3rd Renewal Notice",
		value: "28",
		icon: MailQuestion,
		color: "red"
	},
	{
		label: "Expired - Pending Cancellation",
		value: "29",
		icon: UserX,
		color: "red"
	},
]