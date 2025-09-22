const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ ok: true, service: 'medifinder-backend', time: new Date().toISOString() });
});

module.exports = router;
