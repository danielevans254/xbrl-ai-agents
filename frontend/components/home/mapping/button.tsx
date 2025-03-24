import { Button } from "@/components/ui/button";
import { MapIcon } from "lucide-react";

interface MappingButtonProps {
  onClick: () => void;
  isLoading: boolean;
}

export const MappingButton = ({ onClick, isLoading }: MappingButtonProps) => {
  return (
    <Button
      onClick={onClick}
      disabled={isLoading}
      className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium"
    >
      {isLoading ? (
        <>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-opacity-20 border-t-white"></div>
          <span>Processing...</span>
        </>
      ) : (
        <>
          <MapIcon className="h-4 w-4" />
          <span>Start Mapping</span>
        </>
      )}
    </Button>
  );
};