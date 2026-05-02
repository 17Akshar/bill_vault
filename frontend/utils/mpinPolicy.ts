/**
 * Client-side MPIN weakness check — mirrors backend _is_weak_mpin in server.py.
 * Keeping validation on both sides gives instant UX feedback + defense-in-depth.
 */
export function isWeakMpin(mpin: string): string | null {
  if (!/^\d{4,6}$/.test(mpin)) return 'MPIN must be 4–6 digits';

  // Repeating digits: 1111, 0000, 222222
  if (new Set(mpin).size === 1) {
    return 'MPIN cannot be all the same digit (e.g., 1111)';
  }

  const digits = mpin.split('').map(c => parseInt(c, 10));

  // Simple ascending: 1234, 12345, 012345
  if (digits.every((d, i) => i === 0 || d - digits[i - 1] === 1)) {
    return 'MPIN cannot be a simple sequence (e.g., 1234)';
  }

  // Simple descending: 4321, 9876
  if (digits.every((d, i) => i === 0 || digits[i - 1] - d === 1)) {
    return 'MPIN cannot be a simple descending sequence (e.g., 4321)';
  }

  // Repeating pair: 1212, 121212, 4545
  if (mpin.length % 2 === 0) {
    const pair = mpin.slice(0, 2);
    if (pair.repeat(mpin.length / 2) === mpin) {
      return 'MPIN cannot be a repeating pattern (e.g., 1212)';
    }
  }

  const COMMON_WEAK = new Set([
    '1234', '0000', '1111', '2222', '3333', '4444', '5555', '6666',
    '7777', '8888', '9999', '1212', '1004', '2000', '6969', '4321',
    '0007', '1122', '1313',
    '123456', '654321', '111111', '000000', '112233', '121212',
    '123123', '111222', '112211', '147258', '159357', '987654',
  ]);
  if (COMMON_WEAK.has(mpin)) {
    return 'This MPIN is too common. Please choose a harder-to-guess one.';
  }

  return null;
}
