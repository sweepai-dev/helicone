import { Result } from "../../result";
import { dbExecute } from "../db/dbExecute";
import { buildFilter, FilterNode } from "./filters";

export interface AverageResponseTime {
  average_response_time: number;
  average_tokens_per_response: number;
}
export async function getAggregatedAvgMetrics(
  filter: FilterNode,
  user_id: string
): Promise<Result<AverageResponseTime, string>> {
  const query = `
  SELECT avg(EXTRACT(epoch FROM response_created_at - request_created_at))::float AS average_response_time,
  avg((((response_body ->> 'usage'::text)::json) ->> 'total_tokens'::text)::integer)::float AS average_tokens_per_response
  FROM materialized_response_and_request
WHERE (
  user_api_key_user_id = '${user_id}'
  AND (${buildFilter(filter)})
)
`;
  const { data, error } = await dbExecute<AverageResponseTime>(query);
  if (error !== null) {
    return { data: null, error: error };
  }

  return { data: data[0], error: null };
}
