import mongoose from "mongoose";
const schema = new mongoose.Schema({
  memberId:{type:String,trim:true,index:true},
  name:{type:String,required:true,trim:true},
  mobile:{type:String,required:true,trim:true},
  address:{type:String,default:"",trim:true},
  joiningDate:{type:Date,default:Date.now},
  monthlyFee:{type:Number,default:0,min:0},
  status:{type:String,enum:["active","inactive"],default:"active"},
  notes:{type:String,default:""}
},{timestamps:true});
schema.index({mobile:1});
export default mongoose.model("LibraryMember",schema);
