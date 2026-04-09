process.env.TZ = "America/Los_Angeles";

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
