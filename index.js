const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
const Groq = require('groq-sdk');

const app = express();
app.use(bodyParser.json());

// === TES TIROIRS SECRETS (les vrais codes sont dans Render) ===
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "Mysite123";
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

// 1. VERIFICATION META
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log("WEBHOOK VERIFIE AVEC Mysite123");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// 2. RECEPTION MESSAGE WHATSAPP BUSINESS
app.post('/webhook', async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (message && message.text) {
      const from = message.from;
      const text = message.text.body;

      console.log(`Message de ${from}: ${text}`);

      // IA GROQ avec GPT
      const completion = await groq.chat.completions.create({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: "Tu es l'assistant WhatsApp Business. Réponds court, utile, en français." },
          { role: "user", content: text }
        ],
        max_tokens: 400
      });

      const reply = completion.choices[0].message.content;

      // ENVOI WHATSAPP BUSINESS API v21.0
      await axios.post(
        `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: "whatsapp",
          to: from,
          type: "text",
          text: { body: reply }
        },
        {
          headers: {
            Authorization: `Bearer ${WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log("Reponse envoyee");
    }
    res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error("ERREUR DETAILLEE:", error.response? JSON.stringify(error.response.data) : error.message);
    res.status(200).send('EVENT_RECEIVED');
  }
});

app.get('/', (req, res) => {
  res.send("Bot WhatsApp Business en ligne - Mysite123 OK");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Serveur sur port ${PORT}`));
