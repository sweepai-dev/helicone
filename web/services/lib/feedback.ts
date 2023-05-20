import axios from "axios";

const getFeedback = async () => {
  const resp = await axios.get("/api/feedback/metrics");
  return resp.data.data;
};

export { getFeedback };
