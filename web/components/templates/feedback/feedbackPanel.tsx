import { DateStatisticDBModel } from '../../../lib/api/metrics/getFeedbackStatisticOverTime';
import { Result } from '../../../lib/result';
import { RequestsOverTime } from '../../../lib/timeCalculations/fetchTimeData';
import { RenderBarChart } from '../../shared/metrics/barChart';
import { Loading } from '../dashboard/dashboardPage';
// import { unwrapDefaultEmpty } from '../dashboard/panels/requestsPanel';

interface FeedbackPanelProps {
  feedbackStatisticOverTime: Loading<Result<DateStatisticDBModel[], string>>;
  timeMap: (date: Date) => string;
}

export function unwrapDefaultEmpty<T>(data: Loading<Result<T[], string>>): T[] {
    if (data === "loading") {
      return [];
    }
    if (data.error !== null) {
      return [];
    }
    return data.data;
  }

const FeedbackPanel = (props: FeedbackPanelProps) => {
  const { feedbackStatisticOverTime, timeMap } = props;

  return (
    <div className="grid grid-cols-5 gap-4 h-96">
      <div className="col-span-5 md:col-span-5 bg-white border border-gray-300 rounded-lg">
        <div className="flex flex-col space-y-4 py-6">
          <h3 className="text-lg font-semibold text-gray-900 text-center">
            Feedback Statistics
          </h3>
          <div className="h-72 px-4">
            {feedbackStatisticOverTime === "loading" ? (
              <div className="h-full w-full flex-col flex p-8">
                <div className="h-full w-full rounded-lg bg-gray-300 animate-pulse" />
              </div>
            ) : (
              <RenderBarChart
                data={unwrapDefaultEmpty(feedbackStatisticOverTime).map((f) => ({
                  ...f,
                  value: f.statistic,
                }))}
                timeMap={timeMap}
                valueLabel="feedback"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackPanel;
