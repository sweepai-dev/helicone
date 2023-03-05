import {
  ClipboardDocumentIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";
import { useState } from "react";
import useNotification from "../../shared/notification/useNotification";
import ThemedDrawer from "../../shared/themed/themedDrawer";
import ThemedModal from "../../shared/themed/themedModal";
import { Chat } from "./chat";
import { Completion } from "./completion";
import { CompletionRegex } from "./completionRegex";
import { ThumbsUpDown } from "./feedback";
import { Feedback } from "./provideFeedback";
import { capitalizeWords } from "./requestsPage";
import { MySwitch } from "./switch";

interface RequestDrawerProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  request: {
    request_id: string | null;
    response_id: string | null;
    error?: any;
    time: string | null;
    request: string | undefined;
    response: string | undefined;
    "duration (s)": string;
    total_tokens: number | undefined;
    logprobs: any;
    request_user_id: string | null;
    model: string | undefined;
    temperature: number | undefined;
    [keys: string]: any;
  };
  probabilities: any[];
  index: number;
  properties: string[];
  values: string[];
  thumbs: { [key: number]: "thumbs-up" | "thumbs-down" | undefined };
  setThumbs: (thumbs: { [key: number]: "thumbs-up" | "thumbs-down" | undefined }) => void;
}

const RequestDrawer = (props: RequestDrawerProps) => {
  const { open, setOpen, request, probabilities, index, properties, values, thumbs, setThumbs } =
    props;

    console.log("THUMBS UP DOWN INDEX", index, thumbs)

  const makePropertyRow = (name: string, val: string) => {
    return (
      <div className="py-2 text-sm font-medium">
        <dt className="text-gray-500">{capitalizeWords(name)}</dt>
        <dd className="text-gray-900">{val || "{NULL}"}</dd>
      </div>
    );
  };

  const [selected, setSelected] = useState<"left" | "right">("left");
  const [feedback, setFeedback] = useState("");
  const [feedbackFinal, setFeedbackFinal] = useState("");

  return (
    <ThemedDrawer
      open={open}
      setOpen={setOpen}
      title="Request Information"
      copyData={""}
    >
      <div className="grid grid-cols-3 gap-4 mt-2 border-gray-200">
  <div className="py-2 text-sm font-medium">
    <dt className="text-gray-500">Time</dt>
    <dd className="text-gray-900">
      {new Date(request.time || "").toLocaleString()}
    </dd>
  </div>
  <div className="py-2 text-sm font-medium">
    <dt className="text-gray-500">User ID</dt>
    <dd className="text-gray-900">{request.request_user_id || "n/a"}</dd>
  </div>
  <div className="py-2 text-sm font-medium">
    <dt className="text-gray-500">Duration</dt>
    <dd className="text-gray-900">{request["duration (s)"]}s</dd>
  </div>
  <div className="py-2 text-sm font-medium">
    <dt className="text-gray-500">Model</dt>
    <dd className="text-gray-900">{request.model}</dd>
  </div>
  <div className="py-2 text-sm font-medium">
    <dt className="text-gray-500">Tokens</dt>
    <dd className="text-gray-900">{request.total_tokens}</dd>
  </div>
  <div className="py-2 text-sm font-medium">
    <dt className="text-gray-500">Log Probability</dt>
    <dd className="text-gray-900">
      {probabilities[index] ? (
        <p>{probabilities ? probabilities[index] : 0}</p>
      ) : (
        "n/a"
      )}
    </dd>
  </div>
  {properties
    .filter((v) => request[v] != null)
    .map((p) =>
      makePropertyRow(p, request[p] !== null ? request[p] : "{NULL}")
    )}
</div>
      {request.error && request.error != "unknown error" && (
        <div className="flex flex-col justify-between py-3 text-xs font-medium space-y-1">
          <dt className="text-gray-500">Error</dt>
          <dd className="text-gray-900 p-2 border border-gray-300 bg-gray-100 rounded-md">
            <pre className="whitespace-pre-wrap" style={{ fontSize: "0.7rem" }}>
              {request.error
                ? JSON.stringify(request.error, null, 2)
                : "{{ no error }}"}
            </pre>
          </dd>
        </div>
      )}
      <div className="mt-4">
        {request.isChat ? (
          <Chat chatProperties={request.chatProperties} prompt_regex={request.prompt_regex} keys={values.reduce((acc, key) => {
            console.log("REQUEST", request.prompt_regex)
            console.log("REQUEST", request["adjective"])
            if (request.hasOwnProperty(key)) {
              return {
                ...acc,
                [key]: request[key],
              };
            }
            return acc;
          }, {})} />
        ) : !request.prompt_regex ? (
          <Completion request={request.request} response={request.response} isModeration={request.isModeration} moderationFullResponse={request.moderationFullResponse} />
        ) : (
          <div>
            <div className="flex flex-row justify-end">
              <MySwitch leftLabel="Full" rightLabel="Variables" selected={selected} setSelected={setSelected} />
            </div>
            <CompletionRegex
              prompt_regex={request.prompt_regex}
              prompt_name={request.prompt_name}
              // keys is the values for all the keys in `values`
              keys={values.reduce((acc, key) => {
                if (request.hasOwnProperty(key)) {
                  return {
                    ...acc,
                    [key]: request[key],
                  };
                }
                return acc;
              }, {})}
              response={request.response}
              values={values}
              showFull={selected != "left"}
            />
          </div>
        )}
      </div>
      {/* Put significant space in between the following button and the components above, and center it */}
      <div className="mt-4 flex flex-row justify-end">
        <div className="px-4 py-2 text-sm font-medium">
          <Feedback onFeedbackSubmit={(feedback) => console.log(feedback)} feedback={feedback} setFeedback={setFeedback} setFeedbackFinal={setFeedbackFinal} />
        </div>
        <ThumbsUpDown name="hi" selected={thumbs[index] || undefined} setSelected={setThumbs} id={index} />
      </div>
      <div class="flex justify-end">
  <div class="w-1/3">
    <div class="flex flex-col text-left space-y-1">
      {/* <p class="flex space-y-1 text-gray-500 font-small text-xs justify-end">Feedback</p> */}
      <p class="p-2 border border-gray-100 bg-gray-50 rounded-md whitespace-pre-wrap h-full overflow-auto text-xs text-right">
        {feedbackFinal}
      </p>
    </div>
  </div>
</div>

    </ThemedDrawer>);
};

export default RequestDrawer;
