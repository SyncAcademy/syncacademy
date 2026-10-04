const {test}=require('node:test');const assert=require('node:assert/strict');const {spawn}=require('node:child_process');const {PrismaClient}=require('@prisma/client');const path=require('node:path');
require('dotenv').config({path:path.resolve(__dirname,'../../../.env'),quiet:true});const url=new URL(process.env.DATABASE_URL);url.pathname='/syncacademy_auth_test';process.env.DATABASE_URL=url.toString();
const {encrypt}=require('../dist/security');const db=new PrismaClient();
test('persistent outbox delivers through SMTP and erases delivered payloads',{timeout:60000},async()=>{
  const subject='Worker integration '+Date.now();const job=await db.outbox.create({data:{payload:encrypt(JSON.stringify({to:'worker@example.test',subject,text:'Delivery verification only.'}))}});
  const worker=spawn(process.execPath,[path.resolve(__dirname,'../dist/worker.js')],{env:process.env,stdio:'ignore'});
  try { let delivered;for(let i=0;i<120;i++){delivered=await db.outbox.findUnique({where:{id:job.id}});if(delivered.sentAt)break;await new Promise(r=>setTimeout(r,250));}assert.ok(delivered.sentAt,'Worker must record SMTP delivery');assert.equal(delivered.payload,'','Sensitive payload erased after delivery'); }
  finally{worker.kill();await db.$disconnect();}
});
