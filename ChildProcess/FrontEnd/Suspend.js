const { to } = require("await-to-js");
const Domain = require("../../models/domain");
const User = require("../../models/user");

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

process.on("message", async ({ url }) => {
  let dom_err, domain;
  [dom_err, domain] = await to(Domain.findOne({ domain: url }));

  if (domain) {
    const user = await User.findOne({ _id: domain.uid });

    const currentDateFromDB = user.nextBilling;
    const futureDate = new Date(currentDateFromDB);
    futureDate.setDate(currentDateFromDB.getDate() + 3);
    const currentDate = new Date();

    if (currentDate > futureDate) {
      console.log("Suspend", url);
      process.send(true);
      mongooseClose();
      setTimeout(function () {
        process.exit(1);
      }, 200);
    } else {
      process.send(false);
      mongooseClose();
      setTimeout(function () {
        process.exit(1);
      }, 200);
    }
  }
});
