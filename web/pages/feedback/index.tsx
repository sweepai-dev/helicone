import { User } from "@supabase/auth-helpers-react";
import { GetServerSidePropsContext } from "next";
import AuthLayout from "../../components/shared/layout/authLayout";
import MetaData from "../../components/shared/metaData";
import FeedbackPage from "../../components/templates/feedback/feedbackPage";
import { SupabaseServerWrapper } from "../../lib/wrappers/supabase";

interface FeedbackProps {
  user: User;
}

const Feedback = (props: FeedbackProps) => {
  const { user } = props;

  return (
    <MetaData title="Feedback">
      <AuthLayout user={user}>
        <FeedbackPage />
      </AuthLayout>
    </MetaData>
  );
};

export default Feedback;

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const supabase = new SupabaseServerWrapper(context).getClient();
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
