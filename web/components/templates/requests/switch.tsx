import { Dispatch, SetStateAction, useState } from "react";
import { HomeIcon, KeyIcon } from "@heroicons/react/24/outline";

type TableCardViewProps = {
  leftLabel: string;
  rightLabel: string;
  onSelectionChange?: (selection: "left" | "right") => void;
  selected: string;
  setSelected: any;
};

export function MySwitch({ leftLabel, rightLabel, onSelectionChange, selected, setSelected }: TableCardViewProps) {
  const handleSelection = (selection: "left" | "right") => {
    console.log("HANDLING SELECTION", selection)
    if (selected !== selection) {
        console.log("SETTING")
      setSelected(selection);
      onSelectionChange?.(selection);
    }
  };

  return (
    <div className="flex items-center">
      <button
        className={`relative inline-flex items-center w-24 h-8 transition-colors text-sm ${
          selected === "left" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
        } rounded-l-md cursor-pointer`}
        onClick={() => handleSelection("left")}
      >
        <span className="absolute inset-0 flex items-center justify-center">
          {/* <KeyIcon className="h-4 w-4 mr-1" /> */}
          {leftLabel}
        </span>
      </button>
      <button
        className={`relative inline-flex items-center w-24 h-8 transition-colors text-sm ${
          selected === "right" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
        } rounded-r-md cursor-pointer`}
        onClick={() => handleSelection("right")}
      >
        <span className="absolute inset-0 flex items-center justify-center">
          {/* <HomeIcon className="h-4 w-4 mr-1" /> */}
          {rightLabel}
        </span>
      </button>
    </div>
  );
}