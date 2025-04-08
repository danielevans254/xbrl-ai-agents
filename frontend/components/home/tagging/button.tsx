import { Button } from "@/components/ui/button";
import { Loader2, MapIcon, TagIcon } from "lucide-react";

interface TaggingButtonProps {
  onClick: () => void;
  isLoading: boolean;
}

export const TaggingButton = ({ onClick, isLoading }: { onClick: () => void; isLoading: boolean }) => (
  <button
    onClick={onClick}
    disabled={isLoading}
    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {isLoading ? (
      <>
        <Loader2 className="h-4 w-4 animate-spin" />
        Tagging...
      </>
    ) : (
      <>
        <TagIcon className="h-4 w-4" />
        Tag Data
      </>
    )}
  </button>
);