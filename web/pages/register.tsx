import MetaData from "../components/shared/metaData";
import AuthPage from "../components/templates/auth/authPage";

interface RegisterProps {}

const Register = (props: RegisterProps) => {
  const {} = props;

  return (
    <MetaData title={"Register"}>
      <AuthPage />
    </MetaData>
  );
};

export default Register;
