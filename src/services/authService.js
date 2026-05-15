const supabase = require('../config/supabase');

class AuthService {
  async verifyPassword(password) {
    const { data, error } = await supabase
      .from('user_master')
      .select('master_password')
      .limit(1)
      .single();

    if (error) throw error;
    return data && data.master_password === password;
  }

  async changePassword(currentPassword, newPassword) {
    const { data, error } = await supabase
      .from('user_master')
      .select('id, master_password')
      .limit(1)
      .single();

    if (error) throw error;

    if (!data || data.master_password !== currentPassword) {
      return { success: false, message: 'Invalid current password' };
    }

    const { error: updateError } = await supabase
      .from('user_master')
      .update({ master_password: newPassword })
      .eq('id', data.id);

    if (updateError) throw updateError;

    return { success: true };
  }
}

module.exports = new AuthService();
