import { useSupabaseClient, useUser } from "@supabase/auth-helpers-react";
import { useRouter } from "next/router";
import { useState } from "react";
import AuthenticationForm from "../components/shared/AuthenticationForm";
import MetaData from "../components/shared/metaData";
import { redirectIfLoggedIn } from "../lib/redirectIdLoggedIn";

interface LoginProps {}

const Login = (props: LoginProps) => {
  const supabaseClient = useSupabaseClient();
  const user = useUser();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {} = props;

  return (
    <MetaData title="Login">
      <div>Current user is -{user ? user.email : "not logged in"}</div>
      <button
        onClick={() => {
          supabaseClient
            .from("materialized_response_and_request")
            .select("*")
            .then((res) => {
              console.log(res);
            });
        }}
      >
        CLICK ME FOR A TEST
      </button>
    </MetaData>
  );
};

export default Login;
