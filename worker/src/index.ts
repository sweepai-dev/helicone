import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getCacheSettings } from "./cache";
import { extractPrompt, Prompt } from "./prompt";
import { handleLoggingEndpoint, isLoggingEndpoint } from "./properties";
import {
  forwardRequestToOpenAiWithRetry,
  getRetryOptions,
  RetryOptions,
} from "./retry";
import GPT3Tokenizer from "gpt3-tokenizer";
import {
  checkRateLimit,
  getRateLimitOptions,
  RateLimitOptions,
  RateLimitResponse,
  updateRateLimitCounter,
} from "./rateLimit";
import { EventEmitter } from "events";
import { once } from "./helpers";
import { Database } from "../supabase/database.types";

// import bcrypt from "bcrypt";

export interface Env {
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_URL: string;
  TOKENIZER_COUNT_API: string;
  RATE_LIMIT_KV: KVNamespace;
}

interface SuccessResult<T> {
  data: T;
  error: null;
}
interface ErrorResult<T> {
  data: null;
  error: T;
}

export interface RequestSettings {
  stream: boolean;
  tokenizer_count_api: string;
  helicone_api_key?: string;
  ff_stream_force_format?: boolean;
  ff_increase_timeout?: boolean;
}

export type Result<T, K> = SuccessResult<T> | ErrorResult<K>;

export async function forwardRequestToOpenAi(
  request: Request,
  requestSettings: RequestSettings,
  body?: string,
  retryOptions?: RetryOptions
): Promise<Response> {
  const url = new URL(request.url);
  const new_url = new URL(`https://api.openai.com${url.pathname}`);
  const headers = removeHeliconeHeaders(request.headers);
  const method = request.method;
  const baseInit = { method, headers };
  const init = method === "GET" ? { ...baseInit } : { ...baseInit, body };

  let response;
  if (requestSettings.ff_increase_timeout) {
    const controller = new AbortController();
    const signal = controller.signal;
    setTimeout(() => controller.abort(), 1000 * 60 * 30);
    response = await fetch(new_url.href, { ...init, signal });
  } else {
    response = await fetch(new_url.href, init);
  }

  if (retryOptions && (response.status === 429 || response.status === 500)) {
    throw new Error(`Status code ${response.status}`);
  }

  return response;
}

type HeliconeRequest = {
  dbClient: SupabaseClient<Database>;
  request: Request;
  auth: string;
  requestId: string;
  body?: string;
  prompt?: Prompt;
  heliconeApiKey?: string;
} & HeliconeHeaders;

interface HeliconeHeaders {
  userId: string | null;
  promptId: string | null;
  properties?: Record<string, string>;
  isPromptRegexOn: boolean;
  promptName: string | null;
}

async function getPromptId(
  dbClient: SupabaseClient,
  prompt: Prompt,
  name: string | null,
  auth: string
): Promise<Result<string, string>> {
  // First, get the prompt id if there's a match in the prompt table
  const auth_hash = await hash(auth);
  const { data, error } = await dbClient
    .from("prompt")
    .select("id")
    .eq("auth_hash", auth_hash)
    .eq("prompt", prompt.prompt)
    .limit(1);
  if (error !== null) {
    return { data: null, error: error.message };
  }
  if (data !== null && data.length > 0) {
    return { data: data[0].id, error: null };
  } else {
    let newPromptName;
    if (name) {
      newPromptName = name;
    } else {
      // First, query the database to find the highest prompt name suffix
      const { data: highestSuffixData } = await dbClient
        .from("prompt")
        .select("name")
        .order("name", { ascending: false })
        .like("name", "Prompt (%)")
        .eq("auth_hash", auth_hash)
        .limit(1)
        .single();

      // Extract the highest suffix number from the highest prompt name suffix found
      let highestSuffix = 0;
      if (highestSuffixData) {
        const matches = highestSuffixData.name.match(/\((\d+)\)/);
        if (matches) {
          highestSuffix = parseInt(matches[1]);
        }
      }

      // Increment the highest suffix to get the new suffix for the new prompt name
      const newSuffix = highestSuffix + 1;

      // Construct the new prompt name with the new suffix
      newPromptName = `Prompt (${newSuffix})`;
    }

    // If there's no match, insert the prompt and get the id
    const { data, error } = await dbClient
      .from("prompt")
      .insert([
        {
          id: crypto.randomUUID(),
          prompt: prompt.prompt,
          name: newPromptName,
          auth_hash: auth_hash,
        },
      ])
      .select("id")
      .single();
    if (error !== null) {
      return { data: null, error: error.message };
    }
    return { data: data.id, error: null };
  }
}

