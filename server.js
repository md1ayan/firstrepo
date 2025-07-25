const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect('mongodb+srv://ayan:ayan1712@cluster0.dx2yrah.mongodb.net/ngovisit', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Define a Mongoose schema/model for responses
const responseSchema = new mongoose.Schema({
  name: String,
  regNumber: String,
  phone: String,
  memberType: String,
  timestamp: Date,
});
const Response = mongoose.model('Response', responseSchema);

// API route to get all responses
app.get('/api/responses', async (req, res) => {
  const responses = await Response.find({});
  res.json(responses);
});

// API route to add a new response
app.post('/api/responses', async (req, res) => {
  let data = req.body;
  data.timestamp = new Date();
  const exists = await Response.findOne({ regNumber: data.regNumber });
  if (exists) {
    return res.status(400).json({ error: 'Registration number already exists.' });
  }
  const response = await Response.create(data);
  res.json(response);
});

// API route to clear all responses (if you want admin controls)
app.delete('/api/responses', async (req, res) => {
  await Response.deleteMany({});
  res.json({ success: true });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
