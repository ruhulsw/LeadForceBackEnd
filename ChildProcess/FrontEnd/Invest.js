const { to } = require("await-to-js");
const Invest = require("../../models/invest");
const mongoose = require("mongoose");
mongoose.set("strictQuery", false);
const axios = require("axios");
//============MongoDB=================START

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
  const { name, mobile, amount } = data;
  const get_invest = await Invest.findOne({mobile})
  if(!get_invest){
    const invest = await Invest.create({
      name,
      mobile,
      amount,
    });
    if (invest) {
      sendSMS(mobile, amount, name)
      process.send("Message send to the authority.");
      setTimeout(()=>{
        mongooseClose();
      process.exit(1);
      },500)
      
    } else {
      process.send("Error saving Invest.");
      setTimeout(()=>{
        mongooseClose();
      process.exit(1);
      },500)
    }
  }else{
    process.send("Already send the request.");
      setTimeout(()=>{
        mongooseClose();
      process.exit(1);
      },500)
  }
  
});

async function sendSMS(mobile, amount, name) {
  const textdata = `Name ${name} Mobile ${mobile} Message ${amount}`
  const url = `https://bulksmsbd.net/api/smsapi?api_key=${process.env.SMS_SECRET}&type=text&number=01711026578&senderid=8809617611061&message=${textdata}`;
  axios
    .get(url)
    .then(async (res) => {
      console.log(res.data);
    })
    .catch((err) => console.log(err));
}
