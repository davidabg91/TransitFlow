import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Nfc, Check, SkipForward, X, AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Writing a batch of cards, one tap at a time.
 *
 * The apps that write NFC tags hold one record and put it on every card touched
 * to them. That is the wrong shape for a batch: two hundred cards each need a
 * different address, and a tool that writes the same one to all of them produces
 * two hundred cards that open the same passenger's profile — a fault nobody
 * notices until the second card is scanned.
 *
 * So the list stays here, where it was generated, and the phone walks through
 * it. One card is presented, the address for that position is written, and the
 * screen moves to the next on its own. What the person holding the cards has to
 * keep track of is nothing: the position is on screen, and a card that will not
 * take a write is skipped and comes back at the end rather than stopping the
 * run.
 *
 * Web NFC is Chrome on Android only. There is no way to do this from a desktop
 * browser or from an iPhone, so the screen says so rather than failing quietly.
 */

interface NDEFWriteRecord {
    recordType: string;
    data: string;
}

interface NDEFWriterLike {
    write(
        message: { records: NDEFWriteRecord[] },
        options?: { overwrite?: boolean; signal?: AbortSignal },
    ): Promise<void>;
}

type NDEFWriterCtor = new () => NDEFWriterLike;

const writerCtor = (): NDEFWriterCtor | null =>
    (window as unknown as { NDEFReader?: NDEFWriterCtor }).NDEFReader || null;

export const cardWritingSupported = () => writerCtor() !== null;

/** A short mark that a card took the write, for a hand that is not watching. */
const confirm = () => {
    try { navigator.vibrate?.(60); } catch { /* not every phone has one */ }
    try {
        const Ctx = (window as unknown as {
            AudioContext?: typeof AudioContext;
            webkitAudioContext?: typeof AudioContext;
        });
        const Audio = Ctx.AudioContext || Ctx.webkitAudioContext;
        if (!Audio) return;
        const ctx = new Audio();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = 880;
        gain.gain.value = 0.08;
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.09);
        setTimeout(() => ctx.close(), 300);
    } catch { /* sound is a courtesy, not a requirement */ }
};

type Status = 'pending' | 'written' | 'skipped';

interface Props {
    links: string[];
    numbers: string[];
    onClose: () => void;
}

