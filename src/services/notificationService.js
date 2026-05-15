const supabase = require('../config/supabase');

class NotificationService {
  async getSubscriptions() {
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('subscription_json');
    
    if (error) throw error;
    return data.map(item => item.subscription_json);
  }

  async upsertSubscription(subscription) {
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({ 
        endpoint: subscription.endpoint, 
        subscription_json: subscription 
      }, { onConflict: 'endpoint' });

    if (error) throw error;
    return true;
  }

  async deleteSubscription(endpoint) {
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);
    
    if (error) throw error;
    return true;
  }
}

module.exports = new NotificationService();
