import { Fragment } from "react";
import type { InvitationGiftAccount } from "#/data/invitation";
import { invitation } from "#/data/invitation";
import BankLogo from "../ui/BankLogo";
import CopyButton from "../ui/CopyButton";
import Ornament from "../ui/Ornament";
import Reveal from "../ui/Reveal";
import SectionHeading from "../ui/SectionHeading";

/** Gift section (Figma 384:2909): bank accounts with a copy action. */
export default function Gift() {
	const { sections, gifts, giftThanks } = invitation;

	return (
		<section
			id="hadiah"
			className="bg-inv-bg px-8 py-24 font-body text-inv-ink"
		>
			<Reveal className="mx-auto flex w-full max-w-[348px] flex-col items-center">
				<SectionHeading
					heading={sections.gift.heading}
					intro={sections.gift.intro}
				/>

				<div className="mt-10 flex w-full flex-col items-center">
					{gifts.map((account, index) => (
						<Fragment key={account.accountNumber}>
							{index > 0 ? <Ornament className="my-8" /> : null}
							<GiftAccount {...account} />
						</Fragment>
					))}
				</div>

				<div className="mt-10 flex flex-col items-center gap-6">
					<p className="text-center text-[13px] font-body leading-[1.7] text-inv-muted">
						{giftThanks}
					</p>
					<Ornament />
				</div>
			</Reveal>
		</section>
	);
}

function GiftAccount({
	method,
	bankName,
	accountNumber,
	accountHolder,
}: InvitationGiftAccount) {
	return (
		<div className="flex w-full flex-col items-center text-center">
			<p className="text-[10px] font-body uppercase leading-[1.4] tracking-[0.18em] text-inv-accent">
				{method}
			</p>

			<div className="mt-4">
				<BankLogo bankName={bankName} />
			</div>

			<p className="mt-4 text-[11px] font-body leading-[1.5] text-inv-muted">
				Nomor rekening
			</p>

			<div className="mt-[5px] flex items-center gap-3.5">
				<span className="text-[13px] font-body leading-[1.65]">
					{accountNumber}
				</span>
				<CopyButton value={accountNumber} />
			</div>

			<p className="mt-[13px] text-[11px] font-body leading-[1.5] text-inv-muted">
				Atas nama
			</p>
			<p className="mt-[5px] text-[13px] font-body leading-[1.65]">
				{accountHolder}
			</p>
		</div>
	);
}
