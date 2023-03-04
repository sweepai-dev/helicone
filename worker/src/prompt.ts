import { GenericResult, Result } from ".";

export interface Prompt {
    prompt: string;
    values: { [key: string]: string };
}
 
interface PromptResult {
    request: Request,
    body: string,
    prompt?: Prompt,
}

function formatPrompt(prompt: Prompt): Result {
    let formattedString = prompt.prompt;
    const missingValues = [];

    for (const key in prompt.values) {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        if (!formattedString.includes(`{{${key}}}`)) {
            missingValues.push(key);
        } else {
            formattedString = formattedString.replace(placeholder, prompt.values[key]);
        }
    }

    if (missingValues.length > 0) {
        return {
            data: null,
            error: `Missing values in the prompt: ${missingValues.join(', ')}`,
        };
    }

    const regex = /{{([^{}]+)}}/g;
    let match = regex.exec(formattedString);
    const missingPlaceholders = [];

    while (match) {
        if (!prompt.values.hasOwnProperty(match[1])) {
            missingPlaceholders.push(match[1]);
        }
        match = regex.exec(formattedString);
    }

    if (missingPlaceholders.length > 0) {
        return {
            data: null,
            error: `Missing placeholders in the prompt regex: ${missingPlaceholders.join(', ')}`,
        };
    }

    return {
        data: formattedString,
        error: null,
    };
}

function updateContentLength(clone: Request, text: string): Request {
    const body = new TextEncoder().encode(text);
    const headers = new Headers(clone.headers);
    headers.set("Content-Length", `${body.byteLength}`);

    return new Request(clone.url, {
        method: clone.method,
        headers,
        body
    });
}

async function extractPromptMessages(
    cloneRequest: Request,
    json: any,
): Promise<GenericResult<PromptResult>> {
    console.log("Original body", cloneRequest.body)
    const messages = json["messages"];
    let formattedMessages = [];
    let prompt = null;
    for (let i = 0; i < messages.length; i++) {
        let message = messages[i];
        const parsedContent = message["content"];
        // If the message is a JSON, we format prompt it, otherwise we just return the message
        if (typeof parsedContent === "string") {
            prompt = null;
            formattedMessages.push(message);
            continue;
        } else if (typeof parsedContent === "object") {
            prompt = parsedContent["prompt"]
            const promptResult = formatPrompt(parsedContent);
            if (promptResult.error !== null) {
                return {
                    data: null,
                    error: promptResult.error,
                };
            }
            message["content"] = promptResult.data;
        } else {
            return {
                data: null,
                error: "Message content is not a string or an object",
            };
        }

        formattedMessages.push(message);
    }
    json["messages"] = formattedMessages;
    console.log("FORMATTED", formattedMessages)
    const body = JSON.stringify(json);
    const formattedRequest = updateContentLength(cloneRequest, body);

    const data = {
        request: formattedRequest,
        prompt,
        body,
    }
    console.log("Final body", body)

    return {
        data: {
            request: formattedRequest,
            prompt,
            body,
        },
        error: null,
    };
}


export async function extractPrompt(
    request: Request,
): Promise<GenericResult<PromptResult>> {
    const isPromptRegexOn = request.headers.get("Helicone-Prompt-Format") !== null;
	
    if (isPromptRegexOn) {
        try {
            const cloneRequest = request.clone();
            const cloneBody = await cloneRequest.text();
            const json = cloneBody ? JSON.parse(cloneBody) : {};

            if ("messages" in json && json["messages"].length > 0) {
                return extractPromptMessages(cloneRequest, json);
            }

            const prompt = JSON.parse(json["prompt"]);
            const stringPromptResult = formatPrompt(prompt);
            if (stringPromptResult.error !== null) {
                return {
                    data: null,
                    error: stringPromptResult.error,
                };
            }
            const stringPrompt = stringPromptResult.data;
            json["prompt"] = stringPrompt;
            const body = JSON.stringify(json);
            const formattedRequest = updateContentLength(cloneRequest, body);

            return {
                data: {
                    request: formattedRequest,
                    body: body,
                    prompt: prompt,
                },
                error: null,
            };
        } catch (error) {
            console.error(error);
            return {
                data: null,
                error: `Error parsing prompt: ${error}`,
            }
        }
    } else {
        return {
            data: {
                request: request,
                body: await request.text(),
            },
            error: null,
        }
    }
}
