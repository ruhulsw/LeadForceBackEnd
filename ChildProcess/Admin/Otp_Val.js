const speakeasy = require("speakeasy");
const { to } = require("await-to-js");
const Otp = require("../../models/otp");
const User = require("../../models/user");
const PassToken = require("../../models/passToken");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

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
  const { userId, otp } = data;
  const existingOTP = await Otp.findOne({ userId, IsVerifyed: false }).sort({
    Date: -1,
  });

  if (!existingOTP) {
    process.send("OTP not found");
    setTimeout(() => {
      mongooseClose();
      process.exit(1);
    }, 1000);
  }
  const currentTime = Math.floor(Date.now() / 1000);
  const otpGenerationTime = Math.floor(existingOTP.Date / 1000);
  const timeDifference = currentTime - otpGenerationTime;

  if (timeDifference > 120) {
    process.send("OTP has expired");
    setTimeout(() => {
      mongooseClose();
      process.exit(1);
    }, 1000);
  } else {
    const isValid = speakeasy.totp.verify({
      secret: existingOTP.secret,
      encoding: "base32",
      token: otp,
      window: 4,
    });

    if (isValid) {
      existingOTP.IsVerifyed = true;
      await existingOTP.save();
      const verify_user = await User.findOne({ _id: userId });
      verify_user.Mob_Verify = true;

      function generateRandomPassword(length) {
        var charset =
          "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+{}|:<>?~";
        var password = "";
        for (var i = 0; i < length; i++) {
          var randomIndex = Math.floor(Math.random() * charset.length);
          password += charset[randomIndex];
        }
        return password;
      }

      const genPass = generateRandomPassword(12);
      const pass = await bcrypt.hash(genPass, 10);
      verify_user.password = pass;

      await verify_user.save();
      await PassToken.deleteMany({ uid: userId });

      process.send({ pass: genPass, message: "OTP is valid" });
      setTimeout(() => {
        mongooseClose();
        process.exit(1);
      }, 1000);
    } else {
      process.send("OTP is invalid");
      setTimeout(() => {
        mongooseClose();
        process.exit(1);
      }, 1000);
    }
  }
});
