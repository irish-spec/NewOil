export const formatMoney = (amount: number): string => {
  if (amount < 1000) return amount.toFixed(2);
  
  const suffixes = ["", "K", "M", "B", "T", "Qa", "Qi", "Sx", "Sp", "Oc", "No", "Dc", "Ud", "Dd", "Td", "Qad", "Qid", "Sxd", "Spd", "Od", "Nd", "V"];
  const suffixNum = Math.floor(("" + Math.floor(amount)).length / 3);
  
  let shortValue = parseFloat((suffixNum !== 0 ? (amount / Math.pow(1000, suffixNum)) : amount).toPrecision(3));
  if (shortValue % 1 !== 0) {
      shortValue = parseFloat(shortValue.toFixed(2));
  }
  return shortValue + (suffixes[suffixNum] || "");
};

export const formatTime = (ms: number): string => {
  if (ms < 1000) return Math.round(ms) + "ms";
  const sec = ms / 1000;
  if (sec < 60) return sec.toFixed(1) + "s";
  const min = sec / 60;
  if (min < 60) return min.toFixed(1) + "m";
  const hrs = min / 60;
  return hrs.toFixed(1) + "h";
}

export const calculateCost = (baseCost: number, level: number, increaseFactor: number): number => {
  // Original game approximation: Price = BaseCost * (1.15 ^ Level)
  return baseCost * Math.pow(1.15, level);
};

export const calculateRevenue = (baseRevenue: number, level: number, multiplier: number): number => {
    return (baseRevenue * level) * Math.pow(multiplier, level > 0 ? level - 1 : 0);
};

export const calculateCEOCost = (investmentBaseCost: number, ceoLevel: number): number => {
  // Estimated formula: BaseCost * 500 * (2.5 ^ Level)
  // This makes CEOs expensive but attainable
  return investmentBaseCost * 500 * Math.pow(2.5, ceoLevel);
}

export const calculateXP = (totalMoney: number): number => {
  // Experience is earned linearly, about every $6.725 billion gains 1 more experience.
  return Math.floor(totalMoney / 6725000000);
}

export const calculateXPMultiplier = (xp: number): number => {
  if (xp <= 1) return 1;
  // Multiplier = 2 ^ (log5 Experience)
  // log5(x) = ln(x) / ln(5)
  const log5 = Math.log(xp) / Math.log(5);
  return Math.pow(2, log5);
}
