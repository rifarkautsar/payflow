const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const USERS_FILE = 'users.json';

app.use(bodyParser.json({limit: '4mb'}));
app.use(bodyParser.urlencoded({extended:true, limit:'4mb'}));
app.use(express.static('public'));

// Helper load/save
function readJSON(filename) {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, 'data', filename), 'utf8'));
  } catch(e) { return []; }
}
function writeJSON(filename, data) {
  fs.writeFileSync(path.join(__dirname, 'data', filename), JSON.stringify(data,null,2), 'utf8');
}

function randomPassword(length = 6) {
  let chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pwd = '';
  for(let i=0;i<length;i++) pwd += chars[Math.floor(Math.random()*chars.length)];
  return pwd;
}

// ROUTES: Static HTML (sementara public/index.html untuk pembayaran, tambahkan lain jika perlu)
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/gate', (req, res) => res.sendFile(path.join(__dirname, 'public', 'gate.html')));

// API: Submit Payment
app.post('/api/payment', (req, res) => {
  const {fullname, phone, proofImage} = req.body;
  if(!fullname||!phone||!proofImage) return res.status(400).json({error:'Data tidak lengkap'});
  const payments = readJSON('payments.json');
  const id = Date.now().toString(36)+Math.random().toString(36).substring(2,7);
  const payment = {id, fullname, phone, proofImage, status:'PENDING', date: new Date().toISOString()};
  payments.push(payment);
  writeJSON('payments.json', payments);
  res.json({success:true, id});
});

// API: Get all payments (admin)
app.get('/api/payments', (req,res)=>{
  const payments = readJSON('payments.json');
  res.json(payments);
});

// API: Approve payment
app.post('/api/payment/approve', (req, res) => {
  const {id} = req.body;
  let payments = readJSON('payments.json');
  let users = readJSON(USERS_FILE);
  let payment = payments.find(x=>x.id===id);
  if(!payment) return res.status(404).json({error:'Not found'});
  payment.status = 'APPROVED';
  let phone = payment.phone;
  // Jika user blm ada, buat
  let existing = users.find(u=>u.phone===phone);
  let pw = null;
  if(!existing) {
    pw = randomPassword(6);
    let user = { id: Date.now().toString(36)+Math.random().toString(36).substring(2,7), phone, password: pw, fullname: payment.fullname };
    users.push(user);
    writeJSON(USERS_FILE, users);
  } else {
    pw = existing.password;
  }
  writeJSON('payments.json', payments);
  res.json({success:true, payment: {...payment, password: pw}});
});

// API: Delete payment
app.post('/api/payment/delete', (req, res) => {
  const {id} = req.body;
  let payments = readJSON('payments.json');
  let newPayments = payments.filter(x=>x.id !== id);
  if (payments.length === newPayments.length) {
    return res.status(404).json({error: 'Not found'});
  }
  writeJSON('payments.json', newPayments);
  res.json({success:true});
});

app.get('/api/userlogin', (req,res)=>{
  const phone = (req.query.phone||'').trim();
  const password = (req.query.password||'').trim();
  if(!phone||!password) return res.json({success:false});
  let users = readJSON('users.json');
  let u = users.find(user => user.phone === phone && user.password === password);
  if(!u) return res.json({success:false});
  res.json({success:true, fullname:u.fullname, phone:u.phone});
});

app.listen(PORT, ()=>console.log('PayFlow Node.js berjalan di http://localhost:'+PORT));
