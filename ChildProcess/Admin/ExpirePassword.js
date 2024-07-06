const PassToken = require("../../models/passToken");

const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
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

process.on("message", async ({ uid, token }) => {
  const passToken = await PassToken.findOne({ uid: uid, passToken: token });
  if (!passToken) {
    process.send("NoToken");
    setTimeout(() => {
      mongooseClose();
      process.exit(1);
    }, 100);
  } else {
    process.send("HaveToken");
    setTimeout(() => {
      mongooseClose();
      process.exit(1);
    }, 100);
  }
});
