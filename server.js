require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const sendgrid = require('@sendgrid/mail');
sendgrid.setApiKey(process.env.SENDGRID_API_KEY);

const app = express();
app.use(bodyParser.json());
app.use(express.static('public')); // serve index.html + app.js

app.post('/api/alert', async (req, res) => {
  const body = req.body;
  const userEmail = body.userEmail;

  if (!userEmail) {
    return res.status(400).json({ ok: false, error: 'Email utente mancante' });
  }

  try {
    const msg = {
      to: userEmail,
      from: process.env.FROM_EMAIL,
      subject: `Allarme suono rilevato - ${new Date().toISOString()}`,
      text: `Rilevato suono. Dettagli: ${JSON.stringify(body)}`,
      html: `<p>Rilevato suono.</p><pre>${JSON.stringify(body, null, 2)}</pre>`
    };
    await sendgrid.send(msg);
    return res.json({ ok: true });
  } catch (err) {
    console.error('SendGrid error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server listening on', PORT));
