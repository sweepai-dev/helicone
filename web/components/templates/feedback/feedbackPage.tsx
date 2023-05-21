import {
    ArrowUpIcon,
    ExclamationCircleIcon,
    InformationCircleIcon,
  } from "@heroicons/react/24/solid";
  import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
  import { User } from "@supabase/supabase-js";
  import Link from "next/link";
  import { useRouter } from "next/router";
  import AuthLayout from "../../shared/layout/authLayout";
  import ThemedTable from "../../shared/themed/themedTable";
  import { useEffect, useState } from "react";
  import { Database } from "../../../supabase/database.types";
  import AuthHeader from "../../shared/authHeader";
  import { useQuery } from "@tanstack/react-query";
  import { FeedbackData } from "../../../lib/api/feedback/feedback";
  import { Result } from "../../../lib/result";
  import LoadingAnimation from "../../shared/loadingAnimation";
  import FeedbackCard from './feedbackCard';
    
  interface FeedbackPageProps {}
    
  const FeedbackPage = (props: FeedbackPageProps) => {
    const client = useSupabaseClient<Database>();
    const { data, isLoading } = useQuery({
      queryKey: ["feedbackData"],
      queryFn: async (query) => {
        return await fetch("/api/feedback/summary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filter: "all",
            offset: 0,
            limit: 100,
          }),
        }).then((res) => res.json() as Promise<Result<FeedbackData[], string>>);
      },
      refetchOnWindowFocus: false,
    });
    
    return (
      <>
        <AuthHeader title={"Feedback"} />
        {isLoading ? (
          <LoadingAnimation title="Getting feedback data" />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data?.data?.map((feedback) => (
              <FeedbackCard
                feedback={feedback}
                key={feedback.id}
              />
            ))}
          </div>
        )}
      </>
    );
  };
  
  export default FeedbackPage;
  