import { Result } from "../../result";
import { dbExecute } from "../db/dbExecute";
import { buildFilter, FilterNode } from "./filters";

export interface CreatedAt {
  created_at: number;
}
export async function getXRequestDate(
  filter: FilterNode,
  user_id: string,
  first: boolean
): Promise<Result<Date, string>> {
  const query = `
SELECT 
  request_created_at
 FROM materialized_response_and_request
WHERE (
  user_api_key_user_id = '${user_id}'
  AND (${buildFilter(filter)})
)
ORDER BY response_created_at ${first ? "ASC" : "DESC"}
LIMIT 1
`;
  const { data, error } = await dbExecute<CreatedAt>(query);
  if (error !== null) {
    return { data: null, error: error };
  }
  if (data.length === 0) {
    return { data: null, error: "No data getting last request" };
  }
  return { data: new Date(data[0].created_at), error: null };
}
