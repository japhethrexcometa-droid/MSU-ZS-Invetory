/**
 * Runs the Supabase migration SQL via the Management API.
 * Splits into batches to avoid request size limits.
 */
const fs = require("fs");
const https = require("https");

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || "pcvqgpfpighxzdcjggnn";
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error("ERROR: SUPABASE_ACCESS_TOKEN environment variable is not set.");
  console.error("Get it from: Supabase Dashboard > Account > Access Tokens (create a Personal Access Token)");
  process.exit(1);
}

function query(sql) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sql });
    const req = https.request(
      {
        hostname: "api.supabase.com",
        path: `/v1/projects/${PROJECT_REF}/database/query`,
        method: "POST",
        headers: {
          Authorization: `Bearer ${ACCESS_TOKEN}`,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const sql = fs.readFileSync("supabase/migrations/00001_schema.sql", "utf8");

  // Split into individual statements
  const stmts = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  console.log(`Total SQL statements to execute: ${stmts.length}`);

  // Group into batches of 15
  const BATCH_SIZE = 15;
  let success = 0;
  let errors = [];

  for (let i = 0; i < stmts.length; i += BATCH_SIZE) {
    const batch = stmts.slice(i, i + BATCH_SIZE);
    const batchSql = batch.join(";\n\n") + ";";
    console.log(
      `Executing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(stmts.length / BATCH_SIZE)} (statements ${i + 1}-${Math.min(i + BATCH_SIZE, stmts.length)})...`
    );

    try {
      const result = await query(batchSql);
      console.log(`  ✓ Batch succeeded`);
      success += batch.length;
    } catch (err) {
      // Try one statement at a time to isolate the failing one
      console.log(`  ✗ Batch failed, trying individual statements...`);
      for (let j = 0; j < batch.length; j++) {
        try {
          await query(batch[j] + ";");
          success++;
        } catch (stmtErr) {
          const msg = `Statement ${i + j + 1}: ${stmtErr.message}`;
          console.log(`  ✗ ${msg}`);
          errors.push(msg);
        }
      }
    }
  }

  console.log(`\n=== Migration Complete ===`);
  console.log(`✓ ${success}/${stmts.length} statements executed successfully`);
  if (errors.length > 0) {
    console.log(`✗ ${errors.length} errors:`);
    errors.forEach((e) => console.log(`  - ${e}`));
    process.exit(1);
  } else {
    console.log(`✓ All statements executed successfully!`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
