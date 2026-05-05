import "./index.css";
import { Composition } from "remotion";
import { 
	Step1, Step2, Step3,
	Feature1, Feature2, Feature3, Feature4, Feature5, Feature6,
	Feature7, Feature8, Feature9, Feature10, Feature11, Feature12
} from "./Composition";

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
			
			{/* Features */}
			<Composition id="Feature1" component={Feature1} durationInFrames={120} fps={30} width={600} height={400} />
			<Composition id="Feature2" component={Feature2} durationInFrames={120} fps={30} width={600} height={400} />
			<Composition id="Feature3" component={Feature3} durationInFrames={120} fps={30} width={600} height={400} />
			<Composition id="Feature4" component={Feature4} durationInFrames={120} fps={30} width={600} height={400} />
			<Composition id="Feature5" component={Feature5} durationInFrames={120} fps={30} width={600} height={400} />
			<Composition id="Feature6" component={Feature6} durationInFrames={120} fps={30} width={600} height={400} />
			<Composition id="Feature7" component={Feature7} durationInFrames={120} fps={30} width={600} height={400} />
			<Composition id="Feature8" component={Feature8} durationInFrames={120} fps={30} width={600} height={400} />
			<Composition id="Feature9" component={Feature9} durationInFrames={120} fps={30} width={600} height={400} />
			<Composition id="Feature10" component={Feature10} durationInFrames={120} fps={30} width={600} height={400} />
			<Composition id="Feature11" component={Feature11} durationInFrames={120} fps={30} width={600} height={400} />
			<Composition id="Feature12" component={Feature12} durationInFrames={120} fps={30} width={600} height={400} />
		</>
	);
};
