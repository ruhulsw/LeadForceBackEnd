const speakeasy = require("speakeasy");
const axios = require("axios");
const { to } = require("await-to-js");
const Otp = require("../../models/otp");
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

process.on("message", async ({ number }) => {
  const user = await User.findOne({ mobile: number });
  if (user) {
    const now = new Date();
    const oneMinuteAgo = new Date(user.lastOtpSentAt);
    oneMinuteAgo.setMinutes(oneMinuteAgo.getMinutes() + 1);

    if (!user.lastOtpSentAt || now >= oneMinuteAgo) {
      const secret = speakeasy.generateSecret({ length: 20 });

      const otp = speakeasy.totp({
        secret: secret.base32,
        encoding: "base32",
        window: 4,
      });

      const Otp_Gen = await Otp.create({
        userId: user._id,
        secret: secret.base32,
        otp,
      });

      const Save_Otp = await Otp_Gen.save();

      if (Save_Otp) {
        sendSMS(user.mobile, otp);
        user.lastOtpSentAt = now;
        await user.save();
        setTimeout(() => {
          process.send({
            otpStatus: true,
            userId: user._id,
            message: "OTP Code has been sent",
          });
          mongooseClose();
          process.exit(1);
        }, 2000);
      }
    } else {
      process.send({
        otpStatus: false,
        userId: user._id,
        lastOtpSentAt: user.lastOtpSentAt,
        message: "Please wait 1 min before requesting a new OTP.",
      });
      process.exit(1);
    }
  }
});

async function sendSMS(cMobile, otp) {
  const url = `https://bulksmsbd.net/api/smsapi?api_key=${
    process.env.SMS_SECRET
  }&type=text&number=${cMobile}&senderid=8809617611061&message=${`OTP Code is ${otp}`}`;
  axios
    .get(url)
    .then(async (res) => {
      console.log(res.data);
    })
    .catch((err) => console.log(err));
}
