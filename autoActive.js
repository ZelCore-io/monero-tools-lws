// Make accounts active if their access time is recent (within the last week)
const nodecmd = require('node-cmd');
const util = require('util');

const cmdAsync = util.promisify(nodecmd.get);
const execShell = util.promisify(require('child_process').exec);

async function start() {
  try {
    // get list
    const currentTime = Math.round(new Date().getTime() / 1000);
    const weekAgo = currentTime - 7 * 24 * 60 * 60;
    const execA = '~/monero-lws-trunk/build/src/monero-lws-admin list_accounts';
    const cmdresA = await execShell(execA, { maxBuffer: 1024 * 1024 * 10 });
    console.log(cmdresA);
    const parsed = JSON.parse(cmdresA.stdout);
    const inactive = parsed.inactive;
    const inactiveRecent = inactive.filter((acc) => acc.access_time >= weekAgo);
    for (const acc of inactiveRecent)  {
      // move it to active
      const execB = `~/monero-lws-trunk/build/src/monero-lws-admin modify_account_status active ${acc.address}`;
      const cmdresB = await cmdAsync(execB);
      console.log(cmdresB);
    }
  } catch (error) {
    console.log(error);
  } finally {
    setTimeout(() => {
      start();
    }, 60 * 60 * 1000) // run every hour
  }
}

start();
