const express = require("express");
const router = new express.Router();
const path = require("path");
const controllars = require("../controllars/All");
const VerifyToken = require("./../middleware/auth");

// router.post("/signup", controllars.Signup);
router.post("/login", controllars.Login);

router.post("/upload-data/:userId", controllars.AddData);
router.post("/get-data/:userId", controllars.GetData);
router.post("/get-all-data/:userId", controllars.GetAllData);

router.use("/csv", express.static(path.join(__dirname, "../csv_files")));
router.get("/csv/:fileName", (req, res) => {
  const fileName = req.params.fileName;
  const filePath = path.join(__dirname, "../csv_files", fileName);
  res.download(filePath);
});

router.post("/change-password/:id", controllars.ChangePassword);
router.post("/set-password/:id", controllars.SetPassword);
router.get("/password-expire/:id", controllars.ExpirePassword);

module.exports = router;
