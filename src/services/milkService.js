const supabase = require('../config/supabase');

class MilkService {
  async getAllMilkDetails() {
    const { data, error } = await supabase
      .from('milk_details')
      .select('sr_no, kg')
      .order('sr_no', { ascending: true });

    if (error) throw error;
    return data;
  }

  async updateMilkDetail(sr_no, kg) {
    const { error } = await supabase
      .from('milk_details')
      .update({ kg })
      .eq('sr_no', sr_no);

    if (error) throw error;
    return true;
  }

  async fillZeroValues(kg) {
    const { error } = await supabase
      .from('milk_details')
      .update({ kg })
      .eq('kg', 0);

    if (error) throw error;
    return true;
  }
}

module.exports = new MilkService();
