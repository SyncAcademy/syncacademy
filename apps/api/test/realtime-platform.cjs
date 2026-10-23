const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { io } = require('socket.io-client');
const { authenticator } = require('otplib');
const { passwordHash, encrypt, decrypt, digest } = require('../dist/security');
module.exports = async ({t, db, client, fixture, admin, adminPassword, recoveryCodes, strongPassword}) => {
  await t.test('platform sockets require admin authority and shared transport reaches a second API', {timeout:60000}, async t => {
    const second = spawn(process.execPath,[path.resolve(__dirname,'../dist/main.js')],{env:{...process.env,PORT:'3102',REALTIME_TRANSPORT:'postgres'},stdio:'pipe'});
    let secondLogs='';
    second.stdout.on('data',chunk=>secondLogs+=chunk);
    second.stderr.on('data',chunk=>secondLogs+=chunk);
    t.after(()=>second.kill());
    let ready=false;
    for(let i=0;i<120;i++) { try { ready=(await fetch('http://localhost:3102/api/v1/health/ready')).ok; if(ready)break; } catch{} await new Promise(r=>setTimeout(r,250)); }
    assert.ok(ready,'second API starts');
    const adminSession=await admin.call('GET','auth/me');
    assert.equal(adminSession.status,200,'platform socket fixture must have an active authenticated session');
    const cookie=adminSession.cookie;
    const school=await db.school.create({data:{name:'Shared socket school',code:'SOCKET-'+randomUUID().slice(0,8),region:'Test'}});
    const user=await fixture('shared-socket-'+randomUUID()+'@example.test','HEADMASTER',school.id), head=client();
    await head.login(user.email,undefined,'HEADMASTER');
    const headCookie=(await head.call('GET','auth/me')).cookie;
    const wait=(socket,event)=>new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Missing '+event+(event.endsWith(':ready')?': '+secondLogs.slice(-1000):''))),8000);
      socket.once(event,data=>{clearTimeout(timer);resolve(data);});
      if(event.endsWith(':ready')) {
        socket.once('connect_error',error=>{clearTimeout(timer);reject(new Error('Socket handshake failed: '+error.message));});
        socket.once('disconnect',reason=>{clearTimeout(timer);reject(new Error('Socket disconnected before '+event+': '+reason+': '+secondLogs.slice(-1000)));});
      }
    });
    const connect=async(auth,cookie,event)=>{
      const socket=io('http://localhost:3102',{transports:['websocket'],reconnection:false,autoConnect:false,auth,extraHeaders:{Origin:process.env.APP_ORIGIN,Cookie:cookie}});
      t.after(()=>socket.disconnect());const promise=wait(socket,event);socket.connect();await promise;return socket;
    };
    let platform=await connect({scope:'platform'},cookie,'platform:ready');
    const targetSecret=authenticator.generateSecret();
    const targetUser=await db.user.create({data:{
      email:'socket-admin-'+randomUUID()+'@example.test',
      name:'Socket lifecycle administrator',
      passwordHash:await passwordHash(strongPassword),
      platformAdmin:true,
      mfaSecret:encrypt(targetSecret),
      mfaRecovery:[],
    }});
    const target=client();
    assert.equal((await target.platformLogin(targetUser.email,strongPassword)).body.stage,'totp');
    assert.equal((await target.call('POST','auth/platform/verify',{code:authenticator.generate(targetSecret)})).status,201);
    const targetSocket=await connect({scope:'platform'},target.cookie,'platform:ready');
    const targetDisconnected=wait(targetSocket,'disconnect');
    assert.equal((await admin.call('PATCH',`platform/admins/${targetUser.id}`,{enabled:false})).status,200);
    await targetDisconnected;
    assert.equal((await target.call('GET','platform/summary')).status,401);
    assert.equal((await admin.call('PATCH',`platform/admins/${targetUser.id}`,{enabled:true})).status,200);
    assert.equal((await target.call('GET','platform/summary')).status,401,'re-enabling must not restore revoked sessions');
    const originalAdmin=await db.user.findUniqueOrThrow({where:{email:'admin@example.test'}});
    const originalSecret=decrypt(originalAdmin.mfaSecret);
    const previousVersion=originalAdmin.sessionVersion;
    const oldRecovery=recoveryCodes[1];
    const replacement=await admin.call('POST','auth/platform/replacement/start',{currentPassword:adminPassword,factor:oldRecovery});
    assert.equal(replacement.status,201);
    assert.ok(replacement.body.qr.startsWith('data:image/png;base64,'));
    const verifiedReplacement=await admin.call('POST','auth/platform/replacement/verify',{code:authenticator.generate(replacement.body.secret)});
    assert.equal(verifiedReplacement.status,201);
    assert.equal(verifiedReplacement.body.recoveryCodes.length,8);
    assert.equal((await admin.call('GET','platform/summary')).status,200,'replacement does not apply before recovery acknowledgement');
    const platformDisconnected=wait(platform,'disconnect');
    assert.equal((await admin.call('POST','auth/platform/replacement/acknowledge',{})).status,201);
    await platformDisconnected;
    assert.equal((await admin.call('GET','platform/summary')).status,401,'replacement revokes the current session');
    const replacedAdmin=await db.user.findUniqueOrThrow({where:{id:originalAdmin.id}});
    assert.equal(replacedAdmin.sessionVersion,previousVersion+1);
    assert.equal(decrypt(replacedAdmin.mfaSecret),replacement.body.secret);
    assert.ok(!replacedAdmin.mfaRecovery.includes(oldRecovery));
    assert.ok(await db.auditEvent.count({where:{actorId:originalAdmin.id,action:'PLATFORM_ADMIN_AUTHENTICATOR_REPLACED'}})>0);
    const replacementNotice=await db.outbox.findMany({where:{payload:{not:''}},select:{payload:true}});
    assert.ok(replacementNotice.some(job=>JSON.parse(decrypt(job.payload)).text.includes('all active account sessions were revoked')));
    const oldCodeAttempt=client();
    assert.equal((await oldCodeAttempt.platformLogin(originalAdmin.email,adminPassword)).body.stage,'totp');
    assert.equal((await oldCodeAttempt.call('POST','auth/platform/verify',{code:authenticator.generate(originalSecret)})).status,401,'the replaced authenticator cannot sign in');
    const oldRecoveryAttempt=client();
    assert.equal((await oldRecoveryAttempt.platformLogin(originalAdmin.email,adminPassword)).body.stage,'totp');
    assert.equal((await oldRecoveryAttempt.call('POST','auth/platform/recovery',{code:oldRecovery})).status,401,'recovery codes are replaced atomically');
    const newRecoveryCodes=verifiedReplacement.body.recoveryCodes;
    await db.rateBucket.deleteMany({where:{key:digest('platform-challenge-fail-account:'+originalAdmin.id)}});
    assert.equal((await admin.platformLogin(originalAdmin.email,adminPassword)).body.stage,'totp');
    assert.equal((await admin.call('POST','auth/platform/recovery',{code:newRecoveryCodes[0]})).status,201);
    recoveryCodes.splice(0,recoveryCodes.length,...newRecoveryCodes);
    const renewedAdmin=await admin.call('GET','auth/me');
    assert.equal(renewedAdmin.status,200);
    platform=await connect({scope:'platform'},renewedAdmin.cookie,'platform:ready');
    const scoped=await connect({schoolId:school.id},headCookie,'school:ready');
    const denied=io('http://localhost:3102',{transports:['websocket'],reconnection:false,autoConnect:false,auth:{scope:'platform'},extraHeaders:{Origin:process.env.APP_ORIGIN,Cookie:headCookie}});
    let leaked=false;denied.on('platform:ready',()=>leaked=true);t.after(()=>denied.disconnect());const deniedResult=wait(denied,'disconnect');denied.connect();await deniedResult;assert.equal(leaked,false);
    let platformEvents=0,schoolEvents=0;platform.on('platform:changed',()=>platformEvents++);scoped.on('school:changed',()=>schoolEvents++);
    const platformNotice=wait(platform,'platform:changed'), schoolNotice=wait(scoped,'school:changed');
    const profile={name:'Shared socket school updated',region:'Test',schoolType:'Public',address:'',phone:'',email:'',website:''};
    assert.equal((await head.call('PATCH',`schools/${school.id}/profile`,profile)).status,200);
    await Promise.all([platformNotice,schoolNotice]);assert.ok(platformEvents>0&&schoolEvents>0,'write on API 1 reaches both authorized audiences on API 2');
    await new Promise(r=>setTimeout(r,150));const before=platformEvents;
    assert.equal((await head.call('PATCH','platform/settings',{platformName:'Denied',supportEmail:'',maintenanceMessage:''})).status,403);
    await new Promise(r=>setTimeout(r,150));assert.equal(platformEvents,before,'failed writes produce no event');
    const current=await db.user.findUniqueOrThrow({where:{id:user.id}});
    await db.user.update({where:{id:user.id},data:{sessionVersion:{increment:1}}});
    const revoked=wait(scoped,'disconnect');
    assert.equal((await admin.call('PATCH',`schools/${school.id}`,{active:true,reason:'Verify revoked school session.'})).status,200);await revoked;
    await db.user.update({where:{id:user.id},data:{sessionVersion:current.sessionVersion}});
    const recovered=wait(platform,'platform:changed');
    await db.$queryRaw`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=current_database() AND application_name='syncacademy-realtime'`;
    await recovered;
    const reenabledChallenge=await target.platformLogin(targetUser.email,strongPassword);
    assert.equal(reenabledChallenge.status,201);
    assert.equal(reenabledChallenge.body.stage,'totp');
  });
};
