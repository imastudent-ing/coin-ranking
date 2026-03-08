export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

  const { addr, mc } = req.query;
  if (!addr) return res.status(400).json({ error: 'addr required' });

  // mcが送られてきたら最高値を更新
  if (mc) {
    const newMC = parseFloat(mc);
    // 現在の最高値を取得
    const getRes = await fetch(`${SUPABASE_URL}/rest/v1/max_mc?addr=eq.${addr}&select=max_mc`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const rows = await getRes.json();
    const currentMax = rows?.[0]?.max_mc || 0;

    if (newMC > currentMax) {
      await fetch(`${SUPABASE_URL}/rest/v1/max_mc`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates'
        },
        body: JSON.stringify({ addr, max_mc: newMC, updated_at: new Date().toISOString() })
      });
      return res.json({ maxMC: newMC, updated: true });
    }
    return res.json({ maxMC: currentMax, updated: false });
  }

  // mcが無ければ最高値を返す
  const getRes = await fetch(`${SUPABASE_URL}/rest/v1/max_mc?addr=eq.${addr}&select=max_mc`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  const rows = await getRes.json();
  return res.json({ maxMC: rows?.[0]?.max_mc || 0 });
}
