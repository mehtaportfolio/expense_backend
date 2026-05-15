const supabase = require('../config/supabase');

class MasterService {
  async getAllMasterData() {
    const { data, error } = await supabase
      .from('master')
      .select('*')
      .order('category');

    if (error) throw error;
    return data;
  }

  async addMasterEntry(entry) {
    const { data, error } = await supabase
      .from('master')
      .insert(entry)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async initializeMasterTable(entries) {
    const { error } = await supabase
      .from('master')
      .insert(entries);

    if (error) throw error;
    return true;
  }
}

module.exports = new MasterService();
