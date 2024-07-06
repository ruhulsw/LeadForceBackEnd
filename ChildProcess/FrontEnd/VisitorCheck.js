const Visitor = require("../../models/visitor");
const mongoose = require("mongoose");
mongoose.set("strictQuery", false);

//============MongoDB=================
const { connection } = mongoose;
const URI = process.env.DB_URL;
const OPTS = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
};
mongoose.connect(URI, OPTS);
//============MongoDB=================END

async function mongooseClose() {
  connection.close();
}

process.on("message", async (data) => {
  const Get_Visitor = await Visitor.find({
    domain: data.Furl,
    ip: data.ip,
    vid: data.ip,
    country: data.geo.country,
    $where: function () {
      today = new Date();
      today.setHours(0, 0, 0, 0);
      return this._id.getTimestamp() >= today;
    },
  });

  if (!Get_Visitor || !Get_Visitor.length) {
    await Visitor.create({
      domain: data.Furl,
      ip: data.ip,
      vid: data.ip,
      country: data.geo.country,
    });
    mongooseClose();
    process.send("Done Save Visitor Data");
    setTimeout(() => {
      process.exit(0);
    }, 100);
    process.exit(1);
  }
});
