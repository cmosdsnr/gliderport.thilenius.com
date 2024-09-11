export type Day = {
  date: number;
  codes: number[];
  sun: [number, number];
  limits: [number, number];
};

declare module "*.png";
// declare module "*.jpg";
declare module "*.jpeg";
declare module "*.gif";
declare module "*.svg";

declare module "*.jpg" {
  const value: string;
}
