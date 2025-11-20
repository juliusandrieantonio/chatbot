import Groq from "groq-sdk";

export default async function handler(req, res) {
  const VERIFY_TOKEN = process.env.MESSENGER_VERIFY_TOKEN;

  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verified successfully!");
      return res.status(200).send(challenge);
    } else {
      console.log("Webhook verify failed: token mismatch.");
      return res.status(403);
    }
  }

  // Messenger Messages (POST)
  if (req.method === "POST") {
    try {
      const body = req.body;
  
      if (body.object === "page") {
        for (const entry of body.entry) {
          const event = entry.messaging[0];
          const senderId = event.sender.id;
  
          if (event.message && event.message.text) {
            const userMessage = event.message.text;
  
            const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  
            // Mark seen (optional but recommended)
            await sendMarkSeen(senderId);
  
            // Typing ON
            await sendTypingIndicator(senderId, true);
  
            // Call Groq
            const completion = await client.chat.completions.create({
              model: "openai/gpt-oss-20b",
              messages: [
                { role: "system", content: "You are a helpful assistant." },
                { role: "user", content: userMessage }
              ],
            });
  
            const reply = completion.choices[0].message.content;
  
            // Typing OFF
            await sendTypingIndicator(senderId, false);
  
            // Send reply
            await sendMessageToMessenger(senderId, reply);
          }
        }
  
        return res.status(200).send("OK");
      } else {
        return res.status(404).send("Not Found");
      }
    } catch (err) {
      console.error("Webhook error:", err);
      return res.status(500).send("Server Error");
    }
  }

  return res.status(405); // Method Not Allowed
}

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

async function sendTypingIndicator(recipientId, isTyping) {
  const PAGE_ACCESS_TOKEN = process.env.MESSENGER_PAGE_TOKEN;

  return fetch(
    `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        sender_action: isTyping ? "typing_on" : "typing_off"
      })
    }
  );
}


async function sendMarkSeen(recipientId) {
  const PAGE_ACCESS_TOKEN = process.env.MESSENGER_PAGE_TOKEN;

  return fetch(
    `https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        sender_action: "mark_seen"
      })
    }
  );
}