async function getHeliconeUserId(
  dbClient: SupabaseClient<Database>,
  heliconeApiKey?: string
): Promise<
  Result<
    {
      api_key_hash: string;
      api_key_name: string;
      created_at: string;
      id: number;
      soft_delete: boolean;
      user_id: string;
    },
    string
  >
> {
  if (!heliconeApiKey) {
    return { data: null, error: "No helicone api key" };
  }
  if (!heliconeApiKey.includes("Bearer ")) {
    return { data: null, error: "Must included Bearer in API Key" };
  }
  const apiKey = heliconeApiKey.replace("Bearer ", "").trim();
  const apiKeyHash = await hash(`Bearer ${apiKey}`);
  const { data, error } = await dbClient
    .from("helicone_api_keys")
    .select("*")
    .eq("api_key_hash", apiKeyHash)
    .eq("soft_delete", false)
    .single();
  if (error !== null) {
    return { data: null, error: error.message };
  }
  return { data: data, error: null };
}

async function logRequest({
  dbClient,
  request,
  userId,
  promptId,
  requestId,
  auth,
  body,
  properties,
  prompt,
  promptName,
  heliconeApiKey,
}: HeliconeRequest): Promise<Result<string, string>> {
  try {
    const json = body ? JSON.parse(body) : {};
    const jsonUserId = json.user;

    const formattedPromptResult =
      prompt !== undefined
        ? await getPromptId(dbClient, prompt, promptName, auth)
        : null;
    if (
      formattedPromptResult !== null &&
      formattedPromptResult.error !== null
    ) {
      return { data: null, error: formattedPromptResult.error };
    }
    const formattedPromptId =
      formattedPromptResult !== null ? formattedPromptResult.data : null;
    const prompt_values = prompt !== undefined ? prompt.values : null;
    const hashed_auth = await hash(auth);

    const { data: heliconeUserId, error: userIdError } =
      await getHeliconeUserId(dbClient, heliconeApiKey);
    if (userIdError !== null) {
      console.error(userIdError);
    }

    // TODO - once we deprecate using OpenAI API keys, we can remove this
    // if (userIdError !== null) {
    //   return { data: null, error: userIdError };
    // }

    const { data, error } = await dbClient
      .from("request")
      .insert([
        {
          id: requestId,
          path: request.url,
          body: json,
          auth_hash: hashed_auth,
          user_id: jsonUserId ?? userId,
          prompt_id: promptId,
          properties: properties,
          formatted_prompt_id: formattedPromptId,
          prompt_values: prompt_values,
          helicone_user: heliconeUserId?.user_id,
          helicone_api_key_id: heliconeUserId?.id,
        },
      ])
      .select("id")
      .single();

    if (error !== null) {
      return { data: null, error: error.message };
    } else {
      // Log custom properties and then return request id
      const customProperties = Object.entries(properties ?? {}).map(
        (entry) => ({
          request_id: requestId,
          auth_hash: hashed_auth,
          user_id: null,
          key: entry[0],
          value: entry[1],
        })
      );
      await dbClient.from("properties").insert(customProperties).select();

      return { data: data.id, error: null };
    }
  } catch (e) {
    return { data: null, error: JSON.stringify(e) };
  }
}

async function hash(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashedKey = await crypto.subtle.digest(
    { name: "SHA-256" },
    encoder.encode(key)
  );
  const byteArray = Array.from(new Uint8Array(hashedKey));
  const hexCodes = byteArray.map((value) => {
    const hexCode = value.toString(16);
    const paddedHexCode = hexCode.padStart(2, "0");
    return paddedHexCode;
  });
  return hexCodes.join("");
}

