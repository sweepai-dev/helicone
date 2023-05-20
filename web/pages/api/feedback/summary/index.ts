import { dbExecute } from "../../../../lib/api/db/dbExecute";
import { getFeedbackData } from "../../../../lib/api/feedback/feedback";
import {
  HandlerWrapperOptions,
  withAuth,
} from "../../../../lib/api/handlerWrappers";
import { Result } from "../../../../lib/result";

interface FeedbackSummary {
    metric_name: string;
    metric_data_type: string;
    event_count: number;
    latest_event: string;
}

async function getFeedbackSummary(
  org_id: string
): Promise<Result<FeedbackSummary[], string>> {
  const query = `
    SELECT f.name, f.data_type
    FROM feedback_metrics f
    JOIN helicone_api_keys h ON f.helicone_api_key_id = h.id
    WHERE h.organization_id = '${org_id}'
    LIMIT 1000;
  `;

  const { data, error } = await dbExecute<FeedbackSummary>(query, []);
  if (error !== null) {
    return { data: null, error: error };
  }
  return { data: data, error: null };
}

async function handler({
  req,
  res,
  userData: { orgId },
}: HandlerWrapperOptions<Result<FeedbackSummary[], string>>) {
  const results = await getFeedbackData(orgId);
  res.status(results.error === null ? 200 : 500).json(results);
}

export default withAuth(handler);
