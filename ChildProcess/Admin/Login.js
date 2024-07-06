const User = require("../../models/user");
const PassToken = require("../../models/passToken");

const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

mongoose.set("strictQuery", false);

//============MongoDB=================
const { connection } = mongoose;
const URI = process.env.DB_URL;
mongoose.connect(URI);
//============MongoDB=================END

async function mongooseClose() {
  await connection.close();
}

process.on("message", async ({ email, password }) => {
  try {
    const user = await User.findOne({ email: email }).exec();

    if (!user) {
      process.send("User does not exist");
      setTimeout(async () => {
        await mongooseClose();
        process.exit(1);
      }, 1000);
      return;
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      process.send("Invalid credentials");
      setTimeout(async () => {
        await mongooseClose();
        process.exit(1);
      }, 1000);
      return;
    }

    const payload = { email: email, pass: password };
    const refreshToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
      algorithm: "HS256",
      expiresIn: "7d",
    });

    await PassToken.findOneAndDelete({ uid: user._id }); // Delete old token if it exists

    await PassToken.create({
      uid: user._id,
      passToken: refreshToken,
    });

    process.send({
      UserId: user._id,
      refreshToken,
    });

    setTimeout(async () => {
      await mongooseClose();
      process.exit(0);
    }, 1000);
  } catch (err) {
    process.send(err);
    await mongooseClose();
    process.exit(1);
  }
});
