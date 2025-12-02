import { X } from 'lucide-react';
import PoseTracker from './PoseTracker/Posetracker';
import type { DailyTaskItem } from '../lib/api';

type ExerciseMonitorModalProps = {
  task: DailyTaskItem;
  isOpen: boolean;
  steps: string[];
  referenceVideoUrl?: string;
  onClose: () => void;
  onExerciseComplete?: () => void; // Callback when exercise is completed
};

export default function ExerciseMonitorModal({
  task,
  isOpen,
  steps,
  referenceVideoUrl,
  onClose,
  onExerciseComplete,
}: ExerciseMonitorModalProps) {
  if (!isOpen) return null;
  console.log(task.difficulty)
  return (
    <div className="fixed inset-0 z-[55] overflow-y-hidden bg-black/60 backdrop-blur-sm overflow-auto" style={{ top: '5vh', height: 'calc(100vh - 8vh)' }}>
      <div className="relative h-full bg-gray-50">
        {/* Close Button - Fixed Position */}
        <button
          onClick={onClose}
          className="fixed top-9 right-6 z-50 p-3 bg-white hover:bg-gray-100 rounded-full shadow-lg transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6 text-gray-600" />
        </button>

        {/* PoseTracker Component */}
        <div className="pt-6">
          <PoseTracker
            onClose={onClose}
            taskId={task.id}
            taskName={task.title}
            backendUrl={(() => {
              const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
              const apiPath = baseUrl.endsWith('/api') ? '' : '/api';
              return `${baseUrl}${apiPath}/pose/compare`;
            })()}
            captureFps={10}
            showHints={true}
            referenceVideoUrl={referenceVideoUrl || undefined}
            taskSteps={steps}
            showTrackingPoints={true}
            onExerciseComplete={onExerciseComplete}
            exerciseType={task.exercise_type || null}
            difficulty={task.difficulty || null}
          />
        </div>
      </div>
    </div>
  );
}

