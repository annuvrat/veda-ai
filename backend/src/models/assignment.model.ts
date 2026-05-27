import mongoose, { Schema, Document, Types } from "mongoose";

interface IQuestionConfig {
  type: string;
  count: number;
  marks: number;
}

interface IUploadedMaterial {
  fileName?: string;
  fileUrl?: string;
  extractedText?: string;
}

export interface IAssignment extends Document {
  title: string;

  createdBy: Types.ObjectId;

  dueDate: Date;

  instructions?: string;

  uploadedMaterial?: IUploadedMaterial;

  questionConfigs: IQuestionConfig[];

  totalQuestions: number;

  totalMarks: number;

  status:
    | "draft"
    | "queued"
    | "generating"
    | "completed"
    | "failed";

  progress: number;

  generationLogs: string[];

  generatedPaperId?: Types.ObjectId;

  errorMessage?: string;

  startedAt?: Date;

  completedAt?: Date;

  generationDuration?: number;
}

const questionConfigSchema = new Schema<IQuestionConfig>({
  type: {
    type: String,
    required: true,
  },

  count: {
    type: Number,
    required: true,
    min: 1,
  },

  marks: {
    type: Number,
    required: true,
    min: 1,
  },
});

const uploadedMaterialSchema = new Schema<IUploadedMaterial>({
  fileName: String,

  fileUrl: String,

  extractedText: String,
});

const assignmentSchema = new Schema<IAssignment>(
  {
    title: {
      type: String,
      required: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    dueDate: {
      type: Date,
      required: true,
    },

    instructions: {
      type: String,
    },

    uploadedMaterial: uploadedMaterialSchema,

    questionConfigs: {
      type: [questionConfigSchema],
      required: true,
    },

    totalQuestions: {
      type: Number,
      required: true,
    },

    totalMarks: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "draft",
        "queued",
        "generating",
        "completed",
        "failed",
      ],
      default: "queued",
    },

    progress: {
      type: Number,
      default: 0,
    },

    generationLogs: {
      type: [String],
      default: [],
    },

    generatedPaperId: {
      type: Schema.Types.ObjectId,
      ref: "GeneratedPaper",
    },

    errorMessage: {
      type: String,
    },

    startedAt: Date,

    completedAt: Date,

    generationDuration: Number,
  },
  {
    timestamps: true,
  }
);

export const Assignment = mongoose.model<IAssignment>(
  "Assignment",
  assignmentSchema
);