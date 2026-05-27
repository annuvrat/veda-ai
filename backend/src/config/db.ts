    import mongoose from "mongoose";
import dotenv  from "dotenv"

dotenv.config()

mongoose.connect(process.env.MONGO_URI as string,{})

const db = mongoose.connection

db.on('error', (error: any) => {
    console.log(error)
})

db.once('open',()=>{
    console.log("Database Connected")
})

export default db