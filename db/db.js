const mongoose = require("mongoose");
require("dotenv").config();
mongoose.set("strictQuery", false);
mongoose
  .connect(process.env.DB_URL)
  .then(() => console.log("database connected"))
  .catch((error) => console.log("ERROR ", error));
