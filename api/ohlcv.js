export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

  const { addr, mc, action } = req.query;

  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    // 全コインのMCを一括取得
    if (action === 'all') {
      const ADDRS = [
        '5C7nFDCgWTLnHgszBd4ksmCak3nouFoMZ9sbAxkApump',
        'AG5iXv6pFuQtszqcVzZatTiH3EM5LvUhm6WnP42Gpump',
        'Dir1edcUt6cT8AY35Tr96QaJwTeJJm6zuHnhVcA4pump',
        '77Tp9C1wg7fXxNxYvEudMBs4X2Nve71Wrt1J8HxVpump',
        '3fDJJawU59fL1Mu8g23CsMt24SbKWtciQ1pVhtT1pump',
        'J3dGWsJwpPxKBYRCh44JFKc6eFMRp1JA6bRsxG2Tpump',
        '4FDtAagigMuFcPp36rbd9bzcYTJgQah2qLMYcYtfpump',
        'GnFMf6JVRhAqPbA9r8yW16xycynKNkXfbaYbusLEpump',
        '9SbNtqtnXbSGKvQv6G1XMzmoiEMNHoNWQNtMz7sbpump',
        '4e2DhohUAJ9EbrLey3rVVgFQzLCAeeBirSbdhqrh9snX',
        'FG6jkQyxasn45vQGwpUCD3Kgv4mA5MLvUmYKauUmpump',
        'FuJkw2vgov82x8DXbhPfmH6S6ZSJxvtjj1DQ7TsMpump',
        'EcNyJST9Q7nLWBjN6BB53hwBecmYgKy2UwHHC5TQpump',
        'KbRRK8YcPJfnB6SXo84F2BJwr8nVvzgG4BCWGwYpump',
        'DDpoM1KF4QYJww1qj7bTQFfFDF1KKQFbGozejjzcpump',
        '8d4D4FGUrbtTDucywowRD4AnizRKCr1YZaYQ74bRpump',
      ];

      const half1 = ADDRS.slice(0, 8).join(',');
      const half2 = ADDRS.slice(8).join(',');

      const [r1, r2] = await Promise.all([
        fetch(`https://api.dexscreener.com/latest/dex/tokens/${half1}`),
        fetch(`https://api.dexscreener.com/latest/dex/tokens/${half2}`)
      ]);
      const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
      const pairs = [...(d1?.pairs || []), ...(d2?.pairs || [])];

      const result = {};
      for (const addr of ADDRS) {
        const myPairs = pairs.filter(p =>
          p.baseToken?.address === addr || p.quoteToken?.address === addr
        );
        if (!myPairs.length) continue;
        const best = myPairs.sort((a,b) => (b.liquidity?.usd||0) - (a.liquidity?.usd||0))[0];
        const mc = parseFloat(best.marketCap);
        if (mc > 0) {
          result[addr] = mc;
          // Supabaseの最高値を更新
          const getRes = await fetch(
            `${SUPABASE_URL}/rest/v1/max_mc?addr=eq.${addr}&select=max_mc`,
            { headers }
          );
          const rows = await getRes.json();
          const currentMax = parseFloat(rows?.[0]?.max_mc) || 0;
          if (mc > currentMax) {
            await fetch(`${SUPABASE_URL}/rest/v1/max_mc`, {
              method: 'POST',
              headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
              body: JSON.stringify({ addr, max_mc: mc, updated_at: new Date().toISOString() })
            });
          }
        }
      }

      // Supabaseから全最高値を取得
      const maxRes = await fetch(`${SUPABASE_URL}/rest/v1/max_mc?select=addr,max_mc`, { headers });
      const maxRows = await maxRes.json();
      const maxMC = {};
      for (const row of maxRows) maxMC[row.addr] = row.max_mc;

      return res.json({ nowMC: result, maxMC });
    }

    // 単体の最高値取得・更新
    if (!addr) return res.status(400).json({ error: 'addr required' });

    if (mc) {
      const newMC = parseFloat(mc);
      const getRes = await fetch(
        `${SUPABASE_URL}/rest/v1/max_mc?addr=eq.${addr}&select=max_mc`,
        { headers }
      );
      const rows = await getRes.json();
      const currentMax = parseFloat(rows?.[0]?.max_mc) || 0;
      if (newMC > currentMax) {
        await fetch(`${SUPABASE_URL}/rest/v1/max_mc`, {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify({ addr, max_mc: newMC, updated_at: new Date().toISOString() })
        });
        return res.json({ maxMC: newMC, updated: true });
      }
      return res.json({ maxMC: currentMax, updated: false });
    }

    const getRes = await fetch(
      `${SUPABASE_URL}/rest/v1/max_mc?addr=eq.${addr}&select=max_mc`,
      { headers }
    );
    const rows = await getRes.json();
    return res.json({ maxMC: parseFloat(rows?.[0]?.max_mc) || 0 });

  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}
