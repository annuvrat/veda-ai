
import { Assignment } from "../models/assignment.model.js";
import { ApiError } from "../helpers/ApiError.js";





export const UserAssignments =async(userId:string)=>{
   try{    
    const assignments = await Assignment.find({ createdBy: userId }).populate("generatedPaperId");

    if(!assignments)throw ApiError.notFound("No assignments found");

    return assignments

    } catch (error) {
      
      throw error
      
    }



    
}



