// src/index.ts
import GPT3Tokenizer from "gpt3-tokenizer";
import express from "express";

const app = express();
app.use(express.text({ type: "text/plain" }));

app.post("/", async (req, res) => {
  const text = req.body;
  if (typeof text !== "string") {
    res.status(400).send("Bad request");
    return;
  }
  const tokenizer = new GPT3Tokenizer({ type: "gpt3" });
  const encoded: { bpe: number[]; text: string[] } = tokenizer.encode(text);
  const tokenCount = encoded.bpe.length;
  res.send(tokenCount.toString());
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});
