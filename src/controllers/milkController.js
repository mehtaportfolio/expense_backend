const milkService = require('../services/milkService');

const getAllMilkDetails = async (req, res) => {
  try {
    const data = await milkService.getAllMilkDetails();
    res.json(data);
  } catch (error) {
    console.error('Error in getAllMilkDetails:', error);
    res.status(500).json({ error: error.message });
  }
};

const updateMilkDetail = async (req, res) => {
  try {
    const { sr_no } = req.params;
    const { kg } = req.body;
    await milkService.updateMilkDetail(sr_no, kg);
    res.json({ success: true });
  } catch (error) {
    console.error('Error in updateMilkDetail:', error);
    res.status(500).json({ error: error.message });
  }
};

const fillZeroValues = async (req, res) => {
  try {
    const { kg } = req.body;
    await milkService.fillZeroValues(kg);
    res.json({ success: true });
  } catch (error) {
    console.error('Error in fillZeroValues:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllMilkDetails,
  updateMilkDetail,
  fillZeroValues
};
