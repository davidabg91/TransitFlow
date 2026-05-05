import "./index.css";
import { Composition } from "remotion";
import { Step1, Step2, Step3 } from "./Composition";

export const RemotionRoot: React.FC = () => {
	return (
		<>
			<Composition
				id="Step1"
				component={Step1}
				durationInFrames={120}
				fps={30}
				width={800}
				height={600}
			/>
			<Composition
				id="Step2"
				component={Step2}
				durationInFrames={120}
				fps={30}
				width={800}
				height={600}
			/>
			<Composition
				id="Step3"
				component={Step3}
				durationInFrames={120}
				fps={30}
				width={800}
				height={600}
			/>
		</>
	);
};
