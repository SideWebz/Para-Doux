require('dotenv').config();

const express = require('express');
const path = require('path');
const { engine } = require('express-handlebars');
const session = require('express-session');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Data file path
const dataFile = path.join(__dirname, 'data.json');

// Helper function to read data
function readData() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  } catch (err) {
    return { verlof: [], popups: [] };
  }
}

// Helper function to write data
function writeData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 }
}));

// Handlebars engine setup
const hbs = engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  helpers: {
    equals: (a, b) => a === b,
    ifeq: function(a, b, options) {
      if (a === b) {
        return options.fn(this);
      }
      return options.inverse(this);
    }
  }
});

app.engine('hbs', hbs);

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
  const data = readData();
  const activePopups = data.popups.filter(p => p.active);
  res.render('index', { 
    title: 'Home', 
    pageStyle: 'index', 
    isHome: true,
    popups: activePopups 
  });
});

app.get('/treatments', (req, res) => {
  res.render('treatments', { title: 'Behandelingen', pageStyle: 'treatments', isTreatments: true });
});

app.get('/info', (req, res) => {
  res.render('info', { title: 'Informatie', pageStyle: 'info', isInfo: true });
});

app.get('/contact', (req, res) => {
  const data = readData();
  res.render('contact', { 
    title: 'Contact', 
    pageStyle: 'contact', 
    isContact: true,
    verlofDagen: data.verlof 
  });
});

app.post('/contact', (req, res) => {
  const { name, email, message } = req.body;
  // Handle form submission here
  res.render('contact', { title: 'Contact', pageStyle: 'contact', isContact: true, success: 'Bericht verzonden!' });
});

// Backoffice Login
app.get('/backoffice/login', (req, res) => {
  res.render('backoffice/login', { 
    title: 'Backoffice Login', 
    layout: 'backoffice',
    isLogin: true
  });
});

app.post('/backoffice/login', (req, res) => {
  const { username, password } = req.body;
  
  // Check credentials from .env
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    req.session.authenticated = true;
    req.session.username = username;
    return res.redirect('/backoffice');
  }
  
  res.render('backoffice/login', { 
    title: 'Backoffice Login',
    layout: 'backoffice',
    isLogin: true,
    error: 'Gebruikersnaam of wachtwoord incorrect' 
  });
});

// Verlof Management
app.get('/backoffice/verlof', (req, res) => {
  if (!req.session.authenticated) {
    return res.redirect('/backoffice/login');
  }
  
  const data = readData();
  res.render('backoffice/verlof', { 
    title: 'Verlofperiodes',
    layout: 'backoffice',
    isVerlof: true,
    username: req.session.username,
    verlofDagen: data.verlof 
  });
});

app.post('/backoffice/verlof/add', (req, res) => {
  if (!req.session.authenticated) {
    return res.redirect('/backoffice/login');
  }
  
  const { startDatum, eindDatum, naam } = req.body;
  const data = readData();
  
  data.verlof.push({
    id: Date.now(),
    naam: naam || 'Verlofperiode',
    startDatum,
    eindDatum,
    createdAt: new Date().toISOString()
  });
  
  writeData(data);
  res.redirect('/backoffice/verlof');
});

app.post('/backoffice/verlof/delete/:id', (req, res) => {
  if (!req.session.authenticated) {
    return res.redirect('/backoffice/login');
  }
  
  const id = parseInt(req.params.id);
  const data = readData();
  
  data.verlof = data.verlof.filter(v => v.id !== id);
  writeData(data);
  
  res.redirect('/backoffice/verlof');
});

// Popups Management
app.get('/backoffice/popups', (req, res) => {
  if (!req.session.authenticated) {
    return res.redirect('/backoffice/login');
  }
  
  const data = readData();
  res.render('backoffice/popups', { 
    title: 'Popups',
    layout: 'backoffice',
    isPopups: true,
    username: req.session.username,
    popups: data.popups 
  });
});

app.post('/backoffice/popups/add', (req, res) => {
  if (!req.session.authenticated) {
    return res.redirect('/backoffice/login');
  }
  
  const { title, content, active } = req.body;
  const data = readData();
  
  data.popups.push({
    id: Date.now(),
    title,
    content,
    active: active === 'on',
    createdAt: new Date().toISOString()
  });
  
  writeData(data);
  res.redirect('/backoffice/popups');
});

app.post('/backoffice/popups/toggle/:id', (req, res) => {
  if (!req.session.authenticated) {
    return res.redirect('/backoffice/login');
  }
  
  const id = parseInt(req.params.id);
  const data = readData();
  
  const popup = data.popups.find(p => p.id === id);
  if (popup) {
    popup.active = !popup.active;
    writeData(data);
  }
  
  res.redirect('/backoffice/popups');
});

app.post('/backoffice/popups/delete/:id', (req, res) => {
  if (!req.session.authenticated) {
    return res.redirect('/backoffice/login');
  }
  
  const id = parseInt(req.params.id);
  const data = readData();
  
  data.popups = data.popups.filter(p => p.id !== id);
  writeData(data);
  
  res.redirect('/backoffice/popups');
});

// Backoffice Dashboard
app.get('/backoffice', (req, res) => {
  if (!req.session.authenticated) {
    return res.redirect('/backoffice/login');
  }
  
  res.render('backoffice/dashboard', { 
    title: 'Backoffice Dashboard',
    layout: 'backoffice',
    isDashboard: true,
    username: req.session.username 
  });
});

// Logout
app.get('/backoffice/logout', (req, res) => {
  req.session.destroy((err) => {
    res.redirect('/');
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { title: 'Not Found', pageStyle: '404' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
