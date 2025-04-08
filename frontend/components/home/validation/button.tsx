import { Button } from "@/components/ui/button";
import { CheckCircleIcon, Loader2, MapIcon } from "lucide-react";

interface ValidationButtonProps {
  onClick: () => void;
  isLoading: boolean;
}

export const ValidationButton = ({ onClick, isLoading }: { onClick: () => void; isLoading: boolean }) => (
  <button
    onClick={onClick}
    disabled={isLoading}
    className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {isLoading ? (
      <>
        <Loader2 className="h-4 w-4 animate-spin" />
        Validating...
      </>
    ) : (
      <>
        <CheckCircleIcon className="h-4 w-4" />
        Validate Data
      </>
    )}
  </button>
);