const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());




app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'nabinbhandari',
    database: 'roda_gems'
});

app.get('/api/jewelry', (req, res) => {
    db.query('SELECT * FROM jewelry', (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

app.post('/register', async (req, res) => {
    console.log(req.body)
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
    db.query(sql, [username, email, hashedPassword], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json({ message: 'User registered successfully' });
    });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;

    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const user = results[0];
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

        if (user.role !== 'user') {
            return res.status(403).json({ error: 'Access denied. Not a normal user' });
        }

        res.status(200).json({
            message: 'Login successful',
            user: { id: user.id, username: user.username, email: user.email, role: user.role }
        });
    });
});


app.post('/api/order', (req, res) => {
    const { userId, productId, quantity } = req.body;

    if (!userId) {
        return res.status(401).json({ success: false, message: 'User not logged in' });
    }

    const sql = "INSERT INTO orders (user_id, product_id, quantity) VALUES (?, ?, ?)";
    db.query(sql, [userId, productId, quantity || 1], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        res.json({ success: true, message: 'Order placed successfully' });
    });
});


app.get('/api/users', (req, res) => {
    db.query('SELECT * FROM users WHERE role != "admin"', (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

app.delete('/api/users/:id', (req, res) => {
    db.query('DELETE FROM users WHERE id = ?', [req.params.id], (err) => {
        if (err) throw err;
        res.json({ message: 'User deleted' });
    });
});

app.get('/api/jewelry', (req, res) => {
    db.query('SELECT * FROM jewelry', (err, results) => {
        if (err) throw err;
        res.json(results);
    });
});

app.put('/api/jewelry/:id', (req, res) => {
    const { name, category, material, description, price, image, badge } = req.body;
    db.query(
        'UPDATE jewelry SET name=?, category=?, material=?, description=?, price=?, image=?, badge=? WHERE id=?',
        [name, category, material, description, price, image, badge, req.params.id],
        (err) => {
            if (err) throw err;
            res.json({ message: 'Product updated' });
        }
    );
});

app.get('/api/orders', (req, res) => {
    db.query(
        `SELECT o.id, u.username, j.name AS product, o.quantity, o.order_date
         FROM orders o
         JOIN users u ON o.user_id = u.id
         JOIN jewelry j ON o.product_id = j.id`,
        (err, results) => {
            if (err) throw err;
            res.json(results);
        }
    );
});

app.delete('/api/jewelry/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await db.query('DELETE FROM jewelry WHERE id = ?', [id]); 
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

app.post('/admin/login', (req, res) => {
    const { email, password } = req.body;

    const sql = 'SELECT * FROM users WHERE email = ?';
    db.query(sql, [email], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const user = results[0];
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

        if (user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Not an admin' });
        }

        res.status(200).json({
            message: 'Admin login successful',
            user: { id: user.id, username: user.username, email: user.email, role: user.role }
        });
    });
});



app.listen(3000, () => console.log('API running on http://localhost:3000'));
