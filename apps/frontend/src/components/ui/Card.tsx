import { type JSX, splitProps } from "solid-js";

interface CardProps extends JSX.HTMLAttributes<HTMLDivElement> {
	variant?: "default" | "bordered" | "elevated" | "ghost";
	padding?: "none" | "sm" | "md" | "lg";
	hover?: boolean;
}

const variants = {
	default:
		"bg-white border border-brand-gray-100 shadow-card dark:bg-slate-900 dark:border-slate-800 dark:shadow-card-dark",
	bordered:
		"bg-white border-2 border-brand-200 dark:bg-slate-900 dark:border-slate-700",
	elevated: "bg-white shadow-card-hover dark:bg-slate-900 dark:shadow-lg",
	ghost: "bg-brand-50/50 dark:bg-slate-800/50",
};

const paddings = {
	none: "",
	sm: "p-4",
	md: "p-6",
	lg: "p-8",
};

export function Card(props: CardProps) {
	const [local, others] = splitProps(props, [
		"variant",
		"padding",
		"hover",
		"class",
		"children",
	]);
	const variant = () => variants[local.variant || "default"];
	const pad = () => paddings[local.padding || "md"];
	const hoverClass = () =>
		local.hover
			? "hover:shadow-card-hover hover:border-brand-gray-200 dark:hover:border-slate-700 hover:-translate-y-0.5"
			: "";

	return (
		<div
			{...others}
			class={`rounded-2xl transition-all duration-200 ${variant()} ${pad()} ${hoverClass()} ${local.class || ""}`}
		>
			{local.children}
		</div>
	);
}
