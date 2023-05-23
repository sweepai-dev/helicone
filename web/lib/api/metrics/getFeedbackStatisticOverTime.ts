import { SupabaseClient, User } from "@supabase/supabase-js";
import { FilterNode } from "../../../services/lib/filters/filterDefs";
import { buildFilterWithAuthClickHouseFeedback } from "../../../services/lib/filters/filters";

import { Result } from "../../result";
import {
  isValidTimeIncrement,
  isValidTimeZoneDifference,
} from "../../sql/timeHelpers";
import { TimeIncrement } from "../../timeCalculations/fetchTimeData";
import { dbExecute, dbQueryClickhouse } from "../db/dbExecute";

import { DataOverTimeRequest } from "./timeDataHandlerWrapper";

export interface GetTimeDataOptions {
  filter: FilterNode;
  dbIncrement: TimeIncrement;
}

export interface AuthClient {
  client: SupabaseClient;
  user: User;
}

export interface DateStatisticDBModel {
  created_at_trunc: Date;
  statistic: number;
}

export async function getFeedbackStatisticOverTime({
  timeFilter,
  userFilter,
  orgId,
  dbIncrement,
  timeZoneDifference,
}: DataOverTimeRequest): Promise<Result<DateStatisticDBModel[], string>> {
  const filter: FilterNode = userFilter;
  if (!isValidTimeIncrement(dbIncrement)) {
    return { data: null, error: "Invalid time increment" };
  }
  if (!isValidTimeZoneDifference(timeZoneDifference)) {
    return { data: null, error: "Invalid time zone difference" };
  }
  const builtFilter = await buildFilterWithAuthClickHouseFeedback({
    org_id: orgId,
    filter,
    argsAcc: [],
  });

  const dateTrunc = `DATE_TRUNC('${dbIncrement}', feedback_copy.created_at + INTERVAL '${timeZoneDifference} minutes')`;
  const queries = {
    binary: `
    SELECT
      ${dateTrunc} as created_at_trunc,
      AVG(CAST(boolean_value AS Int8)) as statistic
    FROM feedback_copy
    WHERE boolean_value IS NOT NULL AND (${builtFilter.filter})
    GROUP BY created_at_trunc
    ORDER BY created_at_trunc
  `,
    numerical: `
    SELECT
      ${dateTrunc} as created_at_trunc,
      AVG(float_value) as statistic
    FROM feedback_copy
    WHERE float_value IS NOT NULL AND (${builtFilter.filter})
    GROUP BY created_at_trunc
    ORDER BY created_at_trunc
  `,
  };

  const results = await Promise.all(
    Object.values(queries).map(async (query) => {
      const { data, error } = await dbQueryClickhouse<DateStatisticDBModel>(
        query,
        builtFilter.argsAcc
      );
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
  }, [] as DateStatisticDBModel[]);

  return {
    data: combinedData.map((d) => ({
      created_at_trunc: new Date(
        d.created_at_trunc.getTime() - timeZoneDifference * 60 * 1000
      ),
      statistic: Number(d.statistic),
    })),
    error: null,
  };
}
