const { to } = require("await-to-js");
const Order = require("../../models/order");
const Team = require("../../models/team");
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
  const Admin_id = data.userId;
  const AssignId = data.body.Assign;

  data.body.data.map(async (data) => {
    const order = await Order.findOne({
      _id: data._id,
      userId: Admin_id,
    });
    const team = await Team.findOne({ _id: AssignId });
    order.assignedTo = AssignId;
    order.assignedName = team.name;
    await order.save();
  });

  process.send("Assigned Success..");
  setTimeout(() => {
    mongooseClose();
    process.exit(1);
  }, 1000);
});