function getHeliconeHeaders(headers: Headers): HeliconeHeaders {
  const propTag = "helicone-property-";
  const properties = Object.fromEntries(
    [...headers.entries()]
      .filter(([key]) => key.startsWith(propTag) && key.length > propTag.length)
      .map(([key, value]) => [key.substring(propTag.length), value])
  );
  return {
    userId:
      headers.get("Helicone-User-Id")?.substring(0, 128) ??
      headers.get("User-Id")?.substring(0, 128) ??
      null,
    promptId: headers.get("Helicone-Prompt-Id")?.substring(0, 128) ?? null,
    properties: Object.keys(properties).length === 0 ? undefined : properties,
    isPromptRegexOn: headers.get("Helicone-Prompt-Format") !== null,
    promptName: headers.get("Helicone-Prompt-Name")?.substring(0, 128) ?? null,
  };
}

function removeHeliconeHeaders(request: Headers): Headers {
  const newHeaders = new Headers();
  for (const [key, value] of request.entries()) {
    if (!key.toLowerCase().startsWith("helicone-")) {
      newHeaders.set(key, value);
    }
  }
  return newHeaders;
}

async function getTokenCount(inputText: string): Promise<number> {
  const tokenizer = new GPT3Tokenizer({ type: "gpt3" }); // or 'codex'
  const encoded: { bpe: number[]; text: string[] } =
    tokenizer.encode(inputText);
  return encoded.bpe.length;
}

function getRequestString(requestBody: any): [string, number] {
  if (requestBody.prompt !== undefined) {
    const prompt = requestBody.prompt;
    if (typeof prompt === "string") {
      return [requestBody.prompt, 0];
    } else if ("length" in prompt) {
      return [(prompt as string[]).join(""), 0];
    } else {
      throw new Error("Invalid prompt type");
    }
  } else if (requestBody.messages !== undefined) {
    const messages = requestBody.messages as { content: string }[];

    return [messages.map((m) => m.content).join(""), 3 + messages.length * 5];
  } else {
    throw new Error(`Invalid request body:\n${JSON.stringify(requestBody)}`);
  }
}

function getResponseText(responseBody: any): string {
  type Choice =
    | {
        delta: {
          content: string;
        };
      }
    | {
        text: string;
      };
  if (responseBody.choices !== undefined) {
    const choices = responseBody.choices;
    return (choices as Choice[])
      .map((c) => {
        if ("delta" in c) {
          return c.delta.content;
        } else if ("text" in c) {
          return c.text;
        } else {
          throw new Error("Invalid choice type");
        }
      })
      .join("");
  } else {
    throw new Error(`Invalid response body:\n${JSON.stringify(responseBody)}`);
  }
}

function consolidateTextFields(responseBody: any[]): any {
  try {
    const consolidated = responseBody.reduce((acc, cur) => {
      if (!cur) {
        return acc;
      } else if (acc.choices === undefined) {
        return cur;
      } else {
        return {
          ...acc,
          choices: acc.choices.map((c: any, i: number) => {
            if (!cur.choices) {
              return c;
            } else if (
              c.delta !== undefined &&
              cur.choices[i]?.delta !== undefined
            ) {
              return {
                delta: {
                  ...c.delta,
                  content: c.delta.content
                    ? c.delta.content + (cur.choices[i].delta.content ?? "")
                    : cur.choices[i].delta.content,
                },
              };
            } else if (
              c.text !== undefined &&
              cur.choices[i]?.text !== undefined
            ) {
              return {
                ...c,
                text: c.text + (cur.choices[i].text ?? ""),
              };
            } else {
              return c;
            }
          }),
        };
      }
    }, {});

    consolidated.choices = consolidated.choices.map((c: any) => {
      if (c.delta !== undefined) {
        return {
          ...c,
          // delta: undefined,
          message: {
            ...c.delta,
            content: c.delta.content,
          },
        };
      } else {
        return c;
      }
    });
    return consolidated;
  } catch (e) {
    console.error("Error consolidating text fields", e);
    return responseBody[0];
  }
}

async function parseResponse(
  requestSettings: RequestSettings,
  responseBody: string,
  responseStatus: number
): Promise<Result<any, string>> {
  const result = responseBody;
  try {
    if (!requestSettings.stream || responseStatus !== 200) {
      return {
        data: JSON.parse(result),
        error: null,
      };
    } else {
      const lines = result.split("\n").filter((line) => line !== "");
      const data = lines.map((line, i) => {
        if (i === lines.length - 1) return {};
        return JSON.parse(line.replace("data:", ""));
      });

      try {
        return {
          data: {
            ...consolidateTextFields(data),
            streamed_data: data,
          },
          error: null,
        };
      } catch (e) {
        return {
          data: {
            streamed_data: data,
          },
          error: null,
        };
      }
    }
  } catch (e) {
    return {
      data: null,
      error: "error parsing response, " + e + ", " + result,
    };
  }
}

