class CovidAPI {
  static async getGlobalStats() {
    try {
      const response = await fetch('/api/stats');
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching global stats:', error);
      return {
        lastDate: null,
        totalCases: 0,
        totalDeaths: 0,
        totalVaccinations: 0
      };
    }
  }

  static async getTimeSeriesData(country, metric, period = 'allTime') {
    try {
      // Para "All Countries", sumamos los datos de todos los países
      if (!country) {
        const response = await fetch(`/api/global-time-series?metric=${metric}&period=${period}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
      } else {
        const url = `/api/time-series?country=${encodeURIComponent(country)}&metric=${metric}&period=${period}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
      }
    } catch (error) {
      console.error(`Error fetching time series for ${metric}:`, error);
      return [];
    }
  }

  static async getCountriesList() {
    try {
      const response = await fetch('/api/countries');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching countries list:', error);
      return [];
    }
  }

  static async getGeoData(metric, period = 'allTime') {
    try {
      const response = await fetch(`/api/geo-data?metric=${metric}&period=${period}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching geo data for ${metric}:`, error);
      return [];
    }
  }

  static async getMortalityRateData(period = 'allTime') {
    try {
      const response = await fetch(`/api/mortality-rate?period=${period}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching mortality rate data:', error);
      return [];
    }
  }
}