import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  schoolName: string;
  avatar?: string;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: true,
    },

    schoolName: {
      type: String,
      required: true,
    },

    avatar: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const User = mongoose.model<IUser>("User", userSchema);