require('dotenv').config();

const express = require('express');
const path = require('path');
const { engine } = require('express-handlebars');
const session = require('express-session');
const fs = require('fs');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

/* =========================
   EMAIL CONFIG
========================= */

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Check verbinding bij opstart
transporter.verify((error, success) => {
  console.log('=== SMTP VERBINDING CHECK ===');
  if (error) {
    console.error('✗ SMTP verbinding MISLUKT:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('');
    console.error('DEBUG INFO:');
    console.error('SMTP_HOST:', process.env.SMTP_HOST);
    console.error('SMTP_PORT:', process.env.SMTP_PORT);
    console.error('SMTP_SECURE:', process.env.SMTP_SECURE);
    console.error('SMTP_USER:', process.env.SMTP_USER);
    console.error('');
    console.error('Tips:');
    console.error('- Controleer SMTP_HOST en SMTP_PORT in .env');
    console.error('- Controleer SMTP_USER en SMTP_PASS in .env');
    console.error('- Voor Gmail: gebruik een App Password, niet je gewone wachtwoord');
    console.error('- Zorg dat de poort klopt: Gmail SMTP = 587 (TLS) of 465 (SSL)');
  } else {
    console.log('✓ SMTP server klaar om mails te verzenden');
    console.log('SMTP Host:', process.env.SMTP_HOST);
    console.log('SMTP Port:', process.env.SMTP_PORT);
  }
  console.log('===========================');
});

/* =========================
   DATA FILE
========================= */

const dataFile = path.join(__dirname, 'data.json');

function readData() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  } catch (err) {
    return { verlof: [], popups: [] };
  }
}

function writeData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

/* =========================
   MIDDLEWARE
========================= */

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 1000 * 60 * 60 * 24 }
}));

/* =========================
   HANDLEBARS
========================= */

const hbs = engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  helpers: {
    equals: (a, b) => a === b,
    ifeq: function(a, b, options) {
      return a === b ? options.fn(this) : options.inverse(this);
    }
  }
});

app.engine('hbs', hbs);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

/* =========================
   FRONTEND ROUTES
========================= */

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

app.get('/behandelingen', (req, res) => {
  res.render('treatments', {
    title: 'Behandelingen',
    pageStyle: 'treatments',
    isTreatments: true
  });
});

