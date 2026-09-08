import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Nfc, Check, SkipForward, X, AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Writing a batch of cards, one card at a time.
 *
 * The apps that write NFC tags hold one record and put it on every card touched
 * to them. That is the wrong shape for a batch: two hundred cards each need a
 * different address, and a tool that writes the same one to all of them makes
 * two hundred cards that open the same passenger — a fault nobody sees until
 * the second card is scanned. So the list stays here, where it was generated,
 * and the phone walks through it.
 *
 * The hard part is knowing when one card ends and the next begins. Writing
 * finishes the instant the card has taken the record, and the card is still
 * lying on the phone at that moment; arming the next write there puts the next
 * address onto the same card, and the one after that, until the hand moves. The
 * first version of this did exactly that and wrote five or six positions onto
 * one card in a second.
 *
 * There is no "card removed" event to wait for. What there is, is the serial
 * every chip announces before anything else: it identifies the piece of plastic
 * itself. So the phone listens rather than writes, and a serial it has already
 * written to is ignored however long the card is held. One card is one write,
 * whatever the hand does.
 *
 * Web NFC is Chrome on Android only. Nothing here works anywhere else, and the
 * screen says so rather than failing quietly.
 */

interface NDEFReadingEvent extends Event {
    serialNumber?: string;
}

interface NDEFReaderLike {
    scan(options?: { signal?: AbortSignal }): Promise<void>;
    write(
        message: { records: { recordType: string; data: string }[] },
        options?: { overwrite?: boolean; signal?: AbortSignal },
    ): Promise<void>;
    onreading: ((event: NDEFReadingEvent) => void) | null;
    onreadingerror: ((event: Event) => void) | null;
}

type NDEFReaderCtor = new () => NDEFReaderLike;

const readerCtor = (): NDEFReaderCtor | null =>
    (window as unknown as { NDEFReader?: NDEFReaderCtor }).NDEFReader || null;

export const cardWritingSupported = () => readerCtor() !== null;

