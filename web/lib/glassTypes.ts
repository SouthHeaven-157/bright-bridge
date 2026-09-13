export type GlassType = "highball" | "tumbler" | "cocktail" | "collins";

export type GlassPreset = {
  id: GlassType;
  label: string;
  labelZh: string;
  clipPath: string;
  outlinePath: string;
  rimPath: string;
  highlightPath: string;
  basePath: string;
  liquidBounds: { x: number; width: number; top: number; bottom: number; surfaceRx: number };
};

export const GLASS_TYPES: readonly GlassPreset[] = [
  {
    id: "highball",
    label: "HIGHBALL",
    labelZh: "高球杯",
    clipPath: "M24 18h72l-8 112c-.8 12-10.8 21-22.8 21H54.8C42.8 151 32.8 142 32 130L24 18Z",
    outlinePath: "M24 18h72l-8 112c-.8 12-10.8 21-22.8 21H54.8C42.8 151 32.8 142 32 130L24 18Z",
    rimPath: "M25 19c13 3 57 3 70 0",
    highlightPath: "M37 31l6 88c.4 7 4 13 10 16",
    basePath: "M48 151v7h24v-7M42 159h36",
    liquidBounds: { x: 24, width: 72, top: 35, bottom: 139, surfaceRx: 35 },
  },
  {
    id: "tumbler",
    label: "TUMBLER",
    labelZh: "古典杯",
    clipPath: "M19 45h82l-9 82c-1.2 12-10 20-22 20H50c-12 0-20.8-8-22-20l-9-82Z",
    outlinePath: "M19 45h82l-9 82c-1.2 12-10 20-22 20H50c-12 0-20.8-8-22-20l-9-82Z",
    rimPath: "M20 46c16 3 64 3 80 0",
    highlightPath: "M32 57l6 61c.7 8 4 13 10 16",
    basePath: "M35 147h50M39 139h42",
    liquidBounds: { x: 19, width: 82, top: 55, bottom: 136, surfaceRx: 39 },
  },
  {
    id: "cocktail",
    label: "COCKTAIL",
    labelZh: "鸡尾酒杯",
    clipPath: "M16 34h88L65 106c-2.2 4-7.8 4-10 0L16 34Z",
    outlinePath: "M16 34h88L65 106c-2.2 4-7.8 4-10 0L16 34Z",
    rimPath: "M17 35c18 3 68 3 86 0",
    highlightPath: "M31 43l26 57",
    basePath: "M60 108v42M39 154h42",
    liquidBounds: { x: 16, width: 88, top: 42, bottom: 105, surfaceRx: 41 },
  },
  {
    id: "collins",
    label: "COLLINS",
    labelZh: "柯林杯",
    clipPath: "M31 14h58v123c0 9-7 16-16 16H47c-9 0-16-7-16-16V14Z",
    outlinePath: "M31 14h58v123c0 9-7 16-16 16H47c-9 0-16-7-16-16V14Z",
    rimPath: "M32 15c12 2.5 44 2.5 56 0",
    highlightPath: "M42 27v101c0 7 3 11 8 14",
    basePath: "M42 153h36M45 147h30",
    liquidBounds: { x: 31, width: 58, top: 25, bottom: 143, surfaceRx: 27 },
  },
] as const;

export const GLASS_TYPES_BY_ID = new Map(GLASS_TYPES.map((glass) => [glass.id, glass]));
export const DEFAULT_GLASS_TYPE: GlassType = "highball";
