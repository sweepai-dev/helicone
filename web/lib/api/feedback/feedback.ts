import { FilterNode } from "../../../services/lib/filters/filterDefs";
import {
  buildFilterClickHouse,
  buildFilterWithAuthClickHouse,
  buildFilterWithAuthClickHouseFeedback,
} from "../../../services/lib/filters/filters";
import { Result } from "../../result";
import { dbExecute, dbQueryClickhouse } from "../db/dbExecute";

interface FeedbackDataClickhouse {
  uuid: string;
  metric_data_type: string;
  event_count: number;
  latest_event: string;
  statistic: string;
}

export interface FeedbackData {
  uuid: string;
  metric_name: string;
  metric_data_type: string;
  event_count: number;
  latest_event: string;
  statistic: string;
}

export interface TimeFilter {
  start: Date;
  end: Date;
}

export async function getFeedbackData(
  orgId: string,
  filter: FilterNode,
  timeFilter: TimeFilter,
  offset: number,
  limit: number
): Promise<Result<FeedbackData[], string>> {
  if (isNaN(offset) || isNaN(limit)) {
    return { data: null, error: "Invalid offset or limit" };
  }

  const builtFilter = await buildFilterWithAuthClickHouseFeedback({
    org_id: orgId,
    argsAcc: [],
    filter,
  });

  const queries = {
    binary: `
    SELECT
      uuid,
      'binary' as metric_data_type,
      count(*) as event_count,
      max(created_at) as latest_event,
      concat(CAST(100 * AVG(CAST(boolean_value AS Int8)), 'String'), '%') as statistic
    FROM feedback_copy
    WHERE boolean_value IS NOT NULL AND (${builtFilter.filter})
    GROUP BY uuid
    LIMIT ${limit}
    OFFSET ${offset}
  `,
    numerical: `
    SELECT
      uuid,
      'numerical' as metric_data_type,
      count(*) as event_count,
      max(created_at) as latest_event,
      toString(AVG(float_value)) as statistic
    FROM feedback_copy
    WHERE float_value IS NOT NULL AND (${builtFilter.filter})
    GROUP BY uuid
    LIMIT ${limit}
    OFFSET ${offset}
  `,
  };

  const results = await Promise.all(
    Object.values(queries).map(async (query) => {
      const { data, error } = await dbQueryClickhouse<FeedbackDataClickhouse>(query, builtFilter.argsAcc);
      if (error !== null) {
        return { data: null, error: error };
      }
      return { data: data, error: null };
    })
  );

  // Check for errors in results
  for (let result of results) {
    if (result.error) {
      return { data: null, error: result.error };
    }
  }

  // Combine data from each result
  const combinedData = results.reduce((acc, result) => {
    if (result.data) {
      return [...acc, ...result.data];
    } else {
      return acc;
    }
  }, [] as FeedbackDataClickhouse[]);
  console.log("COMBINED DATA", combinedData)

  // Collect all UUIDs
  const uuids = combinedData.map((feedbackData) => feedbackData.uuid);
  // Convert to unique list
  const uniqueUuids = [...Array.from(new Set(uuids))];

  // Query PostgreSQL to get metric names of these UUIDs
  const query = `
    SELECT f.name, f.uuid
    FROM feedback_metrics f
    WHERE f.uuid = ANY($1)
  `;
  console.log("UNIQUE UUIDS", uniqueUuids)
  const { data: feedbackMetrics, error: pgError } = await dbExecute<{ name: string, uuid: string }>(query, [uniqueUuids]);

  // Error handling
  if (pgError) {
    return { data: null, error: pgError };
  }
  if (feedbackMetrics === null || feedbackMetrics.length === 0) {
    console.log("HEY HO! NO FEEDBACK METRICS", feedbackMetrics === null, feedbackMetrics.length === 0)
    return { data: [], error: null };
  }

  // Map of uuid to metric name
  const uuidToMetricName = new Map(feedbackMetrics.map(fm => [fm.uuid, fm.name]));

  // Replace the uuid with the corresponding metric name in combinedData
  // Replace the uuid with the corresponding metric name in combinedData
  const fullFeedbackData: FeedbackData[] = combinedData.map((feedbackData) => {
    return {
      ...feedbackData,
      metric_name: uuidToMetricName.get(feedbackData.uuid) || "",
    };
  });
  console.log("FULL FEEDBACK DATA", fullFeedbackData)
  return { data: fullFeedbackData, error: null };

}