async function readAndLogResponse(
  requestSettings: RequestSettings,
  responseBody: string,
  requestId: string,
  dbClient: SupabaseClient<Database>,
  requestBody: any,
  responseStatus: number,
  startTime: Date,
  wasTimeout: boolean
): Promise<void> {
  const { data: insertData, error: insertError } = await dbClient
    .from("response")
    .insert([
      {
        request: requestId,
        delay_ms: new Date().getTime() - startTime.getTime(),
        body: {},
        status: -1,
      },
    ])
    .select("id")
    .single();
  if (insertError !== null) {
    console.error(insertError);
    return;
  }

  const responseResult = await parseResponse(
    requestSettings,
    responseBody,
    responseStatus
  );
  if (responseResult.data !== null) {
    const { data, error } = await dbClient
      .from("response")
      .update({
        request: requestId,
        body: responseResult.data,
        status: responseStatus,
        completion_tokens: responseResult.data.usage?.completion_tokens,
        prompt_tokens: responseResult.data.usage?.prompt_tokens,
      })
      .eq("id", insertData.id)
      .select("id");
    if (error !== null) {
      console.error(error);
    } else {
      console.log(data);
    }
  } else {
    console.error(responseResult.error);
  }

  if (
    requestSettings.stream &&
    !responseResult.data.usage?.completion_tokens &&
    responseResult.data?.streamed_data
  ) {
    const streamed_data: any[] = responseResult.data.streamed_data;
    const responseTokenCount = await getTokenCount(
      streamed_data
        .filter((d) => "id" in d)
        .map((d) => getResponseText(d))
        .join("")
    );
    const [requestString, paddingTokenCount] = getRequestString(
      JSON.parse(requestBody)
    );
    const requestTokenCount =
      (await getTokenCount(requestString)) + paddingTokenCount;
    const totalTokens = requestTokenCount + responseTokenCount;
    if (isNaN(totalTokens)) {
      throw new Error("Invalid token count");
    }

    const { data, error } = await dbClient
      .from("response")
      .update({
        request: requestId,
        body: {
          ...responseResult.data,
          usage: {
            completion_tokens: responseTokenCount,
            prompt_tokens: requestTokenCount,
            total_tokens: totalTokens,
            helicone_calculated: true,
          },
        },
        delay_ms: new Date().getTime() - startTime.getTime(),
        status: responseStatus,
        completion_tokens: responseTokenCount,
        prompt_tokens: requestTokenCount,
      })
      .eq("id", insertData.id)
      .select("id");
    if (error !== null) {
      console.error(error);
    } else {
      console.log(data);
    }
  }
}

async function ensureApiKeyAddedToAccount(
  useId: string,
  openAIApiKeyHash: string,
  preview: string,
  dbClient: SupabaseClient<Database>
) {
  await dbClient.from("user_api_keys").upsert(
    {
      user_id: useId,
      api_key_hash: openAIApiKeyHash,
      api_key_preview: preview,
      key_name: "automatically added",
    },
    {
      ignoreDuplicates: true,
      onConflict: "api_key_hash,user_id",
    }
  );
}

async function forwardRequest(
  request: Request,
  requestSettings: RequestSettings,
  body: string,
  retryOptions?: RetryOptions
): Promise<Response> {
  return await (retryOptions
    ? forwardRequestToOpenAiWithRetry(request, requestSettings, retryOptions, body)
    : forwardRequestToOpenAi(request, requestSettings, body, retryOptions));
}

function createLoggingTransformStream(): [TransformStream, EventEmitter, Promise<string>, string] {
  const chunkEmitter = new EventEmitter();
  const responseBodySubscriber = once(chunkEmitter, "done");
  const decoder = new TextDecoder();
  let globalResponseBody = "";
  const loggingTransformStream = new TransformStream({
    transform(chunk, controller) {
      globalResponseBody += decoder.decode(chunk);
      controller.enqueue(chunk);
    },
    flush(controller) {
      chunkEmitter.emit("done", globalResponseBody);
    },
  });

  return [loggingTransformStream, chunkEmitter, responseBodySubscriber, globalResponseBody];
}

