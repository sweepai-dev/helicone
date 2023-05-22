import { useState } from "react";
import { useGetFeedbackAggregates } from "../../../services/hooks/feedbackAggregates";
import { Feedback } from "../../../services/hooks/feedbackMetrics";
import RequestsPage from "../requests/requestsPage";
import { TimeInterval, getTimeIntervalAgo } from "../../../lib/timeCalculations/time";
import { MetricsPanelProps } from "../../shared/metrics/metricsPanel";

interface FeedbackIdPageProps {
  feedback: Feedback;
}

const FeedbackIdPage = (props: FeedbackIdPageProps) => {
  const { feedback } = props;
  const [interval, setInterval] = useState<TimeInterval>("7d");
  const [timeFilter, setTimeFilter] = useState<{
    start: Date;
    end: Date;
  }>({
    start: getTimeIntervalAgo(interval),
    end: new Date(),
  });
  const memoizedTimeFilter = timeFilter;

  const { data, isLoading } = useGetFeedbackAggregates(memoizedTimeFilter, feedback.uuid);
  console.log("THE DATA IS: ", data);

  const metric: MetricsPanelProps = {
    metric: {
        isLoading: isLoading,
        value: data?.data.statistic
    }
  }

  return (
    <div>
      <pre>{JSON.stringify(feedback, null, 2)}</pre>
      <MetricsPanel 
      <RequestsPage page={1} pageSize={25} sortBy={null} />
    </div>
  );
};

export default FeedbackIdPage;
