const expenseService = require('../services/expenseService');

const getAllExpenses = async (req, res) => {
  try {
    const expenses = await expenseService.getAllExpenses();
    res.json(expenses);
  } catch (error) {
    console.error('Error in getAllExpenses:', error);
    res.status(500).json({ error: error.message });
  }
};

const addExpense = async (req, res) => {
  try {
    const data = await expenseService.addExpense(req.body);
    res.status(201).json(data);
  } catch (error) {
    console.error('Error in addExpense:', error);
    res.status(500).json({ error: error.message });
  }
};

const addExpenses = async (req, res) => {
  try {
    const data = await expenseService.addExpenses(req.body);
    res.status(201).json(data);
  } catch (error) {
    console.error('Error in addExpenses:', error);
    res.status(500).json({ error: error.message });
  }
};

const updateExpense = async (req, res) => {
  try {
    const data = await expenseService.updateExpense(req.params.id, req.body);
    res.json(data);
  } catch (error) {
    console.error('Error in updateExpense:', error);
    res.status(500).json({ error: error.message });
  }
};

const deleteExpense = async (req, res) => {
  try {
    await expenseService.deleteExpense(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error in deleteExpense:', error);
    res.status(500).json({ error: error.message });
  }
};

const getExpenseSummary = async (req, res) => {
  try {
    const summary = await expenseService.getExpenseSummary();
    res.json(summary);
  } catch (error) {
    console.error('Error in getExpenseSummary:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllExpenses,
  addExpense,
  addExpenses,
  updateExpense,
  deleteExpense,
  getExpenseSummary
};
