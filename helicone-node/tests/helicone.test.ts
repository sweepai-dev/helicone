import { Configuration, OpenAIApi } from "../dist";
import { v4 as uuidv4 } from "uuid";

const apiKey = process.env.OPENAI_API_KEY;
const heliconeApiKey = process.env.HELICONE_API_KEY;

if (!apiKey || !heliconeApiKey) {
  throw new Error("API keys must be set as environment variables.");
}

// Test cache behavior
test("cache", async () => {
  const uniqueId = uuidv4();
  const prompt = `Cache test with UUID: ${uniqueId}`;

  const configuration = new Configuration({
    apiKey,
    heliconeApiKey,
    cache: true,
  });

  const openai = new OpenAIApi(configuration);

  await openai.createCompletion({
    model: "text-ada-001",
    prompt,
    max_tokens: 10,
  });
}, 60000);

// Test cache behavior
test("cache", async () => {
  const uniqueId = uuidv4();
  const prompt = `Cache test with UUID: ${uniqueId}`;

  const configuration = new Configuration({
    apiKey,
    heliconeApiKey,
    cache: true,
  });

  const openai = new OpenAIApi(configuration);

  await openai.createCompletion({
    model: "text-ada-001",
    prompt,
    max_tokens: 10,
  });
}, 60000);

// Test rate limit policy
test("rate limit policy", async () => {
  const rateLimitPolicyDict = { quota: 10, time_window: 60 };
  const rateLimitPolicyStr = "10;w=60";

  let configuration = new Configuration({
    apiKey,
    heliconeApiKey,
    rateLimitPolicy: rateLimitPolicyDict,
  });

  let openai = new OpenAIApi(configuration);

  await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: "Rate limit policy test" }],
  });

  configuration = new Configuration({
    apiKey,
    heliconeApiKey,
    rateLimitPolicy: rateLimitPolicyStr,
  });

  openai = new OpenAIApi(configuration);

  await openai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content: "Rate limit policy test" }],
  });
}, 60000);

// Test custom properties
test("custom properties", async () => {
  const properties = {
    Session: "24",
    Conversation: "support_issue_2",
    App: "mobile",
  };

  const configuration = new Configuration({
    apiKey,
    heliconeApiKey,
    properties,
  });

  const openai = new OpenAIApi(configuration);

  await openai.createCompletion({
    model: "text-ada-001",
    prompt: "Custom properties test",
    max_tokens: 10,
  });
}, 60000);

// Test rate limit handling
test("rate limit handling", async () => {
  const configuration = new Configuration({
    apiKey,
    heliconeApiKey,
  });

  const openai = new OpenAIApi(configuration);

  // Mock the OpenAI API to return a 429 status code and a `x-ratelimit-reset-request` header with a specific value
  jest.spyOn(openai, 'createCompletion').mockImplementation(() => {
    return Promise.resolve({
      status: 429,
      headers: {
        'x-ratelimit-reset-request': '10',
      },
    });
  });

  const startTime = Date.now();

  // Make a request to the OpenAI API
  await openai.createCompletion({
    model: "text-ada-001",
    prompt: "Rate limit handling test",
    max_tokens: 10,
  });

  const endTime = Date.now();

  // Check that the client waited for the specified amount of time before retrying the request
  expect(endTime - startTime).toBeGreaterThanOrEqual(10000);
}, 60000);
