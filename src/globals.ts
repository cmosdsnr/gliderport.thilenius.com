process.env.TZ = "America/Los_Angeles";
// export const offset = -60000 * new Date().getTimezoneOffset(); //to ms 60s/min*1000ms/s
// console.log("offset ", offset);

var globals: Globals = {
  DEBUG: true,
  textWatch: {},
  firstRecord: null,
  lastRecord: "0",
  tdLast: new Date(),
  numberRecords: 0,
  latestHours: 0,
};
export default globals;
