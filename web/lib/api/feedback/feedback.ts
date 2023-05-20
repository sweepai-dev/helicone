import { FilterNode } from "../../../services/lib/filters/filterDefs";
import {
  buildFilterClickHouse,
  buildFilterWithAuthClickHouse,
} from "../../../services/lib/filters/filters";
import { Result } from "../../result";
import { dbQueryClickhouse } from "../db/dbExecute";

export interface FeedbackData {
  metric_name: string;
  metric_data_type: string;
  event_count: number;
  latest_event: string;
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
  console.log("THE FILTER IS ", filter)
  const builtFilter = await buildFilterWithAuthClickHouse({
    org_id: orgId,
    argsAcc: [],
    filter,
  });

  const havingFilter = buildFilterClickHouse({
    filter,
    having: true,
    argsAcc: builtFilter.argsAcc,
  });

  const query = `
SELECT 
  metric_name,
  metric_data_type,
  count(*) as event_count,
  max(created_at) as latest_event
FROM feedback_copy
WHERE (${builtFilter.filter})
GROUP BY metric_name, metric_data_type
HAVING (${havingFilter.filter})
LIMIT ${limit}
OFFSET ${offset}
  `;

  console.log("RIGHT BEFORE LICKHOUSE!", query, builtFilter.argsAcc)

  const { data, error } = await dbQueryClickhouse<FeedbackData>(query, builtFilter.argsAcc);

  console.log("CLICKHOUSE RESULT", data, error)

  if (error !== null) {
    return { data: null, error: error };
  }
  return { data: data, error: null };
}
