// declare module "web-pingjs";

declare module "*.jpg" {
  const value: any;
  export = value;
}

// type RawTable = {
//   reading: string;
//   r_temp_count: number;
//   r_temp_read: number;
//   r_temp_ref: number;
//   w_count: number;
//   w_period: number;
//   w_delay_r: number;
//   w_delay_f: number;
//   s_count: number;
//   s_humidity: number;
//   s_temp_dht: number;
//   s_temp_bmp: number;
//   s_pressure: number;
// };
type RawTable = {
  reading: string;
  r_temp_count: number;
  r_temp_read: number;
  r_temp_ref: number;
  w_count: number;
  speed: number;
  angle: number;
  s_count: number;
  s_humidity: number;
  s_temp_dht: number;
  s_temp_bmp: number;
  s_pressure: number;
};

type RawReadings = {
  reading: Date;
  r_temp_count: number;
  r_temp_read: number;
  r_temp_ref: number;
  w_count: number;
  speed: number;
  angle: number;
  s_count: number;
  s_humidity: number;
  s_temp_dht: number;
  s_temp_bmp: number;
  s_pressure: number;
};

type Row = [String, number, number, number, number, number, number, number, number, number, number, number];
