/** Max size we accept from the file picker before compressing. Phone photos are often 4–12 MB. */
export const IMAGE_PICK_MAX_BYTES = 20 * 1024 * 1024;

/** Target size after WebP encode. Small enough for mobile uploads on a weak network. */
export const IMAGE_OUTPUT_MAX_BYTES = 900 * 1024;

/** Long-edge cap for stored images. Matches the widest full-bleed hero we render. */
export const IMAGE_MAX_DIMENSION = 1600;
