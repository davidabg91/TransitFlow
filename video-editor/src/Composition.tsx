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

const TransitCard = ({style, scale = 1}: {style?: React.CSSProperties; scale?: number}) => (
	<div style={{
		width: 240, height: 150, 
		background: 'linear-gradient(135deg, #22d3ee 0%, #0ea5e9 100%)',
		borderRadius: 20, padding: 25, color: '#020617', fontWeight: 900,
		boxShadow: '0 15px 30px rgba(34, 211, 238, 0.4)',
		display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
		border: '1px solid rgba(255, 255, 255, 0.3)',
		transform: `scale(${scale})`,
		transformOrigin: 'center',
		flexShrink: 0,
		...style
	}}>
		<div style={{fontSize: 22, letterSpacing: -1, whiteSpace: 'nowrap'}}>TransitFlow</div>
		<div style={{fontSize: 14, opacity: 0.8, fontFamily: 'monospace', whiteSpace: 'nowrap'}}>8829 4412 0031</div>
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

// --- Features Section ---

const FeatBase = ({children}: {children: React.ReactNode}) => (
	<AbsoluteFill style={{backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center', padding: 20, overflow: 'hidden'}}>
		<div style={{position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'radial-gradient(#22d3ee 1px, transparent 1px)', backgroundSize: '20px 20px'}} />
		{children}
	</AbsoluteFill>
);

export const Feature1 = () => {
	const frame = useCurrentFrame();
	const tap = interpolate(frame % 40, [0, 15, 30], [50, -10, 50]);
	const success = frame % 40 > 15;
	return (
		<FeatBase>
			<GlassCard style={{width: 200, height: 250, border: success ? '2px solid #22d3ee' : '1px solid #1e293b', background: success ? 'rgba(34,211,238,0.1)' : 'rgba(2,6,23,0.7)', transition: 'all 0.1s'}}>
				<div style={{height: 50, background: 'rgba(34,211,238,0.1)'}} />
				<div style={{flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: success ? '#22d3ee' : '#1e293b'}}>{success ? '✓' : '...'}</div>
			</GlassCard>
			<div style={{position: 'absolute', transform: `translateY(${tap}px) rotate(15deg)`}}><TransitCard scale={0.5} /></div>
		</FeatBase>
	);
};

export const Feature2 = () => {
	const frame = useCurrentFrame();
	const page = Math.floor(frame / 30);
	return (
		<FeatBase>
			<GlassCard style={{width: 250, height: 300, padding: 20}}>
				<div style={{fontSize: 18, color: '#22d3ee', fontWeight: 800}}>SCHEDULE</div>
				<div style={{marginTop: 20}}>
					{[0,1,2].map(i => (
						<div key={i} style={{height: 40, background: i === page % 3 ? '#22d3ee' : 'rgba(34,211,238,0.1)', marginBottom: 10, borderRadius: 8, transition: 'all 0.3s'}} />
					))}
				</div>
				<div style={{marginTop: 20, color: '#fff', fontSize: 12}}>AUTO-SYNCING...</div>
			</GlassCard>
		</FeatBase>
	);
};

export const Feature3 = () => {
	const frame = useCurrentFrame();
	const bars = [0.4, 0.7, 0.5, 0.9, 0.8];
	return (
		<FeatBase>
			<div style={{display: 'flex', alignItems: 'flex-end', gap: 10, height: 200}}>
				{bars.map((h, i) => {
					const grow = interpolate(frame, [i*10, i*10 + 20], [0, h], {extrapolateRight: 'clamp'});
					return <div key={i} style={{width: 40, height: `${grow * 100}%`, background: '#22d3ee', borderRadius: '8px 8px 0 0', boxShadow: '0 0 20px rgba(34,211,238,0.3)'}} />;
				})}
			</div>
			<div style={{marginTop: 20, color: '#22d3ee', fontWeight: 900, fontSize: 32}}>${Math.floor(interpolate(frame, [0, 100], [1000, 5420]))}</div>
		</FeatBase>
	);
};

export const Feature4 = () => {
	const frame = useCurrentFrame();
	const shake = Math.sin(frame * 0.5) * (frame % 60 < 10 ? 5 : 0);
	return (
		<FeatBase>
			<div style={{transform: `translateX(${shake}px)`, textAlign: 'center'}}>
				<div style={{fontSize: 80}}>🔒</div>
				<div style={{color: '#22d3ee', fontWeight: 900, marginTop: 20}}>KIOSK ACTIVE</div>
				<div style={{fontSize: 12, color: '#64748b', marginTop: 10}}>RESTRICTED ACCESS</div>
			</div>
		</FeatBase>
	);
};

export const Feature5 = () => {
	const frame = useCurrentFrame();
	const rotate = frame * 2;
	return (
		<FeatBase>
			<div style={{fontSize: 80}}>☁️</div>
			<div style={{position: 'absolute', transform: `rotate(${rotate}deg)`, width: 150, height: 150, border: '4px dashed #22d3ee', borderRadius: '50%'}} />
			<div style={{marginTop: 40, color: '#22d3ee', fontWeight: 800}}>CLOUD SYNC</div>
		</FeatBase>
	);
};

export const Feature6 = () => {
	const frame = useCurrentFrame();
	const slide = interpolate(frame % 60, [0, 60], [0, -300]);
	return (
		<FeatBase>
			<GlassCard style={{width: 300, height: 200, overflow: 'hidden', position: 'relative'}}>
				<div style={{display: 'flex', transform: `translateX(${slide}px)`}}>
					<div style={{minWidth: 300, height: 200, background: 'rgba(34,211,238,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'}}>AD 1</div>
					<div style={{minWidth: 300, height: 200, background: 'rgba(14,165,233,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'}}>AD 2</div>
				</div>
				<div style={{position: 'absolute', bottom: 10, right: 10, color: '#22d3ee', fontWeight: 900}}>$ EARNING</div>
			</GlassCard>
		</FeatBase>
	);
};

export const Feature7 = () => {
	const frame = useCurrentFrame();
	return (
		<FeatBase>
			<div style={{display: 'flex', gap: -60}}>
				<TransitCard scale={0.7} style={{transform: `rotate(-15deg) translateX(${Math.sin(frame*0.05)*20}px)`}} />
				<TransitCard scale={0.7} style={{transform: `rotate(0deg) translateY(${Math.cos(frame*0.05)*20}px)`, background: 'linear-gradient(135deg, #f472b6 0%, #db2777 100%)'}} />
				<TransitCard scale={0.7} style={{transform: `rotate(15deg)`, background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'}} />
			</div>
		</FeatBase>
	);
};

export const Feature8 = () => {
	const frame = useCurrentFrame();
	const float = Math.sin(frame * 0.05) * 10;
	return (
		<FeatBase>
			<div style={{transform: `translateY(${float}px)`}}>
				<div style={{width: 250, height: 160, border: '8px solid #1e293b', borderRadius: 20, background: '#0f172a', position: 'relative'}}>
					<div style={{position: 'absolute', right: -20, top: 40, width: 20, height: 60, background: '#1e293b', borderRadius: '0 5px 5px 0'}} />
					<div style={{padding: 20, color: '#22d3ee', fontSize: 20, fontWeight: 900}}>TRANSIT FLOW</div>
				</div>
			</div>
			<div style={{marginTop: 30, color: '#64748b', fontSize: 14, fontWeight: 800}}>INDUSTRIAL HARDWARE</div>
		</FeatBase>
	);
};

export const Feature9 = () => {
	const frame = useCurrentFrame();
	const scale = 1 + Math.sin(frame * 0.1) * 0.1;
	return (
		<FeatBase>
			<div style={{transform: `scale(${scale})`, fontSize: 80}}>🎧</div>
			<div style={{color: '#22d3ee', fontWeight: 900, fontSize: 40, marginTop: 20}}>24/7</div>
			<div style={{color: '#fff', letterSpacing: 5, fontSize: 12}}>SUPPORT</div>
		</FeatBase>
	);
};

export const Feature10 = () => {
	const frame = useCurrentFrame();
	const points = 20;
	return (
		<FeatBase>
			<svg width="300" height="150" viewBox="0 0 400 200">
				<polyline
					fill="none"
					stroke="#22d3ee"
					strokeWidth="6"
					strokeDasharray="1000"
					strokeDashoffset={interpolate(frame, [0, 100], [1000, 0])}
					points={Array.from({length: points}).map((_, i) => `${i * 20},${100 + Math.sin(i + frame * 0.1) * 60}`).join(' ')}
				/>
			</svg>
			<div style={{color: '#22d3ee', fontWeight: 800, marginTop: 20}}>ANALYTICS</div>
		</FeatBase>
	);
};

export const Feature11 = () => {
	const frame = useCurrentFrame();
	const bellRotate = Math.sin(frame * 0.5) * 20;
	return (
		<FeatBase>
			<div style={{transform: `rotate(${bellRotate}deg)`, fontSize: 80}}>🔔</div>
			<div style={{position: 'absolute', top: 120, right: 180, background: '#ef4444', color: '#fff', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14}}>1</div>
			<div style={{marginTop: 30, color: '#22d3ee', fontWeight: 800, fontSize: 14}}>NOTIFICATIONS</div>
		</FeatBase>
	);
};

export const Feature12 = () => {
	const frame = useCurrentFrame();
	const speed = 30; // frames per check
	const index = Math.floor(frame / speed);
	const progress = (frame % speed) / speed;
	
	const scanOpacity = interpolate(progress, [0, 0.2, 0.8, 1], [0, 1, 1, 0]);
	const deviceY = interpolate(progress, [0, 0.3], [100, 0], {extrapolateRight: 'clamp'});

	return (
		<FeatBase>
			{/* Inspector Badge */}
			<div style={{position: 'absolute', top: 30, right: 30, display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(34,211,238,0.2)', padding: '5px 15px', borderRadius: 20}}>
				<div style={{fontSize: 20}}>👮</div>
				<div style={{color: '#22d3ee', fontWeight: 800, fontSize: 12}}>INSPECTOR #04</div>
			</div>

			<div style={{display: 'flex', gap: 20, alignItems: 'center'}}>
				{/* Passengers List */}
				<div style={{display: 'flex', flexDirection: 'column', gap: 15}}>
					{[0, 1, 2].map(i => (
						<div key={i} style={{
							width: 150, height: 60, borderRadius: 12, background: 'rgba(15, 23, 42, 0.8)', 
							border: i === index % 3 ? '2px solid #22d3ee' : '1px solid #1e293b',
							display: 'flex', alignItems: 'center', padding: '0 15px', gap: 10,
							opacity: i < index % 3 ? 0.5 : 1
						}}>
							<div style={{fontSize: 24}}>{i < index % 3 ? '✅' : '👤'}</div>
							<div style={{height: 10, width: 60, background: 'rgba(34,211,238,0.1)', borderRadius: 5}} />
						</div>
					))}
				</div>

				{/* Inspector Device */}
				<div style={{transform: `translateY(${deviceY}px)`, opacity: scanOpacity}}>
					<GlassCard style={{width: 100, height: 180, padding: 10, border: '2px solid #22d3ee'}}>
						<div style={{height: '100%', background: 'rgba(34,211,238,0.1)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
							<div style={{fontSize: 30}}>🔍</div>
						</div>
					</GlassCard>
				</div>
			</div>

			<div style={{marginTop: 30, color: '#22d3ee', fontWeight: 900, letterSpacing: 3}}>CONTROL AUDIT ACTIVE</div>
		</FeatBase>
	);
};