const CardWriter: React.FC<Props> = ({ links, numbers, onClose }) => {
    const [index, setIndex] = useState(0);
    const [status, setStatus] = useState<Status[]>(() => links.map(() => 'pending'));
    const [waiting, setWaiting] = useState(false);
    const [problem, setProblem] = useState('');
    const abortRef = useRef<AbortController | null>(null);
    const supported = cardWritingSupported();

    useEffect(() => () => abortRef.current?.abort(), []);

    const written = status.filter(s => s === 'written').length;
    const skipped = status.filter(s => s === 'skipped').length;
    const finished = index >= links.length;

    const mark = (at: number, value: Status) =>
        setStatus(prev => prev.map((s, i) => (i === at ? value : s)));

    /**
     * Waits for one card and writes the address for the current position.
     *
     * The browser resolves this the moment a card has taken the write, so the
     * call itself is the wait — there is nothing to poll and nothing to time.
     */
    const writeOne = useCallback(async (at: number) => {
        const Ctor = writerCtor();
        if (!Ctor || at >= links.length) return;

        setProblem('');
        setWaiting(true);
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        try {
            await new Ctor().write(
                { records: [{ recordType: 'url', data: links[at] }] },
                { overwrite: true, signal: controller.signal },
            );
            confirm();
            mark(at, 'written');
            setIndex(at + 1);
            setWaiting(false);
        } catch (e) {
            setWaiting(false);
            if (controller.signal.aborted) return;
            const err = e as { name?: string; message?: string };
            // Being refused for want of a gesture is not a fault in the card;
            // the button comes back and the next tap re-arms it.
            setProblem(
                err.name === 'NotAllowedError'
                    ? 'Натиснете отново, за да продължите.'
                    : err.message || 'Картата не прие записа. Опитайте пак или я прескочете.',
            );
        }
    }, [links]);

    // Each card that succeeds arms the next one, so a run of good cards needs no
    // touching of the screen at all.
    useEffect(() => {
        if (!supported || finished || waiting || problem) return;
        if (index === 0 && status.every(s => s === 'pending')) return;  // the first is armed by the button
        void writeOne(index);
    }, [index, supported, finished, waiting, problem, status, writeOne]);

    const skip = () => {
        abortRef.current?.abort();
        setWaiting(false);
        mark(index, 'skipped');
        setIndex(index + 1);
    };

    const retrySkipped = () => {
        const first = status.findIndex(s => s === 'skipped');
        if (first < 0) return;
        setStatus(prev => prev.map(s => (s === 'skipped' ? 'pending' : s)));
        setProblem('');
        setIndex(first);
    };

    const shell: React.CSSProperties = {
        position: 'fixed', inset: 0, zIndex: 11000,
        background: '#0B1120', color: '#fff',
        display: 'flex', flexDirection: 'column',
        padding: '1.5rem 1.25rem', boxSizing: 'border-box', textAlign: 'center',
    };

    const closeButton = (
        <button
            onClick={() => { abortRef.current?.abort(); onClose(); }}
            style={{
                position: 'absolute', top: '1rem', right: '1rem',
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer', padding: '.5rem', display: 'flex',
            }}
        >
            <X size={22} />
        </button>
    );

    if (!supported) {
        return (
            <div style={{ ...shell, alignItems: 'center', justifyContent: 'center', gap: '1.25rem' }}>
                {closeButton}
                <AlertTriangle size={44} color="#ffab00" />
                <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Тук не може да се записва</h2>
                <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '24rem', lineHeight: 1.6 }}>
                    Записването на карти работи само в <b>Chrome на Android</b>.
                    Отворете панела на телефон и опитайте отново.
                </p>
            </div>
        );
    }

    if (finished) {
        return (
            <div style={{ ...shell, alignItems: 'center', justifyContent: 'center', gap: '1.1rem' }}>
                {closeButton}
                <Check size={52} color="#00c853" />
                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Готово</h2>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.05rem' }}>
                    Записани <b style={{ color: '#fff' }}>{written}</b> от {links.length} карти.
                </p>
                {skipped > 0 && (
                    <>
                        <p style={{ color: '#ffab00', fontSize: '.95rem', maxWidth: '24rem', lineHeight: 1.6 }}>
                            {skipped} карти са прескочени. Отделете ги настрани — линковете им
                            остават свободни, докато не бъдат записани.
                        </p>
                        <button
                            onClick={retrySkipped}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '.5rem',
                                background: 'rgba(255,171,0,0.14)', color: '#ffab00',
                                border: '1px solid rgba(255,171,0,0.4)', borderRadius: '12px',
                                padding: '.85rem 1.4rem', fontWeight: 700, cursor: 'pointer',
                            }}
                        >
                            <RotateCcw size={17} /> Пробвай прескочените
                        </button>
                    </>
                )}
            </div>
        );
    }

    const done = written + skipped;
    return (
        <div style={{ ...shell, alignItems: 'center', justifyContent: 'center', gap: '1.1rem' }}>
            {closeButton}

            <div style={{ fontSize: '.82rem', letterSpacing: '.12em', color: 'rgba(255,255,255,0.45)' }}>
                КАРТА {index + 1} ОТ {links.length}
            </div>

            <div style={{ fontSize: '2.4rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
                {numbers[index] || ''}
            </div>

            <Nfc
                size={72}
                color={waiting ? '#20C0DA' : 'rgba(255,255,255,0.35)'}
                style={waiting ? { animation: 'cw-pulse 1.4s ease-in-out infinite' } : undefined}
            />

            <div style={{ fontSize: '1.15rem', fontWeight: 700, minHeight: '1.6em' }}>
                {waiting ? 'Допрете картата' : problem ? '' : 'Готов за следващата'}
            </div>

            {problem && (
                <div style={{
                    color: '#ff8a8a', fontSize: '.9rem', lineHeight: 1.5, maxWidth: '24rem',
                    background: 'rgba(255,82,82,0.1)', border: '1px solid rgba(255,82,82,0.3)',
                    borderRadius: '12px', padding: '.7rem 1rem',
                }}>
                    {problem}
                </div>
            )}

            {(!waiting || problem) && (
                <button
                    onClick={() => void writeOne(index)}
                    style={{
                        background: 'rgba(32,192,218,0.16)', color: '#20C0DA',
                        border: '1px solid rgba(32,192,218,0.45)', borderRadius: '14px',
                        padding: '1rem 2rem', fontWeight: 800, fontSize: '1.05rem', cursor: 'pointer',
                    }}
                >
                    {problem ? 'Опитай пак' : 'Започни'}
                </button>
            )}

            <div style={{ flex: 1 }} />

            {/* The address being written, small: it is here to be checked
                against a card, not to be read. */}
            <div style={{
                fontSize: '.7rem', color: 'rgba(255,255,255,0.3)',
                wordBreak: 'break-all', maxWidth: '30rem', lineHeight: 1.5,
            }}>
                {links[index]}
            </div>

            <div style={{ width: '100%', maxWidth: '30rem' }}>
                <div style={{ height: '5px', borderRadius: '50px', background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                    <div style={{
                        width: `${(done / links.length) * 100}%`, height: '100%',
                        background: '#00c853', transition: 'width .2s ease',
                    }} />
                </div>
                <div style={{
                    display: 'flex', justifyContent: 'space-between', marginTop: '.5rem',
                    fontSize: '.75rem', color: 'rgba(255,255,255,0.4)',
                }}>
                    <span>записани {written}</span>
                    {skipped > 0 && <span style={{ color: '#ffab00' }}>прескочени {skipped}</span>}
                </div>
            </div>

            <button
                onClick={skip}
                style={{
                    display: 'inline-flex', alignItems: 'center', gap: '.45rem',
                    background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)',
                    fontSize: '.85rem', cursor: 'pointer', padding: '.6rem',
                }}
            >
                <SkipForward size={15} /> Прескочи тази карта
            </button>

            <style>{`
                @keyframes cw-pulse { 0%,100% { opacity: .45; } 50% { opacity: 1; } }
                @media (prefers-reduced-motion: reduce) {
                    [style*="cw-pulse"] { animation: none !important; }
                }
            `}</style>
        </div>
    );
};

export default CardWriter;
