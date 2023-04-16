"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/index.ts
const gpt3_tokenizer_1 = __importDefault(require("gpt3-tokenizer"));
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
app.use(express_1.default.text({ type: "text/plain" }));
app.post("/", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const text = req.body;
    if (typeof text !== "string") {
        res.status(400).send("Bad request");
        return;
    }
    const tokenizer = new gpt3_tokenizer_1.default({ type: "gpt3" });
    const encoded = tokenizer.encode(text);
    const tokenCount = encoded.bpe.length;
    res.send(tokenCount.toString());
}));
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
