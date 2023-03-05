import { ArrowLeftCircleIcon, ArrowRightCircleIcon } from '@heroicons/react/24/outline';

interface Props {
  onLeftClick: () => void;
  onRightClick: () => void;
}

const ArrowButtons: React.FC<Props> = ({ onLeftClick, onRightClick }) => {
  return (
    <div className="flex justify-center">
      <button
        onClick={onLeftClick}
        className="p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
      >
        <ArrowLeftCircleIcon className="h-8 w-8 text-gray-500" />
      </button>
      <button
        onClick={onRightClick}
        className="p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:bg-gray-100"
      >
        <ArrowRightCircleIcon className="h-8 w-8 text-gray-500" />
      </button>
    </div>
  );
};

export default ArrowButtons;