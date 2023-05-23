import { useState } from "react";
import { useGetFeedbackAggregates } from "../../../services/hooks/feedbackAggregates";
import { Feedback } from "../../../services/hooks/feedbackMetrics";
import RequestsPage from "../requests/requestsPage";
import { TimeInterval, getTimeIntervalAgo } from "../../../lib/timeCalculations/time";
import { MetricsPanel, MetricsPanelProps } from "../../shared/metrics/metricsPanel";
import { ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline"
import { BarChartData, RenderBarChart } from "../../shared/metrics/barChart";
import { Loading } from "../dashboard/dashboardPage";
import { Result } from "../../../lib/result";
import { RequestsOverTime } from "../../../lib/timeCalculations/fetchTimeData";

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
  const feedbackData = data?.data?.[0];

  const metric = {
        isLoading: isLoading,
        value: feedbackData?.statistic ?? "",
        label: "Statistic",
        icon: ArrowTopRightOnSquareIcon,
    }

   const requestsOverTime: Loading<Result<RequestsOverTime[], string>>

  return (
    <div>
      <pre>{JSON.stringify(feedback, null, 2)}</pre>
      <MetricsPanel metric={metric} key={1} />
      <RenderBarChart
        data={unwrapDefaultEmpty(requestsOverTime).map((r) => ({
            ...r,
            value: r.count,
        }))}
        timeMap={timeMap}
        valueLabel=""
        />
      <RequestsPage page={1} pageSize={25} sortBy={null} />
    </div>
  );
};

export default FeedbackIdPage;
