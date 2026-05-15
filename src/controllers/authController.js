const authService = require('../services/authService');

const verifyPassword = async (req, res) => {
  try {
    const { password } = req.body;
    const isValid = await authService.verifyPassword(password);
    res.json({ isValid });
  } catch (error) {
    console.error('Error in verifyPassword:', error);
    res.status(500).json({ error: error.message });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(currentPassword, newPassword);
    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    console.error('Error in changePassword:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  verifyPassword,
  changePassword
};
