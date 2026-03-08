export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

  const COINS = [
    { addr:"5C7nFDCgWTLnHgszBd4ksmCak3nouFoMZ9sbAxkApump" },
    { addr:"AG5iXv6pFuQtszqcVzZatTiH3EM5LvUhm6WnP42Gpump" },
    { addr:"Dir1edcUt6cT8AY35Tr96QaJwTeJJm6zuHnhVcA4pump" },
    { addr:"77Tp9C1wg7fXxNxYvEudMBs4X2Nve71Wrt1J8HxVpump" },
    { addr:"3fDJJawU59fL1Mu8g23CsMt24SbKWtciQ1pVhtT1pump" },
    { addr:"J3dGWsJwpPxKBYRCh44JFKc6eFMRp1JA6bRsxG2Tpump" },
    { addr:"4FDtAagigMuFcPp36rbd9bzcYTJgQah2qLMYcYtfpump" },
    { addr:"GnFMf6JVRhAqPbA9r8yW16xycynKNkXfbaYbusLEpump" },
    { addr:"9SbNtqtnXbSGKvQv6G1XMzmoiEMNHoNWQNtMz7sbpump" },
    { addr:"4e2DhohUAJ9EbrLey3rVVgFQzLCAeeBirSbdhqrh9snX" },
    { addr:"FG6jkQyxasn45vQGwpUCD3Kgv4mA5MLvUmYKauUmpump" },
    { addr:"FuJkw2vgov82x8DXbhPfmH6S6ZSJxvtjj1DQ7TsMpump" },
    { addr:"EcNyJST9Q7nLWBjN6BB53hwBecmYgKy2UwHHC5TQpump" },
    { addr:"KbRRK8YcPJfnB6SXo84F2BJwr8nVvzgG4BCWGwYpump" },
    { addr:"DDpoM1KF4QYJww1qj7bTQFfFDF1KKQFbGozejjzcpump" },
    { addr:"8d4D4FGUrbtTDucywowRD4AnizRKCr1YZaYQ74bRpump" },
  ];

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    // DexScreenerから全コインのMCを取得
    const addrs = COINS.map(c => c.addr).join(',');
    const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${addrs}`);
    const d = await r.json();
    const pairs = d?.pairs || [];

    let updated = 0;
    for (const coin of COINS) {
      const myPairs = pairs.filter(p =>
        p.baseToken?.address === coin.addr || p.quoteToken?.address === coin.addr
      );
      if (!myPairs.length) continue;
      const best = myPairs.sort((a,b) => (b.liquidity?.usd||0) - (a.liquidity?.usd||0))[0];
      const mc = parseFloat(best.marketCap);
      if (!mc || mc <= 0) continue;

      // 現在の最高値を取得
      const getRes = await fetch(
        `${SUPABASE_URL}/rest/v1/max_mc?addr=eq.${coin.addr}&select=max_mc`,
        { headers }
      );
      const rows = await getRes.json();
      const currentMax = parseFloat(rows?.[0]?.max_mc) || 0;

      if (mc > currentMax) {
        await fetch(`${SUPABASE_URL}/rest/v1/max_mc`, {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify({ addr: coin.addr, max_mc: mc, updated_at: new Date().toISOString() })
        });
        updated++;
      }
    }

    return res.json({ success: true, updated, total: COINS.length });
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
