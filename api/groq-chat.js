import Groq from "groq-sdk";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { messages } = req.body;

  if (!messages) {
    res.status(400).json({ error: "No messages provided" });
    return;
  }

  const client = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  try {
    const chatCompletion = await client.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages,
      max_completion_tokens: 512,
    });

    res.status(200).json({
      reply: chatCompletion.choices[0].message.content,
      usage: chatCompletion.usage,
    });
  } catch (error) {
    console.error("Groq API error:", error);
    res.status(500).json({ error: "Groq API call failed" });
  }
}