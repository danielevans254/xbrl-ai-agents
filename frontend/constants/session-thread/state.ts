export const SESSION_THREAD_STATUS = {
  // Upload stage
  UPLOADING: 'uploading',
  UPLOAD_COMPLETE: 'upload_complete',
  UPLOAD_FAILED: 'upload_failed',

  // Extraction stage
  EXTRACTING: 'extracting',
  EXTRACTING_COMPLETE: 'extracting_complete',
  EXTRACTING_FAILED: 'extracting_failed',

  // Mapping stage
  MAPPING: 'mapping',
  MAPPING_COMPLETE: 'mapping_complete',
  MAPPING_FAILED: 'mapping_failed',

  // Validation stage
  VALIDATING: 'validating',
  VALIDATION_COMPLETE: 'validation_complete',
  VALIDATION_FAILED: 'validation_failed',

  // Tagging stage
  TAGGING: 'tagging',
  TAGGING_COMPLETE: 'tagging_complete',
  TAGGING_FAILED: 'tagging_failed',

  // Generation stage
  GENERATING: 'generating',
  GENERATION_COMPLETE: 'generation_complete',
  GENERATION_FAILED: 'generation_failed',
};

export const PROCESSING_STATUS = {
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  IDLE: 'idle',
  CANCELLED: 'cancelled'
};