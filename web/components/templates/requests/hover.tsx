import React, { useState } from 'react';
import { capitalizeWords } from './requestsPage';

interface Props {
  value: string;
  name: string;
}

const Hover: React.FC<Props> = ({ value, name }) => {
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseOver = () => {
    setIsHovering(true);
  };

  const handleMouseOut = () => {
    setIsHovering(false);
  };

  const tooltipClasses = `text-center tooltip bg-black text-white rounded-md px-2 py-1 text-sm absolute bottom-full left-1/2 transform -translate-x-1/2 transition-transform duration-200 ease-in-out ${isHovering ? 'opacity-100 visible mt-4' : 'opacity-0 invisible'}`;
  const spanClasses = `bg-yellow-200 hover:bg-yellow-300 rounded py-1 relative`;

  return (
    <span
      className={spanClasses}
      onMouseOver={handleMouseOver}
      onMouseOut={handleMouseOut}
    >
      {value}
      {isHovering && (
        <span className={tooltipClasses}>{capitalizeWords(name)}</span>
      )}
    </span>
  );
};

export default Hover;