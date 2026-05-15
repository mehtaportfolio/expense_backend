const salaryService = require('../services/salaryService');

const getAllSalaryDetails = async (req, res) => {
  try {
    const details = await salaryService.getAllSalaryDetails();
    res.json(details);
  } catch (error) {
    console.error('Error in getAllSalaryDetails:', error);
    res.status(500).json({ error: error.message });
  }
};

const addSalaryDetail = async (req, res) => {
  try {
    const data = await salaryService.addSalaryDetail(req.body);
    res.status(201).json(data);
  } catch (error) {
    console.error('Error in addSalaryDetail:', error);
    res.status(500).json({ error: error.message });
  }
};

const updateSalaryDetail = async (req, res) => {
  try {
    const data = await salaryService.updateSalaryDetail(req.params.id, req.body);
    res.json(data);
  } catch (error) {
    console.error('Error in updateSalaryDetail:', error);
    res.status(500).json({ error: error.message });
  }
};

const deleteSalaryDetail = async (req, res) => {
  try {
    await salaryService.deleteSalaryDetail(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error in deleteSalaryDetail:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllSalaryDetails,
  addSalaryDetail,
  updateSalaryDetail,
  deleteSalaryDetail
};
