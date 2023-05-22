import { useState } from "react";
import {
  TimeInterval,
  getTimeIntervalAgo,
} from "../../../lib/timeCalculations/time";
import ThemedTableHeader from "../../shared/themed/themedTableHeader";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { Database } from "../../../supabase/database.types";
import { useQuery } from "@tanstack/react-query";
import { Result } from "../../../lib/result";
import { FeedbackData } from "../../../lib/api/feedback/feedback";
import AuthHeader from "../../shared/authHeader";
import LoadingAnimation from "../../shared/loadingAnimation";
import FeedbackCard from "./feedbackCard";
import {
  FilterLeaf,
  FilterNode,
  filterListToTree,
} from "../../../services/lib/filters/filterDefs";
import { useGetFeedbackAggregates } from "../../../services/hooks/feedbackAggregates";

interface FeedbackPageProps {}

const FeedbackPage = (props: FeedbackPageProps) => {
  const client = useSupabaseClient<Database>();
  const [interval, setInterval] = useState<TimeInterval>("7d");
  const [timeFilter, setTimeFilter] = useState<{
    start: Date;
    end: Date;
  }>({
    start: getTimeIntervalAgo(interval),
    end: new Date(),
  });

  const memoizedTimeFilter = timeFilter;

  const { data, isLoading } = useGetFeedbackAggregates(memoizedTimeFilter);

  return (
    <>
      <AuthHeader title={"Feedback"} />
      <ThemedTableHeader
        isFetching={isLoading}
        timeFilter={{
          customTimeFilter: true,
          timeFilterOptions: [
            { key: "24h", value: "Today" },
            { key: "7d", value: "7D" },
            { key: "1m", value: "1M" },
            { key: "3m", value: "3M" },
          ],
          defaultTimeFilter: interval,
          onTimeSelectHandler: (key: TimeInterval, value: string) => {
            if ((key as string) === "custom") {
              value = value.replace("custom:", "");
              const start = new Date(value.split("_")[0]);
              const end = new Date(value.split("_")[1]);
              setInterval(key);
              setTimeFilter({
                start,
                end,
              });
            } else {
              setInterval(key);
              setTimeFilter({
                start: getTimeIntervalAgo(key),
                end: new Date(),
              });
            }
          },
        }}
      />
      {isLoading ? (
        <LoadingAnimation title="Getting feedback data" />
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start mt-8">
          {data?.data?.map((feedback) => (
            <FeedbackCard feedback={feedback} key={feedback.uuid} />
          ))}
        </ul>
      )}
    </>
  );
};

export default FeedbackPage;
