import React, { useEffect, useRef, useState } from 'react';
import { Nfc, Check, AlertTriangle, Loader2 } from 'lucide-react';
import { normalizeUid } from '../tenant/cards';

/**
 * Reading a card's own serial number, without it travelling in the link.
 *
 * A chip announces its serial at the start of every NFC exchange, but a tag that
 * opens a link hands the browser the link and nothing else — the serial is not
 * part of what a tap delivers to a page. There are three ways it can reach the
 * system, and this is the one that needs no help from anybody:
 *
 *   - a reader or terminal reads it and passes it in (window.onNfcRawEvent),
 *   - the tag writes it into the link itself (a UID mirror), which puts it in
 *     the address bar for anyone to copy,
 *   - the page asks for it directly, which is this.
 *
 * Web NFC is Chrome on Android only, and needs a tap on a button before it may
 * scan. So the card is held to the phone twice when it is issued: once to open
 * it, once to record its chip. Every day afterwards, one tap is enough — the
 * serial is only compared, and the terminal supplies it.
 */

interface NDEFReadingEvent extends Event {
    serialNumber?: string;
}

interface NDEFReaderLike {
    scan(options?: { signal?: AbortSignal }): Promise<void>;
    onreading: ((event: NDEFReadingEvent) => void) | null;
    onreadingerror: ((event: Event) => void) | null;
}

type NDEFReaderCtor = new () => NDEFReaderLike;

const readerCtor = (): NDEFReaderCtor | null =>
    (window as unknown as { NDEFReader?: NDEFReaderCtor }).NDEFReader || null;

export const chipReadingSupported = () => readerCtor() !== null;

interface Props {
    value: string;
    onRead: (uid: string) => void;
}

const ChipReader: React.FC<Props> = ({ value, onRead }) => {
    const [state, setState] = useState<'idle' | 'waiting' | 'error'>('idle');
    const [problem, setProblem] = useState('');
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => () => abortRef.current?.abort(), []);

    const supported = chipReadingSupported();

    const read = async () => {
        const Ctor = readerCtor();
        if (!Ctor) return;
        setProblem('');
        setState('waiting');
        try {
            abortRef.current?.abort();
            const controller = new AbortController();
            abortRef.current = controller;

            const reader = new Ctor();
            reader.onreading = (event) => {
                const uid = normalizeUid(event.serialNumber);
                if (uid) {
                    onRead(uid);
                    setState('idle');
                    controller.abort();
                } else {
                    setProblem('Картата не съобщи разпознаваем номер. Опитайте пак.');
                    setState('error');
                }
            };
            reader.onreadingerror = () => {
                setProblem('Картата не се прочете. Дръжте я неподвижно до телефона.');
                setState('error');
            };
            await reader.scan({ signal: controller.signal });
        } catch (err) {
            const message = (err as { name?: string; message?: string }) || {};
            setProblem(
                message.name === 'NotAllowedError'
                    ? 'Достъпът до NFC е отказан. Разрешете го от иконата вляво на адреса.'
                    : message.message || 'Четенето не успя.'
            );
            setState('error');
        }
    };

    const box: React.CSSProperties = {
        padding: '1rem 1.1rem',
        borderRadius: '14px',
        border: '1px solid rgba(255,255,255,0.1)',
        background: 'rgba(255,255,255,0.03)',
    };

    if (value) {
        return (
            <div style={{ ...box, borderColor: 'rgba(0,230,118,0.35)', background: 'rgba(0,230,118,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#00e676', fontWeight: 800, fontSize: '0.9rem' }}>
                    <Check size={17} /> Чипът е прочетен
                </div>
                <div style={{ marginTop: '0.4rem', fontFamily: 'monospace', fontSize: '0.85rem', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.75)' }}>
                    {value}
                </div>
                <button
                    type="button"
                    onClick={read}
                    style={{ marginTop: '0.6rem', background: 'none', border: 'none', padding: 0, color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                    Прочети друга карта
                </button>
            </div>
        );
    }

    if (!supported) {
        return (
            <div style={{ ...box, borderColor: 'rgba(255,171,0,0.3)', background: 'rgba(255,171,0,0.07)' }}>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                    <AlertTriangle size={17} color="#ffab00" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.6)' }}>
                        Този браузър не може да чете чипове. Картата ще се издаде без записан
                        чип — номерът ѝ ще се запише сам при първото ѝ сканиране на четец.
                        <br />
                        За да се запише сега, отворете страницата с <b>Chrome на Android</b>.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={box}>
            <button
                type="button"
                onClick={read}
                disabled={state === 'waiting'}
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                    padding: '0.9rem', borderRadius: '11px', cursor: state === 'waiting' ? 'default' : 'pointer',
                    background: state === 'waiting' ? 'rgba(255,255,255,0.05)' : 'rgba(0,173,181,0.14)',
                    border: '1px solid rgba(0,173,181,0.4)',
                    color: 'var(--primary-color)', fontWeight: 800, fontSize: '0.92rem',
                }}
            >
                {state === 'waiting'
                    ? <><Loader2 size={17} /> Допрете картата…</>
                    : <><Nfc size={17} /> Прочети чипа на картата</>}
            </button>

            <p style={{ margin: '0.7rem 0 0', fontSize: '0.8rem', lineHeight: 1.6, color: 'rgba(255,255,255,0.45)' }}>
                Записва серийния номер на самата карта, за да не може същият профил да
                тръгне на втора карта. Без него картата пак се издава — номерът ѝ се
                записва при първото сканиране на четец.
            </p>

            {problem && (
                <p style={{ margin: '0.6rem 0 0', fontSize: '0.82rem', fontWeight: 600, color: '#ffab00', lineHeight: 1.5 }}>
                    {problem}
                </p>
            )}
        </div>
    );
};

export default ChipReader;
