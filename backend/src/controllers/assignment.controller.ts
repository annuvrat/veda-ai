import { Request, Response } from "express";
import { Assignment } from "../models/assignment.model.js";
import { assignmentQueue } from "../queues/assignment.queue.js";
import { ApiResponse } from "../helpers/ApiResponse.js";
import { ApiError } from "../helpers/ApiError.js";
import { UserAssignments } from "../services/assignments.service.js";

export const createAssignment = async (req: Request, res: Response) => {
  try {
    // 1. Manually throwing validation errors using static helper
    if (!req.body.title) {
      throw ApiError.badRequest("Assignment title is required");
    }
    const assignment = await Assignment.create({
      ...req.body,
      status: "queued",
      progress: 0,
    });
    await assignmentQueue.add(
      "generate-assignment",
      {
        assignmentId: assignment._id,
      }
    );
    // 2. Returning the standard formatted API Response
    return ApiResponse.created(assignment, "Assignment created successfully").send(res);
  } catch (error: any) {
    console.error(error);
    throw error;
  }
};

export const getUserAssignments = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const { search, status, page = 1, limit = 6 } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build Mongo query filter object
    const filterQuery: any = { createdBy: userId };

    // Search matches assignment titles (case-insensitive)
    if (search) {
      filterQuery.title = { $regex: search, $options: "i" };
    }

    // Status matching e.g. draft, queued, generating, completed, failed
    if (status && status !== "all") {
      filterQuery.status = status;
    }

    // Query assignments and total count
    const assignments = await Assignment.find(filterQuery)
      .populate("generatedPaperId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const totalCount = await Assignment.countDocuments(filterQuery);
    const totalPages = Math.ceil(totalCount / limitNum);

    return ApiResponse.ok(
      {
        assignments,
        pagination: {
          totalCount,
          totalPages,
          currentPage: pageNum,
          limit: limitNum,
        },
      },
      "Assignments fetched successfully"
    ).send(res);
  } catch (error: any) {
    console.error(error);
    throw error;
  }
};

export const deleteAssignment = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const assignment = await Assignment.findByIdAndDelete(id);
    if (!assignment) {
      throw ApiError.notFound("Assignment not found");
    }
    return ApiResponse.ok(null, "Assignment deleted successfully").send(res);
  } catch (error: any) {
    console.error(error);
    throw error;
  }
};

export const getAssignment = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const assignment = await Assignment.findById(id).populate("generatedPaperId");
    if (!assignment) {
      throw ApiError.notFound("Assignment not found");
    }
    return ApiResponse.ok(assignment, "Assignment details fetched successfully").send(res);
  } catch (error: any) {
    console.error(error);
    throw error;
  }
};

export const regenerateAssignment = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const assignment = await Assignment.findById(id);
    if (!assignment) {
      throw ApiError.notFound("Assignment not found");
    }

    // Reset status and progress, push a new job to the queue
    assignment.status = "queued";
    assignment.progress = 0;
    assignment.generationLogs = assignment.generationLogs || [];
    assignment.generationLogs.push("Regeneration requested by user.");
    await assignment.save();

    await assignmentQueue.add("generate-assignment", { assignmentId: assignment._id });

    return ApiResponse.ok(assignment, "Regeneration queued").send(res);
  } catch (error: any) {
    console.error(error);
    throw error;
  }
};

export const generateAssignmentPDF = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const assignment = await Assignment.findById(id).populate("generatedPaperId");
    if (!assignment) {
      throw ApiError.notFound("Assignment not found");
    }

    // Build PDF using pdf-lib
    const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const PAGE_WIDTH = 595.28; // A4 mm-based at 72 DPI in points
    const PAGE_HEIGHT = 841.89;
    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const margin = 40;
    let y = PAGE_HEIGHT - margin;
    const lineHeight = 14;

    const drawText = (text: string, options: any = {}) => {
      const { size = 12, color = rgb(0, 0, 0), moveY = 1 } = options;
      const textLines = String(text).split("\n");
      for (const line of textLines) {
        if (y < margin + lineHeight) {
          page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          y = PAGE_HEIGHT - margin;
        }
        page.drawText(line, { x: margin, y: y - size, size, font, color });
        y -= size + (moveY || 2);
      }
    };

    drawText(`${(assignment as any).title || "Assignment"}`, { size: 18, moveY: 8 });
    drawText(`Created: ${(assignment as any).createdAt || "-"}`, { size: 10, moveY: 4 });
    drawText(`Due: ${(assignment as any).dueDate || "-"}`, { size: 10, moveY: 8 });
    drawText("\nInstructions:\n" + ((assignment as any).instructions || ""), { size: 12, moveY: 6 });

    // Generated paper content
    const paper = (assignment as any).generatedPaperId;
    if (paper && Array.isArray(paper.sections)) {
      for (const sec of paper.sections) {
        drawText(`\n${sec.title}`, { size: 14, moveY: 6 });
        if (sec.instruction) drawText(`${sec.instruction}`, { size: 11, moveY: 4 });
        let qnum = 1;
        for (const q of sec.questions || []) {
          const qText = `${qnum}. ${q.question || ""}`;
          drawText(qText, { size: 12, moveY: 3 });
          if (q.options && q.options.length) {
            for (let i = 0; i < q.options.length; i++) {
              drawText(`   ${String.fromCharCode(65 + i)}. ${q.options[i]}`, { size: 11, moveY: 2 });
            }
          }
          qnum++;
        }
      }
    }

    const pdfBytes = await pdfDoc.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${(assignment.title || "assignment").replace(/[^a-z0-9\-\_ ]/gi, "_")}.pdf"`
    );
    return res.send(Buffer.from(pdfBytes));
  } catch (err: any) {
    console.error("PDF generation error:", err);
    throw new ApiError(500, `PDF generation failed: ${err.message || err}`);
  }
};
  