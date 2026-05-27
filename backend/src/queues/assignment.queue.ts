import { Queue } from "bullmq";
import { redisConnection } from "../config/redis.js";

export const assignmentQueue = new Queue(
  "assignment-generation",
  {
    connection: redisConnection as any,
  }
);