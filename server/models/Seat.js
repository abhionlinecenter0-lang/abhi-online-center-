import mongoose from "mongoose";
const schema = new mongoose.Schema({
  seatNumber:{type:String,required:true,unique:true,trim:true},
  monthlyFee:{type:Number,default:0,min:0},
  status:{type:String,enum:["available","occupied","maintenance"],default:"available"},
  member:{type:mongoose.Schema.Types.ObjectId,ref:"LibraryMember",default:null}
},{timestamps:true});
export default mongoose.model("LibrarySeat",schema);
