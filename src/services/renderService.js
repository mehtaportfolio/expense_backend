class RenderService {
  async restartService() {
    const apiKey = process.env.RENDER_API_KEY;
    const serviceId = process.env.RENDER_SERVICE_ID;

    if (!apiKey || !serviceId) {
      throw new Error('Render API key or Service ID not configured in backend');
    }

    const response = await fetch(
      `https://api.render.com/v1/services/${serviceId}/deploys`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ clearCache: 'do_not_clear' })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Render API error: ${response.statusText}`);
    }

    return await response.json();
  }
}

module.exports = new RenderService();
