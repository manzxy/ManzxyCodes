// api/admin-logout.js

export default async function handler(req, res) {
  res.setHeader('Set-Cookie', [
    'admin_token=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/'
  ]);
  return res.status(200).json({ ok: true });
}
