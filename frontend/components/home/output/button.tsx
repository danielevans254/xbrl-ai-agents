import { Button } from "@/components/ui/button";
import { MapIcon } from "lucide-react";

interface OutputButtonProps {
  onClick: () => void;
  isLoading: boolean;
}

export const OutputButton = ({ onClick, isLoading }: OutputButtonProps) => {
  return (
    <Button
      onClick={onClick}
      disabled={isLoading}
      className="gap-2 bg-green-600 hover:bg-green-700 text-white font-medium absolute right-16 top-100"
    >
      {isLoading ? (
        <>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-opacity-20 border-t-white"></div>
          <span>Processing...</span>
        </>
      ) : (
        <>
          <MapIcon className="h-4 w-4" />
          <span>Generate Output</span>
        </>
      )}
    </Button>
  );
};