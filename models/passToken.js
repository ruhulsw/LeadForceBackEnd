const mongoose = require("mongoose");
const passToken = new mongoose.Schema({
  uid: String,
  passToken: String,
});

module.exports = mongoose.model("passToken", passToken);
