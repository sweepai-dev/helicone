import { capitalizeWords, CsvData } from "./requestsPage";

interface CompletionRegexProps {
  prompt_name?: string;
  prompt_regex?: string;
  response?: string;
  values: string[];
  showFull: boolean;
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

function formatPrompt(prompt: Prompt): Result {
    let formattedString = prompt.prompt;
    const missingValues = [];

    for (const key in prompt.values) {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        if (!formattedString.includes(`{{${key}}}`)) {
            missingValues.push(key);
        } else {
            formattedString = formattedString.replace(placeholder, `<span class="text-red-500">${prompt.values[key]}</span>`);
        }
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

    return {
        data: <div dangerouslySetInnerHTML={{ __html: formattedString }} />,
        error: null,
    };
}

export const CompletionRegex = (props: CompletionRegexProps) => {
  const { prompt_name, prompt_regex, response, values, keys, showFull } = props;
  console.log("PROMPT REGEX", prompt_regex)
  console.log("KEYS", keys)

  const formattedRequest = formatPrompt({
        prompt: prompt_regex || "",
        values: keys,
    }).data

  if (showFull) {
    return (
        <div className="flex flex-col gap-2 text-sm w-full space-y-2">
          <>{values.map(value => {
        const placeholder = new RegExp(`{{${value}}}`, 'g');

        if (prompt_regex?.includes(`{{${value}}}`)) {
         return <div className="w-full flex flex-col text-left space-y-1">
            <p className="text-gray-500 font-medium">{capitalizeWords(value)}</p>
            <p className="p-2 border border-gray-300 bg-gray-100 rounded-md whitespace-pre-wrap h-full max-h-[300px] overflow-auto">
              {keys[value]}
            </p>
          </div>
          } else {return <></>}})}</>
          <div className="w-full flex flex-col text-left space-y-1">
            <p className="text-gray-500 font-medium">Response</p>
            <p className="p-2 border border-gray-300 bg-gray-100 rounded-md whitespace-pre-wrap h-full overflow-auto">
                {response?.trimStart()}
            </p>
          </div>
        </div>
      ); 
  }

  return (
    <div className="flex flex-col gap-2 text-sm w-full space-y-2">
      <div className="w-full flex flex-col text-left space-y-1">
        <p className="text-gray-500 font-medium">Request</p>
        <p className="p-2 border border-gray-300 bg-gray-100 rounded-md whitespace-pre-wrap h-full max-h-[300px] overflow-auto">
          {formattedRequest}
        </p>
      </div>
      <div className="w-full flex flex-col text-left space-y-1">
        <p className="text-gray-500 font-medium">Response</p>
        <p className="p-2 border border-gray-300 bg-gray-100 rounded-md whitespace-pre-wrap h-full overflow-auto">
            {response?.trimStart()}
        </p>
      </div>
    </div>
  );
};
