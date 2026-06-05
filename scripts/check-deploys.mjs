const addr = process.argv[2] ?? "0x8655520b4b19187038aC9a4f560da0979Cc1E95C";
const watcher = addr.toLowerCase();

function isDeploy(tx) {
  const to = (tx.to ?? "").trim();
  return to === "" || to === "0x";
}

const txs = [];
for (let page = 1; page <= 10; page++) {
  const url =
    `https://base.blockscout.com/api?module=account&action=txlist&address=${addr}` +
    `&startblock=0&endblock=99999999&page=${page}&offset=1000&sort=asc`;
  const res = await fetch(url, { signal: AbortSignal.timeout(45000) });
  const json = await res.json();
  if (json.status !== "1" || !Array.isArray(json.result) || json.result.length === 0) break;
  txs.push(...json.result);
  if (json.result.length < 1000) break;
}

const deploys = txs.filter((t) => (t.from ?? "").toLowerCase() === watcher && isDeploy(t));
console.log(`Address: ${addr}`);
console.log(`Indexed txs: ${txs.length}`);
console.log(`Direct deployments: ${deploys.length}`);
for (const t of deploys) {
  const date = new Date(Number(t.timeStamp) * 1000).toISOString().slice(0, 10);
  const created = (t.contractAddress ?? "").trim();
  console.log(`  ${date}  ${t.hash}  created=${created || "(in receipt)"}`);
}
