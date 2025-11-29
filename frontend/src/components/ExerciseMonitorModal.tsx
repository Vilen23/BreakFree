import { X } from 'lucide-react';
import PoseTracker from './PoseTracker/Posetracker';
import type { DailyTaskItem } from '../lib/api';

type ExerciseMonitorModalProps = {
  task: DailyTaskItem;
  isOpen: boolean;
  steps: string[];
  referenceVideoUrl?: string;
  onClose: () => void;
};

export default function ExerciseMonitorModal({
  task,
  isOpen,
  steps,
  referenceVideoUrl,
  onClose,
}: ExerciseMonitorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm overflow-auto">
      <div className="relative min-h-screen bg-gray-50">
        {/* Close Button - Fixed Position */}
        <button
          onClick={onClose}
          className="fixed top-6 right-6 z-50 p-3 bg-white hover:bg-gray-100 rounded-full shadow-lg transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>

        {/* PoseTracker Component */}
        <div className="pt-6">
          <PoseTracker
            taskId={task.id}
            taskName={task.title}
            backendUrl={`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/pose/compare`}
            captureFps={10}
            showHints={true}
            referenceVideoUrl={referenceVideoUrl || undefined}
            taskSteps={steps}
            showTrackingPoints={true}
          />
        </div>
      </div>
    </div>
  );
}

