import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { useQuery } from "@tanstack/react-query";
import { GetServerSidePropsContext } from "next";
import { useRouter } from "next/router";
import { useEffect } from "react";
import AuthLayout from "../components/shared/layout/authLayout";
import BasePageV2 from "../components/shared/layout/basePageV2";
import { useOrg } from "../components/shared/layout/organizationContext";
import LoadingAnimation from "../components/shared/loadingAnimation";
import MetaData from "../components/shared/metaData";
import HomePage from "../components/templates/home/homePage";
import { DEMO_EMAIL } from "../lib/constants";
import { SupabaseServerWrapper } from "../lib/wrappers/supabase";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

interface HomeProps {}

const Home = (props: HomeProps) => {
  const router = useRouter();

  const user = useUser();
  const supabase = createClientComponentClient();
  useEffect(() => {
    if (!router || !user) return;
    if (user && user.email !== DEMO_EMAIL) {
      router.push("/dashboard");
    }
    supabase
      .from("user_settings")
      .select("*")
      .eq("user", user?.id)
      .single()
      .then(({ data }) => {
        if (data === null) {
          router.push("/welcome");
        }
      });
  }, [router, supabase, user]);

  return (
    <MetaData title="Home">
      <HomePage />
    </MetaData>
  );
};

export default Home;
