import mongoose, { Schema, Document, Types } from "mongoose";

interface IQuestion {
  question: string;

  difficulty: "easy" | "moderate" | "hard";

  marks: number;

  type: string;

  answer: string;

  options?: string[];
}

interface ISection {
  title: string;

  instruction: string;

  questions: IQuestion[];
}

export interface IGeneratedPaper extends Document {
  assignmentId: Types.ObjectId;

  sections: ISection[];

  metadata: {
    model: string;
    generatedAt: Date;
  };
}

const questionSchema = new Schema<IQuestion>({
  question: {
    type: String,
    required: true,
  },

  difficulty: {
    type: String,
    enum: ["easy", "moderate", "hard"],
    required: true,
  },

  marks: {
    type: Number,
    required: true,
  },

  type: {
    type: String,
    required: true,
  },

  answer: {
    type: String,
    required: true,
  },

  options: {
    type: [String],
    default: undefined,
  },
});

const sectionSchema = new Schema<ISection>({
  title: {
    type: String,
    required: true,
  },

  instruction: {
    type: String,
    required: true,
  },

  questions: {
    type: [questionSchema],
    default: [],
  },
});

const generatedPaperSchema = new Schema<IGeneratedPaper>(
  {
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },

    sections: {
      type: [sectionSchema],
      default: [],
    },

    metadata: {
      model: String,

      generatedAt: {
        type: Date,
        default: Date.now,
      },
    },
  },
  {
    timestamps: true,
  }
);

export const GeneratedPaper = mongoose.model<IGeneratedPaper>(
  "GeneratedPaper",
  generatedPaperSchema
);