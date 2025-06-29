// pages/api/login.js
import { serialize } from 'cookie';

export default async function login(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { username, password } = req.body;

  // In a real app, validate credentials against a database
  if (username === 'user' && password === 'password') {
    // Set a simple token in a cookie
    const token = 'my-secret-token'; // Replace with a real JWT or session token
    const cookie = serialize('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    res.setHeader('Set-Cookie', cookie);
    res.status(200).json({ message: 'Logged in successfully' });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
}
