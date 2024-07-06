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

process.on("message", async (userId) => {
  const lastOTP = await Otp.findOne({ userId }).sort({ Date: -1 });
  if (lastOTP) {
    const currentTime = Date.now();
    const lastGenerationTime = lastOTP.Date.getTime();
    const timeDifference = currentTime - lastGenerationTime;
    const cooldownPeriod = 2 * 60 * 1000;

    if (timeDifference < cooldownPeriod) {
      process.send(`Please wait 2 minuts`);
      mongooseClose();
      process.exit(1);
    } else {
      const secret = speakeasy.generateSecret({ length: 20 });
      const otp = speakeasy.totp({
        secret: secret.base32,
        encoding: "base32",
        window: 4,
      });
      const Otp_Gen = await Otp.create({ userId, secret: secret.base32, otp });
      const Save_Otp = await Otp_Gen.save();
      if (Save_Otp) {
        const user = await User.findById({ _id: userId });
        if (user) {
          sendSMS(user.mobile, otp);
          setTimeout(() => {
            process.send(`OTP Success`);
            mongooseClose();
            process.exit(1);
          }, 2000);
        }
      }
    }
  } else {
    const secret = speakeasy.generateSecret({ length: 20 });
    const otp = speakeasy.totp({
      secret: secret.base32,
      encoding: "base32",
      window: 4,
    });
    const Otp_Gen = await Otp.create({ userId, secret: secret.base32, otp });
    const Save_Otp = await Otp_Gen.save();
    if (Save_Otp) {
      const user = await User.findById({ _id: userId });
      if (user) {
        sendSMS(user.mobile, otp);
        setTimeout(() => {
          process.send(`OTP Has been send to the mobile ${user.mobile}`);
          mongooseClose();
          process.exit(1);
        }, 2000);
      }
    }
  }
});

async function sendSMS(cMobile, otp) {
  console.log("sendSMS");
  const url = `https://bulksmsbd.net/api/smsapi?api_key=${
    process.env.SMS_SECRET_ECOM
  }&type=text&number=${cMobile}&senderid=8809617617358&message=${`OTP Code is ${otp}`}`;
  axios
    .get(url)
    .then(async (res) => {
      console.log(res.data);
    })
    .catch((err) => console.log(err));
}
