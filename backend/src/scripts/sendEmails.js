import { closeDatabase } from '../config/database.js'
import { emailProvider } from '../providers/emailProvider.js'
import { emailOutboxRepository } from '../repositories/emailOutboxRepository.js'
let sent=0,failed=0
try{const messages=await emailOutboxRepository.claim();for(const message of messages)try{await emailProvider.send({template:message.template,to:message.recipient,variables:message.variables});await emailOutboxRepository.sent(message.id);sent+=1}catch(error){await emailOutboxRepository.failed(message.id,error.code??error.name);failed+=1}console.log(JSON.stringify({event:'EMAIL_OUTBOX_COMPLETED',sent,failed}));if(failed)process.exitCode=1}catch(error){console.error(JSON.stringify({event:'EMAIL_OUTBOX_FAILED',error:error.code??error.name}));process.exitCode=1}finally{await closeDatabase()}
