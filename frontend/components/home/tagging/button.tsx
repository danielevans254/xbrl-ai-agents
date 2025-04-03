import { Button } from "@/components/ui/button";
import { MapIcon } from "lucide-react";

interface TaggingButtonProps {
  onClick: () => void;
  isLoading: boolean;
}

export const TaggingButton = ({ onClick, isLoading }: TaggingButtonProps) => {
  return (
    <Button
      onClick={onClick}
      disabled={isLoading}
      className="gap-2 bg-green-600 hover:bg-green-700 text-white font-medium absolute right-16 top-8"
    >
      {isLoading ? (
        <>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-opacity-20 border-t-white"></div>
          <span>Processing...</span>
        </>
      ) : (
        <>
          <MapIcon className="h-4 w-4" />
          <span>Start Tagging</span>
        </>
      )}
    </Button>
  );
};