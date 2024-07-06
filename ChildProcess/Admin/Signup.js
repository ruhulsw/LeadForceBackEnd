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

process.on("message", async ({ username, email, password }) => {
  try {
    const user = await User.findOne({ email: email }).exec();

    if (user) {
      process.send("User already exists");
      setTimeout(async () => {
        await mongooseClose();
        process.exit(1);
      }, 1000);
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    const newUser = new User({
      username: username,
      email: email,
      password: hash,
    });

    const savedUser = await newUser.save();
    const payload = { email: email, pass: password };
    const refreshToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
      algorithm: "HS256",
      expiresIn: "7d",
    });

    await PassToken.create({
      uid: savedUser._id,
      passToken: refreshToken,
    });

    process.send({
      UserId: savedUser._id,
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
