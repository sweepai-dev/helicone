import { OverTimeRequestQueryParams } from "../../../lib/api/metrics/timeDataHandlerWrapper";
import { Result } from "../../../lib/result";
import { TimeIncrement } from "../../../lib/timeCalculations/fetchTimeData";
import { FilterLeaf } from "../../../services/lib/filters/filterDefs";

export async function fetchDataOverTime<T>(
    timeFilter: {
      start: Date;
      end: Date;
    },
    userFilters: FilterLeaf[],
    dbIncrement: TimeIncrement
  ) {
    const body: OverTimeRequestQueryParams = {
      timeFilter: {
        start: timeFilter.start.toISOString(),
        end: timeFilter.end.toISOString(),
      },
      userFilters,
      dbIncrement,
      timeZoneDifference: new Date().getTimezoneOffset(),
    };
    return await fetch("/api/metrics/feedbackStatisticOverTime", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }).then((res) => res.json() as Promise<Result<T[], string>>);
  }
  