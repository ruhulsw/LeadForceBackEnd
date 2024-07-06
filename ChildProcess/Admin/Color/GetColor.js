const Color = require("../../../models/Color");
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

process.on("message", async (id) => {
  const getColors = await Color.findOne({ uid: id });

  if (getColors) {
    process.send(getColors);
    setTimeout(() => {
      mongooseClose();
      process.exit(1);
    }, 200);
  } else {
    process.send("No Data Found");
    setTimeout(() => {
      mongooseClose();
      process.exit(1);
    }, 200);
  }
});
