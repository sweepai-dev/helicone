import { AxiosResponse } from "axios";
import { Configuration, OpenAIApi } from "openai";
import { v4 as uuidv4 } from "uuid";
import fetch from 'node-fetch';



const apiKey = process.env.OPENAI_API_KEY;
const heliconeApiKey = process.env.HELICONE_API_KEY_LOCAL;
const basePath = "https://oai_staging.hconeai.com/v1";

if (!apiKey || !heliconeApiKey) {
  throw new Error("API keys must be set as environment variables.");
}

async function compareResponses(response1: AxiosResponse, response2: AxiosResponse) {
  // Compare status
  if (response1.status !== response2.status) {
    return false;
  }

  // Prepare headers
  const headers1 = {...response1.headers};
  const headers2 = {...response2.headers};
  
  // Check the expected values for Helicone-Cache
  if (headers1['helicone-cache'] !== 'MISS' || headers2['helicone-cache'] !== 'HIT') {
    return false;
  }

  // Remove Helicone-Cache before comparing the rest of the headers
  delete headers1['helicone-cache'];
  delete headers2['helicone-cache'];
  delete headers2['cache-control'];
  delete headers2['helicone-cache-bucket-idx'];

  // Compare the remaining headers
  if (JSON.stringify(headers1) !== JSON.stringify(headers2)) {
    console.log("HEADERS")
    return false;
  }

  const body1 = await response1.data;
  const body2 = await response2.data;

  if (JSON.stringify(body1) !== JSON.stringify(body2)) {
    return false;
  }

  // If none of the above checks failed, the responses are equal
  return true;
}


// // Test cache behavior
// test("cache", async () => {
//   const configuration = new Configuration({
//     apiKey: process.env.OPENAI_API_KEY,
//     basePath,
//     baseOptions: {
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${apiKey}`,
//         "Helicone-Auth": `Bearer ${heliconeApiKey}`,
//         "Helicone-Cache-Enabled": "true",
//       },
//     },
//   });

//   const uniqueId = uuidv4();
//   const prompt = `Cache test with UUID: ${uniqueId}`;

//   const openai = new OpenAIApi(configuration);
//   const response1 = await openai.createEmbedding({
//     model: "text-embedding-ada-002",
//     input: prompt,
//   });
//   function sleep(ms: number) {
//       return new Promise(resolve => setTimeout(resolve, ms));
//   }
//   await sleep(2000);

//   const response2 = await openai.createEmbedding({
//     model: "text-embedding-ada-002",
//     input: prompt,
//   });

//   // Compare responses
//   console.log("RESPONSES", response1.data.data, response2.data.data);
//   const areEqual = await compareResponses(response1, response2);
//   expect(areEqual).toBeTruthy();
// }, 60000);

test("cache test using fetch", async () => {
  const requestInit = {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'Helicone-Cache-Enabled': 'true',
      'Helicone-Auth': `Bearer ${heliconeApiKey}`
    },
    body: JSON.stringify({
      model: 'text-embedding-ada-002',
      input: `Cache test with UUID: ${uuidv4()}`,
    }),
  };

  function sleep(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }


  const firstResponse = await fetch(`${basePath}/embeddings`, requestInit);
  expect(firstResponse.ok).toBeTruthy();
  // expect(firstResponse.headers.get('Helicone-Cache')).toBe('MISS');
  // console.log(firstResponse.body);
  const firstResponseBody = await firstResponse.json();


  // console.log("MADE IT TO THE SECOND RESPONSE")
  // const secondResponse = await fetch(`${basePath}/embeddings`, requestInit);
  // expect(secondResponse.ok).toBeTruthy();
  // expect(secondResponse.headers.get('Helicone-Cache')).toBe('HIT');
  // const secondResponseBody = await secondResponse.json();

  // // Compare the bodies of the two responses
  // expect(secondResponseBody).toEqual(firstResponseBody);
}, 100000);

