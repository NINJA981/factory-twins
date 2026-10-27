import { ArrowRight, Check, Receipt, Star, TriangleAlert, X } from 'lucide-react';

// One icon family (Lucide, 1.75 stroke) plus the product's own glyph. Icons are always decorative
// here: the words beside them carry the meaning.

const STROKE = 1.75;

export function TwinGlyph({ size = 16 }: { size?: number }) {
  // Two photo frames and the strip they share: the product in one mark.
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
      <path
        d="M7.7 3.5h.6a2.2 2.2 0 0 1 2.2 2.2v4.6a2.2 2.2 0 0 1-2.2 2.2h-.6a2.2 2.2 0 0 1-2.2-2.2V5.7a2.2 2.2 0 0 1 2.2-2.2Z"
        fill="currentColor"
        opacity="0.3"
      />
      <rect x="1.4" y="3.5" width="9.1" height="9" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="5.5" y="3.5" width="9.1" height="9" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export const IconClose = () => <X size={14} strokeWidth={STROKE} aria-hidden="true" />;
export const IconArrow = () => <ArrowRight size={14} strokeWidth={STROKE} aria-hidden="true" />;
export const IconReceipt = () => <Receipt size={14} strokeWidth={STROKE} aria-hidden="true" />;
export const IconAlert = ({ size = 14 }: { size?: number }) => (
  <TriangleAlert size={size} strokeWidth={STROKE} aria-hidden="true" />
);
export const IconStar = () => <Star size={12} strokeWidth={STROKE} fill="currentColor" aria-hidden="true" />;
export const IconCheck = ({ size = 14 }: { size?: number }) => (
  <Check size={size} strokeWidth={2} aria-hidden="true" />
);
