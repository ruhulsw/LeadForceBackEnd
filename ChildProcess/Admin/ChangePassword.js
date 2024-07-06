const { to } = require("await-to-js");
const User = require("../../models/user");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
mongoose.set("strictQuery", false);
const PassToken = require("../../models/passToken");

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

process.on("message", async ({ uid, oldPass, newPass }) => {
  const user = await User.findOne({ _id: uid });
  if (!user) {
    process.send({ message: "User not found" });
    setTimeout(() => {
      mongooseClose();
      process.exit(1);
    }, 1000);
  }
  bcrypt.compare(oldPass, user.password, async (err, pisMatch) => {
    if (!pisMatch) {
      process.send("Password not match");
      setTimeout(() => {
        mongooseClose();
        process.exit(1);
      }, 1000);
    }
    if (pisMatch) {
      bcrypt.hash(newPass, 10, async (err, hash) => {
        user.password = hash;
        await user.save();
      });
      await PassToken.deleteMany({ uid: uid });
      process.send("Password Change Successfully ");
      setTimeout(() => {
        mongooseClose();
        process.exit(1);
      }, 1000);
    }
  });
});