function handleStreamForceFormat(readable: ReadableStream<any> | undefined): ReadableStream<any> | undefined {
  let buffer: any = null;
  const transformer = new TransformStream({
    transform(chunk, controller) {
      if (chunk.length < 50) {
        buffer = chunk;
      } else {
        if (buffer) {
          const mergedArray = new Uint8Array(buffer.length + chunk.length);
          mergedArray.set(buffer);
          mergedArray.set(chunk, buffer.length);
          controller.enqueue(mergedArray);
        } else {
          controller.enqueue(chunk);
        }
        buffer = null;
      }
    },
  });
  return readable?.pipeThrough(transformer);
}

function setHeliconeRequestId(request: Request): string {
  return request.headers.get("Helicone-Request-Id") ?? crypto.randomUUID();
}

async function logRequestInfo(
  ctx: ExecutionContext, 
  env: Env, 
  requestSettings: RequestSettings, 
  request: Request, 
  response: Response,
  auth: string, 
  body: string, 
  requestId: string,
  startTime: Date,
  globalResponseBody: string,
  responseBodySubscriber: Promise<string>,
  prompt?: Prompt,
): Promise<void> {
  async function responseBodyTimeout(delay_ms: number) {
    await new Promise((resolve) => setTimeout(resolve, delay_ms));
    console.log("response body timeout");
    return globalResponseBody;
  }
  ctx.waitUntil(
    (async () => {
      const dbClient = createClient(
        env.SUPABASE_URL,
        env.SUPABASE_SERVICE_ROLE_KEY
      );
      if (requestSettings.helicone_api_key) {
        const { data: heliconeUserId, error: userIdError } =
          await getHeliconeUserId(dbClient, requestSettings.helicone_api_key);
        if (userIdError !== null) {
          console.error(userIdError);
        } else {
          console.log("helicone user id", heliconeUserId);
          await ensureApiKeyAddedToAccount(
            heliconeUserId.user_id,
            await hash(auth),
            auth.replace("Bearer", "").trim().slice(0, 5) +
              "..." +
              auth.trim().slice(-3),
            dbClient
          );
        }
      }
      const requestBody = body === "" ? undefined : body;
      const requestResult = await logRequest({
        dbClient,
        request,
        auth,
        body: requestBody,
        prompt: prompt,
        ...getHeliconeHeaders(request.headers),
        requestId,
        heliconeApiKey: requestSettings.helicone_api_key,
      });

      const responseStatus = response.status;
      const [wasTimeout, responseText] = await Promise.race([
        Promise.all([true, responseBodyTimeout(15 * 60 * 1000)]), //15 minutes
        Promise.all([false, responseBodySubscriber]),
      ]);

      if (requestResult.data !== null) {
        await readAndLogResponse(
          requestSettings,
          responseText,
          requestResult.data,
          dbClient,
          requestBody,
          responseStatus,
          startTime,
          wasTimeout
        );
      }
    })()
  );
}

async function forwardAndLog(
  requestSettings: RequestSettings,
  body: string,
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  retryOptions?: RetryOptions,
  prompt?: Prompt
): Promise<Response> {
  const auth = request.headers.get("Authorization");
  if (auth === null) {
    return new Response("No authorization header found!", { status: 401 });
  }
  const startTime = new Date();

  const response = await forwardRequest(request, requestSettings, body, retryOptions);

  const [loggingTransformStream, _, responseBodySubscriber, globalResponseBody] = createLoggingTransformStream();
  let readable = response.body?.pipeThrough(loggingTransformStream);
  if (requestSettings.ff_stream_force_format) {
    readable = handleStreamForceFormat(readable);
  }

  const requestId = setHeliconeRequestId(request);

  await logRequestInfo(
    ctx,
    env,
    requestSettings,
    request,
    response,
    auth,
    body,
    requestId,
    startTime,
    globalResponseBody,
    responseBodySubscriber,
    prompt,
  );

  const responseHeaders = new Headers(response.headers);
  responseHeaders.set("Helicone-Status", "success");
  responseHeaders.set("Helicone-Id", requestId);

  return new Response(readable, {
    ...response,
    headers: responseHeaders,
  });
}

