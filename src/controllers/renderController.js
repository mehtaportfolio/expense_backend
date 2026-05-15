const renderService = require('../services/renderService');

const restartService = async (req, res) => {
  try {
    const data = await renderService.restartService();
    res.json(data);
  } catch (error) {
    console.error('Error in restartService:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  restartService
};
