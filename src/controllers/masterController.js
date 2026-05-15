const masterService = require('../services/masterService');

const getAllMasterData = async (req, res) => {
  try {
    const data = await masterService.getAllMasterData();
    res.json(data);
  } catch (error) {
    console.error('Error in getAllMasterData:', error);
    res.status(500).json({ error: error.message });
  }
};

const addMasterEntry = async (req, res) => {
  try {
    const data = await masterService.addMasterEntry(req.body);
    res.status(201).json(data);
  } catch (error) {
    console.error('Error in addMasterEntry:', error);
    res.status(500).json({ error: error.message });
  }
};

const initializeMasterTable = async (req, res) => {
  try {
    await masterService.initializeMasterTable(req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Error in initializeMasterTable:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllMasterData,
  addMasterEntry,
  initializeMasterTable
};
