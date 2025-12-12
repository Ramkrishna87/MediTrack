const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  month: { type: String, required: true },
  patients: { type: Number, required: true }
});

module.exports = mongoose.model("Report", reportSchema);
