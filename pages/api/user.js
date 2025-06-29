// pages/api/user.js
import { parse } from 'cookie';

export default async function user(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const cookies = parse(req.headers.cookie || '');
  const authToken = cookies.auth_token;

  if (authToken === 'my-secret-token') { // Validate against your token
    res.status(200).json({ user: { username: 'user' } });
  } else {
    res.status(401).json({ message: 'Unauthorized' });
  }
}
