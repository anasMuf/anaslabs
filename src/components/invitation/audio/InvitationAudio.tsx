import { useEffect, useMemo, useState } from "react";
import { getAudioSource } from "./audio-source";
import MusicController from "./MusicController";
import UniversalAudioPlayer from "./UniversalAudioPlayer";

interface InvitationAudioProps {
	url?: string | null;
}

/**
 * Wires the invitation's background music.
 *
 * Playback starts on the guest's first interaction (browsers block sound
 * autoplay), and the controller only appears after that gesture. Unknown URLs
 * render nothing, so a bad paste can never leave a silent button on the page.
 */
export default function InvitationAudio({ url }: InvitationAudioProps) {
	const source = useMemo(() => getAudioSource(url), [url]);
	const [opened, setOpened] = useState(false);
	const [playing, setPlaying] = useState(true);

	useEffect(() => {
		if (source.type === "unknown") return;

		let done = false;
		const open = () => {
			if (done) return;
			done = true;
			setOpened(true);
		};

		const options: AddEventListenerOptions = { once: true, passive: true };
		document.addEventListener("pointerdown", open, options);
		document.addEventListener("keydown", open, options);
		document.addEventListener("wheel", open, options);
		document.addEventListener("touchstart", open, options);

		return () => {
			document.removeEventListener("pointerdown", open);
			document.removeEventListener("keydown", open);
			document.removeEventListener("wheel", open);
			document.removeEventListener("touchstart", open);
		};
	}, [source.type]);

	if (source.type === "unknown") return null;

	return (
		<>
			<UniversalAudioPlayer
				url={source.url}
				enabled
				isPlaying={playing}
				isOpened={opened}
			/>
			{opened ? (
				<MusicController
					playing={playing}
					onToggle={() => setPlaying((value) => !value)}
				/>
			) : null}
		</>
	);
}
