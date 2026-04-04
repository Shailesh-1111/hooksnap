import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from the root .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const dbString = process.env.DATABASE_URL;

// PostgreSQL Connection Pool
let pool;
if (dbString) {
    pool = new pg.Pool({
        connectionString: dbString,
        ssl: { rejectUnauthorized: false } // Required for NeonDB
    });

    pool.on('error', (err) => {
        console.error('Unexpected error on idle client', err);
        process.exit(-1);
    });
} else {
    console.warn("WARNING: DATABASE_URL is not set in .env! Database features will not work.");
}

// 1. GET /api/homepage-config-data
app.get('/api/homepage-config-data', async (req, res) => {
    try {
        if (!pool) return res.status(500).json({ error: "Database not connected" });

        const result = await pool.query('SELECT * FROM homepage_config ORDER BY id DESC LIMIT 1');
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "No configuration found" });
        }

        let config = result.rows[0];

        // Output the throttled "display" count instead of the true DB count
        config.number_of_visits = config.number_of_visits_display !== null && config.number_of_visits_display !== undefined
            ? config.number_of_visits_display
            : config.number_of_visits;

        res.json(config);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error" });
    }
});

// 2. POST /api/visited-users
app.post('/api/visited-users', async (req, res) => {
    try {
        if (!pool) return res.status(500).json({ error: "Database not connected" });
        const { visitor_id } = req.body;
        if (!visitor_id) return res.status(400).json({ error: "Missing visitor_id" });

        // Insert new visitor or increment visit_count if exists
        await pool.query(`
      INSERT INTO visited_users (visitor_id, visit_count) 
      VALUES ($1, 1) 
      ON CONFLICT (visitor_id) 
      DO UPDATE SET 
        visit_count = visited_users.visit_count + 1,
        last_visit = CURRENT_TIMESTAMP;
    `, [visitor_id]);

        await pool.query(`
      UPDATE homepage_config 
      SET number_of_visits = number_of_visits + 1 
      WHERE id = (SELECT id FROM homepage_config ORDER BY id DESC LIMIT 1);
    `);

        const randomDelay = Math.floor(Math.random() * (18 - 3 + 1)) + 3;

        // Conditionally update display if random delay (3-18s) has passed
        await pool.query(`
            UPDATE homepage_config
            SET number_of_visits_display = number_of_visits,
                visits_last_synced = CURRENT_TIMESTAMP
            WHERE id = (SELECT id FROM homepage_config ORDER BY id DESC LIMIT 1)
              AND (visits_last_synced IS NULL OR EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - visits_last_synced)) >= $1);
        `, [randomDelay]);

        res.json({ success: true, message: `Visitor ${visitor_id} logged.` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error logging visit" });
    }
});

// 3. POST /api/early-access-users
app.post('/api/early-access-users', async (req, res) => {
    try {
        if (!pool) return res.status(500).json({ error: "Database not connected" });

        const { contact, feedback } = req.body;
        if (!contact || !feedback) {
            return res.status(400).json({ error: "Contact and feedback are required" });
        }

        // Insert into DB
        await pool.query(`
      INSERT INTO early_access_users (contact_method, preferred_price)
      VALUES ($1, $2);
    `, [contact, feedback]);

        await pool.query(`
      UPDATE homepage_config 
      SET number_of_registers = number_of_registers + 1 
      WHERE id = (SELECT id FROM homepage_config ORDER BY id DESC LIMIT 1);
    `);

        res.status(201).json({ success: true, message: "Early access request submitted." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Server error submitting request" });
    }
});

// Start Server Locally or Export for Vercel
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Backend Server running on http://localhost:${PORT}`);
    });
}

export default app;
