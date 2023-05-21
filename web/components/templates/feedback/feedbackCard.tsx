import {TrashIcon as InfoIcon} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useState } from "react";
import { FeedbackData } from "../../../lib/api/feedback/feedback";

interface FeedbackCardProps {
  feedback: FeedbackData;
}

const FeedbackCard = (props: FeedbackCardProps) => {
  const { feedback } = props;

  return (
    <li key={feedback.id} className="overflow-hidden border border-gray-300 rounded-xl w-full">
      <div className="p-4 flex flex-row justify-between items-center">
        <div className="flex flex-row space-x-4 items-center">
          <InfoIcon className="h-8 w-8 bg-white p-1.5 rounded-md text-gray-200" />
          <p className="text-md font-semibold flex-1 overflow-ellipsis truncate w-[200px]">
            {feedback.metric_name}
          </p>
        </div>
      </div>
      <div className="bg-white px-4 flex flex-col divide-y divide-gray-200 text-sm">
        <div className="py-3 flex flex-row justify-between">
          <p className="text-gray-500">Type</p>
          <p className="text-gray-700">{feedback.metric_data_type}</p>
        </div>
        <div className="py-3 flex flex-row justify-between">
          <p className="text-gray-500">Average</p>
          <p className="text-gray-700">{feedback.statistic}</p>
        </div>
        <div className="py-3 flex flex-row justify-between">
          <p className="text-gray-500">Events</p>
          <p className="text-gray-700">{feedback.event_count}</p>
        </div>
        <div className="py-3 flex flex-row justify-between">
          <p className="text-gray-500">Last Recorded</p>
          <p className="text-gray-700">{feedback.latest_event}</p>
        </div>
      </div>
    </li>
  );
};

export default FeedbackCard;
