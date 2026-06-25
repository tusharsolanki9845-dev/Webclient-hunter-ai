const express = require("express");
const router = express.Router();

const {
  searchBusinesses,
  saveLead
} = require("../controllers/search.controller");

router.get("/", searchBusinesses);
router.post("/save", saveLead);

const express = require("express");
const router = express.Router();

const {
  searchBusinesses,
  saveLead
} = require("../controllers/search.controller");

router.get("/", searchBusinesses);
router.post("/save", saveLead);

module.exports = router;