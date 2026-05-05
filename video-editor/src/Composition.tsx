import {
	AbsoluteFill,
	interpolate,
	spring,
	useCurrentFrame,
	useVideoConfig,
} from 'remotion';

// --- UI Components ---

const GlassCard = ({children, style}: {children: React.ReactNode; style?: React.CSSProperties}) => (
	<div
		style={{
			background: 'rgba(2, 6, 23, 0.7)',
			backdropFilter: 'blur(20px)',
			border: '1px solid rgba(34, 211, 238, 0.3)',
			borderRadius: '32px',
			boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
			...style,
		}}
	>
		{children}
	</div>
);

const TransitCard = ({style}: {style?: React.CSSProperties}) => (
	<div style={{
		width: 240, height: 150, 
		background: 'linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)',
		borderRadius: 20, padding: 25, color: '#020617', fontWeight: 900,
		boxShadow: '0 15px 30px rgba(34, 211, 238, 0.4)',
		display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
		border: '1px solid rgba(255, 255, 255, 0.3)',
		...style
	}}>
		<div style={{fontSize: 22, letterSpacing: -1}}>TransitFlow</div>
		<div style={{fontSize: 14, opacity: 0.8, fontFamily: 'monospace'}}>8829 4412 0031</div>
	</div>
);

