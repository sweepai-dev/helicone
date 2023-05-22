import { Feedback } from "../../../services/hooks/feedback";
import RequestsPage from "../requests/requestsPage";

interface FeedbackIdPageProps {
    feedback: Feedback;
}

const FeedbackIdPage = (props: FeedbackIdPageProps) => {
    const { feedback } = props;
    
    return (
        <div>
            <pre>{JSON.stringify(feedback, null, 2)}</pre>
            <RequestsPage page={1} pageSize={25} sortBy={null} />
        </div>
    );
};

export default FeedbackIdPage;