import { useState } from "react";

interface FeedbackProps {
  onFeedbackSubmit: (feedback: string) => void;
  feedback: string;
  setFeedback: (feedback: string) => void;
  setFeedbackFinal: (feedback: string) => void;
}

export const Feedback: React.FC<FeedbackProps> = ({ onFeedbackSubmit, feedback, setFeedback, setFeedbackFinal }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFeedback(e.target.value);
  };

  const handleSubmit = () => {
    onFeedbackSubmit(feedback);
    setFeedbackFinal(feedback);
    setFeedback("");
    setIsOpen(false);
  };

  return (
<div className="relative inline-block text-left">
  <div>
    <button
      type="button"
      className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      id="feedback-menu"
      aria-expanded="true"
      aria-haspopup="true"
      onClick={() => setIsOpen(!isOpen)}
    >
      Provide Feedback
      <svg
        className="-mr-1 ml-2 h-5 w-5"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-1.714a6.286 6.286 0 110-12.572 6.286 6.286 0 010 12.572zM9.5 7.5a1 1 0 000-2 1 1 0 000 2zm1 5a1 1 0 01-2 0V9.5a1 1 0 012 0v2z"
          clipRule="evenodd"
        />
      </svg>
    </button>
  </div>

  {isOpen && (
    <div className="origin-top-right absolute right-0 mt-2 w-72 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
      <div className="py-2">
        <label
          htmlFor="feedback-input"
          className="block text-sm font-medium text-gray-700 px-4 py-2"
        >
          Feedback:
        </label>
        <div className="px-4 py-2">
          <input
            id="feedback-input"
            type="text"
            className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Enter your feedback"
            value={feedback}
            onChange={handleInputChange}
          />
        </div>
      </div>
      <div className="px-4 py-2">
        <button
          type="button"
          className="w-20 inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-2.5 py-1.5 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:text-sm"
          onClick={handleSubmit}
          disabled={!feedback}
        >
          Submit
        </button>
      </div>
    </div>
  )}
</div>
  );
};
