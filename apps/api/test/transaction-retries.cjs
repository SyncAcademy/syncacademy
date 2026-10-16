const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {Prisma}=require('@prisma/client');
const {PlatformService}=require('../dist/platform.service');
module.exports=async({t,db})=>{
 await t.test('raw SQL serialization conflicts retry atomically and remain bounded',async()=>{
  const school=await db.school.create({data:{name:'Retry',code:'RETRY-'+randomUUID().slice(0,8),region:'Test'}});
  const svc=new PlatformService(db),attempts=[0,0];let arrivals=0,release;
  const barrier=new Promise(resolve=>release=resolve);
  await Promise.all(['-one','-two'].map((suffix,index)=>svc.atomic(async tx=>{
   const attempt=++attempts[index];
   await tx.school.findUniqueOrThrow({where:{id:school.id}}); // Establish both snapshots before either write.
   if(attempt===1){if(++arrivals===2)release();await barrier;}
   return tx.$queryRaw`UPDATE "School" SET name=name||${suffix} WHERE id=${school.id}::uuid RETURNING name`;
  })));
  assert.deepEqual([...attempts].sort(),[1,2],'the losing raw SQL transaction must actually retry');
  const saved=await db.school.findUniqueOrThrow({where:{id:school.id}});
  assert.ok(['Retry-one-two','Retry-two-one'].includes(saved.name),'each committed mutation occurs exactly once');
  let calls=0;
  const rawError=code=>new Prisma.PrismaClientKnownRequestError('Raw query failed',{code:'P2010',clientVersion:'test',meta:{code}});
  const exhausted=new PlatformService({$transaction:async()=>{calls++;throw rawError('40001');}});
  await assert.rejects(()=>exhausted.atomic(async()=>{}),error=>error.getStatus?.()===409);
  assert.equal(calls,4,'raw SQL retains the existing three-retry limit');
  calls=0;
  const unrelated=new PlatformService({$transaction:async()=>{calls++;throw rawError('23505');}});
  await assert.rejects(()=>unrelated.atomic(async()=>{}),error=>error.code==='P2010');
  assert.equal(calls,1,'unrelated raw SQL failures are not retried');
 });
};
