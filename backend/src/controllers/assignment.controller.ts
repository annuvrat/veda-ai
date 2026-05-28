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
  