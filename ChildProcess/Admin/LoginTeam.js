const { to } = require("await-to-js");
const Team = require("../../models/team");
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

process.on("message", async (data) => {
  const user = await Team.findOne({ mobile: data.mobile });
  if (!user) {
    process.send({ message: "User not found" });
    setTimeout(() => {
      mongooseClose();
      process.exit(1);
    }, 1000);
  }
  bcrypt.compare(data.password, user.password, (err, pisMatch) => {
    if (!pisMatch) {
      process.send({ message: "Password not match" });
      setTimeout(() => {
        mongooseClose();
        process.exit(1);
      }, 1000);
    }
    if (pisMatch) {
      let payload = { mobile: data.mobile };
      let refreshToken = jwt.sign(
        payload,
        process.env.ACCESS_TOKEN_SECRET,
        {
          algorithm: "HS256",
        },
        { expiresIn: "7d" }
      );
      process.send({ user, refreshToken });
      setTimeout(() => {
        mongooseClose();
        process.exit(1);
      }, 1000);
    }
  });
});