async function uncachedRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  requestSettings: RequestSettings,
  retryOptions?: RetryOptions
): Promise<Response> {
  const result = await extractPrompt(request);
  if (result.data !== null) {
    const { request: formattedRequest, body: body, prompt } = result.data;
    return await forwardAndLog(
      requestSettings,
      body,
      formattedRequest,
      env,
      ctx,
      retryOptions,
      prompt
    );
  } else {
    return new Response(result.error, { status: 400 });
  }
}

async function buildCachedRequest(
  request: Request,
  idx: number
): Promise<Request> {
  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (key.toLowerCase().startsWith("helicone-")) {
      headers.set(key, value);
    }
    if (key.toLowerCase() === "authorization") {
      headers.set(key, value);
    }
  }

  const cacheKey = await hash(
    request.url +
      (await request.text()) +
      JSON.stringify([...headers.entries()]) +
      (idx >= 1 ? idx.toString() : "")
  );
  const cacheUrl = new URL(request.url);

  const pathName = cacheUrl.pathname.replaceAll("/", "_");
  cacheUrl.pathname = `/posts/${pathName}/${cacheKey}`;

  return new Request(cacheUrl, {
    method: "GET",
    headers: headers,
  });
}
async function saveToCache(
  request: Request,
  response: Response,
  cacheControl: string,
  settings: { maxSize: number }
): Promise<void> {
  console.log("Saving to cache");
  const cache = caches.default;
  const responseClone = response.clone();
  const responseHeaders = new Headers(responseClone.headers);
  responseHeaders.set("Cache-Control", cacheControl);
  const cacheResponse = new Response(responseClone.body, {
    ...responseClone,
    headers: responseHeaders,
  });
  console.log("cache response", response.headers);
  const { freeIndexes } = await getMaxCachedResponses(
    request.clone(),
    settings
  );
  if (freeIndexes.length > 0) {
    cache.put(await buildCachedRequest(request, freeIndexes[0]), cacheResponse);
  } else {
    throw new Error("No free indexes");
  }
}

async function getMaxCachedResponses(
  request: Request,
  { maxSize }: { maxSize: number }
): Promise<{ requests: Response[]; freeIndexes: number[] }> {
  const cache = caches.default;
  const requests = await Promise.all(
    Array.from(Array(maxSize).keys()).map(async (idx) => {
      const requestCache = await buildCachedRequest(request.clone(), idx);
      return cache.match(requestCache);
    })
  );
  return {
    requests: requests.filter((r) => r !== undefined) as Response[],
    freeIndexes: requests
      .map((r, idx) => idx)
      .filter((idx) => requests[idx] === undefined),
  };
}

async function getCachedResponse(
  request: Request,
  settings: { maxSize: number }
): Promise<Response | null> {
  const { requests: requestCaches, freeIndexes } = await getMaxCachedResponses(
    request.clone(),
    settings
  );
  if (freeIndexes.length > 0) {
    console.log("Max cache size reached, not caching");
    return null;
  } else {
    const cacheIdx = Math.floor(Math.random() * requestCaches.length);
    const randomCache = requestCaches[cacheIdx];
    const cachedResponseHeaders = new Headers(randomCache.headers);
    cachedResponseHeaders.append("Helicone-Cache", "HIT");
    cachedResponseHeaders.append(
      "Helicone-Cache-Bucket-Idx",
      cacheIdx.toString()
    );
    return new Response(randomCache.body, {
      ...randomCache,
      headers: cachedResponseHeaders,
    });
  }
}

async function recordCacheHit(headers: Headers, env: Env): Promise<void> {
  const requestId = headers.get("helicone-id");
  if (!requestId) {
    console.error("No request id found in cache hit");
    return;
  }
  const dbClient = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );
  const { error } = await dbClient
    .from("cache_hits")
    .insert({ request_id: requestId });
  if (error) {
    console.error(error);
  }
}

