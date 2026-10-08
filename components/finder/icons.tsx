"use client";

import { useState } from "react";
export function FolderIcon({ size = 64, id = "f" }: { size?: number; id?: string }) {
  return (
    <svg width={size} height={size * 0.82} viewBox="0 0 64 52" aria-hidden>
      <defs>
        <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6cc4fb" />
          <stop offset="1" stopColor="#2f8fe8" />
        </linearGradient>
        <linearGradient id={`${id}-t`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4aa9f2" />
          <stop offset="1" stopColor="#2a86df" />
        </linearGradient>
      </defs>
      <path d="M4 8a4 4 0 0 1 4-4h14l5 5h29a4 4 0 0 1 4 4v33a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" fill={`url(#${id}-t)`} />
      <path d="M4 17a4 4 0 0 1 4-4h48a4 4 0 0 1 4 4v27a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" fill={`url(#${id}-b)`} />
      <path d="M8 13.5h48a3.5 3.5 0 0 1 3.5 3.5" fill="none" stroke="#fff" strokeOpacity=".45" />
    </svg>
  );
}

export function SmallFolder({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.82} viewBox="0 0 24 20" aria-hidden fill="currentColor">
      <path d="M2 4a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2Z" />
    </svg>
  );
}

function FinderFaceSvg({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <defs><linearGradient id="rm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".9"/><stop offset=".5" stopColor="#fff" stopOpacity=".15"/><stop offset="1" stopColor="#fff" stopOpacity=".45"/></linearGradient><linearGradient id="fl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3fb4ff"/><stop offset="1" stopColor="#1a6cf0"/></linearGradient><linearGradient id="fr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f4f8ff"/><stop offset="1" stopColor="#c9dcf7"/></linearGradient><clipPath id="fc"><rect width="48" height="48" rx="11"/></clipPath></defs>
      <g clipPath="url(#fc)"><rect width="48" height="48" fill="url(#fr)" /><path d="M0 0h25c-3 14-3 30 1 48H0Z" fill="url(#fl)" /></g>
      <path d="M14 14v6M33 14v6" stroke="#0a2540" strokeWidth="2.6" strokeLinecap="round" /><path d="M26 12c0 8 1 15-1 20" stroke="#0a2540" strokeOpacity=".25" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <path d="M13 31c6 6 15 6 22 0" stroke="#0a2540" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      <rect x=".5" y=".5" width="47" height="47" rx="10.5" fill="none" stroke="url(#rm)" />
    </svg>
  );
}

export function AppleGlyph() {
  return (
    <svg width="14" height="17" viewBox="0 0 14 17" fill="currentColor" aria-hidden>
      <path d="M11.6 9c0-2 1.6-2.9 1.7-3-.9-1.4-2.4-1.5-2.9-1.6-1.2-.1-2.4.7-3 .7s-1.600-.7-2.600-.7C3.500 4.400 2.300 5.200 1.600 6.300.2 8.600 1.200 12 2.500 13.900c.7.900 1.400 2 2.400 2s1.300-.6 2.500-.6 1.500.6 2.500.6 1.700-.9 2.300-1.900c.7-1 1-2 1-2.100 0 0-1.600-.6-1.600-2.900ZM9.800 3c.5-.6.900-1.500.8-2.400-.8 0-1.700.5-2.300 1.200-.5.600-.9 1.500-.8 2.300.9.100 1.800-.4 2.300-1.100Z" />
    </svg>
  );
}

const squircle = (id: string, a: string, b: string) => (
  <defs>
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={a} />
      <stop offset="1" stopColor={b} />
    </linearGradient>
  </defs>
);

function NotesIconSvg({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <defs><linearGradient id="rm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".9"/><stop offset=".5" stopColor="#fff" stopOpacity=".15"/><stop offset="1" stopColor="#fff" stopOpacity=".45"/></linearGradient><linearGradient id="nb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff"/><stop offset="1" stopColor="#f1efe8"/></linearGradient><clipPath id="nc"><rect width="48" height="48" rx="11"/></clipPath></defs>
      <g clipPath="url(#nc)"><rect width="48" height="48" fill="url(#nb)" /><rect width="48" height="9" fill="#ffd60a" /><rect y="8" width="48" height="1" fill="#e6b800" opacity=".6" /></g>
      <path d="M9 19h30M9 26h30M9 33h30M9 40h20" stroke="#c9c6bd" strokeWidth="1.2" strokeLinecap="round" />
      <rect x=".5" y=".5" width="47" height="47" rx="10.5" fill="none" stroke="url(#rm)" />
    </svg>
  );
}

