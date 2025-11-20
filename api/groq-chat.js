import Groq from "groq-sdk";

export default async function handler(req, res) {
  // 1️⃣ Your Verify Token
  const VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN;

  // 2️⃣ Facebook Verification (GET)
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verified successfully!");
      return res.status(200).send(challenge);
    } else {
      console.log("Webhook verify failed: token mismatch.");
      return res.sendStatus(403);
    }
  }

  // 3️⃣ Messenger Messages (POST)
  if (req.method === "POST") {
    try {
      const body = req.body;

      // Check if the webhook event is for a page
      if (body.object === "page") {
        for (const entry of body.entry) {
          const event = entry.messaging[0];

          const senderId = event.sender.id;

          // Only respond to text messages
          if (event.message && event.message.text) {
            const userMessage = event.message.text;

            // 🔥 Use Groq LLM
            const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

            const completion = await client.chat.completions.create({
              model: "llama3-8b-8192",
              messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: userMessage }
              ],
            });

            const reply = completion.choices[0].message.content;

            // 📤 Send message back to Messenger user
            await sendMessageToMessenger(senderId, reply);
          }
        }

        return res.status(200).send("EVENT_RECEIVED");
      } else {
        return res.sendStatus(404);
      }
    } catch (err) {
      console.error("Webhook error:", err);
      return res.sendStatus(500);
    }
  }

  return res.sendStatus(405); // Method Not Allowed
}

// 📤 Send response to Messenger
async function sendMessageToMessenger(recipientId, text) {
  const PAGE_ACCESS_TOKEN = process.env.MESSENGER_PAGE_TOKEN;

  const url = `https://graph.facebook.com/v17.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;

  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text }
    }),
  });
}