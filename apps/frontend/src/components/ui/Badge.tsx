import { type JSX, splitProps } from "solid-js";

interface BadgeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
	variant?: "default" | "success" | "warning" | "danger" | "info" | "accent";
	size?: "sm" | "md";
}

const variants = {
	default:
		"bg-brand-gray-100 text-brand-gray-700 dark:bg-slate-700 dark:text-slate-300",
	success:
		"bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
	warning:
		"bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
	danger:
		"bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
	info: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
	accent:
		"bg-accent-50 text-accent-800 border border-accent-200 dark:bg-accent-900/30 dark:text-accent-400 dark:border-accent-800",
};

const sizes = {
	sm: "px-2 py-0.5 text-xs",
	md: "px-2.5 py-1 text-xs",
};

export function Badge(props: BadgeProps) {
	const [local, others] = splitProps(props, [
		"variant",
		"size",
		"class",
		"children",
	]);
	const variantClass = () => variants[local.variant || "default"];
	const sizeClass = () => sizes[local.size || "md"];

	return (
		<span
			{...others}
			class={`inline-flex items-center font-semibold rounded-full ${variantClass()} ${sizeClass()} ${local.class || ""}`}
		>
			{local.children}
		</span>
	);
}