/** A short mark that a card took the write, for a hand that is not watching. */
const confirm = () => {
    try { navigator.vibrate?.(60); } catch { /* not every phone has one */ }
    try {
        const w = window as unknown as {
            AudioContext?: typeof AudioContext;
            webkitAudioContext?: typeof AudioContext;
        };
        const Audio = w.AudioContext || w.webkitAudioContext;
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
    const [listening, setListening] = useState(false);
    const [busy, setBusy] = useState(false);
    const [problem, setProblem] = useState('');
    const [lastNumber, setLastNumber] = useState('');

    // The scan runs for the whole session and its handler is rebuilt as the
    // position moves, so these follow the state rather than the closure.
    const indexRef = useRef(0);
    const busyRef = useRef(false);
    const doneSerials = useRef<Set<string>>(new Set());
    const abortRef = useRef<AbortController | null>(null);

    const supported = cardWritingSupported();
    const written = status.filter(s => s === 'written').length;
    const skipped = status.filter(s => s === 'skipped').length;
    const finished = index >= links.length;

    useEffect(() => { indexRef.current = index; }, [index]);
    useEffect(() => () => abortRef.current?.abort(), []);

    // Once the list is walked there is nothing left to listen for.
    useEffect(() => {
        if (finished && abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
            setListening(false);
        }
    }, [finished]);

    const mark = (at: number, value: Status) =>
        setStatus(prev => prev.map((s, i) => (i === at ? value : s)));

    /**
     * Listens for cards and writes each one exactly once.
     *
     * Started by a button, because the browser will not open the reader without
     * a deliberate action, and then left running: every card after the first is
     * just a card held to the phone.
     */
    const start = useCallback(async () => {
        const Ctor = readerCtor();
        if (!Ctor) return;

        setProblem('');
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        const reader = new Ctor();

        reader.onreading = (event) => {
            const serial = String(event.serialNumber || '').trim().toUpperCase();

            // Without a serial there is no way to tell one card from the next,
            // and writing on every reading is what wrote six positions onto one
            // card. Better to stop and say so.
            if (!serial) {
                setProblem('Телефонът не съобщава номер на чипа, затова не мога да позная кога сменяте картата. Спрете и ми кажете.');
                return;
            }

            // The same card, still lying on the phone. It has had its address.
            if (doneSerials.current.has(serial)) return;
            if (busyRef.current) return;

            const at = indexRef.current;
            if (at >= links.length) return;

            busyRef.current = true;
            setBusy(true);
            setProblem('');

            new Ctor()
                .write(
                    { records: [{ recordType: 'url', data: links[at] }] },
                    { overwrite: true, signal: controller.signal },
                )
                .then(() => {
                    doneSerials.current.add(serial);
                    confirm();
                    setLastNumber(numbers[at] || '');
                    mark(at, 'written');
                    setIndex(at + 1);
                })
                .catch((e: { message?: string }) => {
                    if (controller.signal.aborted) return;
                    setProblem(e?.message || 'Картата не прие записа. Вдигнете я и опитайте пак, или я прескочете.');
                })
                .finally(() => {
                    busyRef.current = false;
                    setBusy(false);
                });
        };

        reader.onreadingerror = () => {
            setProblem('Картата не се прочете. Дръпнете я и я допрете отново.');
        };

        try {
            setListening(true);
            await reader.scan({ signal: controller.signal });
        } catch (e) {
            setListening(false);
            const err = e as { name?: string; message?: string };
            setProblem(
                err.name === 'NotAllowedError'
                    ? 'Достъпът до NFC е отказан. Разрешете го и натиснете отново.'
                    : err.message || 'NFC не тръгна.',
            );
        }
    }, [links, numbers]);

    const skip = () => {
        mark(index, 'skipped');
        setIndex(index + 1);
        setProblem('');
    };

    const retrySkipped = () => {
        const first = status.findIndex(s => s === 'skipped');
        if (first < 0) return;
        setStatus(prev => prev.map(s => (s === 'skipped' ? 'pending' : s)));
        setProblem('');
        setIndex(first);
        void start();
    };

    const shell: React.CSSProperties = {
        position: 'fixed', inset: 0, zIndex: 11000,
        background: '#0B1120', color: '#fff',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem 1.25rem', boxSizing: 'border-box',
        textAlign: 'center', gap: '1rem',
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
            <div style={shell}>
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
            <div style={shell}>
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
        <div style={shell}>
            {closeButton}

            <div style={{ fontSize: '.82rem', letterSpacing: '.12em', color: 'rgba(255,255,255,0.45)' }}>
                КАРТА {index + 1} ОТ {links.length}
            </div>

            <div style={{ fontSize: '2.4rem', fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
                {numbers[index] || ''}
            </div>

            <Nfc
                size={72}
                color={busy ? '#00c853' : listening ? '#20C0DA' : 'rgba(255,255,255,0.35)'}
                style={listening && !busy ? { animation: 'cw-pulse 1.4s ease-in-out infinite' } : undefined}
            />

            <div style={{ fontSize: '1.15rem', fontWeight: 700, minHeight: '1.6em' }}>
                {busy ? 'Записва…' : listening ? 'Допрете картата' : 'Натиснете, за да започнете'}
            </div>

            {listening && !busy && (
                <div style={{ fontSize: '.82rem', color: 'rgba(255,255,255,0.4)', maxWidth: '22rem', lineHeight: 1.5 }}>
                    След всяка карта я <b style={{ color: 'rgba(255,255,255,0.65)' }}>вдигнете</b> и
                    сложете следващата. Една карта се записва само веднъж.
                </div>
            )}

            {lastNumber && !busy && (
                <div style={{ fontSize: '.8rem', color: '#00c853' }}>
                    ✓ записана {lastNumber}
                </div>
            )}

            {problem && (
                <div style={{
                    color: '#ff8a8a', fontSize: '.88rem', lineHeight: 1.5, maxWidth: '24rem',
                    background: 'rgba(255,82,82,0.1)', border: '1px solid rgba(255,82,82,0.3)',
                    borderRadius: '12px', padding: '.7rem 1rem',
                }}>
                    {problem}
                </div>
            )}

            {!listening && (
                <button
                    onClick={() => void start()}
                    style={{
                        background: 'rgba(32,192,218,0.16)', color: '#20C0DA',
                        border: '1px solid rgba(32,192,218,0.45)', borderRadius: '14px',
                        padding: '1rem 2rem', fontWeight: 800, fontSize: '1.05rem', cursor: 'pointer',
                    }}
                >
                    Започни
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
