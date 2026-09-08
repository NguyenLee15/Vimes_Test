const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
const GROUP_NAMES = ['', 'nghìn', 'triệu', 'tỷ'];

function readThreeDigits(hundreds: number, tens: number, ones: number, hasLeadingGroup: boolean): string {
  const parts: string[] = [];

  if (hundreds > 0) {
    parts.push(DIGITS[hundreds], 'trăm');
  } else if (hasLeadingGroup) {
    parts.push('không', 'trăm');
  }

  if (tens > 1) {
    parts.push(DIGITS[tens], 'mươi');
    if (ones === 1) {
      parts.push('mốt');
    } else if (ones === 5) {
      parts.push('lăm');
    } else if (ones > 0) {
      parts.push(DIGITS[ones]);
    }
  } else if (tens === 1) {
    parts.push('mười');
    if (ones === 5) {
      parts.push('lăm');
    } else if (ones > 0) {
      parts.push(DIGITS[ones]);
    }
  } else if (ones > 0) {
    if (hundreds > 0 || hasLeadingGroup) {
      parts.push('linh');
    }
    parts.push(DIGITS[ones]);
  }

  return parts.join(' ');
}

function splitIntoGroups(n: bigint): number[][] {
  const groups: number[][] = [];

  while (n > 0n) {
    const remainder = Number(n % 1000n);
    groups.push([
      Math.floor(remainder / 100),
      Math.floor((remainder % 100) / 10),
      remainder % 10,
    ]);
    n = n / 1000n;
  }

  return groups.reverse();
}

export function numberToVietnameseWords(amount: bigint): string {
  if (amount < 0n) {
    return 'Số tiền không hợp lệ';
  }

  if (amount === 0n) {
    return 'Không đồng';
  }

  const groups = splitIntoGroups(amount);
  const parts: string[] = [];

  for (let i = 0; i < groups.length; i++) {
    const [h, t, o] = groups[i];
    const groupIndex = groups.length - 1 - i;
    const hasLeadingGroup = i > 0;

    if (h === 0 && t === 0 && o === 0) {
      continue;
    }

    const text = readThreeDigits(h, t, o, hasLeadingGroup);

    const groupName = groupIndex >= GROUP_NAMES.length
      ? GROUP_NAMES[3]
      : GROUP_NAMES[groupIndex];

    parts.push(groupName ? `${text} ${groupName}` : text);
  }

  const result = parts.join(' ');
  return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng';
}