// --- Step 1: Registration ---
export const Step1 = () => {
	const frame = useCurrentFrame();
	const name = "DAVID DIMITROV";
	const typeProgress = Math.floor(interpolate(frame, [15, 45], [0, name.length], {extrapolateRight: 'clamp'}));
	const cardY = interpolate(frame, [55, 90], [500, 0], {extrapolateRight: 'clamp'});
	const cardScale = interpolate(frame, [55, 90], [0.5, 1], {extrapolateRight: 'clamp'});

	return (
		<AbsoluteFill style={{backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center'}}>
			{/* Grid Background */}
			<div style={{position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(#22d3ee 1px, transparent 1px)', backgroundSize: '40px 40px'}} />
			
			<GlassCard style={{width: 450, height: 350, padding: 40, position: 'relative', zIndex: 1}}>
				<div style={{color: '#22d3ee', fontSize: 14, fontWeight: 800, letterSpacing: 2, marginBottom: 30}}>РЕГИСТРАЦИЯ</div>
				<div style={{background: 'rgba(0,0,0,0.5)', padding: 20, borderRadius: 15, border: '1px solid rgba(34, 211, 238, 0.1)'}}>
					<div style={{color: '#64748b', fontSize: 12, marginBottom: 8}}>ИМЕ НА КЛИЕНТ:</div>
					<div style={{color: '#fff', fontSize: 28, fontWeight: 900, height: 35}}>
						{name.slice(0, typeProgress)}<span style={{opacity: frame % 10 < 5 ? 1 : 0, color: '#22d3ee'}}>|</span>
					</div>
				</div>
				<div style={{marginTop: 40, display: 'flex', gap: 10}}>
					<div style={{height: 12, width: '70%', background: 'rgba(34, 211, 238, 0.2)', borderRadius: 6}} />
					<div style={{height: 12, width: '20%', background: 'rgba(34, 211, 238, 0.2)', borderRadius: 6}} />
				</div>
				<div style={{marginTop: 15, height: 12, width: '40%', background: 'rgba(34, 211, 238, 0.2)', borderRadius: 6}} />
			</GlassCard>

			<div style={{
				position: 'absolute', 
				transform: `translateY(${cardY}px) scale(${cardScale}) rotate(-5deg)`, 
				zIndex: 10,
				filter: frame < 55 ? 'blur(20px)' : 'none',
				opacity: interpolate(frame, [50, 60], [0, 1])
			}}>
				<TransitCard />
			</div>
		</AbsoluteFill>
	);
};

// --- Step 2: Validation ---
export const Step2 = () => {
	const frame = useCurrentFrame();
	const tapX = interpolate(frame, [20, 40, 60], [-400, 0, 400], {extrapolateRight: 'clamp'});
	const success = frame >= 40 && frame <= 80;
	const successPulse = spring({frame: frame - 40, fps: 30, config: {stiffness: 100}});

	return (
		<AbsoluteFill style={{backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center'}}>
			<div style={{position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(#22d3ee 1px, transparent 1px)', backgroundSize: '40px 40px'}} />
			
			<GlassCard style={{
				width: 400, height: 400, padding: 0, overflow: 'hidden',
				border: success ? '2px solid #22d3ee' : '1px solid rgba(34, 211, 238, 0.3)',
				boxShadow: success ? '0 0 50px rgba(34, 211, 238, 0.3)' : 'none',
				transition: 'all 0.2s ease-out'
			}}>
				<div style={{height: 80, background: 'rgba(34, 211, 238, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22d3ee', fontWeight: 800}}>
					TERMINAL V1
				</div>
				<div style={{
					flex: 1, height: 320, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
					background: success ? '#22d3ee' : 'transparent',
					color: success ? '#020617' : '#22d3ee',
					transform: `scale(${success ? 1 + (successPulse * 0.05) : 1})`
				}}>
					{success ? (
						<>
							<div style={{fontSize: 100, fontWeight: 900}}>✓</div>
							<div style={{fontSize: 28, fontWeight: 900}}>ВАЛИДЕН</div>
							<div style={{fontSize: 20, fontWeight: 700}}>АБОНАМЕНТ</div>
						</>
					) : (
						<div style={{width: 120, height: 120, borderRadius: '50%', border: '4px dashed rgba(34, 211, 238, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
							<div style={{fontSize: 40, opacity: 0.5}}>NFC</div>
						</div>
					)}
				</div>
			</GlassCard>

			<div style={{position: 'absolute', transform: `translateX(${tapX}px) rotate(20deg)`, zIndex: 10}}>
				<TransitCard />
			</div>
		</AbsoluteFill>
	);
};

// --- Step 3: Success ---
export const Step3 = () => {
	const frame = useCurrentFrame();
	const speed = 15; // super fast
	const clientIndex = Math.floor(frame / speed);
	const progress = (frame % speed) / speed;
	
	const scale = interpolate(progress, [0, 0.2, 0.8, 1], [0.9, 1, 1, 0.9]);
	const opacity = interpolate(progress, [0, 0.1, 0.9, 1], [0, 1, 1, 0]);

	return (
		<AbsoluteFill style={{backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center'}}>
			<div style={{position: 'absolute', top: 40, left: 40, color: '#22d3ee', fontWeight: 800, fontSize: 12, letterSpacing: 2}}>DRIVER CONSOLE • REAL-TIME FEED</div>
			
			<div style={{transform: `scale(${scale})`, opacity}}>
				<GlassCard style={{padding: 50, width: 450, textAlign: 'center', border: '2px solid #22d3ee', boxShadow: '0 0 40px rgba(34, 211, 238, 0.2)'}}>
					<div style={{color: '#64748b', fontSize: 16, marginBottom: 10}}>ПЪТНИК ID: #{55021 + clientIndex}</div>
					<div style={{color: '#22d3ee', fontSize: 80, fontWeight: 900, margin: '20px 0'}}>ПЛАТЕНО</div>
					<div style={{height: 6, width: '100%', background: '#22d3ee', borderRadius: 3}} />
					<div style={{color: '#fff', fontSize: 18, marginTop: 20, fontWeight: 300, letterSpacing: 5}}>ОДОБРЕНО</div>
				</GlassCard>
			</div>

			{/* Scanning Line */}
			<div style={{
				position: 'absolute', left: 0, right: 0, height: 2, background: '#22d3ee', 
				top: `${(frame % 30) / 30 * 100}%`, opacity: 0.3, boxShadow: '0 0 20px #22d3ee'
			}} />
		</AbsoluteFill>
	);
};
