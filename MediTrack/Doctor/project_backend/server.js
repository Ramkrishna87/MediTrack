const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// ✅ MongoDB Connection
mongoose
  .connect("mongodb://127.0.0.1:27017/meditrack", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

// ✅ Patient Schema & Model
const patientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: Number,
  disease: String,
  createdAt: { type: Date, default: Date.now },
});

const Patient = mongoose.model("Patient", patientSchema);

// ✅ Test Route
app.get("/api/hello", (req, res) => {
  res.send("✅ Backend is working and connected to MongoDB!");
});

// ✅ Get all patients
app.get("/api/patients", async (req, res) => {
  try {
    const patients = await Patient.find();
    res.json(patients);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Add a new patient
app.post("/api/patients", async (req, res) => {
  try {
    const newPatient = new Patient(req.body);
    await newPatient.save();
    res.status(201).json(newPatient);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
