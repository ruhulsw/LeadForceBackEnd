require("dotenv").config();
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const cors = require("cors");

// Middleware
app.use(bodyParser.urlencoded({ extended: false, limit: "5000mb" }));
app.use(bodyParser.json({ limit: "5000mb" }));
app.use(cors());
app.set("trust proxy", true);

const router = require("./routes/router");
require("./db/db");

app.use(express.json());
app.use(router);

app.listen(7000, () =>
  console.log(`Listening on port 7000 process.pid ${process.pid}`)
);
