declare module 'subset-font' {
  export default function subsetFont(
    font: Uint8Array | ArrayBuffer,
    text: string,
    options?: {
      targetFormat?: 'sfnt' | 'woff' | 'woff2';
      variationAxes?: Record<string, number | { min: number; max: number }>;
    },
  ): Promise<Uint8Array>;
}
