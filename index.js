const express = require('express');
const bodyParser = require('body-parser');
const Groq = require('groq-sdk');
const axios = require('axios');

const app = express();
app.use(bodyParser.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const PAGE_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "yanogo123";

app.get('/', (req, res) => {
  res.send('Bot Messenger est en ligne!');
});

// Pour verification Facebook
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

// Reception des messages
app.post('/webhook', async (req, res) => {
  const body = req.body;
  if (body.object === 'page') {
    for (const entry of body.entry) {
      const event = entry.messaging[0];
      if (event.message && event.message.text) {
        const senderId = event.sender.id;
        const userText = event.message.text;
        try {
          // Appel Groq
          const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            messages: [
              { role: "system", content: "Tu es un assistant amical et utile qui répond en français. Réponds court et utile." },
              { role: "user", content: userText }
            ],
            max_tokens: 500
          });
          const reply = completion.choices[0].message.content;
          await sendMessage(senderId, reply);
        } catch (err) {
          console.error(err);
          await sendMessage(senderId, "Désolé, erreur avec l'IA. Réessaie.");
        }
      }
    }
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.sendStatus(404);
  }
});

async function sendMessage(senderId, text) {
  await axios.post(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_TOKEN}`, {
    recipient: { id: senderId },
    message: { text: text.substring(0, 1900) }
  });
}

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Serveur sur port ${PORT}`));
