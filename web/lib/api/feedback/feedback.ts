import { FilterNode } from "../../../services/lib/filters/filterDefs";
import {
  buildFilterClickHouse,
  buildFilterWithAuthClickHouse,
  buildFilterWithAuthClickHouseFeedback,
} from "../../../services/lib/filters/filters";
import { Result } from "../../result";
import { dbQueryClickhouse } from "../db/dbExecute";

export interface FeedbackData {
  metric_name: string;
  metric_data_type: string;
  event_count: number;
  latest_event: string;
  statistic: string;
}

export async function getFeedbackData(
  orgId: string,
  filter: FilterNode,
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

  const havingFilter = buildFilterClickHouse({
    filter,
    having: true,
    argsAcc: builtFilter.argsAcc,
  });


  // format('%d%%', 100 * AVG(CAST(boolean_value AS Int8)))

  const queries = {
    binary: `
    SELECT
      metric_name,
      'binary' as metric_data_type,
      count(*) as event_count,
      max(created_at) as latest_event,
      concat(CAST(100 * AVG(CAST(boolean_value AS Int8)), 'String'), '%') as statistic
    FROM feedback_copy
    WHERE boolean_value IS NOT NULL AND (${builtFilter.filter})
    GROUP BY metric_name
    HAVING (${havingFilter.filter})
    LIMIT ${limit}
    OFFSET ${offset}
  `,
    numerical: `
    SELECT
      metric_name,
      'numerical' as metric_data_type,
      count(*) as event_count,
      max(created_at) as latest_event,
      toString(AVG(float_value)) as statistic
    FROM feedback_copy
    WHERE float_value IS NOT NULL AND (${builtFilter.filter})
    GROUP BY metric_name
    HAVING (${havingFilter.filter})
    LIMIT ${limit}
    OFFSET ${offset}
  `,
  //   categorical: `
  //   SELECT
  //     metric_name,
  //     'categorical' as metric_data_type,
  //     count(*) as event_count,
  //     max(created_at) as latest_event,
  //     toString(count(DISTINCT categorical_value)) as statistic
  //   FROM feedback_copy
  //   WHERE categorical_value IS NOT NULL AND (${builtFilter.filter})
  //   GROUP BY metric_name
  //   HAVING (${havingFilter.filter})
  //   LIMIT ${limit}
  //   OFFSET ${offset}
  // `,
  //   text: `
  //   SELECT
  //     metric_name,
  //     'text' as metric_data_type,
  //     count(*) as event_count,
  //     max(created_at) as latest_event,
  //     'NA' as statistic
  //   FROM feedback_copy
  //   WHERE string_value IS NOT NULL AND (${builtFilter.filter})
  //   GROUP BY metric_name
  //   HAVING (${havingFilter.filter})
  //   LIMIT ${limit}
  //   OFFSET ${offset}
  // `,
  };

  const results = await Promise.all(
    Object.values(queries).map(async (query) => {
      const { data, error } = await dbQueryClickhouse<FeedbackData>(query, builtFilter.argsAcc);
      console.log("QUERY", query)
      console.log("ERROR", error)
  
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
  }, [] as FeedbackData[]);

  // Return combined data
  return { data: combinedData, error: null };

}