function generateRateLimitHeaders(
  rateLimitCheckResult: RateLimitResponse,
  rateLimitOptions: RateLimitOptions
): { [key: string]: string } {
  const policy = `${rateLimitOptions.quota};w=${rateLimitOptions.time_window};u=${rateLimitOptions.unit}`;
  const headers: { [key: string]: string } = {
    "Helicone-RateLimit-Limit": rateLimitCheckResult.limit.toString(),
    "Helicone-RateLimit-Remaining": rateLimitCheckResult.remaining.toString(),
    "Helicone-RateLimit-Policy": policy,
  };

  if (rateLimitCheckResult.reset !== undefined) {
    headers["Helicone-RateLimit-Reset"] = rateLimitCheckResult.reset.toString();
  }

  return headers;
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    try {
      if (isLoggingEndpoint(request)) {
        const response = await handleLoggingEndpoint(request, env);
        return response;
      }

      const rateLimitOptions = getRateLimitOptions(request);
      console.log("rate limit options", rateLimitOptions);

      const requestBody =
        request.method === "POST"
          ? await request.clone().json<{ stream?: boolean; user?: string }>()
          : {};

      let additionalHeaders: { [key: string]: string } = {};
      if (rateLimitOptions !== undefined) {
        const auth = request.headers.get("Authorization");

        if (auth === null) {
          return new Response("No authorization header found!", {
            status: 401,
          });
        }

        const hashedKey = await hash(auth);
        const rateLimitCheckResult = await checkRateLimit(
          request,
          env,
          rateLimitOptions,
          hashedKey,
          requestBody.user
        );

        additionalHeaders = generateRateLimitHeaders(
          rateLimitCheckResult,
          rateLimitOptions
        );

        if (rateLimitCheckResult.status === "rate_limited") {
          return new Response(
            JSON.stringify({
              message:
                "Rate limit reached. Please wait before making more requests.",
            }),
            {
              status: 429,
              headers: {
                "content-type": "application/json;charset=UTF-8",
                ...additionalHeaders,
              },
            }
          );
        }
      }

      const requestSettings: RequestSettings = {
        stream: requestBody.stream ?? false,
        tokenizer_count_api: env.TOKENIZER_COUNT_API,
        helicone_api_key: request.headers.get("helicone-auth") ?? undefined,
        ff_stream_force_format:
          request.headers.get("helicone-ff-stream-force-format") === "true",
        ff_increase_timeout:
          request.headers.get("helicone-ff-increase-timeout") === "true",
      };

      const retryOptions = getRetryOptions(request);

      const { data: cacheSettings, error: cacheError } = getCacheSettings(
        request.headers,
        requestBody.stream ?? false
      );

      if (cacheError !== null) {
        return new Response(cacheError, { status: 400 });
      }

      if (cacheSettings.shouldReadFromCache) {
        const cachedResponse = await getCachedResponse(
          request.clone(),
          cacheSettings.bucketSettings
        );
        if (cachedResponse) {
          ctx.waitUntil(recordCacheHit(cachedResponse.headers, env));
          return cachedResponse;
        }
      }

      const requestClone = cacheSettings.shouldSaveToCache
        ? request.clone()
        : null;

      const response = await uncachedRequest(
        request,
        env,
        ctx,
        requestSettings,
        retryOptions
      );

      if (cacheSettings.shouldSaveToCache && requestClone) {
        ctx.waitUntil(
          saveToCache(
            requestClone,
            response,
            cacheSettings.cacheControl,
            cacheSettings.bucketSettings
          )
        );
      }
      const responseHeaders = new Headers(response.headers);
      if (cacheSettings.shouldReadFromCache) {
        responseHeaders.append("Helicone-Cache", "MISS");
      }
      Object.entries(additionalHeaders).forEach(([key, value]) => {
        responseHeaders.append(key, value);
      });

      if (rateLimitOptions !== undefined) {
        const auth = request.headers.get("Authorization");

        if (auth === null) {
          return new Response("No authorization header found!", {
            status: 401,
          });
        }
        const hashedKey = await hash(auth);
        updateRateLimitCounter(
          request,
          env,
          rateLimitOptions,
          hashedKey,
          requestBody.user
        );
      }

      return new Response(response.body, {
        ...response,
        status: response.status,
        headers: responseHeaders,
      });
    } catch (e) {
      console.error(e);
      return new Response(
        JSON.stringify({
          "helicone-message":
            "Helicone ran into an error servicing your request: " + e,
          support:
            "Please reach out on our discord or email us at help@helicone.ai, we'd love to help!",
          "helicone-error": JSON.stringify(e),
        }),
        {
          status: 500,
          headers: {
            "content-type": "application/json;charset=UTF-8",
            "helicone-error": "true",
          },
        }
      );
    }
  },
};
