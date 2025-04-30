import { Loader2, DownloadIcon } from 'lucide-react';


interface OutputButtonProps {
  onClick: () => void;
  isLoading: boolean;
  disabled: boolean;
}


export const OutputButton = ({
  onClick,
  isLoading,
  disabled
}: {
  onClick: () => void;
  isLoading: boolean;
  disabled: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={isLoading || disabled}
    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {isLoading ? (
      <>
        <Loader2 className="h-4 w-4 animate-spin" />
        Generating...
      </>
    ) : (
      <>
        <DownloadIcon className="h-4 w-4" />
        Download XBRL
      </>
    )}
  </button>
);