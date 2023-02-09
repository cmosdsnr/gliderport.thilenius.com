export const timestampToString = (ts: number): string => {
  return new Date(ts * 1000)
    .toISOString()
    .replace("T", " ")
    .replace(/\.[0-9]*Z/, "");
};

export const timestampToLocalString = (ts: number): string => {
  return new Date(ts * 1000).toLocaleString();
};

export const toHMS = (s: number): string => {
  let l = s;
  const h = Math.floor(l / 3600);
  let sStr = (h < 10 ? "0" : "") + h;
  l -= 3600 * h;
  const m = Math.floor(l / 60);
  sStr += (m < 10 ? ":0" : ":") + m;
  l -= 60 * m;
  sStr += (l < 10 ? ":0" : ":") + l;
  return sStr;
};

export const getTsFromDate = (date: Date): number => {
  return Math.floor(date.getTime() / 1000);
};

export const getSQLDate = (date: Date): string => {
  return (
    date.getUTCFullYear() +
    "-" +
    ("00" + (date.getUTCMonth() + 1)).slice(-2) +
    "-" +
    ("00" + date.getUTCDate()).slice(-2)
  );
};
