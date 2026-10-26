import { Router } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Member from "../models/Member.js";
import Seat from "../models/Seat.js";
import Fee from "../models/Fee.js";
import Attendance from "../models/Attendance.js";

const router = Router();
function auth(req,res,next){
  const h=req.headers.authorization||"";
  const token=h.startsWith("Bearer ")?h.slice(7):"";
  if(!token) return res.status(401).json({error:"Login required"});
  try { req.auth=jwt.verify(token,process.env.JWT_SECRET); next(); }
  catch { return res.status(401).json({error:"Invalid or expired token"}); }
}
function staffOnly(req,res,next){
  if(!["admin","staff"].includes(req.auth?.role)) return res.status(403).json({error:"Admin or staff access required"});
  next();
}
router.use(auth);
router.get("/stats", async (req,res,next)=>{
  try {
    const today=new Date().toISOString().slice(0,10);
    const [members,seats,occupied,pending,attendance,present]=await Promise.all([
      Member.countDocuments({status:"active"}),Seat.countDocuments({}),
      Seat.countDocuments({status:"occupied"}),
      Fee.aggregate([{$project:{due:{$max:[0,{$subtract:["$amount","$paidAmount"]}]}}},{$group:{_id:null,total:{$sum:"$due"}}}]),
      Attendance.countDocuments({date:today}),Attendance.countDocuments({date:today,status:"present"})
    ]);
    res.json({members,seats,occupied,available:Math.max(0,seats-occupied),pendingFees:pending[0]?.total||0,todayAttendance:attendance,todayPresent:present});
  } catch(e){next(e);}
});
const configs={
 members:{model:Member,sort:{createdAt:-1}},
 seats:{model:Seat,sort:{seatNumber:1}},
 fees:{model:Fee,sort:{createdAt:-1},populate:"member","validate":(b)=>({member:b.member,month:String(b.month||"").trim(),amount:Number(b.amount),paidAmount:Number(b.paidAmount||0),paymentDate:b.paymentDate||null,paymentMode:b.paymentMode||"Cash",receiptNo:b.receiptNo||"",notes:b.notes||""})}
};
for(const [key,c] of Object.entries(configs)){
  router.get("/"+key,async(req,res,next)=>{try{
    let q=c.model.find({}).sort(c.sort);
    if(key==="fees") q=q.populate("member","name mobile memberId");
    if(key==="seats") q=q.populate("member","name mobile memberId");
    res.json(await q); }catch(e){next(e);}});
  router.post("/"+key,staffOnly,async(req,res,next)=>{try{
    const body=key==="fees"?c.validate(req.body):req.body;
    if(key==="members"){
      body.name=String(body.name||"").trim(); body.mobile=String(body.mobile||"").trim();
      if(!body.name||!body.mobile) return res.status(400).json({error:"Name and mobile are required"});
      body.monthlyFee=Number(body.monthlyFee||0);
    }
    if(key==="seats"){
      body.seatNumber=String(body.seatNumber||"").trim();
      if(!body.seatNumber) return res.status(400).json({error:"Seat number is required"});
      if(body.member){body.status="occupied";} else if(body.status==="occupied") body.status="available";
    }
    if(key==="fees" && (!body.member||!body.month||!Number.isFinite(body.amount)||body.amount<0||body.paidAmount<0||body.paidAmount>body.amount))
      return res.status(400).json({error:"Valid member, month and fee amounts are required; paid amount cannot exceed fee"});
    const doc=await c.model.create(body); res.status(201).json(doc);
  }catch(e){ if(e.code===11000)return res.status(409).json({error:"This record already exists (duplicate seat, mobile, or member-month fee)."}); next(e);}});
  router.put("/"+key+"/:id",staffOnly,async(req,res,next)=>{try{
    if(!mongoose.isValidObjectId(req.params.id))return res.status(400).json({error:"Invalid record ID"});
    const body=key==="fees"?c.validate(req.body):{...req.body};
    if(key==="members"){body.name=String(body.name||"").trim();body.mobile=String(body.mobile||"").trim();body.monthlyFee=Number(body.monthlyFee||0);}
    if(key==="seats"){body.seatNumber=String(body.seatNumber||"").trim();if(body.member)body.status="occupied";else if(body.status==="occupied")body.status="available";}
    if(key==="fees"&&(!body.member||!body.month||body.paidAmount<0||body.amount<0||body.paidAmount>body.amount))return res.status(400).json({error:"Please check member, month and amounts"});
    const doc=await c.model.findByIdAndUpdate(req.params.id,body,{new:true,runValidators:true});
    if(!doc)return res.status(404).json({error:"Record not found"});
    res.json(doc);
  }catch(e){if(e.code===11000)return res.status(409).json({error:"Duplicate record"});next(e);}});
  router.delete("/"+key+"/:id",staffOnly,async(req,res,next)=>{try{
    const doc=await c.model.findByIdAndDelete(req.params.id);if(!doc)return res.status(404).json({error:"Record not found"});
    if(key==="members"){await Seat.updateMany({member:doc._id},{$set:{member:null,status:"available"}});await Fee.deleteMany({member:doc._id});await Attendance.deleteMany({member:doc._id});}
    res.json({message:"Deleted"});
  }catch(e){next(e);}});
}
router.get("/attendance",async(req,res,next)=>{try{
  const q={}; if(req.query.date)q.date=String(req.query.date);
  res.json(await Attendance.find(q).populate("member","name mobile memberId").sort({createdAt:-1}));
}catch(e){next(e);}});
router.post("/attendance",staffOnly,async(req,res,next)=>{try{
  const {member,date,status,notes}=req.body;
  if(!member||!date||!["present","absent"].includes(status))return res.status(400).json({error:"Member, date and status are required"});
  const doc=await Attendance.findOneAndUpdate({member,date},{$set:{status,notes:notes||"",...(status==="present"&&!((await Attendance.findOne({member,date}))?.checkIn)?{checkIn:new Date()}:{} )}}, {new:true,upsert:true,setDefaultsOnInsert:true});
  res.json(doc);
}catch(e){next(e);}});
router.post("/attendance/:id/check-in",staffOnly,async(req,res,next)=>{try{
  if(!mongoose.isValidObjectId(req.params.id))return res.status(400).json({error:"Invalid attendance ID"});
  const doc=await Attendance.findByIdAndUpdate(req.params.id,{$set:{checkIn:new Date(),checkOut:null,status:"present"}},{new:true});
  if(!doc)return res.status(404).json({error:"Attendance record not found"});res.json(doc);
}catch(e){next(e);}});
router.post("/attendance/:id/check-out",staffOnly,async(req,res,next)=>{try{
  if(!mongoose.isValidObjectId(req.params.id))return res.status(400).json({error:"Invalid attendance ID"});
  const doc=await Attendance.findByIdAndUpdate(req.params.id,{$set:{checkOut:new Date(),status:"present"}},{new:true});
  if(!doc)return res.status(404).json({error:"Attendance record not found"});res.json(doc);
}catch(e){next(e);}});
export default router;
