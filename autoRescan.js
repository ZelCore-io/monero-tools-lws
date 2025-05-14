// Make accounts inactive if their access time is more than one week ago
const nodecmd = require('node-cmd');
const util = require('util');

const cmdAsync = util.promisify(nodecmd.get);

async function start() {
  try {
    // get list 
    const execA = '~/beldex/build/Linux/lws-implementation/release/bin/beldex-lws-admin list_requests';
    const cmdresA = await cmdAsync(execA);
    console.log(cmdresA);
    const parsed = JSON.parse(cmdresA);
    const importReq = parsed.import;
    if (!importReq) {
      return;
    }
    if (importReq.length > 40) {
      console.log('PANIC');
      return;
    }
    for (const acc of importReq)  {
      // move it to inactive
      const execB = `~/beldex/build/Linux/lws-implementation/release/bin/beldex-lws-admin accept_requests import ${acc.address}`;
      const cmdresB = await cmdAsync(execB);
      console.log(cmdresB);
    }
  } catch (error) {
    console.log(error);
  } finally {
    setTimeout(() => {
      start();
    }, 30 * 60 * 1000) // run every 30 mins
  }
}

start();
