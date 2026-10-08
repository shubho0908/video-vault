/** SF-Symbols look-alikes drawn as own SVG (not Apple artwork). 1.5-2px strokes, round caps. */
type P = { size?: number };
const S = (size: number, children: React.ReactNode, sw = 1.6) => (
  <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{children}</svg>
);
export const SFChevronLeft = ({ size = 17 }: P) => S(size, <path d="M12.200 4.200 6.400 10l5.800 5.800" />, 2.100);
export const SFChevronRight = ({ size = 17 }: P) => S(size, <path d="m7.800 4.200 5.800 5.800-5.800 5.800" />, 2.100);
export const SFGrid = ({ size = 16 }: P) => S(size, <><rect x="3" y="3" width="5.600" height="5.600" rx="1.300" /><rect x="11.400" y="3" width="5.600" height="5.600" rx="1.300" /><rect x="3" y="11.400" width="5.600" height="5.600" rx="1.300" /><rect x="11.400" y="11.400" width="5.600" height="5.600" rx="1.300" /></>, 1.500);
export const SFList = ({ size = 16 }: P) => S(size, <><path d="M7.500 5.500h9M7.500 10h9M7.500 14.500h9" /><circle cx="3.800" cy="5.500" r=".5" /><circle cx="3.800" cy="10" r=".5" /><circle cx="3.800" cy="14.500" r=".5" /></>, 1.600);
export const SFFolderPlus = ({ size = 17 }: P) => S(size, <><path d="M2.800 6.200c0-1 .8-1.700 1.700-1.700h3l1.600 1.700h5.400c1 0 1.700.8 1.700 1.700v1.100M2.800 6.200v7.300c0 1 .8 1.700 1.700 1.700h6.300" /><path d="M15 11.500v5M12.500 14h5" /></>, 1.500);
export const SFSearch = ({ size = 14 }: P) => S(size, <><circle cx="8.500" cy="8.500" r="5.200" /><path d="m12.400 12.400 4.200 4.200" /></>, 1.700);
export const SFCompose = ({ size = 17 }: P) => S(size, <><path d="M10.500 3.800H5.200c-.8 0-1.400.6-1.400 1.400v9.600c0 .8.6 1.400 1.400 1.400h9.600c.8 0 1.400-.6 1.400-1.400V9.500" /><path d="m8.300 11.700.4-2.300 6.300-6.300c.5-.5 1.300-.5 1.800 0s.5 1.300 0 1.800l-6.300 6.300z" /></>, 1.600);
export const SFTrash = ({ size = 17 }: P) => S(size, <><path d="M3.800 5.500h12.400M8 5.500V3.800h4v1.700M5.300 5.500l.7 10.200c0 .6.5 1 1 1h6c.5 0 1-.4 1-1l.7-10.200M8.300 8.700v4.600M11.700 8.700v4.600" /></>, 1.600);
