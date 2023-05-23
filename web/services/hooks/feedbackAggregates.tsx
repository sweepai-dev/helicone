import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Property } from "../../lib/api/properties/properties";
import { ok, Result } from "../../lib/result";
import {
  getPropertyFilters,
  SingleFilterDef,
} from "../lib/filters/frontendFilterDefs";
import { getProperties } from "../lib/properties";
import { getPropertyParams } from "../lib/propertyParams";
import { useDebounce } from "./debounce";
import { getFeedback } from "../lib/feedback";
import { FilterNode } from "../lib/filters/filterDefs";
import { FeedbackData } from "../../lib/api/feedback/feedback";

export interface Feedback {
    name: string;
    dataType: string;
    uuid: string;
}

const useGetFeedbackAggregates = (memoizedTimeFilter: {start: Date, end: Date}, metricUuid?: string) => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["feedbackData", memoizedTimeFilter, metricUuid],
    queryFn: async (query) => {
      const timeFilter = query.queryKey[1] as {
        start: Date;
        end: Date;
      };

      const uuid = query.queryKey[2] as string | undefined;

      let filter: FilterNode = {
        left: {
          feedback_copy: {
            created_at: {
              gte: timeFilter.start
                .toISOString()
                .replace("T", " ")
                .slice(0, -5),
            },
          },
        },
        operator: "and",
        right: {
          feedback_copy: {
            created_at: {
              lte: timeFilter.end.toISOString().replace("T", " ").slice(0, -5),
            },
          },
        },
      };

      if (metricUuid !== undefined) {
        // Filter by the uuid as well
        filter = {
            left: {
                feedback_copy: {
                    uuid: {
                        equals: metricUuid
                    }
                }
            },
            operator: "and",
            right: filter
        }
      }

      const requestBody = {
        filter,
        offset: 0,
        limit: 100,
      };

      return fetch("/api/feedback/summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })
        .then((res) => res.json() as Promise<Result<FeedbackData[], string>>)
        .then(({ data, error }) => {
          if (error !== null) {
            console.error(error);
            return { data, error };
          } else {
            return {
              data,
              error,
            };
          }
        });
    },
    refetchOnWindowFocus: false,
  });

  return {
    data,
    isLoading,
  };
};

export { useGetFeedbackAggregates };
