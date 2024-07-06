const mongoose = require("mongoose");
const user = new mongoose.Schema({
  username: String,
  email: String,
  password: String,

  Date: {
    type: Date,
    default: Date.now,
  },
  Status: {
    type: Number,
    default: 0, // 0 is active
  },
});

module.exports = mongoose.model("User", user);
