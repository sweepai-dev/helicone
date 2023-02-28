import { dbExecute } from "../db/dbExecute";
import { buildFilter, FilterNode } from "./filters";

export interface ModelMetrics {
  model: string;
  sum_tokens: number;
}
export async function getModelMetrics(
  filter: FilterNode,
  user_id: string,
  cached: boolean
) {
  const query = `
SELECT response_body ->> 'model'::text as model,
  sum(((response_body -> 'usage'::text) ->> 'total_tokens'::text)::bigint)::bigint AS sum_tokens
FROM materialized_response_and_request
WHERE (
  user_api_key_user_id = '${user_id}'
  AND materialized_response_and_request.is_cached = ${cached ? "true" : "false"}
  AND (${buildFilter(filter)})
)
GROUP BY response_body ->> 'model'::text;
    `;
  return dbExecute<ModelMetrics>(query);
}
