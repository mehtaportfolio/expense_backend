const supabase = require('../config/supabase');

class SalaryService {
  async getAllSalaryDetails() {
    const { data, error } = await supabase
      .from('salary_details')
      .select('*')
      .order('date', { ascending: false });

    if (error) throw error;
    return data;
  }

  async addSalaryDetail(salaryDetail) {
    const { data, error } = await supabase
      .from('salary_details')
      .insert(salaryDetail)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateSalaryDetail(id, salaryDetail) {
    const { data, error } = await supabase
      .from('salary_details')
      .update(salaryDetail)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteSalaryDetail(id) {
    const { error } = await supabase
      .from('salary_details')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  }
}

module.exports = new SalaryService();
