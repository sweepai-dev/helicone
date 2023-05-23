// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import {
    HandlerWrapperOptions,
    withAuth,
  } from "../../../lib/api/handlerWrappers";
import { getFeedbackStatisticOverTime } from "../../../lib/api/metrics/getFeedbackStatisticOverTime";
  import { getTotalRequestsOverTime } from "../../../lib/api/metrics/getRequestOverTime";
  import {
    getSomeDataOverTime,
    getTimeDataHandler,
  } from "../../../lib/api/metrics/timeDataHandlerWrapper";
  import { Result } from "../../../lib/result";
  import { RequestsOverTime } from "../../../lib/timeCalculations/fetchTimeData";
  
  async function handler(
    options: HandlerWrapperOptions<Result<RequestsOverTime[], string>>
  ) {
    await getTimeDataHandler(options, (d) =>
      getSomeDataOverTime(d, getFeedbackStatisticOverTime, {
        reducer: (acc, d) => ({
          count: acc.count + d.statistic,
        }),
        initial: {
          count: 0,
        },
      })
    );
  }
  
  export default withAuth(handler);
  