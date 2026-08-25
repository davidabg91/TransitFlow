import React from 'react';

/**
 * Card scheme marks, drawn rather than fetched.
 *
 * A checkout that loads its brand logos from someone else's CDN tells that CDN
 * who is looking at which card, and shows an empty box when the request is slow
 * or blocked. These are a few shapes and two words each, so they are drawn here
 * and cost nothing.
 */

const chip: React.CSSProperties = {
    width: 40,
    height: 26,
    borderRadius: 5,
    background: '#fff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 1px 2px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(0,0,0,0.06)',
};

const word: React.CSSProperties = {
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontWeight: 900,
    lineHeight: 1,
    userSelect: 'none',
};

/** Two circles and the lens where they meet — Mastercard and Maestro both. */
const Circles: React.FC<{ left: string; right: string; overlap: string }> = ({ left, right, overlap }) => (
    <svg width="27" height="17" viewBox="0 0 30 19" aria-hidden="true">
        <circle cx="11" cy="9.5" r="9" fill={left} />
        <circle cx="19" cy="9.5" r="9" fill={right} />
        <path d="M15 2.2a9 9 0 0 0 0 14.6 9 9 0 0 0 0-14.6z" fill={overlap} />
    </svg>
);

export const Visa: React.FC = () => (
    <span style={chip} title="Visa" role="img" aria-label="Visa">
        <span style={{ ...word, color: '#1434CB', fontSize: 12, fontStyle: 'italic', letterSpacing: '-0.03em' }}>
            VISA
        </span>
    </span>
);

export const Mastercard: React.FC = () => (
    <span style={chip} title="Mastercard" role="img" aria-label="Mastercard">
        <Circles left="#EB001B" right="#F79E1B" overlap="#FF5F00" />
    </span>
);

export const Maestro: React.FC = () => (
    <span style={chip} title="Maestro" role="img" aria-label="Maestro">
        <Circles left="#EB001B" right="#0099DF" overlap="#6C6BBD" />
    </span>
);

export const Amex: React.FC = () => (
    <span style={{ ...chip, background: '#006FCF' }} title="American Express" role="img" aria-label="American Express">
        <span style={{ ...word, color: '#fff', fontSize: 8.5, letterSpacing: '0.02em' }}>AMEX</span>
    </span>
);

/** The apple silhouette, so the mark reads as Apple Pay on any platform. */
export const ApplePay: React.FC = () => (
    <span style={{ ...chip, background: '#000', boxShadow: '0 1px 2px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.14)' }}
        title="Apple Pay" role="img" aria-label="Apple Pay">
        <svg width="30" height="13" viewBox="0 0 44 19" aria-hidden="true">
            <path
                fill="#fff"
                d="M8.2 3.1c.5-.6.8-1.4.7-2.3-.7 0-1.6.5-2.1 1.1-.5.5-.9 1.4-.8 2.2.8.1 1.6-.4 2.2-1zM8.9 4.3c-1.2-.1-2.2.7-2.8.7-.6 0-1.4-.6-2.4-.6-1.2 0-2.4.7-3 1.8-1.3 2.2-.3 5.5 .9 7.3.6.9 1.3 1.9 2.3 1.8.9 0 1.3-.6 2.4-.6 1.1 0 1.4.6 2.4.6 1 0 1.6-.9 2.2-1.8.7-1 1-2 1-2-.1 0-2-.8-2-3 0-1.9 1.5-2.8 1.6-2.8-.9-1.3-2.3-1.4-2.6-1.4z"
            />
            <text x="15" y="14.5" fill="#fff" style={{ ...word, fontSize: 12 }}>Pay</text>
        </svg>
    </span>
);

/** Every mark a Bulgarian operator's terminal would take. */
const CardBrands: React.FC<{ gap?: number }> = ({ gap = 7 }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap, flexWrap: 'wrap' }}>
        <Visa />
        <Mastercard />
        <Maestro />
        <Amex />
        <ApplePay />
    </div>
);

export default CardBrands;