app.get('/info', (req, res) => {
  res.render('info', {
    title: 'Informatie',
    pageStyle: 'info',
    isInfo: true
  });
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

app.post('/contact', async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  console.log('=== CONTACT FORM SUBMISSION ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Name:', name);
  console.log('Email:', email);
  console.log('Phone:', phone);
  console.log('Subject:', subject);
  console.log('Message length:', message ? message.length : 0);

  try {
    // Validate form data
    if (!name || !email || !phone || !subject || !message) {
      console.warn('Validatiefout: Verplichte velden ontbreken');
      const data = readData();
      return res.render('contact', {
        title: 'Contact',
        pageStyle: 'contact',
        isContact: true,
        verlofDagen: data.verlof,
        error: 'Alle velden zijn verplicht. Controleer je formulier.'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.warn('Validatiefout: Ongeldig e-mailadres');
      const data = readData();
      return res.render('contact', {
        title: 'Contact',
        pageStyle: 'contact',
        isContact: true,
        verlofDagen: data.verlof,
        error: 'Voer een geldig e-mailadres in.'
      });
    }

    const mailOptions = {
      from: `"ParaDoux Website" <${process.env.SMTP_USER}>`,
      to: 'info@paradoux.be',
      replyTo: email,
      subject: `Nieuw contactformulier: ${subject}`,
      text: `
Nieuw bericht van contactformulier

Naam: ${name}
Email: ${email}
Telefoon: ${phone}
Onderwerp: ${subject}

Bericht:
${message}
      `,
      html: `
        <h2>Nieuw bericht van contactformulier</h2>
        <p><strong>Van:</strong> ${name} (${email})</p>
        <p><strong>Telefoonnummer:</strong> ${phone}</p>
        <p><strong>Onderwerp:</strong> ${subject}</p>
        <p><strong>Bericht:</strong></p>
        <p>${message.replace(/\n/g, '<br>')}</p>
      `
    };

    console.log('Mail options voorbereid voor:', mailOptions.to);
    console.log('SMTP Host:', process.env.SMTP_HOST);
    console.log('SMTP Port:', process.env.SMTP_PORT);
    console.log('SMTP Secure:', process.env.SMTP_SECURE);

    const info = await transporter.sendMail(mailOptions);
    
    console.log('✓ E-mail succesvol verzonden!');
    console.log('Message ID:', info.messageId);
    console.log('Response:', info.response);

    const data = readData();
    res.render('contact', {
      title: 'Contact',
      pageStyle: 'contact',
      isContact: true,
      verlofDagen: data.verlof,
      success: '✓ Bedankt! Je bericht is verzonden. We nemen spoedig contact met je op.'
    });

  } catch (error) {
    console.error('✗ E-mailfout opgetreden:');
    console.error('Code:', error.code);
    console.error('Bericht:', error.message);
    console.error('Stack:', error.stack);

    let errorMessage = 'Er is iets fout gegaan bij het verzenden van je bericht. Probeer later opnieuw.';
    
    if (error.code === 'EAUTH') {
      errorMessage = 'SMTP authenticatie fout. Controleer je SMTP gegevens in de server.';
      console.error('DEBUG: SMTP authenticatie mislukt. Check SMTP_USER en SMTP_PASS in .env');
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Kan geen verbinding maken met mailserver. Controleer SMTP_HOST en SMTP_PORT.';
      console.error('DEBUG: Kan niet verbinden met mailserver');
    } else if (error.message.includes('Invalid login')) {
      errorMessage = 'Ongeldige SMTP inloggegevens.';
      console.error('DEBUG: Ongeldige SMTP credentials');
    }

    const data = readData();
    res.render('contact', {
      title: 'Contact',
      pageStyle: 'contact',
      isContact: true,
      verlofDagen: data.verlof,
      error: `✗ ${errorMessage}`
    });
  }
});

/* =========================
   BACKOFFICE AUTH
========================= */

function requireAuth(req, res, next) {
  if (!req.session.authenticated) {
    return res.redirect('/backoffice/login');
  }
  next();
}

app.get('/backoffice/login', (req, res) => {
  res.render('backoffice/login', {
    title: 'Backoffice Login',
    layout: 'backoffice',
    isLogin: true
  });
});

app.post('/backoffice/login', (req, res) => {
  const { username, password } = req.body;

  if (
    username === process.env.ADMIN_USERNAME &&
    password === process.env.ADMIN_PASSWORD
  ) {
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

/* =========================
   BACKOFFICE DASHBOARD
========================= */

app.get('/backoffice', requireAuth, (req, res) => {
  res.render('backoffice/dashboard', {
    title: 'Backoffice Dashboard',
    layout: 'backoffice',
    isDashboard: true,
    username: req.session.username
  });
});

/* =========================
   VERLOF
========================= */

app.get('/backoffice/verlof', requireAuth, (req, res) => {
  const data = readData();
  res.render('backoffice/verlof', {
    title: 'Verlofperiodes',
    layout: 'backoffice',
    isVerlof: true,
    username: req.session.username,
    verlofDagen: data.verlof
  });
});

app.post('/backoffice/verlof/add', requireAuth, (req, res) => {
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

app.post('/backoffice/verlof/delete/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const data = readData();

  data.verlof = data.verlof.filter(v => v.id !== id);
  writeData(data);

  res.redirect('/backoffice/verlof');
});

/* =========================
   POPUPS
========================= */

app.get('/backoffice/popups', requireAuth, (req, res) => {
  const data = readData();
  res.render('backoffice/popups', {
    title: 'Popups',
    layout: 'backoffice',
    isPopups: true,
    username: req.session.username,
    popups: data.popups
  });
});

app.post('/backoffice/popups/add', requireAuth, (req, res) => {
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

app.post('/backoffice/popups/toggle/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const data = readData();

  const popup = data.popups.find(p => p.id === id);
  if (popup) {
    popup.active = !popup.active;
    writeData(data);
  }

  res.redirect('/backoffice/popups');
});

app.post('/backoffice/popups/delete/:id', requireAuth, (req, res) => {
  const id = parseInt(req.params.id);
  const data = readData();

  data.popups = data.popups.filter(p => p.id !== id);
  writeData(data);

  res.redirect('/backoffice/popups');
});

/* =========================
   LOGOUT
========================= */

app.get('/backoffice/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

/* =========================
   404
========================= */

app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Not Found',
    pageStyle: '404'
  });
});

/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});