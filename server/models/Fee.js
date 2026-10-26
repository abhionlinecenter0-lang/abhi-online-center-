import mongoose from "mongoose";
const schema = new mongoose.Schema({
  member:{type:mongoose.Schema.Types.ObjectId,ref:"LibraryMember",required:true},
  month:{type:String,required:true,trim:true},
  amount:{type:Number,required:true,min:0},
  paidAmount:{type:Number,default:0,min:0},
  paymentDate:{type:Date,default:null},
  paymentMode:{type:String,default:"Cash"},
  receiptNo:{type:String,default:""},
  notes:{type:String,default:""}
},{timestamps:true});
schema.index({member:1,month:1},{unique:true});
export default mongoose.model("LibraryFee",schema);
