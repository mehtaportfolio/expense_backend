const supabase = require('../config/supabase');

class ExpenseService {
  async getAllExpenses() {
    const allData = [];
    let from = 0;
    const batchSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false })
        .range(from, from + batchSize - 1);

      if (error) throw error;
      
      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allData.push(...data);
        from += batchSize;
        hasMore = data.length === batchSize;
      }
    }
    return allData;
  }

  async addExpense(expense) {
    const { data, error } = await supabase.from('expenses').insert([expense]).select();
    if (error) throw error;
    return data;
  }

  async addExpenses(expenses) {
    const { data, error } = await supabase.from('expenses').insert(expenses).select();
    if (error) throw error;
    return data;
  }

  async updateExpense(id, updates) {
    const { data, error } = await supabase
      .from('expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteExpense(id) {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
    return true;
  }

  async getExpenseSummary() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    
    const today = `${year}-${month}-${day}`;
    const currentMonth = `${year}-${month}`;

    const { data: expenses, error } = await supabase
      .from('expenses')
      .select('amount, date, expense_type')
      .neq('expense_type', 'income')
      .gte('date', `${currentMonth}-01`);

    if (error) throw error;

    const todayTotal = expenses
      .filter(exp => exp.date.startsWith(today))
      .reduce((sum, exp) => sum + exp.amount, 0);

    const monthTotal = expenses
      .filter(exp => exp.date.startsWith(currentMonth))
      .reduce((sum, exp) => sum + exp.amount, 0);

    return { todayTotal, monthTotal };
  }
}

module.exports = new ExpenseService();
