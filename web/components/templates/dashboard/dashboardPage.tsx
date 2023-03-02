import {
  ArrowTopRightOnSquareIcon,
  ExclamationCircleIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { useSupabaseClient } from "@supabase/auth-helpers-react";
import { SupabaseClient, User } from "@supabase/supabase-js";
import Link from "next/link";
import { SetStateAction, useEffect, useState } from "react";

import { Metrics } from "../../../lib/api/metrics/metrics";
import {
  getDashboardData,
  GraphDataState,
  initialGraphDataState,
} from "../../../lib/dashboardGraphs";
import { Result } from "../../../lib/result";
import { timeGraphConfig } from "../../../lib/timeCalculations/constants";
import {
  getTimeIntervalAgo,
  TimeInterval,
} from "../../../lib/timeCalculations/time";
import { useGetProperties } from "../../../services/hooks/properties";
import {
  FilterLeaf,
  FilterNode,
  getPropertyFilters,
} from "../../../services/lib/filters/filterDefs";
import { RequestsTableFilter } from "../../../services/lib/filters/frontendFilterDefs";
import { Database } from "../../../supabase/database.types";
import AuthHeader from "../../shared/authHeader";
import AuthLayout from "../../shared/layout/authLayout";
import ThemedFilter, { Filter } from "../../shared/themed/themedFilter";
import ThemedTimeFilter from "../../shared/themed/themedTimeFilter";
import useRequestsPage from "../requests/useRequestsPage";
import { Filters } from "./filters";

import { MetricsPanel } from "./metricsPanel";
import TimeGraphWHeader from "./timeGraphWHeader";

interface DashboardPageProps {
  user: User;
  keys: Database["public"]["Tables"]["user_api_keys"]["Row"][];
}

export type Loading<T> = T | "loading";

const DashboardPage = (props: DashboardPageProps) => {
  const { user, keys } = props;
  const [timeData, setTimeData] = useState<GraphDataState>(
    initialGraphDataState
  );

  const [metrics, setMetrics] =
    useState<Loading<Result<Metrics, string>>>("loading");
  const [interval, setInterval] = useState<TimeInterval>("1m");
  const [filter, setFilter] = useState<FilterNode>("all");
  const [timeFilter, setTimeFilter] = useState<FilterLeaf>({
    request: {
      created_at: {
        gte: timeGraphConfig["1m"].start.toISOString(),
        lte: timeGraphConfig["1m"].end.toISOString(),
      },
    },
  });

  const { properties, isLoading: isPropertiesLoading } = useGetProperties();

  useEffect(() => {
    console.log("getting dashboard data", timeFilter, filter);
    getDashboardData(timeFilter, filter, setMetrics, setTimeData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFilter, filter]);

  const propertyFilterMap = {
    properties: {
      label: "Properties",
      columns: getPropertyFilters(properties),
    },
  };
  return (
    <AuthLayout user={user}>
      <AuthHeader
        title={"Dashboard"}
        actions={<Filters keys={keys} filter={filter} setFilter={setFilter} />}
      />
      {keys.length === 0 ? (
        <div className="space-y-16">
          <div className="text-center mt-24">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                vectorEffect="non-scaling-stroke"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="mt-2 text-xl font-medium text-gray-900">
              No OpenAI API Keys found
            </h3>
            <p className="mt-1 text-lg text-gray-500">
              Go to the keys page to add a key and get started.
            </p>
            <div className="mt-6">
              <Link
                href="/keys"
                className="inline-flex items-center rounded-md bg-gradient-to-r from-sky-600 to-indigo-500 bg-origin-border px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <ArrowTopRightOnSquareIcon
                  className="-ml-1 mr-2 h-5 w-5"
                  aria-hidden="true"
                />
                Key Page
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <ThemedFilter
            data={null}
            isFetching={metrics === "loading"}
            customTimeFilter
            timeFilterOptions={[
              { key: "1h", value: "hour" },
              { key: "24h", value: "day" },
              { key: "7d", value: "wk" },
              { key: "1m", value: "mo" },
              { key: "3m", value: "3mo" },
            ]}
            defaultTimeFilter={interval}
            filterMap={{
              ...RequestsTableFilter,
              ...propertyFilterMap,
            }}
            onAdvancedFilter={(_filters: Filter[]) => {
              const filters = _filters.filter((f) => f) as FilterNode[];
              if (filters.length === 0) {
                setFilter("all");
              } else {
                const firstFilter = filters[0];
                setFilter(
                  filters.slice(1).reduce((acc, curr) => {
                    return {
                      left: acc,
                      operator: "and",
                      right: curr,
                    };
                  }, firstFilter)
                );
              }
            }}
            onTimeSelectHandler={(key: TimeInterval, value: string) => {
              if ((key as string) === "custom") {
                console.log("CUSTOM", value);
                value = value.replace("custom:", "");
                const start = new Date(value.split("_")[0]);
                const end = new Date(value.split("_")[1]);
                console.log("CUSTOM", start, end);
                setTimeFilter({
                  request: {
                    created_at: {
                      gte: start.toISOString(),
                      lte: end.toISOString(),
                    },
                  },
                });
              } else {
                console.log("KEY", key, value);
                setTimeFilter({
                  request: {
                    created_at: {
                      gte: getTimeIntervalAgo(key).toISOString(),
                      lte: new Date().toISOString(),
                    },
                  },
                });
              }
            }}
          />
          <MetricsPanel filters={filter} metrics={metrics} />
          <TimeGraphWHeader
            data={timeData}
            interval={interval}
            setInterval={setInterval}
          />
        </div>
      )}
    </AuthLayout>
  );
};

export default DashboardPage;
