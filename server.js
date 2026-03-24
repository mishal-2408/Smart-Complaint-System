const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

const fs = require('fs');
app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));
if (!fs.existsSync('./uploads')) {
    fs.mkdirSync('./uploads');
}
app.use('/uploads', express.static('uploads'));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/project_2_db')
.then(() => console.log('Connected to MongoDB database'))
.catch((err) => console.error('Error connecting to MongoDB:', err));

const authRoutes = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');

app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);

app.get('/api/status', (req, res) => {
  res.json({ message: 'Server is running properly' });
});

app.get('/', (req, res) => {
  res.redirect('/login.html');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
