import { HandThumbUpIcon, HandThumbDownIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

type Props = {
    name: string;
    setDisabled: any;
    selected?: "thumbs-up" | "thumbs-down";
    setSelected: any;
    id: number;
}

export function ThumbsUpDown({ name, setDisabled, selected, setSelected, id }: Props) {
    console.log("KEY", name)
    console.log("THUMBS UP DOWN", selected, id)
  
    const handleSelection = (icon: "thumbs-up" | "thumbs-down") => {
        console.log("SETTING DISABLED")
    //   setDisabled(true);
      if (selected === icon) {
        setSelected(prevState => ({
            ...prevState,
            [id]: undefined
          }))
      } else {
        setSelected(prevState => ({
            ...prevState,
            [id]: icon
          }));
      }
    //   setDisabled(false);
    };

    const handleThumbsUpClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        handleSelection("thumbs-up")
    }
    const handleThumbsDownClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        handleSelection("thumbs-down")
    }
  
    return (
      <div className={`${name} flex items-center space-x-4`}>
        <button
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            selected === "thumbs-up"
              ? "bg-green-300 text-white"
              : "bg-gray-200 text-gray-500"
          } focus:outline-none focus:ring-2 focus:ring-green-500`}
          onClick={handleThumbsUpClick}
        >
          <HandThumbUpIcon className="h-4 w-4 mx-auto text-green-500" />
        </button>
        <button
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            selected === "thumbs-down"
              ? "bg-red-300 text-white"
              : "bg-gray-200 text-gray-500"
          } focus:outline-none focus:ring-2 focus:ring-red-500`}
          onClick={handleThumbsDownClick}
        >
          <HandThumbDownIcon className="h-4 w-4 mx-auto text-red-500" />
        </button>
      </div>
    );
  }