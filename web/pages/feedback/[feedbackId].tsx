import {
  createServerSupabaseClient,
  User,
} from "@supabase/auth-helpers-nextjs";
import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import AuthHeader from "../../components/shared/authHeader";
import AuthLayout from "../../components/shared/layout/authLayout";
import MetaData from "../../components/shared/metaData";
//   import FeedbackIdPage from "../../components/templates/feedbackId/feedbackIdPage"; // Import your FeedbackIdPage component
import { Feedback, useGetFeedbackMetrics } from "../../services/hooks/feedbackMetrics"; // Import your useGetFeedbacks hook
import { Database } from "../../supabase/database.types";
import FeedbackIdPage from "../../components/templates/feedbackId/feedbackIdPage";

interface FeedbackIdProps {
  user: User;
}

const FeedbackId = (props: FeedbackIdProps) => {
  const { user } = props;
  const router = useRouter();
  const { feedbackId } = router.query;

  const { feedback: data, isLoading } = useGetFeedbackMetrics();

  const feedback = data?.find(
    (feedback: Feedback) => feedback.uuid === feedbackId
  );

  if (isLoading || !feedback) {
    return (
      <MetaData title="Feedback">
        <AuthLayout user={user}>
          <AuthHeader title={"Feedback"} />
        </AuthLayout>
      </MetaData>
    );
  }

  return (
    <MetaData title="Feedback">
      <AuthLayout user={user}>
        <AuthHeader
          title={feedback?.name || (feedbackId as string)} // Use a title suitable for your feedback
          breadcrumb={{
            href: "/feedback",
            title: "Feedback",
          }}
        />
        <FeedbackIdPage feedback={feedback} />
      </AuthLayout>
    </MetaData>
  );
};

export default FeedbackId;

export const getServerSideProps = async (ctx: GetServerSidePropsContext) => {
  // Create authenticated Supabase Client
  const supabase = createServerSupabaseClient(ctx);
  // Check if we have a session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session)
    return {
      redirect: {
        destination: "/",
        permanent: false,
      },
    };

  return {
    props: {
      initialSession: session,
      user: session.user,
    },
  };
};
