import mongoose from "mongoose";

const QuestionSchema = new mongoose.Schema(
  {
    exam: { type: String, required: true, index: true },         // "CET"
    standard: { type: String, required: true, index: true },     // "11"
    subject: { type: String, required: true, index: true },      // "Chemistry" or "Physics"
    chapter: { type: String, required: true, index: true },

    // Content
    question: { type: String, required: true },
    question_latex: { type: String },
    options: [{ type: String }],
    answer: { type: String },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium", index: true },
    marks: { type: Number, default: 1 },

    // Optional image fields (if you later render images)
    image_url: { type: String },
  },
  { timestamps: true }
);

// Text index for search over question and options
QuestionSchema.index({ question: "text", options: "text" });
// Compound index for fast filtering
QuestionSchema.index({ exam: 1, standard: 1, subject: 1, chapter: 1 });

export default mongoose.model("Question", QuestionSchema);