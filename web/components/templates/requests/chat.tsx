import { UserCircleIcon, UserIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import { clsx } from "../../shared/clsx";
import FeedbackTooltip from "./feedbackTooltip";
import Hover from "./hover";
import { ChatProperties, CsvData } from "./requestsPage";

interface ChatProps {
  chatProperties: ChatProperties;
  prompt_regex?: string;
  [keys: string]: any;
}

export interface Prompt {
    prompt: string;
    values: { [key: string]: string };
}

export interface Result {
    data: JSX.Element;
    error: string | null;
}

export function formatPrompt(prompt: Prompt): Result {
    const missingValues = [];
    let formattedString = prompt.prompt;
    const elements = formattedString.split(/({{[^}]+}})/g).map((part) => {
      const match = part.match(/{{([^}]+)}}/);
      if (match) {
        const key = match[1];
        const value = prompt.values[key];
        if (value === undefined) {
          missingValues.push(key);
          return null;
        }
        return <Hover value={value} name={key} />;
      }
      return part;
    });
  
    const output = (
      <div>
        <p>
          {elements}
        </p>
      </div>
    );

    return {
        data: <div>{output}</div>,
        error: null,
    };
}

export const Chat = (props: ChatProps) => {
  const { request, response } = props.chatProperties;
  const { prompt_regex, keys } = props;
  console.log("PROMPT REGEX", prompt_regex)
  console.log("KEYS", keys)



  let messages = prompt_regex ? JSON.parse(prompt_regex) : (request ? request : []);

  if (response) {
    messages = messages.concat([response]);
  }


  return (
    <div className="w-full flex flex-col text-left space-y-1 text-sm">
      <p className="text-gray-500 font-medium">Messages</p>
      <div className="flex flex-col text-m w-full border border-gray-300 rounded-md overflow-auto divide-y divide-gray-200 leading-6">
        <div className="flex-1 h-0">
      {/* <div className="text-sm w-full border border-gray-300 rounded-md overflow-auto divide-y divide-gray-200 h-full max-h-[500px]"> */}
        {messages.map((message, index) => {
        console.log("MESSAGES MESSAGES MESSAGES", message);
          const isAssistant = message.role === "assistant";
          const isSystem = message.role === "system";
          const isUser = message.role === "user";

          let formattedMessageContent;
          if (prompt_regex) {
            formattedMessageContent = formatPrompt({
                prompt: message.content,
                values: keys,
            }).data;
          } else {
            formattedMessageContent = message.content;
          }

          return (
            <div key={index} className="">
              <div
                className={clsx(
                  isAssistant || isSystem ? "bg-gray-100" : "bg-white",
                  isSystem ? "font-semibold" : "",
                  "items-start px-4 py-4 text-left grid grid-cols-10 gap-1"
                )}
              >
                <div className="col-span-1">
                  {isAssistant || isSystem ? (
                    <Image
                      src={"/assets/chatGPT.png"}
                      className="h-7 w-7 rounded-md"
                      height={30}
                      width={30}
                      alt="ChatGPT Logo"
                    />
                  ) : (
                    <UserCircleIcon className="h-7 w-7 bg-white rounded-full" />
                  )}
                </div>
                <div className="whitespace-pre-wrap col-span-9">
                  {formattedMessageContent}
                </div>
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
};
