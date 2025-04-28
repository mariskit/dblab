class CovidAPI {
  static async fetchData(resource) {
    const BASE_URL = 'http://localhost:3000'; //apunta a express
    // si no esta apunta a local y la pagina no se trata de comunicar con vs
    // cuando debe comunicarse a express que es donde se manda la info desde app
    try {
      const response = await fetch(`${BASE_URL}${resource}`, { // Usa BASE_URL
        headers: { 'Accept': 'application/json' }
      });

      return response.json();
    } catch (error) {
      console.error(`Error fetching ${resource}:`, error);
      throw error;
    }
  }

  static async getCountries() {
    try {
      const data = await this.fetchData('/api/countries');
      console.log('Countries data:', data); // Debug
      if (!Array.isArray(data)) {
        throw new Error('Formato de datos inválido');
      }
      return data;
    } catch (error) {
      console.error('Error loading countries:', error);
      throw new Error('No se pudo cargar la lista de países');
    }
  }

  static async getSummaryData() {
    try {
      const data = await this.fetchData('/api/summary');
      console.log('Summary data:', data); // Debug
      return data;
    } catch (error) {
      console.error('Error loading summary:', error);
      throw new Error('No se pudo cargar el resumen de datos');
    }
  }

  static async getTimeSeriesData(countryCode, startDate = null) {
    try {
      let url = `/api/timeseries/${encodeURIComponent(countryCode)}`;
      if (startDate) {
        url += `?startDate=${encodeURIComponent(startDate)}`;
      }
      
      const data = await this.fetchData(url);
      console.log('TimeSeries data:', data); // Debug
      return data;
    } catch (error) {
      console.error('Error loading time series:', error);
      throw new Error(`No se pudieron cargar datos para ${countryCode}`);
    }
  }

  static async getMapData() {
    try {
      const data = await this.fetchData('/api/map-data');
      console.log('Map data:', data); // Debug
      return data;
    } catch (error) {
      console.error('Error loading map data:', error);
      throw new Error('No se pudo cargar datos para el mapa');
    }
  }
}
