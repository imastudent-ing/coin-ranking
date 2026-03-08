export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { addr, from } = req.query;
  if (!addr) return res.status(400).json({ error: 'addr required' });

  const fromUnix = from || '1741359000';
  const toUnix = Math.floor(Date.now() / 1000);

  try {
    const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${addr}`);
    const dexData = await dexRes.json();
    const pairs = dexData?.pairs || [];
    if (!pairs.length) return res.status(404).json({ error: 'no pairs' });

    const best = pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
    const pairAddr = best.pairAddress;
    const chainId = best.chainId;

    const chartRes = await fetch(
      `https://io.dexscreener.com/dex/chart/amm/v3/${chainId}/${pairAddr}?from=${fromUnix}&to=${toUnix}&res=60&cb=0`
    );
    const chartData = await chartRes.json();
    const candles = chartData?.candles || chartData?.data || [];

    if (!candles.length) {
      return res.json({ maxMC: parseFloat(best.marketCap) || 0, source: 'current' });
    }

    const currentPrice = parseFloat(best.priceUsd);
    const currentMC = parseFloat(best.marketCap);
    const priceToMC = currentPrice > 0 ? currentMC / currentPrice : 1;

    let maxHigh = 0;
    for (const c of candles) {
      const h = parseFloat(c.h || c.high || c[2] || 0);
      if (h > maxHigh) maxHigh = h;
    }

    const maxMC = maxHigh * priceToMC;
    return res.json({ maxMC, source: 'candles', candleCount: candles.length });

  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
