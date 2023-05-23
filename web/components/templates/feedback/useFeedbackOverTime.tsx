// import { OverTimeRequestQueryParams } from "../../../lib/api/metrics/timeDataHandlerWrapper";
// import { Result } from "../../../lib/result";
// import { TimeIncrement } from "../../../lib/timeCalculations/fetchTimeData";
// import { FilterLeaf } from "../../../services/lib/filters/filterDefs";

import { useQuery } from "@tanstack/react-query";
import { FilterLeaf } from "../../../services/lib/filters/filterDefs";
import { getTimeInterval } from "../../../lib/timeCalculations/time";
import { fetchDataOverTime } from "../dashboard/useDashboardPage";
import { DateStatisticDBModel } from "../../../lib/api/metrics/getFeedbackStatisticOverTime";

// export async function useFeedbackStatisticOverTime<T>(
//     timeFilter: {
//       start: Date;
//       end: Date;
//     },
//     userFilters: FilterLeaf[],
//     dbIncrement: TimeIncrement
//   ) {
//     const body: OverTimeRequestQueryParams = {
//       timeFilter: {
//         start: timeFilter.start.toISOString(),
//         end: timeFilter.end.toISOString(),
//       },
//       userFilters,
//       dbIncrement,
//       timeZoneDifference: new Date().getTimezoneOffset(),
//     };
//     return await fetch("/api/metrics/feedbackStatisticOverTime", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(body),
//     }).then((res) => res.json() as Promise<Result<T[], string>>);
//   }
  
// import { FilterLeaf, OverTimeRequestQueryParams, TimeIncrement, Result, FeedbackStatisticOverTime } from 'your-types'; // Adjust according to your project's structure
// import { DateStatisticDBModel, getFeedbackStatisticOverTime } from "../../../lib/api/metrics/getFeedbackStatisticOverTime";
// import { TimeIncrement } from "../../../lib/timeCalculations/fetchTimeData";
// import { FilterLeaf } from "../../../services/lib/filters/filterDefs";
// import { fetchDataOverTime } from "../dashboard/useDashboardPage";
// import { useQuery } from '@tanstack/react-query';

// export const useFeedbackStatisticOverTime = (timeFilter: { start: Date; end: Date; }, userFilters: FilterLeaf[], timeInterval: TimeIncrement) => {
//   const feedbackStatisticOverTimeQuery = useQuery({
//     queryKey: ["feedbackStatisticOverTimeData", timeFilter, userFilters],
//     queryFn: async () => {
//       return getFeedbackStatisticOverTime({
//         timeFilter,
//         userFilters,
//         timeInterval
//       }).then(({ data, error }) => {
//         if (error !== null) {
//           console.error(error);
//           return { data, error };
//         } else {
//           return {
//             data: data.map((d) => ({
//               statistic: +d.statistic,
//               created_at_trunc: new Date(d.created_at_trunc),
//             })),
//             error,
//           };
//         }
//       });
//     },
//     refetchOnWindowFocus: false,
//   });

//   return feedbackStatisticOverTimeQuery;
// };

// import { useQuery } from "@tanstack/react-query";
// import { fetchDataOverTime } from "./path/to/fetchDataOverTime";
// import { getTimeInterval } from "./path/to/getTimeInterval";
// import { FilterLeaf, DateStatisticDBModel } from "./path/to/typeDefinitions"; // update this import path

interface FeedbackOverTimeRequest {
  timeFilter: {
    start: Date;
    end: Date;
  };
  userFilters: FilterLeaf[];
}

export const useFeedbackOverTime = ({
  timeFilter,
  userFilters,
}: FeedbackOverTimeRequest) => {
  const memoizedTimeFilter = timeFilter;

  const feedbackOverTime = useQuery({
    queryKey: ["feedbackOverTimeData", memoizedTimeFilter, userFilters],
    queryFn: async (query) => {
      const timeFilter = query.queryKey[1] as {
        start: Date;
        end: Date;
      };
      const userFilters = query.queryKey[2] as FilterLeaf[];
      const timeInterval = getTimeInterval(timeFilter);

      return fetchDataOverTime<DateStatisticDBModel>(
        timeFilter,
        userFilters,
        timeInterval,
        "feedbackStatisticOverTime"
      ).then(({ data, error }) => {
        if (error !== null) {
          console.error(error);
          return { data, error };
        } else {
          return {
            data: data.map((d) => ({
              statistic: +d.statistic,
              created_at_trunc: new Date(d.created_at_trunc),
            })),
            error,
          };
        }
      });
    },
    refetchOnWindowFocus: false,
  });

  return feedbackOverTime;
};
