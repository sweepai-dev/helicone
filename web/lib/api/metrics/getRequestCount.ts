import { Result } from "../../result";
import { dbExecute } from "../db/dbExecute";
import { buildFilter, FilterNode } from "./filters";

export interface Count {
  count: number;
}
export async function getRequestCount(
  filter: FilterNode,
  user_id: string,
  cached: boolean
): Promise<Result<number, string>> {
  const query = `
SELECT 
  COUNT(*) AS count
 FROM materialized_response_and_request
WHERE (
  user_api_key_user_id = '${user_id}'
  AND materialized_response_and_request.is_cached = ${cached ? "true" : "false"}
  AND (${buildFilter(filter)})
)
`;
  const { data, error } = await dbExecute<Count>(query);
  if (error !== null) {
    return { data: null, error: error };
  }
  if (data.length === 0) {
    return { data: null, error: "No data getting last request" };
  }
  return { data: data[0].count, error: null };
}