export function CalculatorIcon({ size = 48 }: { size?: number }) {
  const k = (x: number, y: number, c: string) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3.8" fill={c} />;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <defs><linearGradient id="rm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".9"/><stop offset=".5" stopColor="#fff" stopOpacity=".15"/><stop offset="1" stopColor="#fff" stopOpacity=".45"/></linearGradient><linearGradient id="cb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#4a4a4e"/><stop offset="1" stopColor="#1c1c1e"/></linearGradient></defs>
      <g transform="translate(4.8 5.2) scale(.8)">
      <rect width="48" height="48" rx="11" fill="url(#cb)" />
      <rect x="7" y="6.5" width="34" height="10" rx="4" fill="#2b2b2e" /><text x="38" y="14.5" textAnchor="end" fontSize="9" fill="#fff" fontFamily="-apple-system, system-ui" fontWeight="300">0</text>
      {[0,1,2].map(r => [0,1,2].map(c => k(13 + c * 11, 25 + r * 8.6, c === 2 ? "#ff9f0a" : "#7a7a7e")))}
      <rect x=".5" y=".5" width="47" height="47" rx="10.5" fill="none" stroke="url(#rm)" />
      </g>
    </svg>
  );
}

function SettingsIconSvg({ size = 48 }: { size?: number }) {
  const t = Array.from({ length: 8 }, (_, i) => <rect key={i} x="21" y="5" width="6" height="9" rx="2" transform={`rotate(${i * 45} 24 24)`} />);
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <defs><linearGradient id="rm" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".9"/><stop offset=".5" stopColor="#fff" stopOpacity=".15"/><stop offset="1" stopColor="#fff" stopOpacity=".45"/></linearGradient><linearGradient id="sb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d9dade"/><stop offset="1" stopColor="#9b9ca3"/></linearGradient><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5a5b61"/><stop offset="1" stopColor="#3b3c41"/></linearGradient></defs>
      <rect width="48" height="48" rx="11" fill="url(#sb)" />
      <g fill="url(#sg)">{t}<circle cx="24" cy="24" r="14" /></g>
      <circle cx="24" cy="24" r="7" fill="url(#sb)" /><circle cx="24" cy="24" r="14" fill="none" stroke="#fff" strokeOpacity=".25" />
      <rect x=".5" y=".5" width="47" height="47" rx="10.5" fill="none" stroke="url(#rm)" />
    </svg>
  );
}

export function TrashIcon({ size = 48 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      {squircle("tr", "#e3e6ec", "#a9aeb8")}
      <rect width="48" height="48" rx="11" fill="url(#tr)" opacity=".85" />
      <path d="M15 17h18l-1.6 20a2 2 0 0 1-2 1.8H18.600a2 2 0 0 1-2-1.800Z" fill="#6a6f7a" />
      <rect x="13" y="13" width="22" height="3.600" rx="1.800" fill="#555a64" />
      <rect x="20" y="10" width="8" height="3.500" rx="1.700" fill="#555a64" />
    </svg>
  );
}

/* Community Tahoe icons from macosicons.com (see CREDITS.md). Own SVG kept as fallback. */
function Img({ src, size, fallback }: { src: string; size: number; fallback: import("react").ReactNode }) {
  const [bad, setBad] = useState(false);
  if (bad) return <>{fallback}</>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} width={size} height={size} alt="" draggable={false} onError={() => setBad(true)} style={{ display: "block" }} />;
}
export function FinderFace({ size = 48 }: { size?: number }) { return <Img src="/icons/finder.png" size={size} fallback={<FinderFaceSvg size={size} />} />; }
export function NotesIcon({ size = 48 }: { size?: number }) { return <Img src="/icons/notes.png" size={size} fallback={<NotesIconSvg size={size} />} />; }
export function SettingsIcon({ size = 48 }: { size?: number }) { return <Img src="/icons/settings.png" size={size} fallback={<SettingsIconSvg size={size} />} />; }
