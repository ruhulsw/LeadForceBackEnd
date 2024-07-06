const { to } = require("await-to-js");
const Domain = require("../../models/domain");
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

process.on("message", async (userId) => {
  let dom_err, get_dom;
  [dom_err, get_dom] = await to(Domain.findOne({ uid: userId }));
  if (!get_dom) {
    process.send("No store to the user");
    process.exit(1);
  } else {
    process.send({
      store: get_dom.store,
      logo: get_dom.logo,
      domain: get_dom.domain,
    });

    mongooseClose();
    process.exit(1);
  }
});
