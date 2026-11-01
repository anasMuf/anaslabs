import bcaSvg from "idn-finlogos/icons/bca";
import bsiSvg from "idn-finlogos/icons/bsi";

/**
 * Bank / e-wallet marks used by the gift section.
 *
 * Only the icons that are actually used are imported: the package's `react`
 * entry point pulls the full icon map into the bundle.
 */
const BANK_LOGOS: Record<string, string> = {
	BCA: bcaSvg,
	BSI: bsiSvg,
};

interface BankLogoProps {
	bankName: string;
}

export default function BankLogo({ bankName }: BankLogoProps) {
	const key = bankName.trim().toUpperCase();
	const svg = BANK_LOGOS[key];

	if (!svg) {
		// Design fallback: the bank name set in the display serif.
		return (
			<span className="font-display text-[27px] leading-[1.3] text-inv-ink">
				{bankName}
			</span>
		);
	}

	return (
		<span
			role="img"
			aria-label={bankName}
			className="flex h-[35px] items-center justify-center [&>svg]:h-8 [&>svg]:w-auto [&>svg]:max-w-[180px]"
			// biome-ignore lint/security/noDangerouslySetInnerHtml: static SVG shipped by idn-finlogos, the same markup its own components inject.
			dangerouslySetInnerHTML={{ __html: svg }}
		/>
	);
}
