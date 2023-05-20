import { HandlerWrapperOptions, withAuth } from "../../../../lib/api/handlerWrappers";
import { getFeedbackData, FeedbackData } from "../../../../lib/api/feedback/feedback";
import { Result } from "../../../../lib/result";
import { FilterNode } from "../../../../services/lib/filters/filterDefs";

async function handler(
  options: HandlerWrapperOptions<Result<FeedbackData[], string>>
) {
    console.log("HI HI HI FEEDBACK")
  const {
    req,
    res,
    userData: { orgId },
  } = options;
  const { filter, offset, limit } = req.body as {
    filter: FilterNode;
    offset: number;
    limit: number;
  };
  const { error: feedbackError, data: feedback } = await getFeedbackData(
    orgId,
    filter,
    offset,
    limit
  );
  console.log("RESULT", feedbackError, feedback)
  if (feedbackError !== null) {
    res.status(500).json({ error: feedbackError, data: null });
    return;
  }

  res.status(200).json({ error: null, data: feedback });
}

export default withAuth(handler);
