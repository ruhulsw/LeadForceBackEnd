const mongoose = require("mongoose");
const { Schema } = mongoose;

const dataSchema = new Schema({
  userId: String,
  DataObject: {
    type: Schema.Types.Mixed,
    required: true,
  },
  Date: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Data", dataSchema);
