const express = require('express');
const bodyParser = require('body-parser');
const Groq = require('groq-sdk');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "yanogo123";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

app.get('/', (req, res) => {
  res.send('Bot WhatsApp Business est en ligne!');
});

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WEBHOOK VERIFIED');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  const body = req.body;
  if (body.object === 'whatsapp_business_account') {
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        if (change.field === 'messages' && change.value.messages) {
          const msg = change.value.messages[0];
          const from = msg.from;
          const text = msg.text? msg.text.body : "";
          if (text) {
            try {
              const completion = await groq.chat.completions.create({
                model: "llama-3.1-8b-instant",
                messages: [
                  { role: "system", content: "Tu es l'assistant Yanogo Business, expert e-commerce au Burkina. Réponds court, amical, en français." },
                  { role: "user", content: text }
                ],
                max_tokens: 400
              });
              const reply = completion.choices[0].message.content;
              await axios.post(`https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`, {
                messaging_product: "whatsapp",
                to: from,
                text: { body: reply.substring(0,1000) }
              }, { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}` } });
            } catch(e){ console.error(e.message); }
          }
        }
      }
    }
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Serveur WhatsApp sur port ${PORT}`));
