import type { ReactNode } from "react";

/**
 * Small form primitives shared by the content editor sections.
 *
 * Styling follows the dashboard shell (`inv-*` tokens) instead of inventing a
 * second visual language for the editor.
 */

const labelClass =
	"font-body text-[9.5px] font-semibold tracking-[0.12em] text-inv-muted";
const inputClass =
	"mt-1 w-full rounded-xl border border-inv-rule bg-inv-bg px-3 py-2 font-body text-[12px] leading-[1.5] text-inv-ink placeholder:text-inv-muted/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent disabled:opacity-50";

export function SectionCard({
	title,
	description,
	children,
}: {
	title: string;
	description?: string;
	children: ReactNode;
}) {
	return (
		<section className="rounded-3xl border border-inv-rule bg-inv-card px-5 py-4">
			<h2 className="font-display text-[18px] leading-tight">{title}</h2>
			{description ? (
				<p className="mt-1 font-body text-[10.5px] leading-[1.7] text-inv-muted">
					{description}
				</p>
			) : null}
			<div className="mt-4 flex flex-col gap-3">{children}</div>
		</section>
	);
}

export function TextField({
	label,
	value,
	onChange,
	type = "text",
	placeholder,
	hint,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	type?: "text" | "date" | "url";
	placeholder?: string;
	hint?: string;
}) {
	return (
		<label className="block">
			<span className={labelClass}>{label}</span>
			<input
				type={type}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				placeholder={placeholder}
				className={inputClass}
			/>
			{hint ? (
				<span className="mt-1 block font-body text-[10px] leading-[1.5] text-inv-muted">
					{hint}
				</span>
			) : null}
		</label>
	);
}

export function TextAreaField({
	label,
	value,
	onChange,
	rows = 3,
	placeholder,
	hint,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	rows?: number;
	placeholder?: string;
	hint?: string;
}) {
	return (
		<label className="block">
			<span className={labelClass}>{label}</span>
			<textarea
				value={value}
				onChange={(event) => onChange(event.target.value)}
				rows={rows}
				placeholder={placeholder}
				className={`${inputClass} resize-y`}
			/>
			{hint ? (
				<span className="mt-1 block font-body text-[10px] leading-[1.5] text-inv-muted">
					{hint}
				</span>
			) : null}
		</label>
	);
}

export function ToggleField({
	label,
	checked,
	onChange,
	hint,
}: {
	label: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
	hint?: string;
}) {
	return (
		<label className="flex items-start gap-2.5">
			<input
				type="checkbox"
				checked={checked}
				onChange={(event) => onChange(event.target.checked)}
				className="mt-0.5 h-4 w-4 accent-inv-accent"
			/>
			<span>
				<span className="block font-body text-[11px] text-inv-ink">
					{label}
				</span>
				{hint ? (
					<span className="mt-0.5 block font-body text-[10px] leading-[1.5] text-inv-muted">
						{hint}
					</span>
				) : null}
			</span>
		</label>
	);
}

export function MiniButton({
	children,
	onClick,
	disabled,
}: {
	children: ReactNode;
	onClick: () => void;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className="rounded-full border border-inv-rule px-3 py-1.5 font-body text-[10px] text-inv-ink transition-colors hover:bg-inv-ink/5 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
		>
			{children}
		</button>
	);
}

export function DangerMiniButton({
	children,
	onClick,
	disabled,
}: {
	children: ReactNode;
	onClick: () => void;
	disabled?: boolean;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={disabled}
			className="rounded-full border border-inv-accent/40 px-3 py-1.5 font-body text-[10px] text-inv-accent transition-colors hover:bg-inv-accent/10 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inv-accent"
		>
			{children}
		</button>
	);
}
