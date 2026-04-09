/**
   * Pads a number or string with leading zeros to produce a 15-character ID.
   * Used to generate PocketBase-friendly record IDs.
   *
   * @param x - Epoch value as a string
   * @returns A 15-character lowercase, zero-padded ID string
   */
export const ToId = (x: string): string => {
    x = x.slice(0, 15);
    return "0".repeat(15 - x.length) + x.toLowerCase();
};