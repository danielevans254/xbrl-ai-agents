import { Button } from "@/components/ui/button";
import { Loader2, MapIcon } from "lucide-react";

interface MappingButtonProps {
  onClick: () => void;
  isLoading: boolean;
}

export const MappingButton = ({ onClick, isLoading }: { onClick: () => void; isLoading: boolean }) => (
  <button
    onClick={onClick}
    disabled={isLoading}
    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {isLoading ? (
      <>
        <Loader2 className="h-4 w-4 animate-spin" />
        Mapping...
      </>
    ) : (
      <>
        <MapIcon className="h-4 w-4" />
        Map Data
      </>
    )}
  </button>
);