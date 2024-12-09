// Helper function to convert size strings to bytes
export function parseBytes(size: string | number): number {
  if (typeof size === 'number') {
    return size;
  }

  const units = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(kb|mb|gb|b)?$/);
  if (!match || match.length < 2 || !match[1] || !match[2]) {
    throw new Error('Invalid size format');
  }

  const [, num, unit = 'b'] = match;
  return parseFloat(num) * units[unit as keyof typeof units];
}