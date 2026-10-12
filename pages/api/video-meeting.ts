import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Validate room name from database table
    const { tableName } = req.body;
    
    // Check if tableName is provided and is a string
    if (!tableName || typeof tableName !== 'string') {
      return res.status(400).json({ error: 'Valid table name is required' });
    }

    // Format date as YYYYMMDD for URL safety
    const date = new Date();
    const dateString = date.toISOString().split('T')[0].replace(/-/g, '');

    // Combine table name and date to form unique room name
        const roomName = `${tableName}-${dateString}`;

        res.status(200).json({ roomName });
      } else {
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
      }
    }