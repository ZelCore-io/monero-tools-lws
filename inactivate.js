// Make accounts inactive if their access time is more than one week ago
const util = require('util');
const execShell = util.promisify(require('child_process').exec);

// Configuration
const BATCH_SIZE = 50; // Number of addresses per command (adjust based on command line limits)
const CONCURRENCY = 10; // Number of parallel batches
const PROGRESS_INTERVAL = 100; // Log progress every N batches

async function processBatch(addresses) {
  if (addresses.length === 0) return;
  const addressList = addresses.join(' ');
  const execB = `~/monero-lws-trunk/build/src/monero-lws-admin modify_account_status inactive ${addressList}`;
  try {
    await execShell(execB, { maxBuffer: 1024 * 1024 * 10 });
  } catch (error) {
    // If batch fails, try one by one as fallback
    console.log(`Batch failed, processing ${addresses.length} addresses individually...`);
    for (const addr of addresses) {
      try {
        await execShell(`~/monero-lws-trunk/build/src/monero-lws-admin modify_account_status inactive ${addr}`);
      } catch (e) {
        console.log(`Failed to inactivate: ${addr.substring(0, 20)}...`);
      }
    }
  }
}

async function processWithConcurrency(batches, concurrency) {
  let completed = 0;
  const total = batches.length;
  const startTime = Date.now();

  for (let i = 0; i < batches.length; i += concurrency) {
    const chunk = batches.slice(i, i + concurrency);
    await Promise.all(chunk.map(batch => processBatch(batch)));
    completed += chunk.length;

    if (completed % PROGRESS_INTERVAL === 0 || completed === total) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = completed / elapsed;
      const remaining = (total - completed) / rate;
      console.log(`Progress: ${completed}/${total} batches (${Math.round(completed/total*100)}%) - ETA: ${Math.round(remaining)}s`);
    }
  }
}

async function start() {
  try {
    const currentTime = Math.round(new Date().getTime() / 1000);
    const weekAgo = currentTime - 7 * 24 * 60 * 60;

    console.log('Fetching account list...');
    const execA = '~/monero-lws-trunk/build/src/monero-lws-admin list_accounts';
    const cmdresA = await execShell(execA, { maxBuffer: 1024 * 1024 * 200 }); // Increased buffer for large response

    console.log('Parsing accounts...');
    const parsed = JSON.parse(cmdresA.stdout);
    const active = parsed.active;
    const activeOLD = active.filter((acc) => acc.access_time < weekAgo);

    console.log(`Found ${activeOLD.length} accounts to inactivate out of ${active.length} active accounts`);

    if (activeOLD.length === 0) {
      console.log('No accounts to inactivate');
      return;
    }

    // Create batches of addresses
    const addresses = activeOLD.map(acc => acc.address);
    const batches = [];
    for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
      batches.push(addresses.slice(i, i + BATCH_SIZE));
    }

    console.log(`Processing ${batches.length} batches with concurrency ${CONCURRENCY}...`);
    await processWithConcurrency(batches, CONCURRENCY);

    console.log('Done!');
  } catch (error) {
    console.log('Error:', error.message);
  } finally {
    setTimeout(() => {
      start();
    }, 60 * 60 * 1000); // run every hour
  }
}

start();
