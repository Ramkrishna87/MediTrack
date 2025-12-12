const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://127.0.0.1:27017/meditrack', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error(err));

// Schemas
const ReportSchema = new mongoose.Schema({ month: String, patients: Number });
const NotificationSchema = new mongoose.Schema({
  text: String,
  createdAt: { type: Date, default: Date.now }
});
const AppointmentSchema = new mongoose.Schema({
  patient: String, date: String, time: String
});

// Models
const Report = mongoose.model('Report', ReportSchema);
const Notification = mongoose.model('Notification', NotificationSchema);
const Appointment = mongoose.model('Appointment', AppointmentSchema);

// Routes
app.get('/api/reports', async (req, res) => res.json(await Report.find()));
app.post('/api/reports', async (req, res) => {
  const report = new Report(req.body);
  await report.save();
  res.json(report);
});

app.get('/api/notifications', async (req, res) => {
  const notes = await Notification.find().sort({ createdAt: -1 }).limit(5);
  res.json(notes);
});
app.post('/api/notifications', async (req, res) => {
  const note = new Notification(req.body);
  await note.save();
  res.json(note);
});

app.get('/api/appointments', async (req, res) => res.json(await Appointment.find().limit(5)));
app.post('/api/appointments', async (req, res) => {
  const appt = new Appointment(req.body);
  await appt.save();
  res.json(appt);
});

// Seed data
app.post('/api/seed', async (req, res) => {
  await Appointment.deleteMany({});
  await Notification.deleteMany({});
  await Report.deleteMany({});
  await Appointment.create([
    { patient: "John Doe", date: "2025-09-15", time: "10:00 AM" },
    { patient: "Jane Smith", date: "2025-09-15", time: "11:30 AM" }
  ]);
  await Notification.create([
    { text: "Lab results uploaded for Patient #123" },
    { text: "New appointment scheduled with Jane Smith" }
  ]);
  await Report.create([
    { month: "Jan", patients: 120 },
    { month: "Feb", patients: 150 },
    { month: "Mar", patients: 180 }
  ]);
  res.json({ success: true });
});

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
