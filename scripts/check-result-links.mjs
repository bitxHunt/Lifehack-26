const baseUrl = (process.env.PICKME_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const asins = process.argv.slice(2).map((value) => value.trim().toUpperCase()).filter(Boolean);

if (asins.length === 0) {
  console.error("Pass the ASINs returned by an evaluation, for example: npm run links:check -- B08DYFFQ8S B078PSGWZC");
  process.exitCode = 1;
} else {
  const checks = await Promise.all(asins.map(async (asin) => {
    const url = `${baseUrl}/shop/catalog/${asin}`;
    try {
      const response = await fetch(url, { redirect: "follow" });
      return { asin, url, status: response.status, ok: response.ok };
    } catch (error) {
      return { asin, url, status: 0, ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }));

  for (const check of checks) {
    console.log(`${check.ok ? "PASS" : "FAIL"} ${check.status} ${check.asin} ${check.url}${check.error ? ` ${check.error}` : ""}`);
  }
  if (checks.some((check) => !check.ok)) process.exitCode = 1;
}
