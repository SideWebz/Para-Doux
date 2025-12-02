const express = require('express');
const path = require('path');
const { engine } = require('express-handlebars');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Handlebars engine setup
app.engine('hbs', engine({
  extname: '.hbs',
  defaultLayout: 'main',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
}));

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', (req, res) => {
  res.render('index', { title: 'Home' });
});

app.get('/treatments', (req, res) => {
  res.render('treatments', { title: 'Behandelingen' });
});

app.get('/info', (req, res) => {
  res.render('info', { title: 'Informatie' });
});

app.get('/contact', (req, res) => {
  res.render('contact', { title: 'Contact' });
});

app.post('/contact', (req, res) => {
  const { name, email, message } = req.body;
  // Handle form submission here
  res.render('contact', { title: 'Contact', success: 'Bericht verzonden!' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).render('404', { title: 'Not Found' });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
