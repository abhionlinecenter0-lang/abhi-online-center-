import mongoose from "mongoose";
const schema = new mongoose.Schema({
  member:{type:mongoose.Schema.Types.ObjectId,ref:"LibraryMember",required:true},
  date:{type:String,required:true},
  status:{type:String,enum:["present","absent"],default:"present"},
  checkIn:{type:Date,default:null},
  checkOut:{type:Date,default:null},
  notes:{type:String,default:""}
},{timestamps:true});
schema.index({member:1,date:1},{unique:true});
export default mongoose.model("LibraryAttendance",schema);
